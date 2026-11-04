import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, requireTenant } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { orderDecisionSchema, paymentProofSchema } from '@sawit/contracts';
import {
  decideOrder,
  recordPaymentProof,
  submitOrderFromCart,
} from '@/src/features/commerce/approval-service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const tenant = await requireTenant(req);
  const status = req.nextUrl.searchParams.get('status') || 'SUBMITTED';
  const orders = await prisma.order.findMany({
    where: { tenantId: tenant.id, status },
    include: {
      user: { select: { nama: true } },
      items: { select: { blokKode: true, alasanRekomendasi: true, kuantitas: true } },
    },
    orderBy: { createdAt: 'asc' },
    take: 50,
  });
  return NextResponse.json({ success: true, data: { orders } });
}

export async function POST(req: NextRequest) {
  const tenant = await requireTenant(req);
  const body = (await req.json()) as {
    action: 'submit' | 'mobile-checkout' | 'decide' | 'pay';
    items?: Array<{
      productId: string;
      quantity: number;
      blockCode: string;
      recommendationId?: string;
      recommendationReason?: string;
    }>;
    cartId?: string;
    userId?: string;
    orderId?: string;
    approverId?: string;
    approverRole?: string;
    decision?: 'APPROVED' | 'REJECTED';
    reason?: string;
    amount?: number;
    reference?: string;
    proofUrl?: string;
    estimateAcknowledged?: boolean;
  };

  try {
    if (body.action === 'submit') {
      const order = await submitOrderFromCart({
        tenantId: tenant.id,
        userId:
          body.userId ||
          (await getAuthContext(req))?.userId ||
          (await prisma.user.findFirst({ where: { tenantId: tenant.id }, select: { id: true } }))
            ?.id ||
          'system',
        cartId: body.cartId || '',
        estimateAcknowledged: Boolean(body.estimateAcknowledged),
      });
      return NextResponse.json({ success: true, data: order }, { status: 201 });
    }

    if (body.action === 'mobile-checkout') {
      if (!body.userId || !body.estimateAcknowledged || !body.items?.length) {
        return NextResponse.json(
          {
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'Checkout payload is incomplete' },
          },
          { status: 400 },
        );
      }
      const productIds = body.items.map((item) => item.productId);
      const products = await prisma.product.findMany({
        where: { tenantId: tenant.id, id: { in: productIds }, isActive: true },
      });
      if (products.length !== productIds.length) {
        return NextResponse.json(
          {
            success: false,
            error: { code: 'PRODUCT_NOT_FOUND', message: 'Produk tidak ditemukan' },
          },
          { status: 404 },
        );
      }
      const priceMap = new Map(products.map((product) => [product.id, product.harga]));
      const totalHarga = body.items.reduce(
        (sum, item) => sum + (priceMap.get(item.productId) || 0) * item.quantity,
        0,
      );
      const order = await prisma.order.create({
        data: {
          tenantId: tenant.id,
          userId: body.userId,
          status: 'SUBMITTED',
          approvalStatus: 'PENDING',
          paymentStatus: 'UNPAID',
          totalHarga,
          catatan: 'Mobile order',
          items: {
            create: body.items.map((item) => ({
              productId: item.productId,
              kuantitas: item.quantity,
              hargaSatuan: priceMap.get(item.productId) || 0,
              blokKode: item.blockCode,
              recommendationId: item.recommendationId,
              alasanRekomendasi: item.recommendationReason,
            })),
          },
        },
      });
      for (const item of body.items) {
        if (!item.recommendationId) continue;
        await prisma.recommendationLedger.create({
          data: {
            tenantId: tenant.id,
            agronomyLogId: item.recommendationId,
            orderId: order.id,
            stage: 'ORDER_SUBMITTED',
            metadata: JSON.stringify({ source: 'MOBILE' }),
          },
        });
      }
      return NextResponse.json({ success: true, data: order }, { status: 201 });
    }

    if (body.action === 'decide') {
      if (!body.approverId) {
        const auth = await getAuthContext(req);
        if (auth?.userId && auth.role === 'OWNER') {
          body.approverId = auth.userId;
        } else {
          const owner = await prisma.user.findFirst({
            where: { tenantId: tenant.id, role: { in: ['OWNER', 'MANAGER'] } },
            select: { id: true },
          });
          if (owner) body.approverId = owner.id;
        }
      }
      const parsed = orderDecisionSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Payload persetujuan tidak valid',
              details: parsed.error.flatten(),
            },
          },
          { status: 400 },
        );
      }
      const decision = parsed.data;
      const approver = await prisma.user.findFirst({
        where: {
          id: decision.approverId,
          tenantId: tenant.id,
          role: { in: ['OWNER', 'MANAGER'] },
        },
        select: { id: true, role: true },
      });
      if (!approver) {
        return NextResponse.json(
          { success: false, error: { code: 'FORBIDDEN', message: 'Tidak berwenang menyetujui' } },
          { status: 403 },
        );
      }
      const updated = await decideOrder({
        tenantId: tenant.id,
        orderId: decision.orderId,
        approverId: approver.id,
        approverRole: approver.role,
        decision: decision.decision,
        reason: decision.reason,
      });
      return NextResponse.json({ success: true, data: updated });
    }

    if (body.action === 'pay') {
      const parsed = paymentProofSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Payload pembayaran tidak valid',
              details: parsed.error.flatten(),
            },
          },
          { status: 400 },
        );
      }
      const payment = parsed.data;
      const paid = await recordPaymentProof({
        tenantId: tenant.id,
        orderId: payment.orderId,
        amount: payment.amount,
        reference: payment.reference,
        proofUrl: payment.proofUrl,
      });
      return NextResponse.json({ success: true, data: paid });
    }

    return NextResponse.json(
      { success: false, error: { code: 'INVALID_ACTION', message: 'Action tidak didukung' } },
      { status: 400 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal memproses pesanan';
    return NextResponse.json(
      { success: false, error: { code: 'COMMERCE_ERROR', message } },
      { status: 400 },
    );
  }
}
