import {
  calculateBlockNeeds,
  evaluateAgronomyRecommendation,
  validateAgronomyDisclaimer,
  MANDATORY_AGRONOMY_DISCLAIMER,
  AgronomyComplianceError,
  CatalogProductLookup,
} from './agronomy-guard';

const catalog: CatalogProductLookup[] = [
  {
    id: 'p1',
    sku: 'FERT-MOP-50',
    nama: 'Pupuk MOP',
    harga: 400000,
    satuan: 'sak',
    ukuranKemasan: 50,
    isActive: true,
  },
  {
    id: 'p2',
    sku: 'FERT-UREA-50',
    nama: 'Pupuk Urea',
    harga: 350000,
    satuan: 'sak',
    ukuranKemasan: 50,
    isActive: false,
  },
];

describe('agronomy-guard unit tests', () => {
  it('validates mandatory disclaimer properly', () => {
    expect(() => validateAgronomyDisclaimer('Teks acak tanpa disclaimer resmi')).toThrow(
      AgronomyComplianceError,
    );
    expect(validateAgronomyDisclaimer(`Rekomendasi ini: ${MANDATORY_AGRONOMY_DISCLAIMER}`)).toBe(
      true,
    );
  });

  it('rejects invalid inputs on calculateBlockNeeds', () => {
    expect(() => calculateBlockNeeds({ luasHa: 0, dosisKgPerHa: 100 })).toThrow(
      'Luas blok kelapa sawit harus lebih besar dari 0',
    );
    expect(() => calculateBlockNeeds({ luasHa: 10, dosisKgPerHa: 0 })).toThrow(
      'Dosis per Ha harus lebih besar dari 0',
    );
  });

  it('calculates estimation with fallback pack size', () => {
    const est = calculateBlockNeeds({ luasHa: 5, dosisKgPerHa: 100 });
    expect(est.totalKg).toBe(500);
    expect(est.jumlahSak).toBe(10);
    expect(est.ukuranKemasanKg).toBe(50);
  });

  it('evaluates recommendation as RECOMMENDED when SKU active', () => {
    const res = evaluateAgronomyRecommendation({
      sku: 'FERT-MOP-50',
      catalog,
      luasHa: 2,
      dosisKgPerHa: 150,
      disclaimer: MANDATORY_AGRONOMY_DISCLAIMER,
      alasan: 'Defisiensi K',
    });
    expect(res.status).toBe('RECOMMENDED');
    expect(res.estimation?.jumlahSak).toBe(6);
    expect(res.product?.sku).toBe('FERT-MOP-50');
  });

  it('evaluates recommendation as PRODUCT_GAP when SKU missing or inactive', () => {
    const res = evaluateAgronomyRecommendation({
      sku: 'FERT-UREA-50',
      catalog,
      luasHa: 2,
      dosisKgPerHa: 150,
      disclaimer: MANDATORY_AGRONOMY_DISCLAIMER,
      alasan: 'Butuh N',
    });
    expect(res.status).toBe('PRODUCT_GAP');
    expect(res.gapReason).toContain('tidak ditemukan atau tidak aktif');
  });
});
