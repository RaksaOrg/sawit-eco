import { prisma } from '@/lib/prisma';
import { requireTenant } from '@/lib/auth';
import OrdersList from './OrdersList';

export const dynamic = 'force-dynamic';

const currency = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

export default async function OrdersPage() {
  const tenant = await requireTenant();

  const orders = await prisma.order.findMany({
    where: { tenantId: tenant.id },
    include: {
      user: { select: { nama: true } },
      items: { select: { blokKode: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return (
    <OrdersList
      tenantNama={tenant.nama}
      orders={orders.map((o) => ({
        id: o.id,
        tanggal: new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(o.createdAt),
        pemohon: o.user.nama,
        jumlahItem: o.items.length,
        blok: Array.from(new Set(o.items.map((i) => i.blokKode))).join(', ') || '—',
        total: currency.format(o.totalHarga),
        totalValue: o.totalHarga,
        status: o.status,
      }))}
    />
  );
}
