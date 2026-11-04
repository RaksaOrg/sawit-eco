import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/auth';
import { resolveLivenessConfig, verifyLiveness } from '@/src/core/ai/liveness';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  await requireTenant(request);
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
  if (
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

  try {
    const frames = await Promise.all(
      (files as File[]).map(async (file) => ({
        mime: 'image/jpeg' as const,
        base64: Buffer.from(await file.arrayBuffer()).toString('base64'),
      })),
    );
    const result = await verifyLiveness(frames, challengeOrder, config);
    return NextResponse.json({ success: true, data: result });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: { code: 'LIVENESS_FAILED', message: 'Liveness verification failed' },
      },
      { status: 502 },
    );
  }
}
