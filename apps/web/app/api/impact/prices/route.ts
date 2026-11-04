import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireTenant } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const observationSchema = z.object({
  commodity: z.string().trim().min(1).max(80),
  unit: z.string().trim().min(1).max(30),
  beforePrice: z.number().positive().finite(),
  afterPrice: z.number().positive().finite(),
  source: z.string().trim().min(1).max(160),
  observedAt: z.string().datetime().optional(),
});

export async function POST(request: NextRequest) {
  const tenant = await requireTenant(request);
  const parsed = observationSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', details: parsed.error.flatten() } },
      { status: 400 },
    );
  }

  const observation = await prisma.pilotPriceObservation.create({
    data: {
      tenantId: tenant.id,
      ...parsed.data,
      observedAt: parsed.data.observedAt ? new Date(parsed.data.observedAt) : undefined,
    },
  });

  return NextResponse.json({ success: true, data: observation }, { status: 201 });
}
