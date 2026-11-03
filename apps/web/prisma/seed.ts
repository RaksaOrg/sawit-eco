/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

const PASSWORD = 'owner123';

type TenantSeed = {
  slug: string;
  nama: string;
  lokasi: string;
  luasHa: number;
  email: string;
  blocks: { kode: string; luasHa: number; tahunTanam: number }[];
  mandors: { nama: string; waNumber: string }[];
};

const tenants: TenantSeed[] = [
  {
    slug: 'sawit-lestari',
    nama: 'PT Sawit Lestari Jaya',
    lokasi: 'Kotawaringin Timur, Kalimantan Tengah',
    luasHa: 480,
    email: 'owner@sawitlestari.co.id',
    blocks: [
      { kode: 'A1', luasHa: 25, tahunTanam: 2014 },
      { kode: 'A2', luasHa: 28, tahunTanam: 2015 },
      { kode: 'B1', luasHa: 32, tahunTanam: 2016 },
      { kode: 'B2', luasHa: 30, tahunTanam: 2017 },
      { kode: 'C1', luasHa: 27, tahunTanam: 2018 },
      { kode: 'C2', luasHa: 26, tahunTanam: 2019 },
    ],
    mandors: [
      { nama: 'Budi Santoso', waNumber: '6281200000001' },
      { nama: 'Joko Prasetyo', waNumber: '6281200000002' },
      { nama: 'Siti Aminah', waNumber: '6281200000003' },
    ],
  },
  {
    slug: 'green-palm',
    nama: 'PT Green Palm Nusantara',
    lokasi: 'Kampar, Riau',
    luasHa: 360,
    email: 'owner@greenpalm.co.id',
    blocks: [
      { kode: 'D1', luasHa: 30, tahunTanam: 2013 },
      { kode: 'D2', luasHa: 29, tahunTanam: 2015 },
      { kode: 'E1', luasHa: 34, tahunTanam: 2016 },
      { kode: 'E2', luasHa: 31, tahunTanam: 2018 },
      { kode: 'F1', luasHa: 28, tahunTanam: 2020 },
    ],
    mandors: [
      { nama: 'Agus Salim', waNumber: '6281200000011' },
      { nama: 'Rina Wati', waNumber: '6281200000012' },
    ],
  },
];

const aktivitasList = ['Panen', 'Panen', 'Panen', 'Pemupukan', 'Perawatan'];
const risikoList = ['RENDAH', 'SEDANG', 'TINGGI'] as const;

const agronomySamples = [
  {
    gejala: 'Daun muda kuning pucat, pelepah menggulung',
    diagnosa:
      'Gejala: Daun muda menguning, pertumbuhan kerdil.\nDiagnosa: Defisiensi boron/nitrogen ringan.\nRisiko: SEDANG\nTindakan Hari Ini: Cek drainase dan pH tanah, ambil sampel daun.\nTindakan 7-14 Hari: Pemupukan sesuai hasil analisa tanah.\nMonitoring: Amati daun baru 2 minggu.',
    risiko: 'SEDANG',
  },
  {
    gejala: 'Bercak coklat melingkar dengan halo kuning di daun',
    diagnosa:
      'Gejala: Bercak coklat konsentris.\nDiagnosa: Curvularia / bercak daun.\nRisiko: TINGGI\nTindakan Hari Ini: Pangkas daun terinfeksi, sanitasi gulma.\nTindakan 7-14 Hari: Aplikasi fungisida sesuai label.\nMonitoring: Cek penyebaran tiap 3 hari.',
    risiko: 'TINGGI',
  },
  {
    gejala: 'Ulat menempel di pelepah, daun berlubang',
    diagnosa:
      'Gejala: Daun berlubang, ditemukan ulat.\nDiagnosa: Serangan ulat api ringan.\nRisiko: RENDAH\nTindakan Hari Ini: Pengamatan manual, ambil telur/ulat.\nTindakan 7-14 Hari: PHT, predator alami.\nMonitoring: Hitung populasi per pelepah.',
    risiko: 'RENDAH',
  },
];

