import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenant } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const tenant = await requireTenant(req);
    const employees = await prisma.user.findMany({
      where: { tenantId: tenant.id },
      include: { team: true },
      orderBy: { nama: 'asc' },
    });
    return NextResponse.json({ success: true, data: employees });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal mengambil data karyawan';
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message } },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenant = await requireTenant(req);
    const body = await req.json();

    const { nama, waNumber, role, teamName } = body;

    if (!nama || !waNumber || !role) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Nama, WhatsApp, dan peran wajib diisi' },
        },
        { status: 400 },
      );
    }

    // Format WhatsApp number to e.g. 628xxx
    const cleanWa = String(waNumber).replace(/[^0-9]/g, '');
    const formattedWa = cleanWa.startsWith('0') ? `62${cleanWa.slice(1)}` : cleanWa;

    // Check if waNumber already exists
    const existing = await prisma.user.findUnique({
      where: { waNumber: formattedWa },
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'DUPLICATE_WA', message: 'Nomor WhatsApp sudah terdaftar' },
        },
        { status: 400 },
      );
    }

    let teamId: string | undefined;
    if (teamName && String(teamName).trim()) {
      const existingTeam = await prisma.team.findFirst({
        where: { tenantId: tenant.id, nama: String(teamName).trim() },
      });
      if (existingTeam) {
        teamId = existingTeam.id;
      } else {
        const newTeam = await prisma.team.create({
          data: {
            tenantId: tenant.id,
            nama: String(teamName).trim(),
          },
        });
        teamId = newTeam.id;
      }
    }

    const newUser = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        nama: String(nama).trim(),
        waNumber: formattedWa,
        role: String(role).trim().toUpperCase(),
        teamId,
      },
      include: { team: true },
    });

    return NextResponse.json({ success: true, data: newUser }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal menambahkan karyawan';
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message } },
      { status: 500 },
    );
  }
}
