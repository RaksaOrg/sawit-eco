import { prisma } from '@/lib/prisma';
import { canApproveOrder } from '@/src/core/auth/rbac';

export class CommerceError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'CommerceError';
  }
}

export interface SubmitOrderInput {
  tenantId: string;
  userId: string;
  cartId: string;
  estimateAcknowledged: boolean;
}

export async function submitOrderFromCart(input: SubmitOrderInput) {
  if (!input.estimateAcknowledged) {
    throw new CommerceError(
      'ESTIMATE_NOT_ACKNOWLEDGED',
      'Estimasi kebutuhan wajib dikonfirmasi sebelum checkout',
    );
  }

  const cart = await prisma.cart.findUnique({
    where: { id: input.cartId },
    include: { items: { include: { product: true } } },
  });

  if (!cart || cart.tenantId !== input.tenantId || cart.items.length === 0) {
    throw new CommerceError('CART_EMPTY', 'Keranjang kosong atau tidak ditemukan');
  }

  const totalHarga = cart.items.reduce((sum, item) => sum + item.kuantitas * item.product.harga, 0);

  const order = await prisma.order.create({
    data: {
      tenantId: input.tenantId,
      userId: input.userId && input.userId !== 'system' ? input.userId : cart.userId,
      cartId: cart.id,
      status: 'SUBMITTED',
      approvalStatus: 'PENDING',
      paymentStatus: 'UNPAID',
      totalHarga,
      items: {
        create: cart.items.map((item) => ({
          productId: item.productId,
          kuantitas: item.kuantitas,
          hargaSatuan: item.product.harga,
          blokKode: item.blokKode,
          recommendationId: item.recommendationId,
          alasanRekomendasi: item.alasanRekomendasi,
        })),
      },
    },
    include: { items: true },
  });

  await prisma.cart.update({ where: { id: cart.id }, data: { status: 'ORDERED' } });

  for (const item of cart.items) {
    if (!item.recommendationId) continue;
    await prisma.recommendationLedger.create({
      data: {
        tenantId: input.tenantId,
        agronomyLogId: item.recommendationId,
        orderId: order.id,
        stage: 'ORDER_SUBMITTED',
        metadata: JSON.stringify({ orderId: order.id }),
      },
    });
  }

  return order;
}

export async function decideOrder(input: {
  tenantId: string;
  orderId: string;
  approverId: string;
  approverRole: string;
  decision: 'APPROVED' | 'REJECTED';
  reason?: string;
}) {
  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
    include: { items: { include: { product: true } } },
  });

  if (!order || order.tenantId !== input.tenantId) {
    throw new CommerceError('ORDER_NOT_FOUND', 'Pesanan tidak ditemukan');
  }
  if (order.approvalStatus === 'APPROVED' || order.approvalStatus === 'REJECTED') {
    throw new CommerceError('ALREADY_DECIDED', 'Pesanan sudah diputuskan');
  }
  if (input.decision === 'APPROVED' && !canApproveOrder(input.approverRole, order.totalHarga)) {
    throw new CommerceError('APPROVAL_LIMIT_EXCEEDED', 'Limit persetujuan terlampaui');
  }

  if (input.decision === 'REJECTED') {
    return prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'REJECTED',
        approvalStatus: 'REJECTED',
        catatan: input.reason || order.catatan,
      },
    });
  }

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: {
      status: 'APPROVED',
      approvalStatus: 'APPROVED',
      approvedById: input.approverId,
    },
  });

  for (const item of order.items) {
    const task = await prisma.fieldTask.create({
      data: {
        tenantId: input.tenantId,
        kodeTugas: `TASK-${Date.now().toString().slice(-6)}-${item.blokKode}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        blokKode: item.blokKode,
        aktivitas: `Aplikasi Sarana: ${item.product.nama}`,
        deskripsi: item.alasanRekomendasi || 'Aplikasi produk hasil rekomendasi agronomi',
        targetKuantitas: item.kuantitas,
        satuanTarget: item.product.satuanKemasan || 'Sak',
        tanggalTarget: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        prioritas: 'HIGH',
        status: 'ASSIGNED',
        agronomyLogId: item.recommendationId,
        orderId: order.id,
      },
    });

    if (item.recommendationId) {
      await prisma.recommendationLedger.create({
        data: {
          tenantId: input.tenantId,
          agronomyLogId: item.recommendationId,
          orderId: order.id,
          stage: 'TASK_CREATED',
          metadata: JSON.stringify({ taskId: task.id }),
        },
      });
    }
  }

  return updated;
}

export async function recordPaymentProof(input: {
  tenantId: string;
  orderId: string;
  amount: number;
  reference: string;
  proofUrl?: string;
}) {
  const order = await prisma.order.findUnique({ where: { id: input.orderId } });
  if (!order || order.tenantId !== input.tenantId) {
    throw new CommerceError('ORDER_NOT_FOUND', 'Pesanan tidak ditemukan');
  }
  if (order.approvalStatus !== 'APPROVED') {
    throw new CommerceError('NOT_APPROVED', 'Pesanan belum disetujui');
  }
  if (Number(input.amount.toFixed(2)) !== Number(order.totalHarga.toFixed(2))) {
    throw new CommerceError('AMOUNT_MISMATCH', 'Nominal pembayaran tidak sesuai total pesanan');
  }

  return prisma.order.update({
    where: { id: order.id },
    data: {
      paymentStatus: 'PAID',
      status: 'PAID',
      paidAt: new Date(),
      catatan: input.proofUrl ? `${order.catatan || ''} | proof:${input.proofUrl}` : order.catatan,
    },
  });
}
