import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenant } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const tenant = await requireTenant(req);
  const modules = await prisma.learningModule.findMany({
    where: { tenantId: tenant.id },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json({ success: true, data: { modules } });
}

export async function POST(req: NextRequest) {
  try {
    const tenant = await requireTenant(req);
    const body = await req.json();

    const { judul, kategori, deskripsi, durasiMenit, konten, videoUrl } = body;

    if (!judul || !kategori || !deskripsi || !konten) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Semua field wajib diisi' },
        },
        { status: 400 },
      );
    }

    const created = await prisma.learningModule.create({
      data: {
        tenantId: tenant.id,
        judul: String(judul).trim(),
        kategori: String(kategori).trim(),
        deskripsi: String(deskripsi).trim(),
        durasiMenit: Number(durasiMenit) || 15,
        konten: String(konten).trim(),
        videoUrl: videoUrl ? String(videoUrl).trim() : null,
      },
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal membuat modul belajar';
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message } },
      { status: 500 },
    );
  }
}
