import { NextRequest, NextResponse } from 'next/server';
import { getSessionTenantId } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  addToCartFromRecommendation,
  checkoutAndApproveOrder,
} from '@/src/features/commerce/closed-loop-service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const tenantId = (await getSessionTenantId()) || req.headers.get('x-tenant-id');
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHENTICATED', message: 'Unauthorized' } },
        { status: 401 },
      );
    }

    const defaultUser = await prisma.user.findFirst({
      where: { tenantId },
      select: { id: true },
    });

    const body = await req.json();
    const userId = body.userId || defaultUser?.id || 'system-user';

    if (body.action === 'add-to-cart') {
      const res = await addToCartFromRecommendation({
        tenantId,
        userId,
        productId: body.productId,
        quantity: Number(body.quantity) || 1,
        blockCode: body.blockCode || 'ALL',
        recommendationId: body.recommendationId,
        recommendationReason: body.recommendationReason,
      });
      return NextResponse.json({ success: true, data: res });
    }

    if (body.action === 'checkout') {
      const res = await checkoutAndApproveOrder({
        tenantId,
        userId,
        cartId: body.cartId,
        approverMandorId: body.approverUserId,
      });
      return NextResponse.json({ success: true, data: res });
    }

    return NextResponse.json(
      { success: false, error: { code: 'INVALID_ACTION', message: 'Action tidak valid' } },
      { status: 400 },
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Error';
    return NextResponse.json(
      { success: false, error: { code: 'SYSTEM_ERROR', message: errorMsg } },
      { status: 500 },
    );
  }
}
