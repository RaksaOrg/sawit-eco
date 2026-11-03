import {
  REAL_MARKET_BENCHMARKS,
  PILOT_PRODUCTIVITY_BASELINES,
  computeFunnelMetrics,
} from './market-benchmarks';

describe('Real World Impact & Market Transparency', () => {
  it('benchmarks show real tengkulak margin cuts (>20%)', () => {
    const kcl = REAL_MARKET_BENCHMARKS.find((b) => b.commodity === 'PUPUK_KCL');
    expect(kcl).toBeDefined();
    expect(kcl?.middlemanMarginPercentage).toBeGreaterThan(20);
    expect(kcl?.farmerSavingsPerHa).toBeGreaterThan(0);

    const tbs = REAL_MARKET_BENCHMARKS.find((b) => b.commodity === 'TBS_SAWIT');
    expect(tbs?.middlemanMarginPercentage).toBeGreaterThan(15);
  });

  it('documents pilot productivity gains for Kg/HK, Ha/HK, and Rotation', () => {
    expect(PILOT_PRODUCTIVITY_BASELINES).toHaveLength(3);
    const productivity = PILOT_PRODUCTIVITY_BASELINES.find((b) => b.metric === 'KG_PER_HK');
    expect(productivity).toBeDefined();
    expect(productivity?.percentageImprovement).toBeGreaterThan(30);
    expect(productivity?.baselineManual).toBeLessThan(productivity?.pilotSawitEcosystem || 0);
  });

  it('computes a closed loop funnel with repeat purchase & GMV', () => {
    const funnel = computeFunnelMetrics({
      recommendations: 10,
      clicks: 6,
      carts: 4,
      checkouts: 3,
      paidOrders: 2,
      totalGmv: 12800000,
      repeatBuyersCount: 1,
      totalBuyersCount: 2,
    });

    expect(funnel.recommendationToClickRatePct).toBe(60);
    expect(funnel.recommendationToPurchaseRatePct).toBe(20);
    expect(funnel.totalGmvIdr).toBe(12800000);
    expect(funnel.repeatPurchaseRatePct).toBe(50);
    expect(funnel.estimatedTengkulakCutSavingsIdr).toBe(3200000);

    // Zero state fallback shouldn't divide by zero
    const emptyFunnel = computeFunnelMetrics({
      recommendations: 0,
      clicks: 0,
      carts: 0,
      checkouts: 0,
      paidOrders: 0,
      totalGmv: 0,
      repeatBuyersCount: 0,
      totalBuyersCount: 0,
    });
    expect(emptyFunnel.recommendationsCount).toBe(0);
  });
});
