import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSession, sessionCookie, verifyPassword } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const email = String(form.get('email') || '')
    .trim()
    .toLowerCase();
  const password = String(form.get('password') || '');

  const tenant = email ? await prisma.tenant.findUnique({ where: { email } }) : null;
  if (!tenant || !verifyPassword(password, tenant.passwordHash)) {
    return NextResponse.json(
      { success: false, error: { code: 'INVALID_CREDENTIALS' } },
      { status: 401 },
    );
  }

  const owner = await prisma.user.findFirst({
    where: { tenantId: tenant.id, role: 'OWNER' },
    select: { id: true, role: true },
  });

  const res = NextResponse.json({ success: true });
  const c = sessionCookie();
  res.cookies.set(
    c.name,
    createSession({
      userId: owner?.id || 'owner-user',
      tenantId: tenant.id,
      role: 'OWNER',
    }),
    c.options,
  );
  return res;
}
