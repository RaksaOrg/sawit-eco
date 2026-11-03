import { validateZeroPiiLeakage } from './pdp-audit-verifier';

describe('PDP audit verifier', () => {
  it('passes when all records are sanitized', () => {
    const records = [
      { rawMessage: 'Laporan panen B2 tanpa identitas' },
      { gejala: 'Daun menguning tanpa nama individu' },
      { rawMessage: 'Laporan TGS-2026-001 untuk SUPPLIER_002' },
    ];
    const res = validateZeroPiiLeakage(records);
    expect(res.isClean).toBe(true);
    expect(res.violations).toHaveLength(0);
  });

  it('detects raw phone numbers inside stored records', () => {
    const records = [
      { rawMessage: 'Kontak pemasok 081234567890 di gudang' },
      { gejala: 'email petani.budi@sawit.com lapor' },
      { finalOutputJson: 'Nama: Pak Budi Santoso HP 08111222333' },
    ];
    const res = validateZeroPiiLeakage(records);
    expect(res.isClean).toBe(false);
    expect(res.violations.length).toBe(3);
  });

  it('handles empty records and null fields safely', () => {
    expect(validateZeroPiiLeakage([]).isClean).toBe(true);
    expect(
      validateZeroPiiLeakage([{ rawMessage: null, gejala: null, finalOutputJson: null }]).isClean,
    ).toBe(true);
  });
});
