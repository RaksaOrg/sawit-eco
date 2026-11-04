import {
  createMetaInferenceProvider,
  queryMetaInferenceEngine,
  resolveInferenceConfig,
  InferenceError,
} from './inference';

describe('inference engine tests', () => {
  it('resolves config from env correctly or returns null if missing', () => {
    expect(resolveInferenceConfig({})).toBeNull();
    expect(resolveInferenceConfig({ META_INFERENCE_ENDPOINT: 'https://x' })).toBeNull();
    expect(
      resolveInferenceConfig({ META_INFERENCE_ENDPOINT: '   ', META_API_KEY: 'k' }),
    ).toBeNull();
    expect(
      resolveInferenceConfig({ META_INFERENCE_ENDPOINT: 'https://x', META_API_KEY: '   ' }),
    ).toBeNull();
    expect(resolveInferenceConfig({ META_API_KEY: 'k' })).toBeNull();
    expect(
      resolveInferenceConfig({
        META_INFERENCE_ENDPOINT: '',
        META_API_KEY: '',
      }),
    ).toBeNull();
    const customConf = resolveInferenceConfig({
      META_INFERENCE_ENDPOINT: 'https://baseten.mock/v1',
      META_API_KEY: 'sec-123',
      META_MODEL: 'custom-model',
      META_INFERENCE_TIMEOUT_MS: '15000',
    });
    expect(customConf?.model).toBe('custom-model');
    expect(customConf?.timeoutMs).toBe(15000);

    const emptyModelConf = resolveInferenceConfig({
      META_INFERENCE_ENDPOINT: 'https://baseten.mock/v1',
      META_API_KEY: 'sec-123',
      META_MODEL: '   ',
      META_INFERENCE_TIMEOUT_MS: '0',
    });
    expect(emptyModelConf?.model).toBe('muse-spark-1.3');
    expect(emptyModelConf?.timeoutMs).toBe(30000);
    const conf = resolveInferenceConfig({
      META_INFERENCE_ENDPOINT: 'https://baseten.mock/v1',
      META_API_KEY: 'sec-123',
    });
    expect(conf?.endpoint).toBe('https://baseten.mock/v1');
    expect(conf?.model).toBe('muse-spark-1.3');
  });

  it('completes inference via provider mock fetch', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Hasil rekomendasi pupuk.' } }],
      }),
    });

    const provider = createMetaInferenceProvider(
      {
        endpoint: 'https://endpoint.mock',
        apiKey: 'key',
        model: 'llama-3.3',
        timeoutMs: 5000,
      },
      mockFetch as unknown as typeof fetch,
    );

    const res = await provider.complete({
      temperature: 0.7,
      maxTokens: 500,
      messages: [{ role: 'user', content: 'Halo' }],
    });
    expect(res.text).toBe('Hasil rekomendasi pupuk.');
    expect(res.provider).toBe('meta');
    expect(JSON.parse(String(mockFetch.mock.calls[0][1]?.body)).reasoning_effort).toBe('low');
  });

  it('throws InferenceError on HTTP failure or invalid response', async () => {
    const failedFetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 502,
    });
    const provider = createMetaInferenceProvider(
      {
        endpoint: 'https://endpoint.mock',
        apiKey: 'key',
        model: 'llama-3.3',
        timeoutMs: 5000,
      },
      failedFetch as unknown as typeof fetch,
    );
    await expect(
      provider.complete({ messages: [{ role: 'user', content: 'hi' }] }),
    ).rejects.toThrow('Inference HTTP 502');

    const emptyFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
    const emptyProvider = createMetaInferenceProvider(
      {
        endpoint: 'https://endpoint.mock',
        apiKey: 'key',
        model: 'llama-3.3',
        timeoutMs: 5000,
      },
      emptyFetch as unknown as typeof fetch,
    );
    await expect(
      emptyProvider.complete({ messages: [{ role: 'user', content: 'hi' }] }),
    ).rejects.toThrow('Inference returned no text');

    const nonStringFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: { invalid: true } } }] }),
    });
    const nonStringProvider = createMetaInferenceProvider(
      { endpoint: 'https://endpoint.mock', apiKey: 'key', model: 'llama-3.3', timeoutMs: 5000 },
      nonStringFetch as unknown as typeof fetch,
    );
    await expect(
      nonStringProvider.complete({ messages: [{ role: 'user', content: 'hi' }] }),
    ).rejects.toThrow('Inference returned no text');
  });

  it('queryMetaInferenceEngine throws NOT_CONFIGURED when env missing', async () => {
    await expect(queryMetaInferenceEngine({ messages: [] }, {})).rejects.toThrow(InferenceError);
  });

  it('queryMetaInferenceEngine returns result when configured', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'OK' } }] }),
    });
    const originalFetch = global.fetch;
    global.fetch = mockFetch as unknown as typeof fetch;
    const defaultFetchProvider = createMetaInferenceProvider({
      endpoint: 'https://x',
      apiKey: 'k',
      model: 'm',
      timeoutMs: 100,
    });
    const defaultFetchRes = await defaultFetchProvider.complete({ messages: [] });
    expect(defaultFetchRes.text).toBe('OK');

    process.env.META_INFERENCE_ENDPOINT = 'https://x';
    process.env.META_API_KEY = 'k';
    const resEnvDefault = await queryMetaInferenceEngine({
      messages: [{ role: 'user', content: 'halo' }],
    });
    expect(resEnvDefault.text).toBe('OK');
    delete process.env.META_INFERENCE_ENDPOINT;
    delete process.env.META_API_KEY;

    const res = await queryMetaInferenceEngine(
      { messages: [{ role: 'user', content: 'halo' }] },
      { META_INFERENCE_ENDPOINT: 'https://x', META_API_KEY: 'k' },
    );
    global.fetch = originalFetch;
    expect(res.text).toBe('OK');
  });

  it('wraps JSON parse failures and error rejections', async () => {
    const jsonFail = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => {
        throw new Error('bad json');
      },
    });
    const p1 = createMetaInferenceProvider(
      { endpoint: 'https://x', apiKey: 'k', model: 'm', timeoutMs: 100 },
      jsonFail as unknown as typeof fetch,
    );
    await expect(p1.complete({ messages: [] })).rejects.toThrow('Inference failed: bad json');

    const rejectError = jest.fn().mockRejectedValue(new Error('network'));
    const p2 = createMetaInferenceProvider(
      { endpoint: 'https://x', apiKey: 'k', model: 'm', timeoutMs: 100 },
      rejectError as unknown as typeof fetch,
    );
    await expect(p2.complete({ messages: [] })).rejects.toThrow('Inference failed: network');
  });

  it('wraps non-Error failures as REQUEST_FAILED', async () => {
    const badFetch = jest.fn().mockRejectedValue('network down');
    const provider = createMetaInferenceProvider(
      { endpoint: 'https://x', apiKey: 'k', model: 'm', timeoutMs: 100 },
      badFetch as unknown as typeof fetch,
    );
    await expect(provider.complete({ messages: [] })).rejects.toThrow(
      'Inference failed: unknown error',
    );
  });
});

it('triggers abort signal on timeout', async () => {
  const slowFetch = jest.fn((_url: string, init?: RequestInit) => {
    return new Promise((_resolve, reject) => {
      if (init?.signal) {
        init.signal.addEventListener('abort', () => {
          reject(new Error('aborted'));
        });
      }
    });
  });
  const provider = createMetaInferenceProvider(
    { endpoint: 'https://x', apiKey: 'k', model: 'm', timeoutMs: 10 },
    slowFetch as unknown as typeof fetch,
  );
  await expect(provider.complete({ messages: [] })).rejects.toThrow('Inference failed: aborted');
});

describe('META_API_KEY guard for reasoning endpoint', () => {
  it('skips the endpoint when META_API_KEY is missing, empty, or undefined', async () => {
    for (const key of [undefined, '']) {
      const fetchMock = jest.fn();
      await expect(
        queryMetaInferenceEngine(
          { messages: [] },
          {
            META_INFERENCE_ENDPOINT: 'https://api.meta.ai/v1/chat/completions',
            META_API_KEY: key,
          },
          fetchMock as unknown as typeof fetch,
        ),
      ).rejects.toThrow(InferenceError);
      expect(fetchMock).not.toHaveBeenCalled();
    }
  });
});
