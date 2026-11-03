import { NextRequest, NextResponse } from 'next/server';
import { sessionCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const res = NextResponse.redirect(new URL('/login', req.url));
  const c = sessionCookie();
  res.cookies.delete(c.name);
  return res;
}

export async function GET(req: NextRequest) {
  return POST(req);
}
