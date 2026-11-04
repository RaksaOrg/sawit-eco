import { NextRequest, NextResponse } from 'next/server';
import { getSessionTenantId, readSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { processDiagnosisFlow } from '@/src/features/commerce/closed-loop-service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const authorization = req.headers.get('authorization');
    const bearerSession = authorization?.startsWith('Bearer ')
      ? readSession(authorization.slice(7))
      : null;
    const cookieTenant = await getSessionTenantId();
    const tenantId = cookieTenant || bearerSession?.tenantId || req.headers.get('x-tenant-id');

    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHENTICATED', message: 'Tenant tidak valid' } },
        { status: 401 },
      );
    }

    const defaultUser = await prisma.user.findFirst({
      where: { tenantId },
      select: { id: true, nama: true },
    });

    const body = await req.json();
    const result = await processDiagnosisFlow({
      tenantId,
      userId: body.userId || defaultUser?.id || 'system-user',
      mandorNama: body.mandorNama || defaultUser?.nama || 'AI Agronomist',
      blockCode: body.blockCode,
      symptoms: body.symptoms,
      photoUrl: body.photoUrl,
      targetSku: body.targetSku,
      dosageKgPerHa: Number(body.dosageKgPerHa || 150),
      disclaimer:
        body.disclaimer || 'Sesuaikan dengan hasil analisa daun/tanah dan label resmi produk.',
      reason: body.reason || `Rekomendasi penanganan gejala: ${body.symptoms}`,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: errorMsg } },
      { status: 400 },
    );
  }
}
