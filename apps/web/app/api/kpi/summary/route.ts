import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentTenant } from '@/lib/tenant';
import { hitungProduktivitas, getRotasiStatusList } from '@/lib/kpi';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request) {
  try {
    const tenant = await getCurrentTenant();
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant tidak ditemukan' }, { status: 401 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [reportsHariIni, allReports, blocks, tasks] = await Promise.all([
      prisma.dailyReport.findMany({
        where: { tenantId: tenant.id, tanggal: { gte: today } },
      }),
      prisma.dailyReport.findMany({
        where: { tenantId: tenant.id },
      }),
      prisma.block.findMany({
        where: { tenantId: tenant.id },
      }),
      prisma.fieldTask.findMany({
        where: { tenantId: tenant.id },
      }),
    ]);

    const totalProduksiKg = reportsHariIni
      .filter((r) => r.aktivitas.toLowerCase() === 'panen')
      .reduce((acc, curr) => acc + curr.produksiKg, 0);

    const totalHadirHK = reportsHariIni
      .filter((r) => r.aktivitas.toLowerCase() === 'panen')
      .reduce((acc, curr) => acc + curr.hadir, 0);

    const avgProduktivitasKgHK = hitungProduktivitas('Panen', totalProduksiKg, 0, totalHadirHK);

    const totalRawatHa = reportsHariIni
      .filter((r) => r.aktivitas.toLowerCase() !== 'panen')
      .reduce((acc, curr) => acc + curr.luasHa, 0);

    const totalRawatHK = reportsHariIni
      .filter((r) => r.aktivitas.toLowerCase() !== 'panen')
      .reduce((acc, curr) => acc + curr.hadir, 0);

    const avgRawatHaHK = hitungProduktivitas('Rawat', 0, totalRawatHa, totalRawatHK);

    // Rotasi perhitungan
    const blockPanenMap: Record<string, Date> = {};
    allReports
      .filter((r) => r.aktivitas.toLowerCase() === 'panen')
      .forEach((r) => {
        if (
          !blockPanenMap[r.blokKode] ||
          new Date(r.tanggal) > new Date(blockPanenMap[r.blokKode])
        ) {
          blockPanenMap[r.blokKode] = new Date(r.tanggal);
        }
      });

    const blockList = blocks.map((b) => ({
      blokKode: b.kode,
      terakhirPanen: blockPanenMap[b.kode] || null,
    }));

    const rotasiStatusList = getRotasiStatusList(blockList);
    const overdueCount = rotasiStatusList.filter((r) => r.status === 'ERROR').length;

    return NextResponse.json({
      tenant: { id: tenant.id, nama: tenant.nama, lokasi: tenant.lokasi },
      kpi: {
        totalProduksiKg,
        totalHadirHK,
        avgProduktivitasKgHK,
        avgRawatHaHK,
        blokAktif: reportsHariIni.length,
        overdueCount,
        activeTasksCount: tasks.filter((t) => t.status === 'ASSIGNED' || t.status === 'IN_PROGRESS')
          .length,
      },
      rotasiStatusList,
    });
  } catch (error) {
    console.error('KPI Summary Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
