import {
  MANDATORY_AGRONOMY_DISCLAIMER,
  AgronomyComplianceError,
  validateAgronomyDisclaimer,
  calculateBlockNeeds,
  evaluateAgronomyRecommendation,
} from './agronomy-guard';

describe('Agronomy Guard & Compliance Rules', () => {
  it('throws error when disclaimer is missing or incorrect', () => {
    expect(() => validateAgronomyDisclaimer('')).toThrow(AgronomyComplianceError);
    expect(() => validateAgronomyDisclaimer('Disclaimer sembarang')).toThrow(
      AgronomyComplianceError,
    );
  });

  it('validates exact mandatory disclaimer string', () => {
    expect(validateAgronomyDisclaimer(`Catatan: ${MANDATORY_AGRONOMY_DISCLAIMER}`)).toBe(true);
  });

  it('throws error on invalid area or dosage', () => {
    expect(() => calculateBlockNeeds({ luasHa: 0, dosisKgPerHa: 100 })).toThrow(
      AgronomyComplianceError,
    );

    expect(() => calculateBlockNeeds({ luasHa: 10, dosisKgPerHa: -5 })).toThrow(
      AgronomyComplianceError,
    );
  });

  it('calculates proportional block needs with default 50kg bag', () => {
    const res = calculateBlockNeeds({
      luasHa: 25,
      dosisKgPerHa: 300,
    });

    expect(res.luasHa).toBe(25);
    expect(res.totalKg).toBe(7500);
    expect(res.jumlahSak).toBe(150);
    expect(res.ukuranKemasanKg).toBe(50);
  });

  it('calculates proportional block needs with custom package size', () => {
    const res = calculateBlockNeeds({
      luasHa: 10,
      dosisKgPerHa: 25,
      ukuranKemasanKg: 20,
    });

    expect(res.totalKg).toBe(250);
    expect(res.jumlahSak).toBe(13); // ceil(250 / 20)
    expect(res.ukuranKemasanKg).toBe(20);
  });

  it('returns PRODUCT_GAP when SKU not found or inactive', () => {
    const catalog = [
      {
        id: 'p-1',
        sku: 'FERT-MOP-50',
        nama: 'Pupuk MOP',
        harga: 400000,
        satuan: 'sak',
        ukuranKemasan: 50,
        isActive: false,
      },
    ];

    const res = evaluateAgronomyRecommendation({
      sku: 'FERT-MOP-50',
      catalog,
      luasHa: 10,
      dosisKgPerHa: 150,
      disclaimer: MANDATORY_AGRONOMY_DISCLAIMER,
      alasan: 'Defisiensi K',
    });

    expect(res.status).toBe('PRODUCT_GAP');
    expect(res.product).toBeUndefined();
    expect(res.gapReason).toContain('tidak ditemukan');
  });

  it('returns RECOMMENDED when SKU is active in catalog', () => {
    const catalog = [
      {
        id: 'p-1',
        sku: 'FERT-MOP-50',
        nama: 'Pupuk MOP',
        harga: 400000,
        satuan: 'sak',
        ukuranKemasan: 50,
        isActive: true,
      },
    ];

    const res = evaluateAgronomyRecommendation({
      sku: 'FERT-MOP-50',
      catalog,
      luasHa: 20,
      dosisKgPerHa: 200,
      disclaimer: MANDATORY_AGRONOMY_DISCLAIMER,
      alasan: 'Defisiensi K',
    });

    expect(res.status).toBe('RECOMMENDED');
    expect(res.product?.sku).toBe('FERT-MOP-50');
    expect(res.estimation?.totalKg).toBe(4000);
    expect(res.estimation?.jumlahSak).toBe(80);
  });
});
