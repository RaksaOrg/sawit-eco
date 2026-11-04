import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  const now = new Date();
  const workDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const attendance = await prisma.attendance.findFirst({
    where: { tenantId: auth.tenantId, userId: auth.userId, workDate },
    select: { checkInAt: true, checkOutAt: true },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({
    success: true,
    data: attendance ?? { checkInAt: null, checkOutAt: null },
  });
}
