import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentTenant } from '@/lib/tenant';
import { getRotasiStatusList } from '@/lib/kpi';
import { logServerError } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request) {
  try {
    const tenant = await getCurrentTenant();
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant tidak ditemukan' }, { status: 401 });
    }

    const [blocks, allPanenReports] = await Promise.all([
      prisma.block.findMany({
        where: { tenantId: tenant.id },
      }),
      prisma.dailyReport.findMany({
        where: { tenantId: tenant.id, aktivitas: 'Panen' },
      }),
    ]);

    const blockPanenMap: Record<string, Date> = {};
    allPanenReports.forEach((r) => {
      if (!blockPanenMap[r.blokKode] || new Date(r.tanggal) > new Date(blockPanenMap[r.blokKode])) {
        blockPanenMap[r.blokKode] = new Date(r.tanggal);
      }
    });

    const blockList = blocks.map((b) => ({
      blokKode: b.kode,
      terakhirPanen: blockPanenMap[b.kode] || null,
    }));

    const rotasiStatusList = getRotasiStatusList(blockList);

    return NextResponse.json({
      tenantId: tenant.id,
      rotasiStatusList,
    });
  } catch (error) {
    logServerError('Rotasi Panen API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
