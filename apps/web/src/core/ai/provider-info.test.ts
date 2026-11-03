import { detectProvider, describeProvider } from './provider-info';

describe('provider info detection', () => {
  it('detects mock and unconfigured states', () => {
    expect(describeProvider('https://api.meta.ai/v1', true)).toEqual({
      id: 'mock',
      label: 'Mock model',
    });
    expect(detectProvider(undefined)).toEqual({ id: 'unconfigured', label: 'Not configured' });
    expect(detectProvider('   ')).toEqual({ id: 'unconfigured', label: 'Not configured' });
  });

  it('detects known inference providers from endpoint', () => {
    expect(detectProvider('https://api.meta.ai/v1/responses').id).toBe('meta-model-api');
    expect(detectProvider('https://model-xxxx.api.baseten.co/production/predict').id).toBe(
      'baseten',
    );
    expect(detectProvider('https://api.fireworks.ai/inference/v1/chat/completions').id).toBe(
      'fireworks',
    );
    expect(detectProvider('https://xxxx.modal.run/v1').id).toBe('modal');
    expect(detectProvider('http://my-ollama.internal:11434/v1').id).toBe('ollama');
  });

  it('detects local and generic OpenAI-compatible endpoints', () => {
    expect(detectProvider('http://localhost:8080/v1/chat/completions').id).toBe('local');
    expect(detectProvider('http://127.0.0.1:8000/v1').id).toBe('local');
    expect(detectProvider('http://custom-host:11434/api').id).toBe('ollama');
    expect(detectProvider('https://inference.example.com/v1/chat/completions').id).toBe(
      'openai-compatible',
    );
    expect(describeProvider('https://api.meta.ai/v1', false).id).toBe('meta-model-api');
  });
});
