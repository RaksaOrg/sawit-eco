import { maskPii, maskSupplierName } from '../privacy/pdp-guard';
import { InferenceRequest } from '../ai/inference';

export interface RawFieldInput {
  text: string;
  voiceTranscript?: string;
  imageCaption?: string;
  channel: 'WHATSAPP' | 'MOBILE' | 'WEB';
  commodityPricePerKg?: number;
  stockVolumeKg?: number;
  supplierName?: string;
}

export interface CleanedData {
  text: string;
  slangNormalized: boolean;
  commodityPricePerKg?: number;
  stockVolumeKg?: number;
  rawSupplierName?: string;
}

export interface PdpSanitizedData {
  text: string;
  maskedSupplierAlias: string;
  fieldsMasked: string[];
  auditLogged: boolean;
}

export type AnomalySeverity = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface AnomalyAnalysis {
  medianPrice: number;
  quotedPrice: number;
  deviationPercentage: number;
  severity: AnomalySeverity;
  isAnomaly: boolean;
  reasoning: string;
}

export interface FinalAgentOutput {
  summary: string;
  headline: string;
  actionRequired: boolean;
  pdpProtected: boolean;
  anomalyDetected: boolean;
}

export interface AgentState {
  raw_input: RawFieldInput;
  cleaned_data: CleanedData;
  pdp_sanitized: PdpSanitizedData;
  anomaly_analysis: AnomalyAnalysis;
  final_output: FinalAgentOutput;
}

export interface PipelineDependencies {
  getHistoricalMedianPrice: (skuOrCommodity: string) => Promise<number>;
  recordPdpAuditLog: (entry: { traceId: string; fields: string[]; alias: string }) => Promise<void>;
  queryInference?: (request: InferenceRequest) => Promise<{ text: string }>;
}

const SLANG_DICTIONARY: Record<string, string> = {
  blm: 'belum',
  yg: 'yang',
  sdh: 'sudah',
  pupk: 'pupuk',
  knk: 'kena',
  ulat: 'ulat api',
  b2: 'Blok B2',
  kcl: 'KCl',
  dgn: 'dengan',
  bnyk: 'banyak',
};

export function normalizeSlang(text: string): { normalized: string; changed: boolean } {
  let changed = false;
  const words = text.split(/(\s+)/);
  const transformed = words.map((w) => {
    const key = w.toLowerCase();
    if (SLANG_DICTIONARY[key]) {
      changed = true;
      return SLANG_DICTIONARY[key];
    }
    return w;
  });
  return { normalized: transformed.join(''), changed };
}

export function detectPriceAnomaly(quotedPrice: number, medianPrice: number): AnomalyAnalysis {
  if (medianPrice <= 0 || quotedPrice <= 0) {
    return {
      medianPrice: Math.max(0, medianPrice),
      quotedPrice: Math.max(0, quotedPrice),
      deviationPercentage: 0,
      severity: 'NONE',
      isAnomaly: false,
      reasoning: 'Harga tidak dapat dibandingkan (nilai median atau kuotasi <= 0)',
    };
  }

  const deviation = Number((((quotedPrice - medianPrice) / medianPrice) * 100).toFixed(2));
  const absDev = Math.abs(deviation);

  let severity: AnomalySeverity = 'LOW';
  if (absDev >= 50) severity = 'CRITICAL';
  else if (absDev >= 30) severity = 'HIGH';
  else if (absDev >= 20) severity = 'MEDIUM';

  const isAnomaly = absDev >= 20;
  const direction = deviation >= 0 ? 'lebih mahal' : 'lebih murah';
  const reasoning = isAnomaly
    ? `Lonjakan harga ${absDev}% ${direction} dibanding median historis Rp ${medianPrice.toLocaleString('id-ID')}`
    : `Harga dalam deviasi normal (${absDev}%)`;

  return {
    medianPrice,
    quotedPrice,
    deviationPercentage: deviation,
    severity,
    isAnomaly,
    reasoning,
  };
}

export async function runFourStageAgentPipeline(
  raw: RawFieldInput,
  traceId: string,
  deps: PipelineDependencies,
): Promise<AgentState> {
  const mergedText = [raw.text, raw.voiceTranscript, raw.imageCaption]
    .filter(Boolean)
    .join(' ')
    .trim();

  const { normalized, changed } = normalizeSlang(mergedText);
  const cleaned: CleanedData = {
    text: normalized,
    slangNormalized: changed,
    commodityPricePerKg: raw.commodityPricePerKg,
    stockVolumeKg: raw.stockVolumeKg,
    rawSupplierName: raw.supplierName,
  };

  const masked = maskPii(cleaned.text);
  const maskedSupplier = maskSupplierName(cleaned.rawSupplierName || '', 1);
  await deps.recordPdpAuditLog({
    traceId,
    fields: masked.fieldsMasked,
    alias: maskedSupplier,
  });

  const pdp: PdpSanitizedData = {
    text: masked.text,
    maskedSupplierAlias: maskedSupplier,
    fieldsMasked: masked.fieldsMasked,
    auditLogged: true,
  };

  const median = await deps.getHistoricalMedianPrice('TBS_SAWIT');
  const anomaly = detectPriceAnomaly(cleaned.commodityPricePerKg || 0, median);

  let summaryText = `Laporan diproses untuk ${pdp.maskedSupplierAlias}.`;
  if (deps.queryInference) {
    try {
      const res = await deps.queryInference({
        messages: [
          {
            role: 'system',
            content: 'Anda analis operasi sawit. Buat 1 kalimat ringkasan profesional bebas PII.',
          },
          {
            role: 'user',
            content: `Teks: ${pdp.text}. Status harga: ${anomaly.reasoning}`,
          },
        ],
      });
      summaryText = res.text.trim();
    } catch {
      summaryText = `${pdp.text.slice(0, 100)} | Anomali: ${anomaly.severity}`;
    }
  } else {
    summaryText = `${pdp.text} | Analisis harga: ${anomaly.reasoning}`;
  }

  const finalOutput: FinalAgentOutput = {
    summary: summaryText,
    headline: anomaly.isAnomaly
      ? `PERINGATAN ANOMALI HARGA (${anomaly.severity})`
      : 'OPERASIONAL NORMAL',
    actionRequired: anomaly.isAnomaly,
    pdpProtected: true,
    anomalyDetected: anomaly.isAnomaly,
  };

  return {
    raw_input: raw,
    cleaned_data: cleaned,
    pdp_sanitized: pdp,
    anomaly_analysis: anomaly,
    final_output: finalOutput,
  };
}
