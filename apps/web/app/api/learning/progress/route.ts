import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenant } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const tenant = await requireTenant(req);
  const body = (await req.json()) as {
    userId?: string;
    moduleId?: string;
    isCompleted?: boolean;
  };

  if (!body.userId || !body.moduleId) {
    return NextResponse.json(
      {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'User dan modul wajib diisi' },
      },
      { status: 400 },
    );
  }

  const [user, module] = await Promise.all([
    prisma.user.findFirst({
      where: { id: body.userId, tenantId: tenant.id },
      select: { id: true },
    }),
    prisma.learningModule.findFirst({
      where: { id: body.moduleId, tenantId: tenant.id },
      select: { id: true },
    }),
  ]);

  if (!user || !module) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'User atau modul tidak ditemukan' } },
      { status: 404 },
    );
  }

  const progress = await prisma.userLearningProgress.upsert({
    where: { userId_moduleId: { userId: body.userId, moduleId: body.moduleId } },
    update: { isCompleted: Boolean(body.isCompleted) },
    create: {
      tenantId: tenant.id,
      userId: body.userId,
      moduleId: body.moduleId,
      isCompleted: Boolean(body.isCompleted),
    },
  });

  return NextResponse.json({ success: true, data: progress });
}

export async function GET(req: NextRequest) {
  const tenant = await requireTenant(req);
  const userId = req.nextUrl.searchParams.get('userId');
  const progress = await prisma.userLearningProgress.findMany({
    where: { tenantId: tenant.id, ...(userId ? { userId } : {}) },
    include: {
      user: { select: { nama: true, role: true } },
      module: { select: { judul: true, kategori: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });
  return NextResponse.json({ success: true, data: progress });
}
