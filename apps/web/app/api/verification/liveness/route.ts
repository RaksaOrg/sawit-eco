import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { resolveLivenessConfig, verifyLiveness } from '@/src/core/ai/liveness';
import { getModelProvider, recordModelTrigger } from '@/lib/model-trigger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > 11_000_000) {
    return NextResponse.json(
      {
        success: false,
        error: { code: 'PAYLOAD_TOO_LARGE', message: 'Liveness payload is too large' },
      },
      { status: 413 },
    );
  }
  const form = await request.formData();
  const files = form.getAll('frames');
  const challengeOrder = form.get('challengeOrder');
  const attendanceAction = form.get('attendanceAction');
  if (
    (attendanceAction !== null &&
      attendanceAction !== 'CHECK_IN' &&
      attendanceAction !== 'CHECK_OUT') ||
    (challengeOrder !== 'right,left,blink' && challengeOrder !== 'left,right,blink') ||
    files.length !== 3 ||
    files.some(
      (file) =>
        !(file instanceof File) ||
        file.type !== 'image/jpeg' ||
        file.size === 0 ||
        file.size > 4_000_000,
    ) ||
    files.reduce((size, file) => size + (file instanceof File ? file.size : 0), 0) > 10_000_000
  ) {
    return NextResponse.json(
      { success: false, error: { code: 'INVALID_FRAMES', message: 'Invalid liveness frames' } },
      { status: 400 },
    );
  }

  const config = resolveLivenessConfig();
  if (!config) {
    return NextResponse.json(
      {
        success: false,
        error: { code: 'LIVENESS_UNAVAILABLE', message: 'Liveness verification is not configured' },
      },
      { status: 503 },
    );
  }

  const startedAt = Date.now();
  const traceId = request.headers.get('x-request-id') || randomUUID();
  let inferenceSucceeded = false;
  try {
    const frames = await Promise.all(
      (files as File[]).map(async (file) => ({
        mime: 'image/jpeg' as const,
        base64: Buffer.from(await file.arrayBuffer()).toString('base64'),
      })),
    );
    const result = await verifyLiveness(frames, challengeOrder, config);
    inferenceSucceeded = true;
    await recordModelTrigger({
      tenantId: auth.tenantId,
      traceId,
      route: '/api/verification/liveness',
      provider: getModelProvider(config.endpoint),
      model: config.model,
      operation: 'LIVENESS_VERIFICATION',
      status: 'SUCCEEDED',
      startedAt,
    });
    if (!result.isLive || !attendanceAction) {
      return NextResponse.json({ success: true, data: result });
    }

    const now = new Date();
    const workDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const dateKey = workDate.toISOString().slice(0, 10);
    const idempotencyKey = `self-${auth.userId}-${dateKey}-${attendanceAction}`;
    const attendance = await prisma.$transaction(async (tx) => {
      const current = await tx.attendance.findFirst({
        where: { tenantId: auth.tenantId, userId: auth.userId, workDate },
        orderBy: { createdAt: 'desc' },
      });

      if (attendanceAction === 'CHECK_IN') {
        if (current?.checkInIdempotencyKey === idempotencyKey) return current;
        if (current?.checkInAt) throw new Error('ALREADY_CHECKED_IN');
        const saved = current
          ? await tx.attendance.update({
              where: { id: current.id },
              data: {
                checkInAt: now,
                checkInIdempotencyKey: idempotencyKey,
                source: 'MOBILE_SELFIE',
              },
            })
          : await tx.attendance.create({
              data: {
                tenantId: auth.tenantId,
                userId: auth.userId,
                blokKode: '-',
                workDate,
                status: 'PRESENT',
                verificationStatus: 'VERIFIED',
                checkInAt: now,
                checkInIdempotencyKey: idempotencyKey,
                source: 'MOBILE_SELFIE',
                hkValue: 1,
                idempotencyKey: `${idempotencyKey}-attendance`,
              },
            });
        await tx.attendanceAudit.create({
          data: {
            tenantId: auth.tenantId,
            attendanceId: saved.id,
            action: 'CHECK_IN',
            afterJson: JSON.stringify({
              checkInAt: now.toISOString(),
              verification: 'LIVENESS_PASSED',
            }),
            reason: 'Selfie liveness verification passed',
            actorId: auth.userId,
          },
        });
        return saved;
      }

      if (!current?.checkInAt) throw new Error('CHECK_IN_REQUIRED');
      if (current.checkOutIdempotencyKey === idempotencyKey) return current;
      if (current.checkOutAt) throw new Error('ALREADY_CHECKED_OUT');
      const saved = await tx.attendance.update({
        where: { id: current.id },
        data: { checkOutAt: now, checkOutIdempotencyKey: idempotencyKey, source: 'MOBILE_SELFIE' },
      });
      await tx.attendanceAudit.create({
        data: {
          tenantId: auth.tenantId,
          attendanceId: saved.id,
          action: 'CHECK_OUT',
          beforeJson: JSON.stringify({ checkInAt: current.checkInAt.toISOString() }),
          afterJson: JSON.stringify({
            checkOutAt: now.toISOString(),
            verification: 'LIVENESS_PASSED',
          }),
          reason: 'Selfie liveness verification passed',
          actorId: auth.userId,
        },
      });
      return saved;
    });
    return NextResponse.json({
      success: true,
      data: {
        ...result,
        attendance: { checkInAt: attendance.checkInAt, checkOutAt: attendance.checkOutAt },
      },
    });
  } catch (error) {
    if (!inferenceSucceeded)
      await recordModelTrigger({
        tenantId: auth.tenantId,
        traceId,
        route: '/api/verification/liveness',
        provider: getModelProvider(config.endpoint),
        model: config.model,
        operation: 'LIVENESS_VERIFICATION',
        status: 'FAILED',
        startedAt,
        errorCode: error instanceof Error ? error.name : 'UNKNOWN_ERROR',
      });
    const message = error instanceof Error ? error.message : '';
    if (['ALREADY_CHECKED_IN', 'CHECK_IN_REQUIRED', 'ALREADY_CHECKED_OUT'].includes(message)) {
      return NextResponse.json(
        { success: false, error: { code: message, message: 'Attendance action is not valid now' } },
        { status: 409 },
      );
    }
    return NextResponse.json(
      {
        success: false,
        error: { code: 'LIVENESS_FAILED', message: 'Liveness verification failed' },
      },
      { status: 502 },
    );
  }
}
