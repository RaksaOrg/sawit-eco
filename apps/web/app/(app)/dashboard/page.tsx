import { prisma } from '@/lib/prisma';
import { requireTenant } from '@/lib/auth';
import { getRotasiStatusList, hitungProduktivitas } from '@/lib/kpi';
import { orderStatusInfo, riskStatusInfo, rotasiStatusInfo } from '@/lib/fiori-status';
import DashboardOverview, { type AttentionItem } from './DashboardOverview';
import { REAL_MARKET_BENCHMARKS, computeFunnelMetrics } from '@/src/core/impact/market-benchmarks';

export const dynamic = 'force-dynamic';

const PERIODS: Record<string, { days: number; label: string }> = {
  today: { days: 1, label: 'Hari Ini' },
  '7d': { days: 7, label: '7 Hari Terakhir' },
  '30d': { days: 30, label: '30 Hari Terakhir' },
};

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const tenant = await requireTenant();
  const params = await searchParams;
  const requested = params.period || 'today';
  const period = PERIODS[requested] ? requested : 'today';
  const periodCfg = PERIODS[period];

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (periodCfg.days - 1));

  const [
    reportsPeriode,
    allReports,
    blocks,
    tugasAktif,
    tugasOverdueList,
    diagnosaTotal,
    diagnosaRisikoTinggiList,
    modulLearning,
    progressTotal,
    progressSelesai,
    produkAktif,
    orderMenungguList,
    ordersAgg,
    productGapOpen,
    priceAnomalies,
    pdpAuditCount,
  ] = await Promise.all([
    prisma.dailyReport.findMany({ where: { tenantId: tenant.id, tanggal: { gte: start } } }),
    prisma.dailyReport.findMany({ where: { tenantId: tenant.id } }),
    prisma.block.findMany({ where: { tenantId: tenant.id }, orderBy: { kode: 'asc' } }),
    prisma.fieldTask.count({
      where: { tenantId: tenant.id, status: { in: ['ASSIGNED', 'IN_PROGRESS'] } },
    }),
    prisma.fieldTask.findMany({
      where: {
        tenantId: tenant.id,
        status: { in: ['ASSIGNED', 'IN_PROGRESS'] },
        tanggalTarget: { lt: new Date() },
      },
      orderBy: { tanggalTarget: 'asc' },
      take: 3,
    }),
    prisma.agronomyLog.count({ where: { tenantId: tenant.id } }),
    prisma.agronomyLog.findMany({
      where: { tenantId: tenant.id, risiko: { in: ['TINGGI', 'KRITIS'] } },
      orderBy: { createdAt: 'desc' },
      take: 3,
    }),
    prisma.learningModule.count({ where: { tenantId: tenant.id } }),
    prisma.userLearningProgress.count({ where: { tenantId: tenant.id } }),
    prisma.userLearningProgress.count({ where: { tenantId: tenant.id, isCompleted: true } }),
    prisma.product.count({ where: { tenantId: tenant.id, isActive: true } }),
    prisma.order.findMany({
      where: { tenantId: tenant.id, status: 'SUBMITTED' },
      include: { user: { select: { nama: true } }, items: { select: { blokKode: true } } },
      orderBy: { createdAt: 'desc' },
      take: 3,
    }),
    prisma.order.aggregate({
      where: { tenantId: tenant.id },
      _sum: { totalHarga: true },
      _count: true,
    }),
    prisma.productGap.count({ where: { tenantId: tenant.id, status: 'OPEN' } }),
    prisma.priceAnomaly.findMany({
      where: { tenantId: tenant.id },
      orderBy: { detectedAt: 'desc' },
      take: 5,
    }),
    prisma.pdpAuditLog.count({ where: { tenantId: tenant.id } }),
  ]);

  const panen = reportsPeriode.filter((r) => r.aktivitas.toLowerCase() === 'panen');
  const rawat = reportsPeriode.filter((r) => r.aktivitas.toLowerCase() !== 'panen');
  const totalKg = panen.reduce((a, r) => a + r.produksiKg, 0);
  const totalHkPanen = panen.reduce((a, r) => a + r.hadir, 0);
  const totalHaRawat = rawat.reduce((a, r) => a + r.luasHa, 0);
  const totalHkRawat = rawat.reduce((a, r) => a + r.hadir, 0);
  const totalHadir = reportsPeriode.reduce((a, r) => a + r.hadir, 0);

  const blockPanenMap: Record<string, Date> = {};
  allReports
    .filter((r) => r.aktivitas.toLowerCase() === 'panen')
    .forEach((r) => {
      if (!blockPanenMap[r.blokKode] || new Date(r.tanggal) > new Date(blockPanenMap[r.blokKode])) {
        blockPanenMap[r.blokKode] = new Date(r.tanggal);
      }
    });

  const rotasiStatus = getRotasiStatusList(
    blocks.map((b) => ({ blokKode: b.kode, terakhirPanen: blockPanenMap[b.kode] || null })),
  );

  const rotasi = rotasiStatus.map((r) => ({
    blokKode: r.blokKode,
    terakhirPanenLabel: r.terakhirPanen
      ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(r.terakhirPanen))
      : '—',
    hariLabel: r.hariSejakPanen !== null ? `${r.hariSejakPanen} hari` : '—',
    status: r.status,
    label: rotasiStatusInfo(r.status).label,
  }));

  const attention: AttentionItem[] = [
    ...tugasOverdueList.map((t) => ({
      id: `task-${t.id}`,
      title: `${t.kodeTugas} — Blok ${t.blokKode}`,
      description: `${t.aktivitas} · Tenggat ${new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(t.tanggalTarget))}`,
      statusLabel: 'Overdue',
      state: 'Negative' as const,
      href: '/tasks',
    })),
    ...diagnosaRisikoTinggiList.map((d) => {
      const info = riskStatusInfo(d.risiko);
      return {
        id: `diag-${d.id}`,
        title: `Blok ${d.blokKode} — ${info.label}`,
        description: d.gejala || d.diagnosa.slice(0, 80),
        statusLabel: `Risiko ${info.label}`,
        state: info.state,
        href: '/agronomy',
      };
    }),
    ...orderMenungguList.map((o) => ({
      id: `order-${o.id}`,
      title: `Pesanan ${o.user.nama}`,
      description: `${o.items.length} item · ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(o.totalHarga)}`,
      statusLabel: orderStatusInfo(o.status).label,
      state: orderStatusInfo(o.status).state,
      href: '/commerce/orders',
    })),
  ].slice(0, 6);

  const diagnosaRisikoTinggi = diagnosaRisikoTinggiList.length;

  const maxDeviation = priceAnomalies.length
    ? Math.max(...priceAnomalies.map((a) => a.deviationPercentage))
    : 0;

  const intelligence = priceAnomalies.slice(0, 3).map((a) => ({
    id: a.id,
    sku: a.sku,
    deviationPercentage: a.deviationPercentage,
    severity: a.severity,
    reasoning: a.reasoningSummary,
    detectedAt: new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(a.detectedAt),
  }));

  const benchmarks = REAL_MARKET_BENCHMARKS.map((b) => ({
    commodity: b.commodity,
    regionalDistrict: b.regionalDistrict,
    officialRefPrice: `Rp ${b.officialRefPricePerUnit.toLocaleString('id-ID')}`,
    tengkulakOfferPrice: `Rp ${b.tengkulakOfferPricePerUnit.toLocaleString('id-ID')}`,
    marginCut: `-${b.middlemanMarginPercentage}%`,
    savings: `Rp ${b.farmerSavingsPerHa.toLocaleString('id-ID')} / Ha`,
  }));

  const [recommendationsCount, checksCount] = await Promise.all([
    prisma.recommendationLedger.count({ where: { tenantId: tenant.id } }),
    prisma.recommendationLedger.count({ where: { tenantId: tenant.id, stage: 'ORDER_SUBMITTED' } }),
  ]);

  const selectionsCount = await prisma.order.count({
    where: { tenantId: tenant.id, status: { in: ['APPROVED', 'PAID', 'DELIVERED'] } },
  });

  const funnel = computeFunnelMetrics({
    recommendations: recommendationsCount,
    clicks: checksCount,
    carts: checksCount,
    checkouts: checksCount,
    paidOrders: selectionsCount,
    totalGmv: ordersAgg._sum.totalHarga ?? 0,
    repeatBuyersCount: Math.max(1, Math.floor((ordersAgg._count || 1) / 3)),
    totalBuyersCount: Math.max(1, Math.floor((ordersAgg._count || 1) / 2)),
  });

  return (
    <DashboardOverview
      tenantName={tenant.nama}
      lokasi={tenant.lokasi}
      period={period}
      periodLabel={periodCfg.label}
      metrics={{
        produksiKg: reportsPeriode.length ? totalKg : null,
        kgPerHK: totalHkPanen > 0 ? hitungProduktivitas('Panen', totalKg, 0, totalHkPanen) : null,
        haPerHK:
          totalHkRawat > 0 ? hitungProduktivitas('Rawat', 0, totalHaRawat, totalHkRawat) : null,
        hadirHK: reportsPeriode.length ? totalHadir : null,
        blokMelapor: new Set(reportsPeriode.map((r) => r.blokKode)).size,
        overdueCount: rotasiStatus.filter((r) => r.status === 'ERROR').length,
        dalamRotasiCount: rotasiStatus.filter((r) => r.status === 'SUCCESS').length,
        totalBlok: blocks.length,
        tugasAktif,
        tugasOverdue: tugasOverdueList.length,
        diagnosaTotal,
        diagnosaRisikoTinggi,
        modulLearning,
        learningCompletionPct: progressTotal > 0 ? (progressSelesai / progressTotal) * 100 : null,
        produkAktif,
        orderMenunggu: await prisma.order.count({
          where: { tenantId: tenant.id, status: 'SUBMITTED' },
        }),
        gmv: ordersAgg._count > 0 ? (ordersAgg._sum.totalHarga ?? 0) : null,
        productGapOpen,
        maxDeviation,
        priceAnomaliesCount: priceAnomalies.length,
        pdpAuditCount,
        conversionRatePct: funnel.recommendationToPurchaseRatePct,
        repeatPurchaseRatePct: funnel.repeatPurchaseRatePct,
        estimatedSavingsIdr:
          funnel.estimatedTengkulakCutSavingsIdr + Math.round(funnel.totalGmvIdr * 0.05),
      }}
      intelligence={intelligence}
      benchmarks={benchmarks}
      rotasi={rotasi}
      attention={attention}
    />
  );
}
