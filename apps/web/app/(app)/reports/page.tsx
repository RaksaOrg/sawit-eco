import { prisma } from '@/lib/prisma';
import { requireTenant } from '@/lib/auth';
import FioriReportTable from './FioriReportTable';

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  const tenant = await requireTenant();

  const reports = await prisma.dailyReport.findMany({
    where: { tenantId: tenant.id },
    orderBy: { tanggal: 'desc' },
    take: 100,
  });

  const mapped = reports.map((r) => ({
    id: r.id,
    tanggal: r.tanggal.toLocaleDateString('id-ID'),
    blokKode: r.blokKode,
    mandorNama: r.mandorNama || '-',
    aktivitas: r.aktivitas,
    hadir: r.hadir,
    produksiKg: r.produksiKg,
    produktivitas: r.produktivitas ? r.produktivitas.toFixed(0) : '-',
  }));

  return <FioriReportTable reports={mapped} tenantNama={tenant.nama} />;
}
