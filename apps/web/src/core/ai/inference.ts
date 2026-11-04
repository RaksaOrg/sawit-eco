import { isModelMockEnabled, MOCK_REASONING_TEXT } from './mock';

export type ChatRole = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface InferenceRequest {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}

export interface InferenceResult {
  text: string;
  model: string;
  provider: 'meta';
}

export interface InferenceProvider {
  complete(request: InferenceRequest): Promise<InferenceResult>;
}

export interface InferenceConfig {
  endpoint: string;
  apiKey: string;
  model: string;
  timeoutMs: number;
}

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export type InferenceErrorCode = 'NOT_CONFIGURED' | 'REQUEST_FAILED' | 'INVALID_RESPONSE';

export class InferenceError extends Error {
  constructor(
    public readonly code: InferenceErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'InferenceError';
  }
}

const DEFAULT_MODEL = 'muse-spark-1.3';
const DEFAULT_TIMEOUT_MS = 30_000;

export function resolveInferenceConfig(
  env: Record<string, string | undefined>,
): InferenceConfig | null {
  const rawEndpoint = env.META_INFERENCE_ENDPOINT;
  const rawApiKey = env.META_API_KEY;
  if (!rawEndpoint || !rawApiKey) return null;
  const endpoint = rawEndpoint.trim();
  const apiKey = rawApiKey.trim();
  if (!endpoint || !apiKey) return null;
  const rawModel = env.META_MODEL;
  const model = rawModel && rawModel.trim().length > 0 ? rawModel.trim() : DEFAULT_MODEL;
  const timeout = Number(env.META_INFERENCE_TIMEOUT_MS);
  const timeoutMs = timeout > 0 ? timeout : DEFAULT_TIMEOUT_MS;
  return { endpoint, apiKey, model, timeoutMs };
}

export function createMetaInferenceProvider(
  config: InferenceConfig,
  fetchImpl: FetchLike = fetch,
): InferenceProvider {
  return {
    async complete(request) {
      const controller = new AbortController();
      const onTimeout = () => {
        controller.abort();
      };
      const timer = setTimeout(onTimeout, config.timeoutMs);
      try {
        const response = await fetchImpl(config.endpoint, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${config.apiKey}`,
          },
          body: JSON.stringify({
            model: config.model,
            messages: request.messages,
            temperature: request.temperature ?? 0.2,
            max_tokens: request.maxTokens ?? 800,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new InferenceError('REQUEST_FAILED', `Inference HTTP ${response.status}`);
        }

        const payload = (await response.json()) as {
          choices?: Array<{ message?: { content?: unknown } }>;
        };
        const rawText = payload.choices?.[0]?.message?.content;
        const text = typeof rawText === 'string' ? rawText : '';
        if (!text) {
          throw new InferenceError('INVALID_RESPONSE', 'Inference returned no text');
        }

        return { text, model: config.model, provider: 'meta' };
      } catch (error) {
        if (error instanceof InferenceError) throw error;
        const reason = error instanceof Error ? error.message : 'unknown error';
        throw new InferenceError('REQUEST_FAILED', `Inference failed: ${reason}`);
      } finally {
        clearTimeout(timer);
      }
    },
  };
}

export async function queryMetaInferenceEngine(
  request: InferenceRequest,
  env: Record<string, string | undefined> = process.env,
  fetchImpl: FetchLike = fetch,
): Promise<InferenceResult> {
  if (isModelMockEnabled(env)) {
    return {
      text: MOCK_REASONING_TEXT,
      model: 'mock-meta-llama',
      provider: 'meta',
    };
  }

  const config = resolveInferenceConfig(env);
  if (!config) {
    throw new InferenceError(
      'NOT_CONFIGURED',
      'META_INFERENCE_ENDPOINT dan META_API_KEY belum dikonfigurasi',
    );
  }
  return createMetaInferenceProvider(config, fetchImpl).complete(request);
}
