import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth';
import { getModelProvider, recordModelTrigger } from '@/lib/model-trigger';
import { prisma } from '@/lib/prisma';
import { MANDATORY_AGRONOMY_DISCLAIMER } from '@/src/core/compliance/agronomy-guard';
import { queryMetaInferenceEngine } from '@/src/core/ai/inference';
import { maskPii } from '@/src/core/privacy/pdp-guard';
import { processDiagnosisFlow } from '@/src/features/commerce/closed-loop-service';
import { z } from 'zod';

const diagnosisSchema = z.object({
  blockCode: z.string().trim().min(1).max(32),
  symptoms: z.string().trim().min(1).max(2000),
  targetSku: z.string().trim().min(1).max(80),
  dosageKgPerHa: z.number().finite().positive().max(10000).default(150),
  photoUrl: z.string().url().optional(),
  reason: z.string().trim().max(500).optional(),
});

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHENTICATED' } },
        { status: 401 },
      );
    }

    const parsed = diagnosisSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', details: parsed.error.flatten() } },
        { status: 400 },
      );
    }
    const body = parsed.data;
    const block = await prisma.block.findUnique({
      where: { tenantId_kode: { tenantId: auth.tenantId, kode: body.blockCode } },
      select: { id: true },
    });
    if (!block) {
      return NextResponse.json(
        { success: false, error: { code: 'BLOCK_NOT_FOUND' } },
        { status: 404 },
      );
    }

    const traceId = randomUUID();
    const startedAt = Date.now();
    const maskedSymptoms = maskPii(body.symptoms).text;
    let diagnosisText: string | undefined;
    try {
      const inference = await queryMetaInferenceEngine({
        messages: [
          {
            role: 'system',
            content:
              'Anda agronomis kelapa sawit. Berikan diagnosis awal dan risiko dari gejala. Jangan merekomendasikan produk, SKU, atau dosis. Jika gejala tidak cukup, nyatakan perlu pemeriksaan lapangan.',
          },
          { role: 'user', content: `Blok ${body.blockCode}. Gejala: ${maskedSymptoms}` },
        ],
        maxTokens: 800,
      });
      diagnosisText = inference.text;
      await recordModelTrigger({
        tenantId: auth.tenantId,
        traceId,
        route: '/api/agronomy/diagnose',
        provider: getModelProvider(process.env.META_INFERENCE_ENDPOINT, inference.provider),
        model: inference.model,
        operation: 'AGRONOMY_DIAGNOSIS',
        status: 'SUCCEEDED',
        startedAt,
      });
    } catch (error) {
      await recordModelTrigger({
        tenantId: auth.tenantId,
        traceId,
        route: '/api/agronomy/diagnose',
        provider: getModelProvider(process.env.META_INFERENCE_ENDPOINT),
        model: process.env.META_MODEL || 'muse-spark-1.3',
        operation: 'AGRONOMY_DIAGNOSIS',
        status: 'FAILED',
        startedAt,
        errorCode: error instanceof Error ? error.name : 'UNKNOWN_ERROR',
      });
    }

    const result = await processDiagnosisFlow({
      tenantId: auth.tenantId,
      userId: auth.userId,
      mandorNama: auth.user.nama,
      blockCode: body.blockCode,
      symptoms: maskedSymptoms,
      diagnosisText,
      photoUrl: body.photoUrl,
      targetSku: body.targetSku,
      dosageKgPerHa: body.dosageKgPerHa,
      disclaimer: MANDATORY_AGRONOMY_DISCLAIMER,
      reason: body.reason || `Rekomendasi penanganan gejala: ${body.symptoms}`,
    });

    return NextResponse.json({ success: true, traceId, data: result });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: errorMsg } },
      { status: 400 },
    );
  }
}
