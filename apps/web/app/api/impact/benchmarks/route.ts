import { NextResponse } from 'next/server';
import {
  REAL_MARKET_BENCHMARKS,
  PILOT_PRODUCTIVITY_BASELINES,
  computeFunnelMetrics,
} from '@/src/core/impact/market-benchmarks';

export const dynamic = 'force-dynamic';

export async function GET() {
  const simulatedFunnel = computeFunnelMetrics({
    recommendations: 142,
    clicks: 118,
    carts: 89,
    checkouts: 64,
    paidOrders: 58,
    totalGmv: 184500000,
    repeatBuyersCount: 22,
    totalBuyersCount: 27,
  });

  return NextResponse.json({
    success: true,
    data: {
      location: 'Kotawaringin Timur (Kalteng) & Kampar (Riau)',
      period: 'Pilot Q3-Q4 2026',
      priceBenchmarks: REAL_MARKET_BENCHMARKS.map((b) => ({
        commodity: b.commodity,
        region: b.regionalDistrict,
        officialPrice: b.officialRefPricePerUnit,
        middlemanPrice: b.tengkulakOfferPricePerUnit,
        marginCutPercentage: b.middlemanMarginPercentage,
        farmerSavingsPerHaIdr: b.farmerSavingsPerHa,
        source: b.sourceOfTruth,
        effectiveDate: b.effectiveDate,
      })),
      productivityMetrics: PILOT_PRODUCTIVITY_BASELINES.map((p) => ({
        metric: p.metric,
        baselineManual: p.baselineManual,
        pilotSawitEcosystem: p.pilotSawitEcosystem,
        percentageImprovement: p.percentageImprovement,
        economicValueIdrPerHa: p.economicValueIdrPerHa,
        notes: p.notes,
      })),
      funnel: simulatedFunnel,
      summary: {
        totalGmvProtectedIdr: 184500000,
        estimatedMiddlemanCutSavingsIdr: 46125000,
        kgPerHkLiftPct: 51.4,
        haPerHkLiftPct: 92.3,
        rotationReductionPct: 48.6,
      },
    },
  });
}
