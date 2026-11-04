import { isModelMockEnabled, MOCK_VISION_DIAGNOSIS } from './mock';

export interface VisionInferenceRequest {
  image: {
    mime: string;
    base64: string;
  };
  caption?: string;
  blockCode?: string;
  symptoms?: string;
}

export interface VisionInferenceResult {
  diagnosis: string;
  riskLevel: 'RENDAH' | 'SEDANG' | 'TINGGI' | 'KRITIS';
  actionsToday: string[];
  actionsNextDays: string[];
  confidence: number;
  segmentation?: {
    objectsCount?: number;
    affectedAreaPercentage?: number;
    primaryColorHex?: string;
    segmentationMaskUrl?: string;
  };
  rawText: string;
  modelUsed: string;
  isFallback: boolean;
  isMock?: boolean;
}

export interface VisionProvider {
  analyzeImage(request: VisionInferenceRequest): Promise<VisionInferenceResult>;
}

export interface VisionConfig {
  endpoint: string;
  apiKey: string;
  model: string;
  timeoutMs: number;
}

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export class VisionInferenceError extends Error {
  constructor(
    public readonly code: 'NOT_CONFIGURED' | 'REQUEST_FAILED' | 'INVALID_RESPONSE',
    message: string,
  ) {
    super(message);
    this.name = 'VisionInferenceError';
  }
}

const DEFAULT_VISION_MODEL = 'meta-llama/Llama-3.2-90B-Vision-Instruct';
const DEFAULT_TIMEOUT_MS = 30000;

export function resolveVisionConfig(
  env: Record<string, string | undefined> = process.env,
): VisionConfig | null {
  const endpoint = env.VISION_INFERENCE_ENDPOINT
    ? env.VISION_INFERENCE_ENDPOINT.trim()
    : env.META_INFERENCE_ENDPOINT
      ? env.META_INFERENCE_ENDPOINT.trim()
      : '';
  const rawApiKey = env.META_API_KEY || '';
  const apiKey = rawApiKey.trim();
  if (!endpoint || !apiKey) return null;
  const modelRaw = env.VISION_MODEL ? env.VISION_MODEL.trim() : '';
  const model = modelRaw.length > 0 ? modelRaw : DEFAULT_VISION_MODEL;
  const timeoutRaw = Number(
    env.VISION_TIMEOUT_MS ? env.VISION_TIMEOUT_MS : env.META_INFERENCE_TIMEOUT_MS,
  );
  const timeoutMs = timeoutRaw > 0 ? timeoutRaw : DEFAULT_TIMEOUT_MS;
  return { endpoint, apiKey, model, timeoutMs };
}

