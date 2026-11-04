import {
  queryMetaVisionInference,
  resolveVisionConfig,
  createVisionInferenceProvider,
  analyzeImageFallback,
} from './vision';

describe('vision defaults coverage', () => {
  it('uses env defaulting and fetch default', async () => {
    const original = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content:
                'Diagnosa: Sehat\nRisiko: RENDAH\nTindakan Hari Ini: Pantau\nTindakan 7-14 Hari: Pantau lagi',
            },
          },
        ],
      }),
    }) as unknown as typeof fetch;

    process.env.META_INFERENCE_ENDPOINT = 'https://x';
    process.env.META_API_KEY = 'k';

    const config = resolveVisionConfig();
    expect(config?.endpoint).toBe('https://x');

    const res = await queryMetaVisionInference({
      image: { mime: 'image/jpeg', base64: 'abc' },
      blockCode: 'B2',
      symptoms: 'menguning',
    });
    expect(res.diagnosis).toBeDefined();

    global.fetch = original;
    delete process.env.META_INFERENCE_ENDPOINT;
    delete process.env.META_API_KEY;
  });

  it('covers remaining branch paths in vision module', async () => {
    const fbNoBlock = analyzeImageFallback({
      image: { mime: 'image/jpeg', base64: 'abc' },
    });
    expect(fbNoBlock.rawText).toContain('unknown');

    // 1. Line 69 default fetch
    const config = resolveVisionConfig({
      VISION_INFERENCE_ENDPOINT: 'https://x',
      META_API_KEY: 'k',
    });
    expect(config).not.toBeNull();
    if (config) {
      const orig = global.fetch;
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Diagnosa: Sehat\nRisiko: RENDAH' } }],
        }),
      }) as unknown as typeof fetch;
      const prov = createVisionInferenceProvider(config);
      await prov.analyzeImage({
        image: { mime: 'image/jpeg', base64: 'abc' },
        blockCode: 'B1',
      });
      global.fetch = orig;
    }

    // 2. Line 157 non-VisionInferenceError
    const errorProv = createVisionInferenceProvider(
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      config as NonNullable<typeof config>,
      jest.fn().mockRejectedValue('plain string error') as unknown as typeof fetch,
    );
    await expect(
      errorProv.analyzeImage({ image: { mime: 'image/jpeg', base64: 'abc' } }),
    ).rejects.toThrow('Vision fetch failed: Synthesis error');

    // 3. Line 205 request.blockCode truthy in analyzeImageFallback
    const fb = analyzeImageFallback({
      image: { mime: 'image/jpeg', base64: 'abc' },
      blockCode: 'BLOCK_VALID',
    });
    expect(fb.rawText).toContain('BLOCK_VALID');
  });
});
