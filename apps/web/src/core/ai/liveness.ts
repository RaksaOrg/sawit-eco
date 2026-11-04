export type LivenessFrame = { mime: 'image/jpeg'; base64: string };

export type LivenessConfig = {
  endpoint: string;
  apiKey: string;
  model: string;
  timeoutMs: number;
};

export type LivenessResult = {
  isLive: boolean;
  confidence: number;
  presentationAttack: boolean;
};

export function resolveLivenessConfig(
  env: Record<string, string | undefined> = process.env,
): LivenessConfig | null {
  const endpoint =
    env.VISION_INFERENCE_ENDPOINT?.trim() || env.META_INFERENCE_ENDPOINT?.trim() || '';
  const apiKey = env.META_API_KEY?.trim() || '';
  if (!endpoint || !apiKey) return null;
  const timeoutValue = Number(env.VISION_TIMEOUT_MS || env.META_INFERENCE_TIMEOUT_MS);
  return {
    endpoint,
    apiKey,
    model: env.VISION_MODEL?.trim() || env.META_MODEL?.trim() || 'muse-spark-1.3',
    timeoutMs: timeoutValue > 0 ? timeoutValue : 30000,
  };
}

export function parseLivenessResult(content: string): LivenessResult | null {
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const value = JSON.parse(match[0]) as Record<string, unknown>;
    if (
      typeof value.is_live !== 'boolean' ||
      typeof value.presentation_attack !== 'boolean' ||
      typeof value.confidence !== 'number' ||
      !Number.isFinite(value.confidence) ||
      value.confidence < 0 ||
      value.confidence > 1
    )
      return null;
    return {
      isLive: value.is_live && value.confidence >= 0.85 && !value.presentation_attack,
      confidence: value.confidence,
      presentationAttack: value.presentation_attack,
    };
  } catch {
    return null;
  }
}

export async function verifyLiveness(
  frames: LivenessFrame[],
  challengeOrder: 'right,left,blink' | 'left,right,blink',
  config: LivenessConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<LivenessResult> {
  if (frames.length !== 3 || frames.some((frame) => frame.base64.length > 6_000_000)) {
    throw new Error('Invalid liveness frames');
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
  try {
    const response = await fetchImpl(config.endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${config.apiKey}` },
      body: JSON.stringify({
        model: config.model,
        temperature: 0,
        max_tokens: 250,
        messages: [
          {
            role: 'system',
            content:
              'Assess visible evidence in three ordered selfie frames after prompted head turns and blink. Do not claim certainty. Return only JSON: {"is_live":boolean,"confidence":number,"presentation_attack":boolean}. Reject photos of screens, printed photos, masks, deepfakes, missing face, or inconsistent identity. A single image cannot prove liveness.',
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Frames ordered by challenge: ${challengeOrder}. Assess whether sequence appears to show one live human performing requested motion.`,
              },
              ...frames.map((frame) => ({
                type: 'image_url',
                image_url: { url: `data:${frame.mime};base64,${frame.base64}` },
              })),
            ],
          },
        ],
      }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Liveness inference failed (${response.status})`);
    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const result = parseLivenessResult(payload.choices?.[0]?.message?.content || '');
    if (!result) throw new Error('Invalid liveness inference response');
    return result;
  } finally {
    clearTimeout(timeout);
  }
}
