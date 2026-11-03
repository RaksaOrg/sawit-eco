/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from '@/lib/prisma';
import { requireTenant } from '@/lib/auth';
import FioriTasksList from './FioriTasksList';

export const dynamic = 'force-dynamic';

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const tenant = await requireTenant();

  const where: any = { tenantId: tenant.id };
  const statusFilter = params?.status;
  if (statusFilter && statusFilter !== 'ALL') {
    if (statusFilter === 'OVERDUE') {
      where.status = { in: ['ASSIGNED', 'IN_PROGRESS'] };
      where.tanggalTarget = { lt: new Date() };
    } else {
      where.status = statusFilter;
    }
  }

  const tasks = await prisma.fieldTask.findMany({
    where,
    include: {
      mandor: { select: { id: true, nama: true } },
    },
    orderBy: [{ status: 'asc' }, { tanggalTarget: 'asc' }],
  });

  const now = new Date();
  const tasksMapped = tasks.map((t) => ({
    id: t.id,
    kodeTugas: t.kodeTugas,
    blokKode: t.blokKode,
    aktivitas: t.aktivitas,
    targetKuantitas: t.targetKuantitas,
    satuanTarget: t.satuanTarget,
    tanggalTarget: t.tanggalTarget.toLocaleDateString('id-ID'),
    mandorNama: t.mandor?.nama || t.mandorNama || '-',
    status: t.status,
    prioritas: t.prioritas,
    isOverdue:
      t.status !== 'COMPLETED' && t.status !== 'CANCELLED' && new Date(t.tanggalTarget) < now,
  }));

  return <FioriTasksList tasks={tasksMapped} tenantNama={tenant.nama} />;
}
