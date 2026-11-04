import { parseLivenessResult, resolveLivenessConfig, verifyLiveness } from './liveness';

describe('liveness inference', () => {
  const config = {
    endpoint: 'https://example.test',
    apiKey: 'secret',
    model: 'muse-spark-1.3',
    timeoutMs: 1000,
  };
  const frames = [1, 2, 3].map(() => ({ mime: 'image/jpeg' as const, base64: 'aGVsbG8=' }));

  it('resolves server-side configuration from VISION and META environment values', () => {
    expect(resolveLivenessConfig({})).toBeNull();
    expect(
      resolveLivenessConfig({
        VISION_INFERENCE_ENDPOINT: 'https://vision.test',
        META_API_KEY: ' key ',
        VISION_MODEL: 'muse-spark-1.3',
        VISION_TIMEOUT_MS: '45000',
      }),
    ).toEqual({
      endpoint: 'https://vision.test',
      apiKey: 'key',
      model: 'muse-spark-1.3',
      timeoutMs: 45000,
    });
    expect(
      resolveLivenessConfig({
        META_INFERENCE_ENDPOINT: 'https://meta.test',
        META_API_KEY: 'key',
        META_MODEL: 'muse-spark-1.3',
        META_INFERENCE_TIMEOUT_MS: '30000',
      })?.model,
    ).toBe('muse-spark-1.3');
  });

  it('fails closed for invalid or low-confidence responses', () => {
    expect(parseLivenessResult('not json')).toBeNull();
    expect(
      parseLivenessResult('{"is_live":true,"confidence":0.7,"presentation_attack":false}')?.isLive,
    ).toBe(false);
    expect(
      parseLivenessResult('{"is_live":true,"confidence":0.99,"presentation_attack":true}')?.isLive,
    ).toBe(false);
    expect(
      parseLivenessResult('{"is_live":true,"confidence":0.99,"presentation_attack":false}')?.isLive,
    ).toBe(true);
  });

  it('sends all challenge frames and returns parsed model result', async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: '{"is_live":true,"confidence":0.96,"presentation_attack":false}',
              },
            },
          ],
        }),
        { status: 200 },
      ),
    );
    await expect(
      verifyLiveness(frames, 'right,left,blink', config, fetchMock),
    ).resolves.toMatchObject({
      isLive: true,
      confidence: 0.96,
    });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.model).toBe('muse-spark-1.3');
    expect(body.messages[1].content[0].text).toContain('right,left,blink');
    expect(
      body.messages[1].content.filter((part: { type: string }) => part.type === 'image_url'),
    ).toHaveLength(3);
  });

  it('rejects malformed frame counts and non-OK inference', async () => {
    await expect(verifyLiveness(frames.slice(0, 2), 'right,left,blink', config)).rejects.toThrow(
      'Invalid liveness frames',
    );
    await expect(
      verifyLiveness(
        frames,
        'left,right,blink',
        config,
        jest.fn().mockResolvedValue(new Response('', { status: 503 })),
      ),
    ).rejects.toThrow('Liveness inference failed');
  });
});