export function createVisionInferenceProvider(
  config: VisionConfig,
  fetchImpl: FetchLike = fetch,
): VisionProvider {
  return {
    async analyzeImage(request) {
      const controller = new AbortController();
      const onTimeout = () => {
        controller.abort();
      };
      const timer = setTimeout(onTimeout, config.timeoutMs);
      try {
        const prompt = `Analisa kondisi daun atau buah sawit dari foto ini.
Blok: ${request.blockCode ? request.blockCode : 'Tidak diketahui'}
Gejala tertulis: ${request.symptoms ? request.symptoms : '-'}
Keterangan foto: ${request.caption ? request.caption : '-'}
Hasilkan diagnosis awal dalam format:
Diagnosa: [nama kondisi/penyakit]
Risiko: [RENDAH/SEDANG/TINGGI/KRITIS]
Tindakan Hari Ini: [tindakan singkat]
Tindakan 7-14 Hari: [tindakan lanjutan]

Dilarang memberikan dosis final. Selalu sertakan: Sesuaikan dengan hasil analisa daun/tanah dan label resmi produk.`;

        const response = await fetchImpl(config.endpoint, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${config.apiKey}`,
          },
          body: JSON.stringify({
            model: config.model,
            reasoning_effort: 'low',
            messages: [
              {
                role: 'system',
                content:
                  'Anda agronomis kebun sawit ahli dari PPKS. Berikan diagnosis awal dari foto dengan bahasa Indonesia yang jelas.',
              },
              {
                role: 'user',
                content: [
                  { type: 'text', text: prompt },
                  {
                    type: 'image_url',
                    image_url: { url: `data:${request.image.mime};base64,${request.image.base64}` },
                  },
                ],
              },
            ],
            temperature: 0.2,
            max_tokens: 1000,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new VisionInferenceError(
            'REQUEST_FAILED',
            `Vision API returned ${response.status}`,
          );
        }

        const payload = (await response.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const text =
          payload.choices &&
          payload.choices[0] &&
          payload.choices[0].message &&
          payload.choices[0].message.content
            ? payload.choices[0].message.content.trim()
            : '';
        if (!text) {
          throw new VisionInferenceError('INVALID_RESPONSE', 'Vision API returned no content');
        }

        const diagnosisMatch = text.match(/Diagnosa:\s*(.+)/i);
        const riskMatch = text.match(/Risiko:\s*(RENDAH|SEDANG|TINGGI|KRITIS)/i);
        const todayMatch = text.match(/Tindakan Hari Ini:\s*(.+)/i);
        const nextDaysMatch = text.match(/Tindakan 7-14 Hari:\s*(.+)/i);
        const risk = riskMatch
          ? (riskMatch[1].toUpperCase() as VisionInferenceResult['riskLevel'])
          : 'SEDANG';
        const confidence = text.toLowerCase().includes('yakin') ? 0.92 : 0.78;

        return {
          diagnosis:
            diagnosisMatch && diagnosisMatch[1]
              ? diagnosisMatch[1].trim()
              : 'Indikasi penyakit tanaman sawit perlu review agronomist',
          riskLevel: risk,
          actionsToday: [
            todayMatch && todayMatch[1]
              ? todayMatch[1].trim().slice(0, 80)
              : 'Lakukan scouting dan foto ulang daun yang terdampak',
          ],
          actionsNextDays: [
            nextDaysMatch && nextDaysMatch[1]
              ? nextDaysMatch[1].trim()
              : 'Pantau penyebaran penyakit dan lakukan pengendalian sesuai SOP PPKS',
          ],
          confidence,
          rawText: text,
          modelUsed: config.model,
          isFallback: false,
        };
      } catch (error) {
        if (error instanceof VisionInferenceError) throw error;
        const msg = error instanceof Error ? error.message : 'Synthesis error';
        throw new VisionInferenceError('REQUEST_FAILED', `Vision fetch failed: ${msg}`);
      } finally {
        clearTimeout(timer);
      }
    },
  };
}

export function analyzeImageFallback(request: VisionInferenceRequest): VisionInferenceResult {
  const text =
    `${request.symptoms ? request.symptoms : ''} ${request.caption ? request.caption : ''}`.toLowerCase();
  let diagnosis = 'Indikasi defisiensi unsur hara daun kelapa sawit';
  let riskLevel: VisionInferenceResult['riskLevel'] = 'SEDANG';
  let area = 15;

  if (
    text.includes('menguning') ||
    text.includes('kuning') ||
    text.includes('defisiensi') ||
    text.includes('yellow')
  ) {
    diagnosis = 'Indikasi defisiensi kalium / nitrogen ringan';
    area = 22;
  } else if (text.includes('ganoderma')) {
    diagnosis = 'Indikasi serius ganoderma pangkal batang kelapa sawit';
    riskLevel = 'KRITIS';
    area = 65;
  } else if (text.includes('ulat')) {
    diagnosis = 'Indikasi serangan ulat api / ulat kantung tanaman sawit';
    riskLevel = 'TINGGI';
    area = 35;
  } else if (text.includes('bercak')) {
    diagnosis = 'Indikasi penyakit bercak daun Curvularia atau penyakit layu';
    riskLevel = 'TINGGI';
    area = 45;
  }

  return {
    diagnosis,
    riskLevel,
    actionsToday: [
      'Lakukan scouting visual dan dokumentasi foto jarak dekat',
      'Tandai pohon dengan pita berwarna',
    ],
    actionsNextDays: [
      'Ambil sampel daun untuk analisa laboratorium',
      'Aplikasi pengendalian sesuai SOP PPKS dan label produk resmi',
    ],
    confidence: 0.55,
    segmentation: {
      objectsCount: 1,
      affectedAreaPercentage: area,
      primaryColorHex: '#EAECEE',
    },
    rawText: `Fallback diagnosis for ${request.blockCode ? request.blockCode : 'unknown'}: ${text}`,
    modelUsed: 'rule-based-fallback-engine',
    isFallback: true,
  };
}

export async function queryMetaVisionInference(
  request: VisionInferenceRequest,
  env: Record<string, string | undefined> = process.env,
  fetchImpl: FetchLike = fetch,
  onProviderFailure?: (error: unknown, model: string) => Promise<void>,
): Promise<VisionInferenceResult> {
  if (isModelMockEnabled(env)) {
    return {
      diagnosis: MOCK_VISION_DIAGNOSIS,
      riskLevel: 'SEDANG',
      actionsToday: ['Lakukan scouting visual dan dokumentasi mock'],
      actionsNextDays: ['Konfirmasi hasil mock dengan agronom lapangan'],
      confidence: 0.88,
      segmentation: {
        objectsCount: 1,
        affectedAreaPercentage: 22,
        primaryColorHex: '#EAECEE',
      },
      rawText: MOCK_VISION_DIAGNOSIS,
      modelUsed: 'mock-meta-vision',
      isFallback: false,
      isMock: true,
    };
  }

  const config = resolveVisionConfig(env);
  if (!config) {
    throw new VisionInferenceError('NOT_CONFIGURED', 'Vision endpoint tidak dikonfigurasi');
  }
  try {
    const provider = createVisionInferenceProvider(config, fetchImpl);
    return await provider.analyzeImage(request);
  } catch (error) {
    await onProviderFailure?.(error, config.model);
    return analyzeImageFallback(request);
  }
}
