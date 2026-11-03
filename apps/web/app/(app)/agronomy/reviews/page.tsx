import { prisma } from '@/lib/prisma';
import { requireTenant } from '@/lib/auth';
import FioriAgronomyList from '../FioriAgronomyList';

export const dynamic = 'force-dynamic';

export default async function ReviewsPage() {
  const tenant = await requireTenant();
  const [logs, blocks, products] = await Promise.all([
    prisma.agronomyLog.findMany({
      where: { tenantId: tenant.id, risiko: { in: ['TINGGI', 'KRITIS'] } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.block.findMany({
      where: { tenantId: tenant.id },
      orderBy: { kode: 'asc' },
    }),
    prisma.product.findMany({
      where: { tenantId: tenant.id, isActive: true },
      orderBy: { nama: 'asc' },
    }),
  ]);

  return (
    <FioriAgronomyList
      tenantNama={tenant.nama}
      items={logs.map((log) => ({
        id: log.id,
        blokKode: log.blokKode,
        mandorNama: log.mandorNama || '—',
        risiko: log.risiko,
        gejala: log.gejala || null,
        diagnosa: log.diagnosa,
        rekomendasi: log.rekomendasi,
        fotoUrl: log.fotoUrl || null,
        createdAt: log.createdAt.toLocaleDateString('id-ID'),
      }))}
      blocks={blocks.map((b) => ({
        kode: b.kode,
        luasHa: b.luasHa,
        tahunTanam: b.tahunTanam,
      }))}
      products={products.map((p) => ({
        id: p.id,
        sku: p.sku,
        nama: p.nama,
        kategori: p.kategori,
        harga: p.harga,
        satuan: p.satuan,
        ukuranKemasan: p.ukuranKemasan,
      }))}
    />
  );
}
