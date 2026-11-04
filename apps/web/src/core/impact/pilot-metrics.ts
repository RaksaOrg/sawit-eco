import { haPerHk, kgPerHk, rotationDays } from '../hris/kpi';

export type PilotReport = {
  produksiKg: number;
  luasHa: number;
  blokKode: string;
  tanggal: Date;
  aktivitas: string;
};

export function percentChange(before: number | null, after: number | null): number | null {
  if (before === null || after === null || before === 0) return null;
  return Number((((after - before) / Math.abs(before)) * 100).toFixed(1));
}

export function average(values: number[]): number | null {
  return values.length
    ? Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2))
    : null;
}

export function calculatePeriodMetrics(reports: PilotReport[], hkTotal: number) {
  const harvests = reports.filter((report) => report.aktivitas.toLowerCase() === 'panen');
  const harvestKg = harvests.reduce((sum, report) => sum + report.produksiKg, 0);
  const treatedHa = reports.reduce((sum, report) => sum + report.luasHa, 0);
  const datesByBlock = new Map<string, Date[]>();
  for (const report of harvests) {
    if (report.produksiKg <= 0) continue;
    const dates = datesByBlock.get(report.blokKode) || [];
    dates.push(report.tanggal);
    datesByBlock.set(report.blokKode, dates);
  }
  const blockRotations = Array.from(datesByBlock.values())
    .map(rotationDays)
    .filter((days): days is number => days !== null);
  const rotation = average(blockRotations);

  return {
    harvestKg,
    hkTotal: Number(hkTotal.toFixed(2)),
    treatedHa,
    kgPerHk: kgPerHk(harvestKg, hkTotal),
    haPerHk: haPerHk(treatedHa, hkTotal),
    rotationDays: rotation === null ? null : Number(rotation.toFixed(1)),
    harvestReportCount: harvests.length,
    rotationBlockCount: blockRotations.length,
  };
}

export function calculatePriceChanges(
  observations: Array<{
    commodity: string;
    unit: string;
    beforePrice: number;
    afterPrice: number;
    source: string;
  }>,
) {
  const grouped = new Map<
    string,
    { unit: string; before: number[]; after: number[]; sources: Set<string> }
  >();
  for (const observation of observations) {
    const values = grouped.get(observation.commodity) || {
      unit: observation.unit,
      before: [],
      after: [],
      sources: new Set<string>(),
    };
    values.before.push(observation.beforePrice);
    values.after.push(observation.afterPrice);
    values.sources.add(observation.source);
    grouped.set(observation.commodity, values);
  }
  return Array.from(grouped, ([commodity, values]) => {
    const beforePrice = average(values.before);
    const afterPrice = average(values.after);
    return {
      commodity,
      unit: values.unit,
      beforePrice,
      afterPrice,
      changePct: percentChange(beforePrice, afterPrice),
      sampleCount: values.before.length,
      sources: Array.from(values.sources),
    };
  });
}
