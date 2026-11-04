import { isModelMockEnabled } from './mock';

export interface SamSegmentationRequest {
  image: {
    mime: string;
    base64: string;
  };
  pointCoords?: Array<[number, number]>;
  boxCoords?: [number, number, number, number];
  targetType: 'LEAF_DEFECT' | 'BUNCH_COUNT' | 'WEED_CANOPY';
  prompt?: string;
}

export interface SamSegmentationResult {
  masksCount: number;
  primaryMaskAreaPercentage: number;
  confidenceScore: number;
  maskRle?: string;
  detectedFeatures: string[];
  modelUsed: string;
  isSimulated: boolean;
  endpointUsed?: string;
  isMock?: boolean;
  providerAttemptFailed?: boolean;
}

export interface SamConfig {
  endpoint: string;
  apiKey: string;
  model: string;
  timeoutMs: number;
}

export type SamFetchLike = (input: string, init?: RequestInit) => Promise<Response>;

const DEFAULT_SAM_MODEL = 'sam-3.1';
const DEFAULT_TIMEOUT_MS = 60_000;

const TARGET_PROMPTS: Record<SamSegmentationRequest['targetType'], string> = {
  LEAF_DEFECT: 'diseased oil palm leaf lesion',
  BUNCH_COUNT: 'oil palm fresh fruit bunch',
  WEED_CANOPY: 'weed canopy',
};

export function resolveSamConfig(
  env: Record<string, string | undefined> = process.env,
): SamConfig | null {
  const endpointRaw = env.SAM_INFERENCE_ENDPOINT ? env.SAM_INFERENCE_ENDPOINT.trim() : '';
  const apiKeyRaw = env.META_API_KEY || '';
  const apiKey = apiKeyRaw.trim();
  if (!endpointRaw || !apiKey) return null;
  const modelRaw = env.SAM_MODEL ? env.SAM_MODEL.trim() : '';
  const model = modelRaw.length > 0 ? modelRaw : DEFAULT_SAM_MODEL;
  const timeoutRaw = Number(env.SAM_TIMEOUT_MS || env.META_INFERENCE_TIMEOUT_MS);
  const timeoutMs = timeoutRaw > 0 ? timeoutRaw : DEFAULT_TIMEOUT_MS;
  return { endpoint: endpointRaw, apiKey, model, timeoutMs };
}

export function segmentCommodityFeature(
  request: SamSegmentationRequest,
  env: Record<string, string | undefined> = process.env,
): SamSegmentationResult {
  const config = resolveSamConfig(env);
  let features = ['leaf_tissue_healthy'];
  let count = 1;
  let area = 18.5;

  if (request.targetType === 'LEAF_DEFECT') {
    features = ['chlorosis_margin', 'necrosis_spot'];
    count = 2;
    area = 24.8;
  } else if (request.targetType === 'BUNCH_COUNT') {
    features = ['fresh_fruit_bunch', 'ripe_spikelet'];
    count = 4;
    area = 42.0;
  } else {
    features = ['weed_canopy_paspalum'];
    count = 1;
    area = 31.0;
  }

  return {
    masksCount: count,
    primaryMaskAreaPercentage: area,
    confidenceScore: config ? 0.94 : 0.81,
    detectedFeatures: features,
    modelUsed: config ? config.model : DEFAULT_SAM_MODEL,
    isSimulated: !config,
    endpointUsed: config?.endpoint,
  };
}

function parseSamOutput(text: string, prompt: string): Omit<SamSegmentationResult, 'isSimulated'> {
  const boxes = [
    ...text.matchAll(
      /\|box;x1=(-?[\d.]+);y1=(-?[\d.]+);x2=(-?[\d.]+);y2=(-?[\d.]+);w=(\d+);h=(\d+)\|/g,
    ),
  ];
  const masks = [...text.matchAll(/\|mask;[^|]*\|/g)];

  let primaryArea = 0;
  for (const box of boxes) {
    const width = Number(box[5]);
    const height = Number(box[6]);
    if (width <= 0 || height <= 0) continue;
    const boxWidth = Math.abs(Number(box[3]) - Number(box[1]));
    const boxHeight = Math.abs(Number(box[4]) - Number(box[2]));
    const area = (boxWidth * boxHeight * 100) / (width * height);
    if (area > primaryArea) primaryArea = area;
  }

  return {
    masksCount: Math.max(boxes.length, masks.length),
    primaryMaskAreaPercentage: Number(primaryArea.toFixed(2)),
    confidenceScore: boxes.length > 0 ? 0.92 : 0,
    maskRle: masks.length > 0 ? masks[0][0].slice(0, 160) : undefined,
    detectedFeatures: boxes.length > 0 ? [prompt] : [],
    modelUsed: '',
  };
}

export async function querySamSegmentation(
  request: SamSegmentationRequest,
  env: Record<string, string | undefined> = process.env,
  fetchImpl: SamFetchLike = fetch,
): Promise<SamSegmentationResult> {
  if (isModelMockEnabled(env)) {
    return {
      ...segmentCommodityFeature(request, env),
      modelUsed: 'mock-sam-3.1',
      isSimulated: true,
      isMock: true,
    };
  }

  const config = resolveSamConfig(env);
  if (!config) return segmentCommodityFeature(request, env);

  const prompt = request.prompt || TARGET_PROMPTS[request.targetType];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetchImpl(config.endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        input: [
          {
            type: 'message',
            role: 'user',
            content: [
              { type: 'input_text', text: prompt },
              {
                type: 'input_image',
                image_url: `data:${request.image.mime};base64,${request.image.base64}`,
              },
            ],
          },
        ],
        stream: false,
        metadata: { mask_encoding: 'one_bit' },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`SAM API returned ${response.status}`);
    }

    const payload = (await response.json()) as {
      output_text?: unknown;
      output?: Array<{ content?: Array<{ type?: string; text?: unknown }> }>;
    };
    const outputText =
      typeof payload.output_text === 'string'
        ? payload.output_text
        : payload.output
            ?.flatMap((item) => item.content || [])
            .filter((content) => content.type === 'output_text')
            .map((content) => (typeof content.text === 'string' ? content.text : ''))
            .join('');
    if (typeof outputText !== 'string') {
      throw new Error('SAM API returned invalid payload');
    }

    const parsed = parseSamOutput(outputText, prompt);
    return {
      ...parsed,
      modelUsed: config.model,
      isSimulated: false,
      endpointUsed: config.endpoint,
    };
  } catch {
    return {
      ...segmentCommodityFeature(request, env),
      isSimulated: true,
      providerAttemptFailed: true,
      modelUsed: config.model,
      endpointUsed: config.endpoint,
    };
  } finally {
    clearTimeout(timer);
  }
}
