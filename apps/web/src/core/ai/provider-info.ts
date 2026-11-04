export interface ProviderInfo {
  id:
    | 'mock'
    | 'unconfigured'
    | 'meta-model-api'
    | 'baseten'
    | 'fireworks'
    | 'modal'
    | 'ollama'
    | 'local'
    | 'openai-compatible';
  label: string;
}

const PROVIDERS: Array<{ match: string; info: ProviderInfo }> = [
  { match: 'api.meta.ai', info: { id: 'meta-model-api', label: 'Meta Model API' } },
  { match: 'baseten', info: { id: 'baseten', label: 'Baseten' } },
  { match: 'fireworks', info: { id: 'fireworks', label: 'Fireworks AI' } },
  { match: 'modal', info: { id: 'modal', label: 'Modal' } },
  { match: 'ollama', info: { id: 'ollama', label: 'Ollama Local' } },
];

export function detectProvider(endpoint?: string | null): ProviderInfo {
  if (!endpoint || endpoint.trim().length === 0) {
    return { id: 'unconfigured', label: 'Not configured' };
  }
  const lower = endpoint.toLowerCase();
  for (const provider of PROVIDERS) {
    if (lower.includes(provider.match)) return provider.info;
  }
  if (lower.includes(':11434')) {
    return { id: 'ollama', label: 'Ollama Local' };
  }
  if (lower.includes('0.0.0.0') || lower.includes('127.0.0.1')) {
    return { id: 'local', label: 'Local endpoint' };
  }
  return { id: 'openai-compatible', label: 'OpenAI-compatible provider' };
}

export function describeProvider(
  endpoint: string | null | undefined,
  mockEnabled: boolean,
): ProviderInfo {
  if (mockEnabled) return { id: 'mock', label: 'Mock model' };
  return detectProvider(endpoint);
}
