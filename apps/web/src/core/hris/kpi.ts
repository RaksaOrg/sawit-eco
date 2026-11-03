export type AttendanceStatus = 'PRESENT' | 'HALF_DAY' | 'ABSENT' | 'LEAVE';

export interface MandorScoreInput {
  kgPerHk: number | null;
  attendancePct: number;
  rotationAdherencePct: number;
  dataCompletenessPct: number;
  sampleHk: number;
}

export interface MandorScoreResult {
  compositeScore: number | null;
  eligible: boolean;
  reasons: string[];
}

export function hkValue(status: AttendanceStatus, overtimeHours = 0): number {
  if (status !== 'PRESENT' && status !== 'HALF_DAY') return 0;
  const base = status === 'HALF_DAY' ? 0.5 : 1;
  if (overtimeHours <= 0) return base;
  return Number((base + Math.min(overtimeHours / 8, 1)).toFixed(2));
}

export function kgPerHk(harvestKg: number, hkTotal: number): number | null {
  if (hkTotal <= 0) return null;
  return Number((harvestKg / hkTotal).toFixed(2));
}

export function haPerHk(treatedHa: number, hkTotal: number): number | null {
  if (hkTotal <= 0) return null;
  return Number((treatedHa / hkTotal).toFixed(2));
}

export function rotationDays(harvestDates: Date[]): number | null {
  if (harvestDates.length < 2) return null;
  const sorted = [...harvestDates].sort((a, b) => a.getTime() - b.getTime());
  let total = 0;
  for (let i = 1; i < sorted.length; i += 1) {
    total += (sorted[i].getTime() - sorted[i - 1].getTime()) / 86_400_000;
  }
  return Number((total / (sorted.length - 1)).toFixed(1));
}

const clamp = (value: number) => Math.max(0, Math.min(100, value));

export function calculateMandorScore(input: MandorScoreInput): MandorScoreResult {
  if (input.sampleHk < 5) {
    return {
      compositeScore: null,
      eligible: false,
      reasons: ['Sampel belum cukup (< 5 HK)'],
    };
  }

  const normalizedKg = input.kgPerHk === null ? 0 : clamp((input.kgPerHk / 200) * 100);
  const score =
    normalizedKg * 0.5 +
    clamp(input.attendancePct) * 0.2 +
    clamp(input.rotationAdherencePct) * 0.2 +
    clamp(input.dataCompletenessPct) * 0.1;

  const reasons: string[] = [];
  if (input.kgPerHk === null) reasons.push('Kg/HK belum tersedia, skor produktivitas 0');

  return {
    compositeScore: Number(score.toFixed(1)),
    eligible: true,
    reasons,
  };
}
