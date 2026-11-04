import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import idImpact from '@/src/i18n/locales/id/impact.json';
import enImpact from '@/src/i18n/locales/en/impact.json';
import {
  calculatePeriodMetrics,
  calculatePriceChanges,
  percentChange,
  type PilotReport,
} from '@/src/core/impact/pilot-metrics';

export const dynamic = 'force-dynamic';

function parseDate(value: string | null): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : date;
}

export async function GET(request: NextRequest) {
  const messages = request.headers.get('accept-language')?.toLowerCase().startsWith('en')
    ? enImpact
    : idImpact;
  const tenant = await requireTenant(request);
  const pilotStart = parseDate(request.nextUrl.searchParams.get('pilotStart'));
  const pilotEnd = parseDate(request.nextUrl.searchParams.get('pilotEnd'));
  if (!pilotStart || !pilotEnd) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INVALID_PERIOD',
          message: messages.error.invalid_period,
        },
      },
      { status: 400 },
    );
  }
  const duration = pilotEnd.getTime() - pilotStart.getTime();

  if (duration <= 0 || duration > 366 * 86_400_000) {
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INVALID_PERIOD', message: messages.error.invalid_range },
      },
      { status: 400 },
    );
  }

  const beforeEnd = pilotStart;
  const beforeStart = new Date(beforeEnd.getTime() - duration);
  const [beforeReports, pilotReports, beforeAttendance, pilotAttendance, priceObservations] =
    await Promise.all([
      prisma.dailyReport.findMany({
        where: { tenantId: tenant.id, tanggal: { gte: beforeStart, lt: beforeEnd } },
        select: { produksiKg: true, luasHa: true, blokKode: true, tanggal: true, aktivitas: true },
      }),
      prisma.dailyReport.findMany({
        where: { tenantId: tenant.id, tanggal: { gte: pilotStart, lt: pilotEnd } },
        select: { produksiKg: true, luasHa: true, blokKode: true, tanggal: true, aktivitas: true },
      }),
      prisma.attendance.aggregate({
        where: { tenantId: tenant.id, workDate: { gte: beforeStart, lt: beforeEnd } },
        _sum: { hkValue: true },
      }),
      prisma.attendance.aggregate({
        where: { tenantId: tenant.id, workDate: { gte: pilotStart, lt: pilotEnd } },
        _sum: { hkValue: true },
      }),
      prisma.pilotPriceObservation.findMany({
        where: { tenantId: tenant.id, observedAt: { gte: pilotStart, lt: pilotEnd } },
        select: { commodity: true, unit: true, beforePrice: true, afterPrice: true, source: true },
      }),
    ]);

  const before = calculatePeriodMetrics(
    beforeReports as PilotReport[],
    beforeAttendance._sum.hkValue || 0,
  );
  const pilot = calculatePeriodMetrics(
    pilotReports as PilotReport[],
    pilotAttendance._sum.hkValue || 0,
  );
  const prices = calculatePriceChanges(priceObservations);

  return NextResponse.json({
    success: true,
    data: {
      source: 'database',
      periods: {
        before: { start: beforeStart.toISOString(), end: beforeEnd.toISOString() },
        pilot: { start: pilotStart.toISOString(), end: pilotEnd.toISOString() },
      },
      productivity: {
        before,
        pilot,
        changes: {
          kgPerHkPct: percentChange(before.kgPerHk, pilot.kgPerHk),
          haPerHkPct: percentChange(before.haPerHk, pilot.haPerHk),
          rotationDaysPct: percentChange(before.rotationDays, pilot.rotationDays),
        },
      },
      prices,
      dataQuality: {
        priceSampleCount: priceObservations.length,
        note: messages.data_quality.price_sample_note,
      },
    },
  });
}
