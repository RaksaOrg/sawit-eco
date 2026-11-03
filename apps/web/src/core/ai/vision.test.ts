import {
  resolveVisionConfig,
  createVisionInferenceProvider,
  analyzeImageFallback,
  queryMetaVisionInference,
  VisionInferenceError,
} from './vision';

describe('Meta Vision Pipeline (Llama 3.2 90B Vision)', () => {
  const dummyRequest = {
    image: {
      mime: 'image/jpeg',
      base64:
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    },
    blockCode: 'B2',
    symptoms: 'Daun menguning tepi pelepah tua',
    caption: 'Foto daun kelapa sawit',
  };

  it('resolves vision config from env correctly or returns null', () => {
    expect(resolveVisionConfig({})).toBeNull();
    const config = resolveVisionConfig({
      VISION_INFERENCE_ENDPOINT: 'https://baseten.mock/v1/vision',
      MODEL_API_KEY: 'sec-key-123',
    });
    expect(config?.endpoint).toBe('https://baseten.mock/v1/vision');
    expect(config?.model).toBe('meta-llama/Llama-3.2-90B-Vision-Instruct');
    expect(config?.timeoutMs).toBe(30000);

    const customConfig = resolveVisionConfig({
      META_INFERENCE_ENDPOINT: 'https://fallback.mock/v1',
      MODEL_API_KEY: 'sec-123',
      VISION_MODEL: 'custom-vision-model',
      VISION_TIMEOUT_MS: '45000',
    });
    expect(customConfig?.endpoint).toBe('https://fallback.mock/v1');
    expect(customConfig?.model).toBe('custom-vision-model');
    expect(customConfig?.timeoutMs).toBe(45000);
  });

  it('analyzes image via mock fetch with structured output and parses fields', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content:
                'yakin Diagnosa: Defisiensi Kalium\nRisiko: TINGGI\nTindakan Hari Ini: Ambil sampel daun di 10 pokok\nTindakan 7-14 Hari: Aplikasi KCl 1.5kg/pokok. Sesuaikan dengan hasil analisa daun/tanah dan label resmi produk.',
            },
          },
        ],
      }),
    });

    const provider = createVisionInferenceProvider(
      {
        endpoint: 'https://baseten.mock/v1/vision',
        apiKey: 'key',
        model: 'meta-llama/Llama-3.2-90B-Vision-Instruct',
        timeoutMs: 5000,
      },
      mockFetch as unknown as typeof fetch,
    );

    const result = await provider.analyzeImage(dummyRequest);
    expect(result.diagnosis).toBe('Defisiensi Kalium');
    expect(result.riskLevel).toBe('TINGGI');
    expect(result.confidence).toBe(0.92);
    expect(result.isFallback).toBe(false);

    // Fallback parsing branch when diagnosis regex doesn't match
    const mockFetchUnstructured = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Hasil analisis tidak terstruktur' } }],
      }),
    });
    const providerUnstructured = createVisionInferenceProvider(
      {
        endpoint: 'https://baseten.mock/v1/vision',
        apiKey: 'key',
        model: 'meta-llama/Llama-3.2-90B-Vision-Instruct',
        timeoutMs: 5000,
      },
      mockFetchUnstructured as unknown as typeof fetch,
    );
    const unstructResult = await providerUnstructured.analyzeImage({
      ...dummyRequest,
      blockCode: undefined,
      symptoms: undefined,
      caption: undefined,
    });
    expect(unstructResult.confidence).toBe(0.78);
    expect(unstructResult.riskLevel).toBe('SEDANG');
  });

  it('handles abort on timeout properly', async () => {
    const slowFetch = jest.fn((_url: string, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        if (init?.signal) {
          init.signal.addEventListener('abort', () => {
            reject(new Error('aborted'));
          });
        }
      });
    });
    const provider = createVisionInferenceProvider(
      { endpoint: 'https://x', apiKey: 'k', model: 'm', timeoutMs: 10 },
      slowFetch as unknown as typeof fetch,
    );
    await expect(provider.analyzeImage(dummyRequest)).rejects.toThrow(
      'Vision fetch failed: aborted',
    );
  });

  it('uses rule-based fallback when vision API fails or timeout occurs', async () => {
    const fallback = analyzeImageFallback(dummyRequest);
    expect(fallback.diagnosis).toContain('defisiensi');
    expect(fallback.riskLevel).toBe('SEDANG');
    expect(fallback.isFallback).toBe(true);

    const ganoFallback = analyzeImageFallback({
      ...dummyRequest,
      symptoms: 'busuk pangkal ganoderma',
    });
    expect(ganoFallback.riskLevel).toBe('KRITIS');

    const pestFallback = analyzeImageFallback({
      ...dummyRequest,
      symptoms: 'ulat api memakan daun',
    });
    expect(pestFallback.diagnosis).toContain('ulat api');
    expect(pestFallback.riskLevel).toBe('TINGGI');

    const spotFallback = analyzeImageFallback({
      ...dummyRequest,
      symptoms: 'bercak coklat konsentris',
    });
    expect(spotFallback.riskLevel).toBe('TINGGI');

    const genericFallback = analyzeImageFallback({ ...dummyRequest, symptoms: '', caption: '' });
    expect(genericFallback.diagnosis).toContain('defisiensi unsur hara');

    const failedFetch = jest.fn().mockRejectedValue(new Error('Network error'));
    const env = {
      VISION_INFERENCE_ENDPOINT: 'https://mock/v1',
      MODEL_API_KEY: 'key',
    };
    const res = await queryMetaVisionInference(
      dummyRequest,
      env,
      failedFetch as unknown as typeof fetch,
    );
    expect(res.isFallback).toBe(true);
    expect(res.diagnosis).toBeDefined();

    const successFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Diagnosa: Sehat\nRisiko: RENDAH' } }],
      }),
    });
    const successRes = await queryMetaVisionInference(
      dummyRequest,
      env,
      successFetch as unknown as typeof fetch,
    );
    expect(successRes.isFallback).toBe(false);
  });

  it('throws error on empty response or bad status in provider', async () => {
    const emptyFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '' } }] }),
    });
    const provider = createVisionInferenceProvider(
      {
        endpoint: 'https://mock',
        apiKey: 'key',
        model: 'model',
        timeoutMs: 1000,
      },
      emptyFetch as unknown as typeof fetch,
    );
    await expect(provider.analyzeImage(dummyRequest)).rejects.toThrow(
      'Vision API returned no content',
    );

    const badStatusFetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 502,
    });
    const badProvider = createVisionInferenceProvider(
      {
        endpoint: 'https://mock',
        apiKey: 'key',
        model: 'model',
        timeoutMs: 1000,
      },
      badStatusFetch as unknown as typeof fetch,
    );
    await expect(badProvider.analyzeImage(dummyRequest)).rejects.toThrow('Vision API returned 502');
  });

  it('throws NOT_CONFIGURED when env is missing', async () => {
    await expect(queryMetaVisionInference(dummyRequest, {})).rejects.toThrow(VisionInferenceError);
  });
});

describe('MODEL_API_KEY guard for vision endpoint', () => {
  it('skips the endpoint when MODEL_API_KEY is missing, empty, or undefined', async () => {
    for (const key of [undefined, '']) {
      const fetchMock = jest.fn();
      await expect(
        queryMetaVisionInference(
          { image: { mime: 'image/jpeg', base64: 'abc' }, blockCode: 'B2' },
          {
            VISION_INFERENCE_ENDPOINT: 'https://api.meta.ai/v1/chat/completions',
            MODEL_API_KEY: key,
          },
          fetchMock as unknown as typeof fetch,
        ),
      ).rejects.toThrow(VisionInferenceError);
      expect(fetchMock).not.toHaveBeenCalled();
    }
  });
});
