import { segmentCommodityFeature, querySamSegmentation, resolveSamConfig } from './sam';

const sampleBoxes =
  '<0f>0<|box;x1=10;y1=20;x2=110;y2=120;w=1000;h=1000|><|mask;x=0;y=0;data=46,101,~abc|>,1<|box;x1=200;y1=200;x2=400;y2=500;w=1000;h=1000|><|mask;x=0;y=0;data=46,81,~def|>';

describe('SAM 3.1 via Meta Model API', () => {
  const req = {
    image: { mime: 'image/jpeg', base64: 'abc' },
    targetType: 'LEAF_DEFECT' as const,
  };

  it('resolves Meta Model API config or returns null', () => {
    expect(resolveSamConfig({})).toBeNull();
    const config = resolveSamConfig({
      SAM_INFERENCE_ENDPOINT: 'https://api.meta.ai/v1/responses',
      MODEL_API_KEY: 'meta-key',
    });
    expect(config?.endpoint).toBe('https://api.meta.ai/v1/responses');
    expect(config?.model).toBe('sam-3.1');
    expect(config?.timeoutMs).toBe(60000);

    const custom = resolveSamConfig({
      SAM_INFERENCE_ENDPOINT: 'https://api.meta.ai/v1/responses',
      MODEL_API_KEY: 'key',
      SAM_MODEL: 'sam-3.1',
      SAM_TIMEOUT_MS: '45000',
    });
    expect(custom?.timeoutMs).toBe(45000);
  });

  it('runs deterministic simulation when SAM is not configured', () => {
    expect(segmentCommodityFeature(req).masksCount).toBe(2);
    const leaf = segmentCommodityFeature(req, {});
    expect(leaf.masksCount).toBe(2);
    expect(leaf.primaryMaskAreaPercentage).toBe(24.8);
    expect(leaf.isSimulated).toBe(true);
    expect(leaf.modelUsed).toBe('sam-3.1');

    const bunch = segmentCommodityFeature({ ...req, targetType: 'BUNCH_COUNT' }, {});
    expect(bunch.masksCount).toBe(4);
    expect(bunch.detectedFeatures).toContain('fresh_fruit_bunch');

    const weed = segmentCommodityFeature({ ...req, targetType: 'WEED_CANOPY' }, {});
    expect(weed.masksCount).toBe(1);
    expect(weed.detectedFeatures).toContain('weed_canopy_paspalum');

    const configured = segmentCommodityFeature(req, {
      SAM_INFERENCE_ENDPOINT: 'https://api.meta.ai/v1/responses',
      MODEL_API_KEY: 'key',
      SAM_MODEL: 'custom-sam',
    });
    expect(configured.isSimulated).toBe(false);
    expect(configured.modelUsed).toBe('custom-sam');
  });

  it('calls Meta Model API Responses endpoint and parses boxes and masks', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ output_text: sampleBoxes }),
    });
    const env = {
      SAM_INFERENCE_ENDPOINT: 'https://api.meta.ai/v1/responses',
      MODEL_API_KEY: 'meta-secret',
      SAM_MODEL: 'sam-3.1',
    };

    const res = await querySamSegmentation(req, env, mockFetch as unknown as typeof fetch);
    expect(res.isSimulated).toBe(false);
    expect(res.masksCount).toBe(2);
    expect(res.primaryMaskAreaPercentage).toBeGreaterThan(0);
    expect(res.confidenceScore).toBe(0.92);
    expect(res.detectedFeatures).toEqual(['diseased oil palm leaf lesion']);
    expect(res.maskRle).toContain('|mask;');
    expect(res.modelUsed).toBe('sam-3.1');

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe('https://api.meta.ai/v1/responses');
    const body = JSON.parse(String(init.body));
    expect(body.model).toBe('sam-3.1');
    expect(body.input[0].content[0]).toEqual({
      type: 'input_text',
      text: 'diseased oil palm leaf lesion',
    });
    expect(body.input[0].content[1].type).toBe('input_image');
    expect(body.input[0].content[1].image_url).toContain('data:image/jpeg;base64,abc');
    expect(body.metadata.mask_encoding).toBe('one_bit');
  });

  it('accepts custom prompt and returns zero matches without failing', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ output_text: '' }),
    });
    const env = {
      SAM_INFERENCE_ENDPOINT: 'https://api.meta.ai/v1/responses',
      MODEL_API_KEY: 'key',
    };
    const res = await querySamSegmentation(
      { ...req, prompt: 'ganoderma fruiting body' },
      env,
      mockFetch as unknown as typeof fetch,
    );
    expect(res.isSimulated).toBe(false);
    expect(res.masksCount).toBe(0);
    expect(res.confidenceScore).toBe(0);
    expect(res.detectedFeatures).toEqual([]);
    expect(res.maskRle).toBeUndefined();
  });

  it('skips zero-size boxes and keeps the largest area', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        output_text:
          '<0f>0<|box;x1=0;y1=0;x2=0;y2=100;w=0;h=1000|><|mask;x=0;y=0;data=1|>,1<|box;x1=0;y1=0;x2=100;y2=0;w=1000;h=0|><|mask;x=0;y=0;data=1b|>,2<|box;x1=0;y1=0;x2=500;y2=500;w=1000;h=1000|><|mask;x=0;y=0;data=2|>,3<|box;x1=0;y1=0;x2=100;y2=100;w=1000;h=1000|><|mask;x=0;y=0;data=3|>',
      }),
    });
    const res = await querySamSegmentation(
      req,
      {
        SAM_INFERENCE_ENDPOINT: 'https://api.meta.ai/v1/responses',
        MODEL_API_KEY: 'key',
      },
      mockFetch as unknown as typeof fetch,
    );
    expect(res.isSimulated).toBe(false);
    expect(res.primaryMaskAreaPercentage).toBe(25);
    expect(res.masksCount).toBe(4);
  });

  it('falls back to simulation on API failure, invalid payload, or timeout', async () => {
    const env = {
      SAM_INFERENCE_ENDPOINT: 'https://api.meta.ai/v1/responses',
      MODEL_API_KEY: 'key',
    };

    const failed = jest.fn().mockResolvedValue({ ok: false, status: 503 });
    const failedRes = await querySamSegmentation(req, env, failed as unknown as typeof fetch);
    expect(failedRes.isSimulated).toBe(true);
    expect(failedRes.masksCount).toBe(2);

    const invalid = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ output_text: 123 }),
    });
    const invalidRes = await querySamSegmentation(req, env, invalid as unknown as typeof fetch);
    expect(invalidRes.isSimulated).toBe(true);

    const slowFetch = jest.fn((_url: string, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        if (init?.signal) {
          init.signal.addEventListener('abort', () => reject(new Error('aborted')));
        }
      });
    });
    const timeoutRes = await querySamSegmentation(
      req,
      { ...env, SAM_TIMEOUT_MS: '10' },
      slowFetch as unknown as typeof fetch,
    );
    expect(timeoutRes.isSimulated).toBe(true);
  });

  it('returns simulation directly when endpoint is not configured', async () => {
    const res = await querySamSegmentation(req, {});
    expect(res.isSimulated).toBe(true);
  });

  it('uses default env arguments for config and query', async () => {
    const originalFetch = global.fetch;
    process.env.SAM_INFERENCE_ENDPOINT = 'https://api.meta.ai/v1/responses';
    process.env.MODEL_API_KEY = 'key';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ output_text: sampleBoxes }),
    }) as unknown as typeof fetch;

    expect(resolveSamConfig()?.endpoint).toBe('https://api.meta.ai/v1/responses');
    const res = await querySamSegmentation(req);
    expect(res.isSimulated).toBe(false);

    global.fetch = originalFetch;
    delete process.env.SAM_INFERENCE_ENDPOINT;
    delete process.env.MODEL_API_KEY;
  });
});

describe('MODEL_API_KEY guard for SAM endpoint', () => {
  it('skips the endpoint when MODEL_API_KEY is missing, empty, or undefined', async () => {
    for (const key of [undefined, '']) {
      const fetchMock = jest.fn();
      const res = await querySamSegmentation(
        { image: { mime: 'image/jpeg', base64: 'abc' }, targetType: 'LEAF_DEFECT' },
        { SAM_INFERENCE_ENDPOINT: 'https://api.meta.ai/v1/responses', MODEL_API_KEY: key },
        fetchMock as unknown as typeof fetch,
      );
      expect(res.isSimulated).toBe(true);
      expect(fetchMock).not.toHaveBeenCalled();
    }
  });
});
