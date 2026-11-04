import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireTenant } from '@/lib/auth';
import { attendanceCreateSchema, lessonProgressSchema, syncBatchSchema } from '@sawit/contracts';
import { hkValue } from '@/src/core/hris/kpi';
import { maskPii } from '@/src/core/privacy/pdp-guard';
import { querySamSegmentation } from '@/src/core/ai/sam';
import { getModelProvider, recordModelTrigger } from '@/lib/model-trigger';

export const dynamic = 'force-dynamic';

const taskCompleteSchema = z.object({
  taskId: z.string().uuid(),
  productionKg: z.number().nonnegative().default(0),
  areaHa: z.number().nonnegative().default(0),
  workUnits: z.number().positive().default(1),
  notes: z.string().max(1000).optional(),
  proofBase64: z.string().optional(),
});

const diagnosisMediaSchema = z.object({
  blockCode: z.string().min(1),
  symptoms: z.string().min(1),
  voiceTranscript: z.string().optional(),
  voiceBase64: z.string().optional(),
  voiceMimeType: z.string().optional(),
  photoBase64: z.string().optional(),
  mimeType: z.string().optional(),
});

async function savePhoto(base64: string, mimeType: string): Promise<string | null> {
  if (base64.length > 8 * 1024 * 1024) return null;
  const extension = mimeType.split('/')[1]?.split(';')[0] || 'jpg';
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
  const dir = path.join(process.cwd(), 'public', 'uploads', 'agronomy');
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, fileName), Buffer.from(base64, 'base64'));
  return `/uploads/agronomy/${fileName}`;
}

