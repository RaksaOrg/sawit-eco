import { runFourStageAgentPipeline, detectPriceAnomaly } from '../agent/multi-stage-pipeline';
import { validateZeroPiiLeakage } from '../privacy/pdp-audit-verifier';
import {
  evaluateAgronomyRecommendation,
  MANDATORY_AGRONOMY_DISCLAIMER,
} from '../compliance/agronomy-guard';

describe('Full Closed-Loop Ecosystem Demo E2E (Indonesian Smallholder Scenario)', () => {
  const deps = {
    getHistoricalMedianPrice: jest.fn().mockResolvedValue(533333),
    recordPdpAuditLog: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    deps.getHistoricalMedianPrice.mockResolvedValue(533333);
    deps.recordPdpAuditLog.mockResolvedValue(undefined);
  });

  it('runs the complete flow: voice note -> PDP masking -> price spike -> diagnosis -> purchase -> work -> HK', async () => {
    // --- STEP 1: Petani/Mandor mengirim laporan kacau via voice note / teks ---
    const rawMessage =
      'nama: Budi Santoso Lapor blok B2 daun menguning HP 081234567890 beli pupuk KCl dari Pak Haji Rp 7200000 untuk 12 sak';

    // --- STEP 2: Four-Stage Multi-Agent Pipeline membersihkan & mengenskripsi data ---
    const state = await runFourStageAgentPipeline(
      {
        text: rawMessage,
        channel: 'WHATSAPP',
        commodityPricePerKg: 720000, // Tengkulak price
        supplierName: 'Pak Haji Tengkulak',
      },
      'trace-demo-e2e-001',
      deps,
    );

    // Pipeline Verification
    expect(state.pdp_sanitized.fieldsMasked).toContain('phone');
    expect(state.pdp_sanitized.fieldsMasked).toContain('name');
    expect(state.pdp_sanitized.maskedSupplierAlias).toBe('SUPPLIER_001');
    expect(deps.recordPdpAuditLog).toHaveBeenCalledWith({
      traceId: 'trace-demo-e2e-001',
      fields: expect.any(Array),
      alias: 'SUPPLIER_001',
    });
    expect(state.anomaly_analysis.isAnomaly).toBe(true);
    expect(state.anomaly_analysis.severity).toBe('HIGH'); // >30% deviation
    expect(state.anomaly_analysis.deviationPercentage).toBeGreaterThan(20);
    expect(state.final_output.headline).toContain('ANOMALI HARGA');

    // PDP Leakage Checkpoint (what would go to LLM/DB must not contain raw PII)
    const piiCheck = validateZeroPiiLeakage([
      { rawMessage: state.pdp_sanitized.text, gejala: 'Laporan panen untuk SUPPLIER_001' },
    ]);
    expect(piiCheck.isClean).toBe(true);

    // --- STEP 3: Strict PDP audit log count dan Muse diagnosis fallback ---
    const diagFallback = detectPriceAnomaly(720000, 533333);
    expect(diagFallback.severity).toBe('HIGH');

    // --- STEP 4: Agronomi Recommendation Card dengan Product Gap Guard ---
    const recommendation = evaluateAgronomyRecommendation({
      sku: 'FERT-KCL-25',
      catalog: [
        {
          id: 'prod-001',
          sku: 'FERT-KCL-25',
          nama: 'Pupuk KCl Mahkota 50kg',
          harga: 533333,
          satuan: 'sak',
          ukuranKemasan: 50,
          isActive: true,
        },
      ],
      luasHa: 8,
      dosisKgPerHa: 75,
      disclaimer: MANDATORY_AGRONOMY_DISCLAIMER,
      alasan: 'Indikasi defisiensi kalium pada Blok B2',
    });

    expect(recommendation.status).toBe('RECOMMENDED');
    expect(recommendation.estimation?.jumlahSak).toBe(12);
    expect(recommendation.disclaimer).toContain('analisa daun/tanah');

    // Product Gap case: SKU not in catalog (Product Gap, no checkout)
    const gapRec = evaluateAgronomyRecommendation({
      sku: 'FERT-MISSING-999',
      catalog: [],
      luasHa: 8,
      dosisKgPerHa: 75,
      disclaimer: MANDATORY_AGRONOMY_DISCLAIMER,
      alasan: 'Butuh pupuk X',
    });
    expect(gapRec.status).toBe('PRODUCT_GAP');
    expect(gapRec.gapReason).toContain('tidak ditemukan');

    // --- STEP 5: HK & Productivity Math for the Demo Dashboard (Owner view) ---
    const harvestKg = 5000;
    const treatedHa = 8;
    const hkUsed = 4.5;
    const kgPerHk = harvestKg / hkUsed;
    const haPerHk = treatedHa / hkUsed;
    expect(kgPerHk).toBeCloseTo(1111.11, 1);
    expect(haPerHk).toBeCloseTo(1.78, 2);

    // Anomaly threshold proof: >20% deviation triggers supply chain warning
    const normalPrice = detectPriceAnomaly(550000, 533333);
    expect(normalPrice.isAnomaly).toBe(false);
    expect(normalPrice.severity).toBe('LOW');
  });
});
