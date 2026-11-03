import { prisma } from '@/lib/prisma';
import {
  evaluateAgronomyRecommendation,
  CatalogProductLookup,
  AgronomyRecommendationOutput,
  MANDATORY_AGRONOMY_DISCLAIMER,
} from '@/src/core/compliance/agronomy-guard';

export interface DiagnoseRequest {
  tenantId: string;
  userId: string;
  blockCode: string;
  symptoms: string;
  photoUrl?: string;
  targetSku: string;
  dosageKgPerHa: number;
  disclaimer: string;
  reason: string;
}

export interface DiagnoseResult {
  logId: string;
  recommendation: AgronomyRecommendationOutput;
  gapId?: string;
}

export async function processDiagnosisFlow(input: DiagnoseRequest): Promise<DiagnoseResult> {
  const block = await prisma.block.findUnique({
    where: {
      tenantId_kode: {
        tenantId: input.tenantId,
        kode: input.blockCode,
      },
    },
  });

  const luasHa = block?.luasHa ?? 1;

  const catalogProducts = await prisma.product.findMany({
    where: { tenantId: input.tenantId, isActive: true },
    select: {
      id: true,
      sku: true,
      nama: true,
      harga: true,
      satuan: true,
      ukuranKemasan: true,
      isActive: true,
    },
  });

  const recommendation = evaluateAgronomyRecommendation({
    sku: input.targetSku,
    catalog: catalogProducts as CatalogProductLookup[],
    luasHa,
    dosisKgPerHa: input.dosageKgPerHa,
    disclaimer: input.disclaimer,
    alasan: input.reason,
  });

  const agroLog = await prisma.agronomyLog.create({
    data: {
      tenantId: input.tenantId,
      blokKode: input.blockCode,
      gejala: input.symptoms,
      fotoUrl: input.photoUrl,
      diagnosa: `Diagnosa gejala: ${input.symptoms}`,
      risiko: 'TINGGI',
      rekomendasi: `${input.reason} | ${MANDATORY_AGRONOMY_DISCLAIMER}`,
    },
  });

  let gapId: string | undefined;

  if (recommendation.status === 'PRODUCT_GAP') {
    const gap = await prisma.productGap.create({
      data: {
        tenantId: input.tenantId,
        agronomyLogId: agroLog.id,
        targetSku: input.targetSku,
        alasan: recommendation.gapReason as string,
        status: 'OPEN',
      },
    });
    gapId = gap.id;
  }

  await prisma.recommendationLedger.create({
    data: {
      tenantId: input.tenantId,
      agronomyLogId: agroLog.id,
      stage: recommendation.status,
      metadata: JSON.stringify({
        sku: input.targetSku,
        status: recommendation.status,
      }),
    },
  });

  return {
    logId: agroLog.id,
    recommendation,
    gapId,
  };
}

export async function addToCartFromRecommendation(params: {
  tenantId: string;
  userId: string;
  productId: string;
  quantity: number;
  blockCode: string;
  recommendationId: string;
  recommendationReason: string;
}) {
  let cart = await prisma.cart.findFirst({
    where: { tenantId: params.tenantId, userId: params.userId, status: 'ACTIVE' },
  });

  if (!cart) {
    cart = await prisma.cart.create({
      data: {
        tenantId: params.tenantId,
        userId: params.userId,
        status: 'ACTIVE',
      },
    });
  }

  const item = await prisma.cartItem.create({
    data: {
      cartId: cart.id,
      productId: params.productId,
      kuantitas: params.quantity,
      blokKode: params.blockCode,
      recommendationId: params.recommendationId,
      alasanRekomendasi: params.recommendationReason,
    },
  });

  await prisma.recommendationLedger.create({
    data: {
      tenantId: params.tenantId,
      agronomyLogId: params.recommendationId,
      stage: 'CART_ADDED',
      metadata: JSON.stringify({ cartItemId: item.id, kuantitas: params.quantity }),
    },
  });

  return { cart, item };
}

export async function checkoutAndApproveOrder(params: {
  tenantId: string;
  userId: string;
  cartId: string;
  approverMandorId?: string;
}) {
  const cart = await prisma.cart.findUnique({
    where: { id: params.cartId },
    include: { items: { include: { product: true } } },
  });

  if (!cart || cart.items.length === 0) {
    throw new Error('Keranjang kosong atau tidak ditemukan');
  }

  const totalHarga = cart.items.reduce((sum, item) => sum + item.kuantitas * item.product.harga, 0);

  const order = await prisma.order.create({
    data: {
      tenantId: params.tenantId,
      userId: params.userId,
      cartId: cart.id,
      status: 'APPROVED',
      totalHarga,
      catatan: 'Auto checkout and approval from recommendation flow',
      items: {
        create: cart.items.map((it) => ({
          productId: it.productId,
          kuantitas: it.kuantitas,
          hargaSatuan: it.product.harga,
          blokKode: it.blokKode,
          recommendationId: it.recommendationId,
          alasanRekomendasi: it.alasanRekomendasi,
        })),
      },
    },
  });

  await prisma.cart.update({
    where: { id: cart.id },
    data: { status: 'ORDERED' },
  });

  const createdTasks = [];
  for (const item of cart.items) {
    const task = await prisma.fieldTask.create({
      data: {
        tenantId: params.tenantId,
        kodeTugas: `TASK-${Date.now().toString().slice(-6)}-${item.blokKode}`,
        blokKode: item.blokKode,
        aktivitas: `Aplikasi Sarana: ${item.product.nama}`,
        deskripsi: item.alasanRekomendasi || 'Aplikasi produk hasil rekomendasi agronomi',
        targetKuantitas: item.kuantitas,
        satuanTarget: item.product.satuanKemasan || 'Sak',
        tanggalTarget: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        prioritas: 'HIGH',
        status: 'ASSIGNED',
        mandorId: params.approverMandorId,
        agronomyLogId: item.recommendationId,
        orderId: order.id,
      },
    });
    createdTasks.push(task);

    if (item.recommendationId) {
      await prisma.recommendationLedger.create({
        data: {
          tenantId: params.tenantId,
          agronomyLogId: item.recommendationId,
          orderId: order.id,
          stage: 'TASK_CREATED',
          metadata: JSON.stringify({ taskId: task.id, orderId: order.id }),
        },
      });
    }
  }

  return { order, tasks: createdTasks };
}
