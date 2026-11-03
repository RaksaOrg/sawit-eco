import { prisma } from '@/lib/prisma';
import { requireTenant } from '@/lib/auth';
import TaskFormClient from './TaskFormClient';

export const dynamic = 'force-dynamic';

export default async function NewTaskPage({
  searchParams,
}: {
  searchParams: Promise<{
    agronomyLogId?: string;
    blockCode?: string;
    activity?: string;
    notes?: string;
    fromAgronomi?: string;
    blok?: string;
    aktivitas?: string;
    catatan?: string;
  }>;
}) {
  const params = await searchParams;
  const tenant = await requireTenant();

  const [blocks, mandors] = await Promise.all([
    prisma.block.findMany({
      where: { tenantId: tenant.id },
      orderBy: { kode: 'asc' },
    }),
    prisma.user.findMany({
      where: { tenantId: tenant.id, role: 'MANDOR' },
      select: { id: true, nama: true, waNumber: true },
      orderBy: { nama: 'asc' },
    }),
  ]);

  return (
    <TaskFormClient
      blocks={blocks}
      mandors={mandors}
      tenantNama={tenant.nama}
      prefill={{
        agronomyLogId: params.agronomyLogId || params.fromAgronomi,
        blokKode: params.blockCode || params.blok,
        aktivitas: params.activity || params.aktivitas,
        deskripsi: params.notes || params.catatan,
      }}
    />
  );
}
