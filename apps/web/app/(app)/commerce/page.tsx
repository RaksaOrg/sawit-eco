import { prisma } from '@/lib/prisma';
import { requireTenant } from '@/lib/auth';
import CommerceCatalog from './CommerceCatalog';

export const dynamic = 'force-dynamic';

export default async function CommercePage() {
  const tenant = await requireTenant();

  const [products, gaps, blocks] = await Promise.all([
    prisma.product.findMany({
      where: { tenantId: tenant.id },
      orderBy: [{ kategori: 'asc' }, { nama: 'asc' }],
    }),
    prisma.productGap.findMany({
      where: { tenantId: tenant.id, status: 'OPEN' },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.block.findMany({
      where: { tenantId: tenant.id },
      orderBy: { kode: 'asc' },
    }),
  ]);

  return (
    <CommerceCatalog
      tenantNama={tenant.nama}
      blocks={blocks.map((b) => ({
        kode: b.kode,
        luasHa: b.luasHa,
      }))}
      products={products.map((p) => ({
        id: p.id,
        sku: p.sku,
        nama: p.nama,
        kategori: p.kategori,
        harga: p.harga,
        satuan: p.satuan,
        stok: p.stok,
        isActive: p.isActive,
      }))}
      gaps={gaps.map((g) => ({
        id: g.id,
        targetSku: g.targetSku,
        alasan: g.alasan,
        status: g.status,
        createdAt: new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(g.createdAt),
      }))}
    />
  );
}
