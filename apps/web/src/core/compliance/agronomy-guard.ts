export const MANDATORY_AGRONOMY_DISCLAIMER =
  'Sesuaikan dengan hasil analisa daun/tanah dan label resmi produk.';

export interface CatalogProductLookup {
  id: string;
  sku: string;
  nama: string;
  harga: number;
  satuan: string;
  ukuranKemasan: number;
  isActive: boolean;
}

export interface RecommendationCalculationInput {
  luasHa: number;
  dosisKgPerHa: number;
  ukuranKemasanKg?: number;
}

export interface RecommendationEstimation {
  luasHa: number;
  totalKg: number;
  jumlahSak: number;
  ukuranKemasanKg: number;
}

export interface AgronomyRecommendationOutput {
  status: 'RECOMMENDED' | 'PRODUCT_GAP';
  disclaimer: string;
  product?: CatalogProductLookup;
  estimation?: RecommendationEstimation;
  gapReason?: string;
}

export class AgronomyComplianceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AgronomyComplianceError';
  }
}

export function validateAgronomyDisclaimer(text: string): boolean {
  if (!text || !text.includes(MANDATORY_AGRONOMY_DISCLAIMER)) {
    throw new AgronomyComplianceError(
      `Rekomendasi agronomi wajib menyertakan disclaimer: "${MANDATORY_AGRONOMY_DISCLAIMER}"`,
    );
  }
  return true;
}

export function calculateBlockNeeds(
  input: RecommendationCalculationInput,
): RecommendationEstimation {
  if (input.luasHa <= 0) {
    throw new AgronomyComplianceError('Luas blok kelapa sawit harus lebih besar dari 0');
  }
  if (input.dosisKgPerHa <= 0) {
    throw new AgronomyComplianceError('Dosis per Ha harus lebih besar dari 0');
  }

  const ukuranKemasanKg =
    input.ukuranKemasanKg && input.ukuranKemasanKg > 0 ? input.ukuranKemasanKg : 50;
  const totalKg = Number((input.luasHa * input.dosisKgPerHa).toFixed(2));
  const jumlahSak = Math.ceil(totalKg / ukuranKemasanKg);

  return {
    luasHa: input.luasHa,
    totalKg,
    jumlahSak,
    ukuranKemasanKg,
  };
}

export function evaluateAgronomyRecommendation(params: {
  sku: string;
  catalog: CatalogProductLookup[];
  luasHa: number;
  dosisKgPerHa: number;
  disclaimer: string;
  alasan: string;
}): AgronomyRecommendationOutput {
  validateAgronomyDisclaimer(params.disclaimer);

  const matchedProduct = params.catalog.find((item) => item.sku === params.sku && item.isActive);

  if (!matchedProduct) {
    return {
      status: 'PRODUCT_GAP',
      disclaimer: MANDATORY_AGRONOMY_DISCLAIMER,
      gapReason: `SKU ${params.sku} tidak ditemukan atau tidak aktif di katalog tenant`,
    };
  }

  const estimation = calculateBlockNeeds({
    luasHa: params.luasHa,
    dosisKgPerHa: params.dosisKgPerHa,
    ukuranKemasanKg: matchedProduct.ukuranKemasan,
  });

  return {
    status: 'RECOMMENDED',
    disclaimer: MANDATORY_AGRONOMY_DISCLAIMER,
    product: matchedProduct,
    estimation,
  };
}