export async function POST(req: NextRequest) {
  const tenant = await requireTenant(req);
  const parsed = syncBatchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid sync batch',
          details: parsed.error.flatten(),
        },
      },
      { status: 400 },
    );
  }

  const results: Array<{ id: string; status: 'SYNCED' | 'FAILED'; errorCode?: string }> = [];

  for (const event of parsed.data.events) {
    try {
      if (event.type === 'ATTENDANCE') {
        const attendance = attendanceCreateSchema.safeParse(event.payload);
        if (!attendance.success) throw new Error('INVALID_ATTENDANCE');
        const data = attendance.data;
        const user = await prisma.user.findFirst({
          where: { id: data.userId, tenantId: tenant.id },
          select: { id: true },
        });
        if (!user) throw new Error('USER_NOT_FOUND');
        const block = await prisma.block.findUnique({
          where: { tenantId_kode: { tenantId: tenant.id, kode: data.blockCode } },
          select: { id: true },
        });
        await prisma.attendance.upsert({
          where: { idempotencyKey: data.idempotencyKey },
          update: {},
          create: {
            tenantId: tenant.id,
            userId: data.userId,
            blockId: block?.id,
            blokKode: data.blockCode,
            workDate: new Date(data.workDate),
            status: data.status,
            source: data.source,
            hkValue: hkValue(data.status, data.overtimeHours ?? 0),
            latitude: data.latitude,
            longitude: data.longitude,
            notes: data.notes,
            idempotencyKey: data.idempotencyKey,
          },
        });
      }

      if (event.type === 'TASK_COMPLETE') {
        const completion = taskCompleteSchema.safeParse(event.payload);
        if (!completion.success) throw new Error('INVALID_TASK_COMPLETION');
        const data = completion.data;
        const task = await prisma.fieldTask.findFirst({
          where: { id: data.taskId, tenantId: tenant.id },
        });
        if (!task) throw new Error('TASK_NOT_FOUND');
        await prisma.$transaction(async (tx) => {
          if (task.status !== 'COMPLETED') {
            await tx.dailyReport.create({
              data: {
                tenantId: tenant.id,
                userId: task.mandorId || undefined,
                blokKode: task.blokKode,
                mandorNama: task.mandorNama || 'Mobile',
                aktivitas: task.aktivitas,
                status: 'Selesai',
                hadir: data.workUnits,
                produksiKg: data.productionKg,
                luasHa: data.areaHa,
                produktivitas:
                  data.workUnits > 0 ? Number((data.productionKg / data.workUnits).toFixed(2)) : 0,
                rawMessage: `Mobile sync: ${data.notes || 'task completion'}`,
                fieldTaskId: task.id,
              },
            });
            await tx.fieldTask.update({
              where: { id: task.id },
              data: { status: 'COMPLETED' },
            });
          }
        });
      }

      if (event.type === 'LEARNING_PROGRESS') {
        const progress = lessonProgressSchema.safeParse(event.payload);
        if (!progress.success) throw new Error('INVALID_LEARNING_PROGRESS');
        const data = progress.data;
        const user = await prisma.user.findFirst({
          where: { id: data.userId, tenantId: tenant.id },
          select: { id: true },
        });
        const module = await prisma.learningModule.findFirst({
          where: { id: data.moduleId, tenantId: tenant.id },
          select: { id: true },
        });
        if (!user || !module) throw new Error('LEARNING_TARGET_NOT_FOUND');
        await prisma.userLearningProgress.upsert({
          where: { userId_moduleId: { userId: data.userId, moduleId: data.moduleId } },
          update: { isCompleted: data.isCompleted },
          create: {
            tenantId: tenant.id,
            userId: data.userId,
            moduleId: data.moduleId,
            isCompleted: data.isCompleted,
          },
        });
      }

      if (event.type === 'DIAGNOSIS_MEDIA') {
        const diagnosis = diagnosisMediaSchema.safeParse(event.payload);
        if (!diagnosis.success) throw new Error('INVALID_DIAGNOSIS_MEDIA');
        const data = diagnosis.data;
        const masked = maskPii(`${data.symptoms} ${data.voiceTranscript || ''}`.trim());
        let photoUrl: string | null = null;
        if (data.photoBase64) {
          photoUrl = await savePhoto(data.photoBase64, data.mimeType || 'image/jpeg');
          if (!photoUrl) throw new Error('PHOTO_TOO_LARGE');
        }
        if (data.voiceBase64) {
          const voiceUrl = await savePhoto(data.voiceBase64, data.voiceMimeType || 'audio/m4a');
          if (!voiceUrl) throw new Error('VOICE_TOO_LARGE');
        }

        let samSummary = '';
        if (data.photoBase64) {
          const startedAt = Date.now();
          try {
            const sam = await querySamSegmentation(
              {
                image: { mime: data.mimeType || 'image/jpeg', base64: data.photoBase64 },
                targetType: 'LEAF_DEFECT',
              },
              process.env,
              fetch,
            );
            if (sam.providerAttemptFailed) {
              await recordModelTrigger({
                tenantId: tenant.id,
                traceId: event.id,
                route: '/api/sync/batch',
                provider: getModelProvider(sam.endpointUsed),
                model: sam.modelUsed,
                operation: 'IMAGE_SEGMENTATION',
                status: 'FAILED',
                startedAt,
                errorCode: 'PROVIDER_REQUEST_FAILED',
              });
            }
            await recordModelTrigger({
              tenantId: tenant.id,
              traceId: event.id,
              route: '/api/sync/batch',
              provider: sam.isSimulated ? 'local-fallback' : getModelProvider(sam.endpointUsed),
              model: sam.modelUsed,
              operation: 'IMAGE_SEGMENTATION',
              status: 'SUCCEEDED',
              startedAt,
            });
            samSummary = sam.isSimulated
              ? ` Segmentasi SAM (simulasi): area ${sam.primaryMaskAreaPercentage}%.`
              : ` Segmentasi SAM 3.1: area ${sam.primaryMaskAreaPercentage}% (${sam.detectedFeatures.join(', ')}).`;
          } catch (error) {
            await recordModelTrigger({
              tenantId: tenant.id,
              traceId: event.id,
              route: '/api/sync/batch',
              provider: getModelProvider(process.env.SAM_INFERENCE_ENDPOINT),
              model: process.env.SAM_MODEL || 'sam-3.1',
              operation: 'IMAGE_SEGMENTATION',
              status: 'FAILED',
              startedAt,
              errorCode: error instanceof Error ? error.name : 'UNKNOWN_ERROR',
            });
            throw error;
          }
        }

        await prisma.agronomyLog.create({
          data: {
            tenantId: tenant.id,
            blokKode: data.blockCode,
            fotoUrl: photoUrl,
            gejala: masked.text,
            diagnosa: `Menunggu analisa agronomi lanjutan dari foto lapangan.${samSummary}`,
            risiko: 'SEDANG',
            rekomendasi:
              'Lakukan scouting blok dan konfirmasi dengan agronom. Sesuaikan dengan hasil analisa daun/tanah dan label resmi produk.',
            mandorNama: 'Mobile',
            waMessageId: `mobile-${event.id}`,
          },
        });
      }

      results.push({ id: event.id, status: 'SYNCED' });
    } catch (error) {
      results.push({
        id: event.id,
        status: 'FAILED',
        errorCode: error instanceof Error ? error.message : 'UNKNOWN_ERROR',
      });
    }
  }

  return NextResponse.json({
    success: true,
    data: { processed: results.length, results },
  });
}
