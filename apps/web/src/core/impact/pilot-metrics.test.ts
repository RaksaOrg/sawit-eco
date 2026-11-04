import { calculatePeriodMetrics, calculatePriceChanges, percentChange } from './pilot-metrics';

describe('pilot metrics', () => {
  it('calculates actual productivity and average harvest rotation by block', () => {
    const metrics = calculatePeriodMetrics(
      [
        {
          aktivitas: 'Panen',
          blokKode: 'A1',
          produksiKg: 1000,
          luasHa: 2,
          tanggal: new Date('2026-01-01T00:00:00Z'),
        },
        {
          aktivitas: 'Panen',
          blokKode: 'A1',
          produksiKg: 1200,
          luasHa: 2,
          tanggal: new Date('2026-01-11T00:00:00Z'),
        },
        {
          aktivitas: 'Pemupukan',
          blokKode: 'A1',
          produksiKg: 0,
          luasHa: 1,
          tanggal: new Date('2026-01-12T00:00:00Z'),
        },
        {
          aktivitas: 'Panen',
          blokKode: 'B1',
          produksiKg: 500,
          luasHa: 1,
          tanggal: new Date('2026-01-02T00:00:00Z'),
        },
        {
          aktivitas: 'Panen',
          blokKode: 'B1',
          produksiKg: 700,
          luasHa: 1,
          tanggal: new Date('2026-01-12T00:00:00Z'),
        },
      ],
      10,
    );

    expect(metrics.harvestKg).toBe(3400);
    expect(metrics.treatedHa).toBe(7);
    expect(metrics.kgPerHk).toBe(340);
    expect(metrics.haPerHk).toBe(0.7);
    expect(metrics.rotationDays).toBe(10);
    expect(metrics.rotationBlockCount).toBe(2);
  });

  it('averages paired prices by commodity and reports sources and sample size', () => {
    expect(
      calculatePriceChanges([
        { commodity: 'TBS', unit: 'kg', beforePrice: 2000, afterPrice: 2400, source: 'invoice-1' },
        { commodity: 'TBS', unit: 'kg', beforePrice: 2200, afterPrice: 2600, source: 'invoice-2' },
      ]),
    ).toEqual([
      {
        commodity: 'TBS',
        unit: 'kg',
        beforePrice: 2100,
        afterPrice: 2500,
        changePct: 19,
        sampleCount: 2,
        sources: ['invoice-1', 'invoice-2'],
      },
    ]);
  });

  it('returns null when comparison sample is missing or baseline is zero', () => {
    expect(percentChange(null, 2)).toBeNull();
    expect(percentChange(0, 2)).toBeNull();
    expect(calculatePriceChanges([])).toEqual([]);
  });
});
