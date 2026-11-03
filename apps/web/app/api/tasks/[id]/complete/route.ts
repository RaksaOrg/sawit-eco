import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenant } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const tenant = await requireTenant(req);
    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: taskId } = await params;
    const task = await prisma.fieldTask.findFirst({
      where: { id: taskId, tenantId: tenant.id },
      include: { mandor: true },
    });

    if (!task) {
      return NextResponse.json({ error: 'Tugas tidak ditemukan' }, { status: 404 });
    }

    const body = (await req.json()) as {
      productionKg?: number;
      areaHa?: number;
      workUnits?: number;
      notes?: string;
      produksiKg?: number;
      luasHa?: number;
      hadir?: number;
      catatan?: string;
    };
    const productionKg = body.productionKg ?? body.produksiKg ?? 0;
    const areaHa = body.areaHa ?? body.luasHa ?? 0;
    const workUnits = body.workUnits ?? body.hadir ?? 1;
    const notes = body.notes ?? body.catatan ?? 'Manual completion via web';

    const result = await prisma.$transaction(async (tx) => {
      const report = await tx.dailyReport.create({
        data: {
          tenantId: tenant.id,
          userId: task.mandorId || undefined,
          blokKode: task.blokKode,
          mandorNama: task.mandorNama || 'Admin',
          aktivitas: task.aktivitas,
          status: 'Selesai',
          hadir: Number(workUnits) || 1,
          produksiKg: Number(productionKg) || 0,
          luasHa: Number(areaHa) || 0,
          produktivitas:
            Number(workUnits) > 0 ? (Number(productionKg) || 0) / Number(workUnits) : 0,
          rawMessage: `Manual completion web: ${notes}`,
          fieldTaskId: task.id,
        },
      });

      const updatedTask = await tx.fieldTask.update({
        where: { id: task.id },
        data: { status: 'COMPLETED' },
      });

      return { report, updatedTask };
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
