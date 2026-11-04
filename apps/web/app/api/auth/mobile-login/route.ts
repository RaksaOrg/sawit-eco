import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logServerError } from '@/lib/logger';
import { createSession, verifyPassword, type SessionRole } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type LoginRole = 'OWNER' | 'MANDOR';

function normalizeWhatsApp(value?: string): string {
  let number = (value ?? '').replace(/\D/g, '');

  if (number.startsWith('0')) {
    number = `62${number.slice(1)}`;
  } else if (number.startsWith('8')) {
    number = `62${number}`;
  }

  return number;
}

function invalidCredentials() {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid credentials',
      },
    },
    { status: 401 },
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      email?: string;
      waNumber?: string;
      password?: string;
      role?: LoginRole;
    };

    const role = body.role ?? 'OWNER';
    const password = body.password;

    if (!password || !['OWNER', 'MANDOR'].includes(role)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Password and valid role required',
          },
        },
        { status: 400 },
      );
    }

    let user;

    if (role === 'OWNER') {
      const email = body.email?.trim().toLowerCase();

      if (!email) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Email required for OWNER',
            },
          },
          { status: 400 },
        );
      }

      const tenant = await prisma.tenant.findUnique({
        where: { email },
      });

      if (!tenant) {
        return invalidCredentials();
      }

      user = await prisma.user.findFirst({
        where: {
          tenantId: tenant.id,
          role: 'OWNER',
        },
      });
    } else {
      const waNumber = normalizeWhatsApp(body.waNumber);

      if (!waNumber) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'WhatsApp number required for MANDOR',
            },
          },
          { status: 400 },
        );
      }

      user = await prisma.user.findFirst({
        where: {
          waNumber,
          role: 'MANDOR',
        },
      });
    }

    if (!user?.passwordHash) {
      return invalidCredentials();
    }

    const passwordValid = verifyPassword(password, user.passwordHash);

    if (!passwordValid) {
      return invalidCredentials();
    }

    // Resolve tenant from authenticated user.
    const tenant = await prisma.tenant.findUnique({
      where: { id: user.tenantId },
    });

    if (!tenant) {
      return invalidCredentials();
    }

    const token = createSession({
      userId: user.id,
      tenantId: tenant.id,
      role: user.role as SessionRole,
    });

    return NextResponse.json({
      success: true,
      data: {
        token,
        userId: user.id,
        userName: user.nama,
        tenantId: tenant.id,
        tenantName: tenant.nama,
        role: user.role,
        phone: user.waNumber,
      },
    });
  } catch (error) {
    logServerError('[LOGIN_ERROR]', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Something went wrong',
        },
      },
      { status: 500 },
    );
  }
}
