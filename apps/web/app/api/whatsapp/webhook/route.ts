import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';
import { logServerError } from '@/lib/logger';
import { downloadMedia, sendWhatsApp } from '@/lib/whatsapp';
import { runAgent } from '@/lib/agent';
import { maskPii } from '@/src/core/privacy/pdp-guard';
import { transcribeAudio } from '@/lib/transcribe';

function isValidSignature(raw: string, signature: string | null) {
  const secret = process.env.WA_APP_SECRET;
  if (!secret) return true;
  if (!signature) return false;
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(raw).digest('hex');
  return (
    expected.length === signature.length &&
    crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  );
}

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  if (p.get('hub.verify_token') === process.env.WA_VERIFY_TOKEN) {
    return new NextResponse(p.get('hub.challenge'), { status: 200 });
  }
  return new NextResponse('Forbidden', { status: 403 });
}

export async function POST(req: NextRequest) {
  try {
    const raw = await req.text();
    if (!isValidSignature(raw, req.headers.get('x-hub-signature-256'))) {
      return new NextResponse('Invalid signature', { status: 403 });
    }

    const body = JSON.parse(raw);
    const msgObj = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (!msgObj) return NextResponse.json({ ok: true });

    const from = msgObj.from as string;
    const waId = msgObj.id as string;
    const msgType = msgObj.type as string;
    let text =
      msgType === 'image'
        ? (msgObj.image?.caption as string) || ''
        : (msgObj.text?.body as string) || '';
    const imageId = msgType === 'image' ? (msgObj.image?.id as string) : undefined;

    if (!from || (!text && !imageId)) return NextResponse.json({ ok: true });

    const user = await prisma.user.findUnique({
      where: { waNumber: from },
      include: { tenant: true },
    });
    if (!user) {
      await sendWhatsApp(
        from,
        'Nomor Anda belum terdaftar di Sawit Ecosystem. Hubungi admin kebun.',
      );
      return NextResponse.json({ ok: true });
    }

    const exist = await prisma.dailyReport.findUnique({
      where: { waMessageId: waId },
    });
    if (exist) return NextResponse.json({ ok: true });
    if (imageId) {
      const logged = await prisma.agronomyLog.findUnique({
        where: { waMessageId: waId },
      });
      if (logged) return NextResponse.json({ ok: true });
    }

    if (msgType === 'audio') {
      const audioId = msgObj.audio?.id as string | undefined;
      if (!audioId) return NextResponse.json({ ok: true });
      try {
        const media = await downloadMedia(audioId);
        const transcript = await transcribeAudio(media.buffer, media.mime);
        if (!transcript) {
          await sendWhatsApp(
            from,
            'Voice note diterima, namun transkripsi sedang tidak tersedia. Mohon kirim ulang sebagai teks singkat.',
          );
          return NextResponse.json({ ok: true });
        }
        text = transcript;
      } catch {
        await sendWhatsApp(from, 'Voice note gagal diproses. Mohon kirim sebagai teks.');
        return NextResponse.json({ ok: true });
      }
    }

    const masked = maskPii(text);
    const safeText = masked.text;

    await prisma.pdpAuditLog.create({
      data: {
        tenantId: user.tenantId,
        traceId: waId,
        actorId: user.id,
        action: 'MASK_PII',
        dataSubjectRef: `WA_${user.id.slice(0, 8)}`,
        fieldsMasked: masked.fieldsMasked.join(','),
        purpose: 'WHATSAPP_INGESTION',
        modelEndpoint: process.env.META_INFERENCE_ENDPOINT || 'LOCAL_FALLBACK',
      },
    });

    const [blocks, mandors] = await Promise.all([
      prisma.block.findMany({
        where: { tenantId: user.tenantId },
        orderBy: { kode: 'asc' },
      }),
      prisma.user.findMany({
        where: { tenantId: user.tenantId, role: 'MANDOR' },
        select: { nama: true },
      }),
    ]);

    const tenant = {
      ...user.tenant,
      blocks:
        blocks.map((b) => `${b.kode}:${b.luasHa}Ha-TT${b.tahunTanam}`).join(', ') || undefined,
      mandors: mandors.map((m) => m.nama).join(', ') || undefined,
    };

    let image: { mime: string; base64: string } | undefined;
    let fotoUrl: string | undefined;
    if (imageId) {
      try {
        const media = await downloadMedia(imageId);
        const ext = (media.mime.split('/')[1] || 'jpg').split(';')[0];
        const dir = path.join(process.cwd(), 'public', 'uploads', 'agronomy');
        await fs.promises.mkdir(dir, { recursive: true });
        const fileName = `${waId}.${ext}`;
        await fs.promises.writeFile(path.join(dir, fileName), media.buffer);
        image = { mime: media.mime, base64: media.base64 };
        fotoUrl = `/uploads/agronomy/${fileName}`;
      } catch (e) {
        logServerError('Gagal unduh media WhatsApp', e);
      }
    }

    const { agent, reply } = await runAgent(safeText, tenant, image);

    const blokKode =
      blocks.find((b) => safeText.toLowerCase().includes(b.kode.toLowerCase()))?.kode || 'UNKNOWN';

    let cleanReply = reply;
    const match = reply.match(/\[JSON\]([\s\S]*?)\[\/JSON\]/);
    if (match && agent === 'supervisor') {
      try {
        const data = JSON.parse(match[1]);
        const hadir = Number(data.hadir) || 0;
        const produksiKg = Number(data.produksi_kg) || 0;

        // Deterministic task resolution (Sprint 1)
        let resolution: {
          id: string;
          blokKode: string;
          targetKuantitas: number;
          satuanTarget: string;
        } | null = null;
        const explicitKode =
          typeof data.kode_tugas === 'string' ? data.kode_tugas.trim().toUpperCase() : '';
        const textKodeMatch = safeText.match(/\bTGS-\d{8}-\d{3}\b/i);
        const candidateKode = (
          explicitKode || (textKodeMatch ? textKodeMatch[0].toUpperCase() : '')
        ).trim();

        if (candidateKode) {
          resolution = await prisma.fieldTask.findFirst({
            where: {
              tenantId: user.tenantId,
              kodeTugas: candidateKode,
              status: { in: ['ASSIGNED', 'IN_PROGRESS'] },
              OR: [{ mandorId: user.id }, { mandorId: null, mandorNama: user.nama }],
            },
          });
          if (!resolution && !explicitKode) {
            resolution = await prisma.fieldTask.findFirst({
              where: {
                tenantId: user.tenantId,
                kodeTugas: candidateKode,
                status: { in: ['ASSIGNED', 'IN_PROGRESS'] },
              },
            });
          }
        } else {
          const blokTugas = String(data.blok || '').trim();
          if (blokTugas && blokTugas !== 'UNKNOWN') {
            resolution = await prisma.fieldTask.findFirst({
              where: {
                tenantId: user.tenantId,
                blokKode: blokTugas,
                status: { in: ['ASSIGNED', 'IN_PROGRESS'] },
                OR: [
                  { mandorId: user.id },
                  { mandorId: null, mandorNama: user.nama },
                  { mandorId: null, mandorNama: null },
                ],
              },
              orderBy: [{ tanggalTarget: 'asc' }, { createdAt: 'asc' }],
            });
          }
        }

        await prisma.$transaction(async (tx) => {
          const report = await tx.dailyReport.create({
            data: {
              tenantId: user.tenantId,
              userId: user.id,
              blokKode: data.blok || 'UNKNOWN',
              mandorNama: data.mandor || user.nama,
              aktivitas: data.aktivitas || 'Panen',
              status: data.status || 'Selesai',
              hadir,
              produksiKg,
              luasHa: Number(data.luas_ha) || 0,
              produktivitas: hadir > 0 ? produksiKg / hadir : 0,
              rawMessage: safeText,
              waMessageId: waId,
              fieldTaskId: resolution ? resolution.id : undefined,
            },
          });

          if (resolution) {
            await tx.fieldTask.update({
              where: { id: resolution.id },
              data: { status: 'COMPLETED' },
            });
          }
          return report;
        });

        if (resolution) {
          const realisasi =
            resolution.satuanTarget === 'Kg'
              ? produksiKg
              : resolution.satuanTarget === 'Ha'
                ? Number(data.luas_ha) || 0
                : 0;
          cleanReply =
            reply.split('[JSON]')[0].trim() +
            `\n\n✅ Tugas ${candidateKode || resolution.id} di blok ${resolution.blokKode} selesai. Target: ${resolution.targetKuantitas} ${resolution.satuanTarget} | Realisasi: ${realisasi} ${resolution.satuanTarget}`;
        }
      } catch (e) {
        logServerError(e);
      }
      cleanReply =
        reply.split('[JSON]')[0].trim() +
        (cleanReply.includes('✅ Tugas')
          ? cleanReply.slice(cleanReply.indexOf('\n\n✅ Tugas'))
          : '');
    }

    if (agent === 'agronomy') {
      try {
        const risiko =
          reply.match(/\b(RENDAH|SEDANG|TINGGI|KRITIS)\b/i)?.[1].toUpperCase() || 'SEDANG';
        await prisma.agronomyLog.create({
          data: {
            tenantId: user.tenantId,
            blokKode,
            fotoUrl: fotoUrl || null,
            gejala: safeText || null,
            diagnosa: reply,
            risiko,
            rekomendasi: reply,
            mandorNama: user.nama,
            waMessageId: waId,
          },
        });
      } catch (e) {
        logServerError(e);
      }
    }

    await sendWhatsApp(from, cleanReply);
    return NextResponse.json({ ok: true });
  } catch (e) {
    logServerError(e);
    return NextResponse.json({ ok: true });
  }
}
