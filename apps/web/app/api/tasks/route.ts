import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireTenant } from '@/lib/auth';
import { sendWhatsApp } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const tenant = await requireTenant(req);
    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const blockCode = searchParams.get('blockCode') || searchParams.get('blokKode');
    const supervisorId = searchParams.get('supervisorId') || searchParams.get('mandorId');

    const where: Prisma.FieldTaskWhereInput = {
      tenantId: tenant.id,
    };
    if (status) where.status = status;
    if (blockCode) where.blokKode = blockCode;
    if (supervisorId) where.mandorId = supervisorId;

    const tasks = await prisma.fieldTask.findMany({
      where,
      include: {
        mandor: { select: { id: true, nama: true, waNumber: true } },
        dailyReport: { select: { produksiKg: true, luasHa: true, hadir: true, createdAt: true } },
      },
      orderBy: [{ tanggalTarget: 'asc' }, { createdAt: 'desc' }],
    });

    const now = new Date();
    const mapped = tasks.map((t) => {
      const isOverdue =
        t.status !== 'COMPLETED' && t.status !== 'CANCELLED' && new Date(t.tanggalTarget) < now;
      return {
        ...t,
        isOverdue,
      };
    });

    return NextResponse.json({ tasks: mapped });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenant = await requireTenant(req);
    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await req.json()) as {
      blockCode?: string;
      activity?: string;
      description?: string;
      targetQuantity?: number | string;
      targetUnit?: string;
      targetDate?: string;
      priority?: string;
      supervisorId?: string | null;
      agronomyLogId?: string | null;
      sendWhatsappNotification?: boolean;
      blokKode?: string;
      aktivitas?: string;
      deskripsi?: string;
      targetKuantitas?: number | string;
      satuanTarget?: string;
      tanggalTarget?: string;
      prioritas?: string;
      mandorId?: string | null;
      kirimNotifWa?: boolean;
    };
    const blockCode = body.blockCode || body.blokKode;
    const activity = body.activity || body.aktivitas;
    const description = body.description || body.deskripsi;
    const targetQuantity = body.targetQuantity || body.targetKuantitas;
    const targetUnit = body.targetUnit || body.satuanTarget;
    const targetDate = body.targetDate || body.tanggalTarget;
    const priority = body.priority || body.prioritas || 'MEDIUM';
    const supervisorId = body.supervisorId || body.mandorId;
    const agronomyLogId = body.agronomyLogId;
    const sendWhatsappNotification = body.sendWhatsappNotification ?? body.kirimNotifWa ?? true;

    if (!blockCode || !activity || !targetQuantity || !targetUnit || !targetDate) {
      return NextResponse.json({ error: 'Semua field wajib diisi' }, { status: 400 });
    }

    // Generate kode tugas format: TGS-YYYYMMDD-XXX
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const countToday = await prisma.fieldTask.count({
      where: {
        tenantId: tenant.id,
        kodeTugas: { startsWith: `TGS-${dateStr}` },
      },
    });
    const kodeTugas = `TGS-${dateStr}-${String(countToday + 1).padStart(3, '0')}`;

    let mandorUser = null;
    if (supervisorId) {
      mandorUser = await prisma.user.findFirst({
        where: { id: supervisorId, tenantId: tenant.id },
      });
      if (!mandorUser) {
        return NextResponse.json(
          { error: 'Mandor tidak ditemukan pada tenant ini' },
          { status: 400 },
        );
      }
    }

    const task = await prisma.fieldTask.create({
      data: {
        tenantId: tenant.id,
        kodeTugas,
        blokKode: blockCode,
        aktivitas: activity,
        deskripsi: description || null,
        targetKuantitas: Number(targetQuantity),
        satuanTarget: targetUnit,
        tanggalTarget: new Date(targetDate),
        prioritas: priority,
        mandorId: mandorUser?.id || null,
        mandorNama: mandorUser?.nama || null,
        agronomyLogId: agronomyLogId || null,
        status: 'ASSIGNED',
      },
      include: {
        mandor: { select: { id: true, nama: true, waNumber: true } },
      },
    });

    if (sendWhatsappNotification && mandorUser?.waNumber) {
      const targetDateFormatted = new Date(targetDate).toLocaleDateString('id-ID');
      const msg =
        `📋 *TUGAS LAPANGAN BARU*\n` +
        `Kode: ${kodeTugas}\n` +
        `Aktivitas: ${activity}\n` +
        `Blok: ${blockCode}\n` +
        `Target: ${targetQuantity} ${targetUnit}\n` +
        `Tenggat: ${targetDateFormatted}\n` +
        (description ? `Instruksi: ${description}\n` : '') +
        `\nKetik balasan saat selesai, contoh: *selesai tugas ${kodeTugas} hasil ${targetQuantity}*`;
      await sendWhatsApp(mandorUser.waNumber, msg).catch((e) =>
        console.error('Gagal kirim WA tugas', e),
      );
    }

    return NextResponse.json({ success: true, task }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
