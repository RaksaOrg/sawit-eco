
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from './prisma';
import {
  SESSION_COOKIE,
  readSession,
} from './session';

export * from './session';

export async function getSession() {
  const cookieStore = await cookies();

  return readSession(
    cookieStore.get(SESSION_COOKIE)?.value
  );
}

export async function getSessionTenantId(): Promise<string | null> {
  const session = await getSession();
  return session?.tenantId ?? null;
}

export async function getAuthContext(req?: Request) {
  let session = await getSession();

  if (!session && req) {
    const authHeader = req.headers.get('authorization');

    if (authHeader?.startsWith('Bearer ')) {
      session = readSession(authHeader.slice(7));
    }
  }

  if (!session) return null;

  const user = await prisma.user.findFirst({
    where: {
      id: session.userId,
      tenantId: session.tenantId,
      role: session.role,
    },
    include: {
      tenant: true,
    },
  });

  if (!user) return null;

  return {
    user,
    tenant: user.tenant,
    userId: user.id,
    tenantId: user.tenantId,
    role: session.role,
  };
}

export async function requireAuth(req?: Request) {
  const auth = await getAuthContext(req);

  if (!auth) redirect('/login');

  return auth;
}

export async function requireRole(
  allowedRoles: Array<'OWNER' | 'MANDOR'>,
  req?: Request
) {
  const auth = await requireAuth(req);

  if (!allowedRoles.includes(auth.role)) {
    redirect('/forbidden');
  }

  return auth;
}

export async function requireTenant(req?: Request) {
  const auth = await getAuthContext(req);

  if (!auth) redirect('/login');

  return auth.tenant;
}