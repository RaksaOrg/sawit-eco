
import crypto from 'crypto';

export const SESSION_COOKIE = 'sp_session';

export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 hari

export type SessionRole = 'OWNER' | 'MANDOR';

export type SessionPayload = {
  userId: string;
  tenantId: string;
  role: SessionRole;
  iat: number;
  exp: number;
  v: 1;
};

function secret() {
  const value = process.env.AUTH_SECRET;

  if (value) {
    if (Buffer.byteLength(value, 'utf8') < 32) {
      throw new Error('AUTH_SECRET must be at least 32 bytes');
    }

    return value;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('AUTH_SECRET is required in production');
  }

  return 'dev-only-insecure-secret-do-not-use-in-production';
}

function sign(payload: string) {
  return crypto
    .createHmac('sha256', secret())
    .update(payload)
    .digest('base64url');
}

export function createSession(input: {
  userId: string;
  tenantId: string;
  role: SessionRole;
}) {
  const now = Math.floor(Date.now() / 1000);

  const payload: SessionPayload = {
    ...input,
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
    v: 1,
  };

  const encoded = Buffer
    .from(JSON.stringify(payload))
    .toString('base64url');

  return `${encoded}.${sign(encoded)}`;
}

export function readSession(
  value: string | undefined
): SessionPayload | null {
  if (!value || value.length > 4096) return null;

  const idx = value.lastIndexOf('.');
  if (idx < 1) return null;

  const encoded = value.slice(0, idx);
  const signature = value.slice(idx + 1);

  let expected: Buffer;
  let actual: Buffer;

  try {
    expected = Buffer.from(sign(encoded), 'base64url');
    actual = Buffer.from(signature, 'base64url');
  } catch {
    return null;
  }

  if (
    actual.length !== expected.length ||
    !crypto.timingSafeEqual(actual, expected)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf8')
    ) as Partial<SessionPayload>;

    if (
      payload.v !== 1 ||
      typeof payload.userId !== 'string' ||
      !payload.userId ||
      typeof payload.tenantId !== 'string' ||
      !payload.tenantId ||
      (payload.role !== 'OWNER' && payload.role !== 'MANDOR') ||
      typeof payload.iat !== 'number' ||
      typeof payload.exp !== 'number'
    ) {
      return null;
    }

    const now = Math.floor(Date.now() / 1000);

    if (
      payload.exp <= now ||
      payload.iat > now + 60 ||
      payload.exp <= payload.iat ||
      payload.exp - payload.iat > SESSION_TTL_SECONDS
    ) {
      return null;
    }

    return payload as SessionPayload;
  } catch {
    return null;
  }
}

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');

  return `${salt}:${hash}`;
}

export function verifyPassword(
  password: string,
  stored: string | null
) {
  if (!stored || typeof password !== 'string') return false;

  try {
    const parts = stored.split(':');

    if (parts.length !== 2) return false;

    const [salt, hash] = parts;

    if (
      !/^[a-f0-9]{32}$/i.test(salt) ||
      !/^[a-f0-9]{128}$/i.test(hash)
    ) {
      return false;
    }

    const actual = crypto.scryptSync(password, salt, 64);
    const expected = Buffer.from(hash, 'hex');

    return crypto.timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export function sessionCookie() {
  return {
    name: SESSION_COOKIE,
    options: {
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: SESSION_TTL_SECONDS,
    },
  };
}
