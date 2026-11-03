import { hkValue, kgPerHk, haPerHk, rotationDays, calculateMandorScore } from './kpi';

describe('hris kpi calculations', () => {
  it('computes HK based on attendance status and overtime', () => {
    expect(hkValue('ABSENT', 4)).toBe(0);
    expect(hkValue('LEAVE')).toBe(0);
    expect(hkValue('HALF_DAY')).toBe(0.5);
    expect(hkValue('PRESENT')).toBe(1);
    expect(hkValue('PRESENT', 4)).toBe(1.5);
    expect(hkValue('PRESENT', 20)).toBe(2);
  });

  it('computes kg/HK and ha/HK with null guard for zero HK', () => {
    expect(kgPerHk(0, 0)).toBeNull();
    expect(haPerHk(10, 0)).toBeNull();
    expect(kgPerHk(1000, 4)).toBe(250);
    expect(haPerHk(8, 4)).toBe(2);
  });

  it('computes harvest rotation days', () => {
    expect(rotationDays([])).toBeNull();
    expect(rotationDays([new Date('2026-10-01')])).toBeNull();
    const result = rotationDays([
      new Date('2026-10-11'),
      new Date('2026-10-01'),
      new Date('2026-10-06'),
    ]);
    expect(result).toBe(5);
  });

  it('calculates mandor score with minimum sample guard', () => {
    const insufficient = calculateMandorScore({
      kgPerHk: 200,
      attendancePct: 90,
      rotationAdherencePct: 80,
      dataCompletenessPct: 100,
      sampleHk: 4,
    });
    expect(insufficient.eligible).toBe(false);
    expect(insufficient.compositeScore).toBeNull();
    expect(insufficient.reasons[0]).toContain('Sampel belum cukup');
  });

  it('calculates weighted composite score when sample sufficient', () => {
    const result = calculateMandorScore({
      kgPerHk: 200,
      attendancePct: 100,
      rotationAdherencePct: 100,
      dataCompletenessPct: 100,
      sampleHk: 10,
    });
    expect(result.eligible).toBe(true);
    expect(result.compositeScore).toBe(100);
    expect(result.reasons).toHaveLength(0);
  });

  it('handles null kgPerHk with reasons and clamps out-of-range percentages', () => {
    const result = calculateMandorScore({
      kgPerHk: null,
      attendancePct: 150,
      rotationAdherencePct: -10,
      dataCompletenessPct: 200,
      sampleHk: 10,
    });
    expect(result.compositeScore).toBe(30);
    expect(result.reasons).toContain('Kg/HK belum tersedia, skor produktivitas 0');
  });
});
