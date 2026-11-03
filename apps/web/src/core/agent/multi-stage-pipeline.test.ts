import {
  runFourStageAgentPipeline,
  normalizeSlang,
  detectPriceAnomaly,
} from './multi-stage-pipeline';

describe('multi-stage agent pipeline', () => {
  const deps = {
    getHistoricalMedianPrice: jest.fn().mockResolvedValue(2000),
    recordPdpAuditLog: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    deps.getHistoricalMedianPrice.mockResolvedValue(2000);
    deps.recordPdpAuditLog.mockResolvedValue(undefined);
  });

  it('normalizes slang dictionary words', () => {
    const res = normalizeSlang('blm sdh pupk di b2');
    expect(res.normalized).toBe('belum sudah pupuk di Blok B2');
    expect(res.changed).toBe(true);
    expect(normalizeSlang('laporan normal').changed).toBe(false);
  });

  it('detects anomalies above 20% threshold with severities', () => {
    expect(detectPriceAnomaly(0, 100).severity).toBe('NONE');
    expect(detectPriceAnomaly(100, 0).severity).toBe('NONE');
    const lowDev = detectPriceAnomaly(1100, 1000);
    expect(lowDev.severity).toBe('LOW');
    expect(lowDev.isAnomaly).toBe(false);
    expect(detectPriceAnomaly(1250, 1000).severity).toBe('MEDIUM');
    expect(detectPriceAnomaly(1350, 1000).severity).toBe('HIGH');
    expect(detectPriceAnomaly(1600, 1000).severity).toBe('CRITICAL');
    expect(detectPriceAnomaly(1600, 1000).isAnomaly).toBe(true);
    const cheaper = detectPriceAnomaly(700, 1000);
    expect(cheaper.severity).toBe('HIGH');
    expect(cheaper.reasoning).toContain('lebih murah');
  });

  it('runs 4 stage pipeline, masks PII, logs audit, marks anomaly', async () => {
    deps.getHistoricalMedianPrice.mockResolvedValue(1000);
    const state = await runFourStageAgentPipeline(
      {
        text: 'nama: Budi Santoso lapor harga 1250000 HP 081234567890',
        channel: 'WHATSAPP',
        commodityPricePerKg: 1250000,
        supplierName: 'PT Sawit Jaya',
      },
      'trace-1',
      deps,
    );

    expect(state.cleaned_data.slangNormalized).toBe(false);
    expect(state.pdp_sanitized.fieldsMasked).toContain('phone');
    expect(state.pdp_sanitized.fieldsMasked).toContain('name');
    expect(state.pdp_sanitized.maskedSupplierAlias).toBe('SUPPLIER_001');
    expect(state.anomaly_analysis.severity).toBe('CRITICAL');
    expect(state.anomaly_analysis.isAnomaly).toBe(true);
    expect(state.final_output.headline).toContain('ANOMALI HARGA');
    expect(state.final_output.actionRequired).toBe(true);
    expect(deps.recordPdpAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ traceId: 'trace-1' }),
    );
  });

  it('uses inference query if provided and falls back gracefully on error', async () => {
    const queryInference = jest.fn().mockResolvedValue({ text: 'Ringkasan aman.' });
    const state = await runFourStageAgentPipeline(
      { text: 'laporan panen', channel: 'MOBILE' },
      'trace-2',
      { ...deps, queryInference },
    );
    expect(state.final_output.summary).toBe('Ringkasan aman.');
    expect(queryInference).toHaveBeenCalled();

    const failingInference = jest.fn().mockRejectedValue(new Error('down'));
    const fallback = await runFourStageAgentPipeline(
      { text: 'laporan panen', channel: 'MOBILE' },
      'trace-3',
      { ...deps, queryInference: failingInference },
    );
    expect(fallback.final_output.summary).toContain('laporan panen');
  });

  it('handles missing price and raw supplier', async () => {
    const state = await runFourStageAgentPipeline(
      { text: 'laporan tanpa harga', channel: 'WEB' },
      'trace-4',
      deps,
    );
    expect(state.anomaly_analysis.severity).toBe('NONE');
    expect(state.pdp_sanitized.maskedSupplierAlias).toBe('SUPPLIER_000');
    expect(state.final_output.actionRequired).toBe(false);
  });
});
