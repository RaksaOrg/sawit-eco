import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenant } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const tenant = await requireTenant(req);
  const category = req.nextUrl.searchParams.get('category');
  const products = await prisma.product.findMany({
    where: {
      tenantId: tenant.id,
      isActive: true,
      ...(category ? { kategori: category } : {}),
    },
    orderBy: [{ kategori: 'asc' }, { nama: 'asc' }],
  });
  return NextResponse.json({ success: true, data: { products } });
}
