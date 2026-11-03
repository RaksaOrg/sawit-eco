import { prisma } from '@/lib/prisma';
import { requireTenant } from '@/lib/auth';
import FioriSupervisorTable from './FioriSupervisorTable';

export const dynamic = 'force-dynamic';

export default async function SupervisorsPage() {
  const tenant = await requireTenant();

  const data = await prisma.dailyReport.groupBy({
    by: ['mandorNama'],
    where: { tenantId: tenant.id, mandorNama: { not: null } },
    _sum: { produksiKg: true, hadir: true },
    _avg: { produktivitas: true },
    _count: { _all: true },
    orderBy: { _sum: { produksiKg: 'desc' } },
  });

  const mapped = data.map((m) => ({
    mandorNama: m.mandorNama || 'Tanpa Nama',
    jumlahLaporan: m._count._all,
    totalHadir: m._sum.hadir ?? 0,
    totalProduksi: `${(m._sum.produksiKg ?? 0).toLocaleString('id-ID')} Kg`,
    avgKgHK: `${(m._avg.produktivitas ?? 0).toFixed(0)} Kg/HK`,
    avgKgHKValue: m._avg.produktivitas ?? 0,
  }));

  return <FioriSupervisorTable items={mapped} tenantNama={tenant.nama} />;
}
