import { maskPii, maskSupplierName, hasUnmaskedPii } from './pdp-guard';

describe('pdp guard tests', () => {
  it('masks phone numbers and emails to REDACTED_FOR_PRIVACY', () => {
    const raw = 'Petani no 081234567890 lapor melalui email petani.budi@sawit.com segera ditangani';
    const res = maskPii(raw);
    expect(res.text).not.toContain('081234567890');
    expect(res.text).not.toContain('petani.budi@sawit.com');
    expect(res.fieldsMasked).toContain('phone');
    expect(res.fieldsMasked).toContain('email');
    expect(res.text).toContain('REDACTED_FOR_PRIVACY');
  });

  it('masks names and addresses to aliases', () => {
    const raw = 'nama: Budi Santoso alamat: Desa Sawit Makmur RT 01 nama: Mandor Joko';
    const res = maskPii(raw);
    expect(res.text).toContain('SUPPLIER_001');
    expect(res.text).toContain('PEKERJA_002');
    expect(res.text).toContain('REDACTED_FOR_PRIVACY');
    expect(res.fieldsMasked).toContain('name');
    expect(res.fieldsMasked).toContain('address');
  });

  it('generates consistent supplier alias', () => {
    expect(maskSupplierName('PT Pupuk Nusantara', 1)).toBe('SUPPLIER_001');
    expect(maskSupplierName('PT Dua', 2)).toBe('SUPPLIER_002');
    expect(maskSupplierName('', 0)).toBe('SUPPLIER_000');
  });

  it('detects unmasked pii correctly', () => {
    expect(hasUnmaskedPii('Nomor telepon 081999888777')).toBe(true);
    expect(hasUnmaskedPii('Laporan operasional bersih tanpa identitas')).toBe(false);
  });
});
