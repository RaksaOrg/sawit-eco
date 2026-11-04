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
  mandorNama?: string;
  blockCode: string;
  symptoms: string;
  diagnosisText?: string;
  photoUrl?: string;
  targetSku: string;
  dosageKgPerHa: number;
  disclaimer: string;
  reason: string;
}

export interface DiagnoseResult {
  logId: string;
  recommendation: AgronomyRecommendationOutput & {
    card?: {
      sku: string;
      nama: string;
      alasan: string;
      kuantitas: number;
      satuan: string;
      estimasiTotalHarga: number;
      disclaimer: string;
    };
  };
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
      diagnosa: input.diagnosisText || `Diagnosa gejala: ${input.symptoms}`,
      risiko: 'TINGGI',
      rekomendasi: `${input.reason} | ${MANDATORY_AGRONOMY_DISCLAIMER}`,
      mandorNama: input.mandorNama || 'AI Agronomist',
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

  const card =
    recommendation.status === 'RECOMMENDED' && recommendation.product && recommendation.estimation
      ? {
          sku: recommendation.product.sku,
          nama: recommendation.product.nama,
          alasan: input.reason,
          kuantitas: recommendation.estimation.jumlahSak,
          satuan: recommendation.product.satuan,
          estimasiTotalHarga: recommendation.estimation.jumlahSak * recommendation.product.harga,
          disclaimer: recommendation.disclaimer,
        }
      : undefined;

  return {
    logId: agroLog.id,
    recommendation: {
      ...recommendation,
      card,
    },
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
        userId:
          params.userId && params.userId !== 'system' && params.userId !== 'system-user'
            ? params.userId
            : (
                await prisma.user.findFirst({
                  where: { tenantId: params.tenantId },
                  select: { id: true },
                })
              )?.id || params.userId,
        status: 'ACTIVE',
      },
    });
  }

  let validLogId: string | null = null;
  if (params.recommendationId && params.recommendationId.trim()) {
    const log = await prisma.agronomyLog.findFirst({
      where: { id: params.recommendationId.trim(), tenantId: params.tenantId },
      select: { id: true },
    });
    if (log) validLogId = log.id;
  }

  const item = await prisma.cartItem.create({
    data: {
      cartId: cart.id,
      productId: params.productId,
      kuantitas: params.quantity,
      blokKode: params.blockCode,
      recommendationId: validLogId,
      alasanRekomendasi: params.recommendationReason,
    },
  });

  if (validLogId) {
    await prisma.recommendationLedger.create({
      data: {
        tenantId: params.tenantId,
        agronomyLogId: validLogId,
        stage: 'CART_ADDED',
        metadata: JSON.stringify({ cartItemId: item.id, kuantitas: params.quantity }),
      },
    });
  }

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
      userId:
        params.userId && params.userId !== 'system' && params.userId !== 'system-user'
          ? params.userId
          : cart.userId,
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
        kodeTugas: `TASK-${Date.now().toString().slice(-6)}-${item.blokKode}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
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
