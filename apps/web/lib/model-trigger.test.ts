import { getModelProvider } from './model-trigger';

describe('getModelProvider', () => {
  it('labels Meta and OpenAI hosts without recording full endpoint URLs', () => {
    expect(getModelProvider('https://api.meta.ai/v1/chat/completions')).toBe('meta');
    expect(getModelProvider('https://api.openai.com/v1/chat/completions')).toBe('openai');
    expect(getModelProvider('https://inference.example.com/v1')).toBe('openai-compatible');
  });

  it('uses fallback for missing or invalid endpoint', () => {
    expect(getModelProvider(undefined, 'mock')).toBe('mock');
    expect(getModelProvider('not a URL', 'unknown')).toBe('unknown');
  });
});
