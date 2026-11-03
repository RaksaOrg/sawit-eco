import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenant } from '@/lib/auth';
import { hkValue, type AttendanceStatus } from '@/src/core/hris/kpi';
import { attendanceCorrectionSchema, attendanceCreateSchema } from '@sawit/contracts';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const tenant = await requireTenant(req);
  const dateParam = req.nextUrl.searchParams.get('date');
  const date = dateParam ? new Date(dateParam) : new Date();
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const records = await prisma.attendance.findMany({
    where: { tenantId: tenant.id, workDate: { gte: start, lt: end } },
    include: { user: { select: { nama: true, role: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({
    success: true,
    data: {
      records,
      summary: {
        present: records.filter((r) => r.status === 'PRESENT').length,
        halfDay: records.filter((r) => r.status === 'HALF_DAY').length,
        absent: records.filter((r) => r.status === 'ABSENT' || r.status === 'LEAVE').length,
        totalHk: Number(records.reduce((sum, r) => sum + r.hkValue, 0).toFixed(2)),
      },
    },
  });
}

export async function PATCH(req: NextRequest) {
  const tenant = await requireTenant(req);
  const parsed = attendanceCorrectionSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Alasan koreksi wajib diisi',
          details: parsed.error.flatten(),
        },
      },
      { status: 400 },
    );
  }
  const body = parsed.data;
  const existing = await prisma.attendance.findFirst({
    where: { id: body.id, tenantId: tenant.id },
  });
  if (!existing) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Presensi tidak ditemukan' } },
      { status: 404 },
    );
  }
  const status = body.status ?? (existing.status as AttendanceStatus);
  const updated = await prisma.attendance.update({
    where: { id: existing.id },
    data: {
      status,
      hkValue: hkValue(status as AttendanceStatus),
      notes: body.notes ?? existing.notes,
      verificationStatus: 'VERIFIED',
    },
  });
  await prisma.attendanceAudit.create({
    data: {
      tenantId: tenant.id,
      attendanceId: existing.id,
      action: 'CORRECTION',
      beforeJson: JSON.stringify({ status: existing.status, hkValue: existing.hkValue }),
      afterJson: JSON.stringify({ status: updated.status, hkValue: updated.hkValue }),
      reason: body.reason,
      actorId: body.actorId || 'system',
    },
  });
  return NextResponse.json({ success: true, data: updated });
}

export async function POST(req: NextRequest) {
  const tenant = await requireTenant(req);
  const parsed = attendanceCreateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Field wajib belum lengkap',
          details: parsed.error.flatten(),
        },
      },
      { status: 400 },
    );
  }
  const body = parsed.data;
  const blockCode = body.blockCode;
  const status = body.status;
  const user = await prisma.user.findFirst({
    where: { id: body.userId, tenantId: tenant.id },
    select: { id: true },
  });
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Karyawan tidak ditemukan' } },
      { status: 404 },
    );
  }

  const block = await prisma.block.findUnique({
    where: { tenantId_kode: { tenantId: tenant.id, kode: blockCode } },
    select: { id: true },
  });

  const record = await prisma.attendance.upsert({
    where: { idempotencyKey: body.idempotencyKey },
    update: {},
    create: {
      tenantId: tenant.id,
      userId: body.userId,
      blockId: block?.id,
      blokKode: blockCode,
      workDate: new Date(body.workDate),
      status,
      source: body.source,
      hkValue: hkValue(status, body.overtimeHours ?? 0),
      latitude: body.latitude,
      longitude: body.longitude,
      notes: body.notes,
      idempotencyKey: body.idempotencyKey,
    },
  });

  return NextResponse.json({ success: true, data: record }, { status: 201 });
}
