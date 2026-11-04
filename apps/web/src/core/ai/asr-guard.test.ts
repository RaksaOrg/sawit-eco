import { transcribeAudio } from '@/lib/transcribe';

describe('META_API_KEY guard for ASR endpoint', () => {
  it('skips the endpoint when META_API_KEY is missing or empty', async () => {
    const originalFetch = global.fetch;
    const originalKey = process.env.META_API_KEY;
    const originalEndpoint = process.env.ASR_INFERENCE_ENDPOINT;

    for (const key of [undefined, '']) {
      const fetchMock = jest.fn();
      global.fetch = fetchMock as unknown as typeof fetch;
      process.env.ASR_INFERENCE_ENDPOINT = 'https://api.meta.ai/v1/asr/transcribe';
      if (key === undefined) delete process.env.META_API_KEY;
      else process.env.META_API_KEY = key;

      await expect(transcribeAudio(Buffer.from('audio'), 'audio/ogg')).resolves.toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    }

    global.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.META_API_KEY;
    else process.env.META_API_KEY = originalKey;
    if (originalEndpoint === undefined) delete process.env.ASR_INFERENCE_ENDPOINT;
    else process.env.ASR_INFERENCE_ENDPOINT = originalEndpoint;
  });
});
