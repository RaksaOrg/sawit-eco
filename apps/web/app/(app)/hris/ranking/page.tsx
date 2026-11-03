import { prisma } from '@/lib/prisma';
import { requireTenant } from '@/lib/auth';
import FioriSupervisorTable from '../../supervisors/FioriSupervisorTable';

export const dynamic = 'force-dynamic';

export default async function RankingPage() {
  const tenant = await requireTenant();
  const data = await prisma.dailyReport.groupBy({
    by: ['mandorNama'],
    where: { tenantId: tenant.id, mandorNama: { not: null } },
    _sum: { produksiKg: true, hadir: true },
    _avg: { produktivitas: true },
    _count: { _all: true },
    orderBy: { _sum: { produksiKg: 'desc' } },
  });

  return (
    <FioriSupervisorTable
      tenantNama={tenant.nama}
      items={data.map((item) => ({
        mandorNama: item.mandorNama || 'Tanpa Nama',
        jumlahLaporan: item._count._all,
        totalHadir: item._sum.hadir ?? 0,
        totalProduksi: `${(item._sum.produksiKg ?? 0).toLocaleString('id-ID')} Kg`,
        avgKgHK: `${(item._avg.produktivitas ?? 0).toFixed(0)} Kg/HK`,
        avgKgHKValue: item._avg.produktivitas ?? 0,
      }))}
    />
  );
}
