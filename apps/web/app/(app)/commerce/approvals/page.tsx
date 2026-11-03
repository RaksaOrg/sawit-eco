import { prisma } from '@/lib/prisma';
import { requireTenant } from '@/lib/auth';
import ApprovalInbox from './ApprovalInbox';

export const dynamic = 'force-dynamic';

const currency = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

export default async function ApprovalPage() {
  const tenant = await requireTenant();

  const [orders, approver] = await Promise.all([
    prisma.order.findMany({
      where: { tenantId: tenant.id, status: 'SUBMITTED' },
      include: {
        user: { select: { nama: true } },
        items: { select: { blokKode: true, alasanRekomendasi: true } },
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.user.findFirst({
      where: { tenantId: tenant.id, role: 'OWNER' },
      select: { id: true, role: true },
    }),
  ]);

  return (
    <ApprovalInbox
      tenantName={tenant.nama}
      approverId={approver?.id || ''}
      approverRole={approver?.role || 'OWNER'}
      orders={orders.map((order) => ({
        id: order.id,
        date: new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(order.createdAt),
        requester: order.user.nama,
        block: Array.from(new Set(order.items.map((item) => item.blokKode))).join(', ') || '—',
        reason:
          order.items
            .map((item) => item.alasanRekomendasi)
            .filter(Boolean)
            .join('; ') || '—',
        total: currency.format(order.totalHarga),
        totalValue: order.totalHarga,
        status: order.status,
      }))}
    />
  );
}
