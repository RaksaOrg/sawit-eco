import { executeHybridAgronomyVision } from './hybrid-vision';
import * as vision from './vision';
import * as sam from './sam';

describe('Hybrid Vision: Meta Llama 3.2 Vision + Meta SAM 3.1 Coordination', () => {
  const dummyImage = {
    mime: 'image/jpeg',
    base64:
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  };

  it('runs qualitative diagnosis with Llama and quantitative area calculation with SAM', async () => {
    const result = await executeHybridAgronomyVision({
      image: dummyImage,
      blockCode: 'B2',
      symptoms: 'Daun menguning bercak oranye pekat',
      targetType: 'LEAF_DEFECT',
    });

    // 1. Qualitative (Llama) scope checks
    expect(result.qualitative.diagnosis).toBeDefined();
    expect(['RENDAH', 'SEDANG', 'TINGGI', 'KRITIS']).toContain(result.qualitative.riskLevel);
    expect(result.qualitative.actionsToday.length).toBeGreaterThan(0);

    // 2. Quantitative (SAM) scope checks
    expect(result.quantitative.targetType).toBe('LEAF_DEFECT');
    expect(result.quantitative.masksCount).toBeGreaterThan(0);
    expect(result.quantitative.affectedAreaPercentage).toBeGreaterThan(0);
    expect(result.quantitative.detectedFeatures).toContain('chlorosis_margin');

    // 3. Synthesis checks
    expect(result.synthesis.summary).toContain('Diagnosa Llama 3.2:');
    expect(result.synthesis.summary).toContain('Segmentasi SAM 3.1:');
    expect(result.synthesis.estimatedYieldLossRiskPct).toBeGreaterThanOrEqual(0);
  });

  it('calculates bunch counts when targetType is BUNCH_COUNT', async () => {
    const result = await executeHybridAgronomyVision({
      image: dummyImage,
      blockCode: 'A1',
      symptoms: 'Hitung janjang matang di piringan pohon',
      targetType: 'BUNCH_COUNT',
    });

    expect(result.quantitative.targetType).toBe('BUNCH_COUNT');
    expect(result.quantitative.detectedFeatures).toContain('fresh_fruit_bunch');
    expect(result.quantitative.affectedAreaPercentage).toBe(42.0);
  });

  it('synthesizes estimated yield loss correctly for all risk levels', async () => {
    const spySam = jest.spyOn(sam, 'querySamSegmentation').mockResolvedValue({
      modelUsed: 'SAM-3.1',
      masksCount: 1,
      primaryMaskAreaPercentage: 20,
      confidenceScore: 0.9,
      detectedFeatures: ['lesion'],
      isSimulated: true,
    });

    const spyVision = jest.spyOn(vision, 'queryMetaVisionInference');

    // KRITIS
    spyVision.mockResolvedValueOnce({
      diagnosis: 'Ganoderma stadium lanjut',
      riskLevel: 'KRITIS',
      actionsToday: ['Sanitasi'],
      actionsNextDays: ['Isolasi'],
      confidence: 0.95,
      modelUsed: 'Llama-3.2-Vision',
      isFallback: false,
      rawText: 'raw',
    });
    const resKritis = await executeHybridAgronomyVision({ image: dummyImage });
    expect(resKritis.synthesis.estimatedYieldLossRiskPct).toBe(36);
    expect(resKritis.synthesis.requiresImmediateIntervention).toBe(true);

    // TINGGI
    spyVision.mockResolvedValueOnce({
      diagnosis: 'Ulat api berat',
      riskLevel: 'TINGGI',
      actionsToday: ['Fogging'],
      actionsNextDays: ['Monitoring'],
      confidence: 0.9,
      modelUsed: 'Llama-3.2-Vision',
      isFallback: false,
      rawText: 'raw',
    });
    const resTinggi = await executeHybridAgronomyVision({ image: dummyImage });
    expect(resTinggi.synthesis.estimatedYieldLossRiskPct).toBe(24);
    expect(resTinggi.synthesis.requiresImmediateIntervention).toBe(true);

    // SEDANG
    spyVision.mockResolvedValueOnce({
      diagnosis: 'Defisiensi N sedang',
      riskLevel: 'SEDANG',
      actionsToday: ['Pupuk urea'],
      actionsNextDays: ['Cek daun'],
      confidence: 0.85,
      modelUsed: 'Llama-3.2-Vision',
      isFallback: false,
      rawText: 'raw',
    });
    const resSedang = await executeHybridAgronomyVision({ image: dummyImage });
    expect(resSedang.synthesis.estimatedYieldLossRiskPct).toBe(14);
    expect(resSedang.synthesis.requiresImmediateIntervention).toBe(false);

    // RENDAH
    spyVision.mockResolvedValueOnce({
      diagnosis: 'Gulma ringan',
      riskLevel: 'RENDAH',
      actionsToday: ['Babat piringan'],
      actionsNextDays: ['Evaluasi'],
      confidence: 0.8,
      modelUsed: 'Llama-3.2-Vision',
      isFallback: false,
      rawText: 'raw',
    });
    const resRendah = await executeHybridAgronomyVision({ image: dummyImage });
    expect(resRendah.synthesis.estimatedYieldLossRiskPct).toBe(6);
    expect(resRendah.synthesis.requiresImmediateIntervention).toBe(false);

    spySam.mockRestore();
    spyVision.mockRestore();
  });
});
