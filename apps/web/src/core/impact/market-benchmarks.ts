export interface RealMarketPriceBenchmark {
  commodity: 'TBS_SAWIT' | 'PUPUK_KCL' | 'PUPUK_UREA' | 'HERBISIDA_GLIFOSAT';
  regionalDistrict: string;
  officialRefPricePerUnit: number;
  tengkulakOfferPricePerUnit: number;
  middlemanMarginPercentage: number;
  farmerSavingsPerHa: number;
  sourceOfTruth: string;
  effectiveDate: string;
}

export interface ProductivityImpactComparison {
  metric: 'KG_PER_HK' | 'HA_PER_HK' | 'HARVEST_ROTATION_DAYS';
  baselineManual: number;
  pilotSawitEcosystem: number;
  percentageImprovement: number;
  economicValueIdrPerHa: number;
  notes: string;
}

export interface RealWorldFunnelMetrics {
  recommendationsCount: number;
  cardClickCount: number;
  cartAdditionCount: number;
  checkoutCount: number;
  approvedPaidCount: number;
  recommendationToClickRatePct: number;
  recommendationToPurchaseRatePct: number;
  totalGmvIdr: number;
  repeatPurchaseRatePct: number;
  estimatedTengkulakCutSavingsIdr: number;
}

export const REAL_MARKET_BENCHMARKS: RealMarketPriceBenchmark[] = [
  {
    commodity: 'TBS_SAWIT',
    regionalDistrict: 'Kotawaringin Timur & Riau',
    officialRefPricePerUnit: 2850,
    tengkulakOfferPricePerUnit: 2250,
    middlemanMarginPercentage: 26.6,
    farmerSavingsPerHa: 1440000,
    sourceOfTruth: 'Dinas Perkebunan Provinsi (Harga Resmi TBS Periode II)',
    effectiveDate: '2026-10-15',
  },
  {
    commodity: 'PUPUK_KCL',
    regionalDistrict: 'Kalimantan Tengah',
    officialRefPricePerUnit: 533333,
    tengkulakOfferPricePerUnit: 720000,
    middlemanMarginPercentage: 35.0,
    farmerSavingsPerHa: 2240000,
    sourceOfTruth: 'Katalog Resmi Distributor PT Pupuk Indonesia (Holding)',
    effectiveDate: '2026-10-01',
  },
  {
    commodity: 'PUPUK_UREA',
    regionalDistrict: 'Kampar Riau',
    officialRefPricePerUnit: 420000,
    tengkulakOfferPricePerUnit: 520000,
    middlemanMarginPercentage: 23.8,
    farmerSavingsPerHa: 1200000,
    sourceOfTruth: 'Harga Eceran Tertinggi (HET) Terverifikasi',
    effectiveDate: '2026-10-01',
  },
];

export const PILOT_PRODUCTIVITY_BASELINES: ProductivityImpactComparison[] = [
  {
    metric: 'KG_PER_HK',
    baselineManual: 142.0,
    pilotSawitEcosystem: 215.0,
    percentageImprovement: 51.4,
    economicValueIdrPerHa: 3650000,
    notes: 'Kenaikan tonase per HK karena rotasi panen tepat waktu (mencegah buah restan busuk)',
  },
  {
    metric: 'HA_PER_HK',
    baselineManual: 0.65,
    pilotSawitEcosystem: 1.25,
    percentageImprovement: 92.3,
    economicValueIdrPerHa: 1850000,
    notes: 'Aplikasi perawatan pupuk dan pruning sesuai SPK harian terarah',
  },
  {
    metric: 'HARVEST_ROTATION_DAYS',
    baselineManual: 17.5,
    pilotSawitEcosystem: 9.0,
    percentageImprovement: 48.6,
    economicValueIdrPerHa: 4200000,
    notes: 'Penurunan siklus dari restan berat (>14 hari) menjadi optimal 7–10 hari',
  },
];

export function computeFunnelMetrics(input: {
  recommendations: number;
  clicks: number;
  carts: number;
  checkouts: number;
  paidOrders: number;
  totalGmv: number;
  repeatBuyersCount: number;
  totalBuyersCount: number;
}): RealWorldFunnelMetrics {
  const recs = Math.max(1, input.recommendations);
  const clickRate = Number(((input.clicks / recs) * 100).toFixed(1));
  const purchaseRate = Number(((input.paidOrders / recs) * 100).toFixed(1));
  const buyers = Math.max(1, input.totalBuyersCount);
  const repeatRate = Number(((input.repeatBuyersCount / buyers) * 100).toFixed(1));

  // Estimasi penghematan dari pemotongan margin tengkulak 25% rata-rata
  const savings = Math.round(input.totalGmv * 0.25);

  return {
    recommendationsCount: input.recommendations,
    cardClickCount: input.clicks,
    cartAdditionCount: input.carts,
    checkoutCount: input.checkouts,
    approvedPaidCount: input.paidOrders,
    recommendationToClickRatePct: clickRate,
    recommendationToPurchaseRatePct: purchaseRate,
    totalGmvIdr: input.totalGmv,
    repeatPurchaseRatePct: repeatRate,
    estimatedTengkulakCutSavingsIdr: savings,
  };
}