async function main() {
  if (process.env.NODE_ENV === 'production' && process.env.SEED_ALLOW_RESET !== '1') {
    throw new Error('Seed bersifat reset data. Set SEED_ALLOW_RESET=1 untuk jalan di production.');
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await prisma.recommendationLedger.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.attendanceAudit.deleteMany();
  await prisma.dailyReport.deleteMany();
  await prisma.fieldTask.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.userLearningProgress.deleteMany();
  await prisma.team.deleteMany();
  await prisma.user.deleteMany();

  await prisma.productGap.deleteMany();
  await prisma.product.deleteMany();
  await prisma.agronomyLog.deleteMany();
  await prisma.learningModule.deleteMany();
  await prisma.block.deleteMany();
  await prisma.priceBook.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.priceAnomaly.deleteMany();
  await prisma.pdpAuditLog.deleteMany();
  await prisma.agentRun.deleteMany();
  await prisma.productivitySnapshot.deleteMany();

  await prisma.tenant.deleteMany();

  for (const t of tenants) {
    const tenant = await prisma.tenant.create({
      data: {
        nama: t.nama,
        lokasi: t.lokasi,
        luasHa: t.luasHa,
        email: t.email,
        passwordHash: hashPassword(PASSWORD),
      },
    });
    await prisma.block.createMany({
      data: t.blocks.map((b) => ({ ...b, tenantId: tenant.id })),
    });

    // Create OWNER user with password hash
    const ownerHash = hashPassword(PASSWORD);

    await prisma.user.create({
      data: {
        tenantId: tenant.id,
        nama: `Owner ${t.nama}`,
        waNumber: `62812999${t.slug === 'sawit-lestari' ? '0001' : '0002'}`,
        role: 'OWNER',
        passwordHash: ownerHash,
      },
    });

    const mandorUsers = [];
    const mandorPassword = 'mandor123';
    for (const m of t.mandors) {
      const mandorHash = hashPassword(mandorPassword);
      mandorUsers.push(
        await prisma.user.create({
          data: { 
            ...m, 
            tenantId: tenant.id, 
            role: 'MANDOR',
            passwordHash: mandorHash,
          },
        }),
      );
    }

    const reports = [];
    for (let day = 0; day < 14; day++) {
      const tanggal = new Date(today);
      tanggal.setDate(tanggal.getDate() - day);
      tanggal.setHours(8, 0, 0, 0);

      for (let i = 0; i < mandorUsers.length; i++) {
        const mandor = mandorUsers[i];
        const block = t.blocks[(day + i) % t.blocks.length];
        const aktivitas = aktivitasList[(day + i) % aktivitasList.length];
        const hadir = 6 + ((day * 3 + i * 2) % 7);
        const produktivitas = aktivitas === 'Panen' ? 150 + ((day * 7 + i * 13) % 70) : 0;
        const produksiKg = Math.round(hadir * produktivitas);

        reports.push({
          tenantId: tenant.id,
          userId: mandor.id,
          blokKode: block.kode,
          mandorNama: mandor.nama,
          aktivitas,
          hadir: aktivitas === 'Panen' ? hadir : Math.max(3, hadir - 2),
          produksiKg,
          luasHa: block.luasHa,
          status: 'Selesai',
          produktivitas,
          rawMessage: `lapor ${block.kode} ${mandor.nama} ${hadir} orang ${produksiKg / 1000} ton ${aktivitas.toLowerCase()} selesai`,
          waMessageId: `seed-${t.slug}-${i}-${day}`,
          tanggal,
        });
      }
    }
    await prisma.dailyReport.createMany({ data: reports });


    await prisma.agronomyLog.createMany({
      data: agronomySamples.map((s, idx) => {
        const block = t.blocks[idx % t.blocks.length];
        const createdAt = new Date(today);
        createdAt.setDate(createdAt.getDate() - idx);
        createdAt.setHours(9 + idx, 15, 0, 0);
        return {
          tenantId: tenant.id,
          blokKode: block.kode,
          fotoUrl: null,
          gejala: s.gejala,
          diagnosa: s.diagnosa,
          risiko: s.risiko,
          rekomendasi: s.diagnosa,
          mandorNama: t.mandors[idx % t.mandors.length].nama,
          waMessageId: `seed-agro-${t.slug}-${idx}`,
          createdAt,
        };
      }),
    });

    // Seed Products & Catalog for Closed-Loop
    const productKcl = await prisma.product.create({
      data: {
        tenantId: tenant.id,
        sku: 'FERT-KCL-25',
        nama: 'Pupuk KCl Mahkota 50kg',
        kategori: 'Pupuk',
        harga: 533333,
        satuan: 'Sak',
        ukuranKemasan: 50,
        satuanKemasan: 'Kg',
        stok: 120,
        isActive: true,
        registrationNo: 'KEMTAN-RI-01022020',
        activeIngredient: 'Kalium K2O 60%',
        regulatoryStatus: 'VALID',
        restricted: false,
      },
    });

    const productUrea = await prisma.product.create({
      data: {
        tenantId: tenant.id,
        sku: 'FERT-UREA-50',
        nama: 'Pupuk Urea Petro 50kg',
        kategori: 'Pupuk',
        harga: 420000,
        satuan: 'Sak',
        ukuranKemasan: 50,
        satuanKemasan: 'Kg',
        stok: 85,
        isActive: true,
        registrationNo: 'KEMTAN-RI-01022019',
        activeIngredient: 'Nitrogen 46%',
        regulatoryStatus: 'VALID',
        restricted: false,
      },
    });

    // Seed Suppliers
    const supplier = await prisma.supplier.create({
      data: {
        tenantId: tenant.id,
        maskedSupplierName: 'PT Agro Sarana Prima (Alias)',
        alias: 'SUPPLIER_001',
        contactMasked: '+62*******8899',
        leadTimeDays: 3,
        status: 'ACTIVE',
      },
    });

    // Seed PriceBook
    await prisma.priceBook.createMany({
      data: [
        {
          tenantId: tenant.id,
          sku: productKcl.sku,
          supplierId: supplier.id,
          price: 533333,
          currency: 'IDR',
        },
        {
          tenantId: tenant.id,
          sku: productUrea.sku,
          supplierId: supplier.id,
          price: 420000,
          currency: 'IDR',
        },
      ],
    });

    // Seed Price Anomaly (>20% spike from tengkulak alert)
    await prisma.priceAnomaly.createMany({
      data: [
        {
          tenantId: tenant.id,
          sku: productKcl.sku,
          quotedPrice: 720000,
          medianPrice: 533333,
          deviationPercentage: 35.0,
          severity: 'HIGH',
          reasoningSummary:
            'Lonjakan harga 35% lebih mahal dibanding median regional Rp 533.333 dari penawaran tengkulak lokal.',
        },
        {
          tenantId: tenant.id,
          sku: productUrea.sku,
          quotedPrice: 520000,
          medianPrice: 420000,
          deviationPercentage: 23.8,
          severity: 'MEDIUM',
          reasoningSummary:
            'Lonjakan harga 23.8% lebih mahal dibanding median regional Rp 420.000.',
        },
      ],
    });

    // Seed PDP Audit Logs (UU PDP Proof)
    await prisma.pdpAuditLog.createMany({
      data: [
        {
          tenantId: tenant.id,
          traceId: `trace-pdp-${t.slug}-001`,
          actorId: mandorUsers[0].id,
          action: 'MASK_PII',
          dataSubjectRef: 'SUPPLIER_001',
          fieldsMasked: 'phone,name,address',
          purpose: 'MULTI_AGENT_PIPELINE_INGESTION',
          modelEndpoint: 'https://api.baseten.co/v1/models/llama-3-3-70b/predict',
        },
        {
          tenantId: tenant.id,
          traceId: `trace-pdp-${t.slug}-002`,
          actorId: mandorUsers[1]?.id || mandorUsers[0].id,
          action: 'MASK_PII',
          dataSubjectRef: 'PEKERJA_001',
          fieldsMasked: 'phone,name',
          purpose: 'WHATSAPP_INGESTION',
          modelEndpoint: 'LOCAL_FALLBACK',
        },
      ],
    });

    // Seed Learning Modules
    await prisma.learningModule.createMany({
      data: [
        {
          tenantId: tenant.id,
          judul: 'Identifikasi Defisiensi Kalium pada Kelapa Sawit',
          kategori: 'Pemupukan',
          deskripsi:
            'Gejala tepi daun tua mengering, bercak oranye/klorosis, dan cara pemupukan MOP/KCl.',
          durasiMenit: 3,
          konten:
            'Gejala defisiensi kalium (K) ditandai dengan bintik oranye transparan pada helaian daun tua yang kemudian menyatu dan mengering dari tepi ke tengah. Lakukan penaburan KCl 1.5-2.0 kg/pokok pada piringan bersih.',
        },
        {
          tenantId: tenant.id,
          judul: 'SOP K3 Penanganan Bahan Kimia & APD Perkebunan',
          kategori: 'K3',
          deskripsi: 'Standar perlindungan diri sebelum aplikasi pestisida atau herbisida di blok.',
          durasiMenit: 5,
          konten:
            'Wajib gunakan sarung tangan nitril, masker respirator, kacamata pelindung, dan sepatu boot sebelum mencampur bahan kimia. Dilarang merokok atau makan selama aplikasi.',
        },
      ],
    });

    // Seed Pending Orders for Approval flow
    const sampleOrder = await prisma.order.create({
      data: {
        tenantId: tenant.id,
        userId: mandorUsers[0].id,
        status: 'SUBMITTED',
        approvalStatus: 'PENDING',
        paymentStatus: 'UNPAID',
        totalHarga: 6400000,
        catatan: 'Permohonan 12 sak KCl untuk penanganan defisiensi K di Blok B2',
        items: {
          create: [
            {
              productId: productKcl.id,
              kuantitas: 12,
              hargaSatuan: productKcl.harga,
              blokKode: 'B2',
              alasanRekomendasi: 'Rekomendasi indikasi defisiensi kalium Blok B2',
            },
          ],
        },
      },
    });

    console.log(
      `✓ ${t.nama}: ${t.blocks.length} blok, ${mandorUsers.length} mandor, ${reports.length} laporan, Order ${sampleOrder.id.slice(0, 8)}`,
    );
    console.log(`  Login: ${t.email} / ${PASSWORD}`);
  }

  console.log('\nSeed selesai. Risiko contoh:', risikoList.join(', '));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
