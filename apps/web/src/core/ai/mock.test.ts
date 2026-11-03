import {
  isModelMockEnabled,
  MOCK_REASONING_TEXT,
  MOCK_VISION_DIAGNOSIS,
  MOCK_TRANSCRIPT,
} from './mock';
import { queryMetaInferenceEngine } from './inference';
import { queryMetaVisionInference } from './vision';
import { querySamSegmentation } from './sam';
import { transcribeAudio } from '@/lib/transcribe';

describe('Model Mock Flagging (MOCK_MODELS_ENABLED=1)', () => {
  it('correctly reads flag status', () => {
    expect(isModelMockEnabled()).toBe(process.env.MOCK_MODELS_ENABLED === '1');
    expect(isModelMockEnabled({})).toBe(false);
    expect(isModelMockEnabled({ MOCK_MODELS_ENABLED: '0' })).toBe(false);
    expect(isModelMockEnabled({ MOCK_MODELS_ENABLED: '1' })).toBe(true);
  });

  it('bypasses HTTP call and returns mock reasoning when flag is 1', async () => {
    const fetchMock = jest.fn();
    const res = await queryMetaInferenceEngine(
      { messages: [{ role: 'user', content: 'test' }] },
      { MOCK_MODELS_ENABLED: '1' },
      fetchMock as unknown as typeof fetch,
    );
    expect(res.text).toBe(MOCK_REASONING_TEXT);
    expect(res.model).toBe('mock-meta-llama');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('bypasses HTTP call and returns mock vision when flag is 1', async () => {
    const fetchMock = jest.fn();
    const res = await queryMetaVisionInference(
      { image: { mime: 'image/jpeg', base64: 'abc' }, blockCode: 'B2' },
      { MOCK_MODELS_ENABLED: '1' },
      fetchMock as unknown as typeof fetch,
    );
    expect(res.diagnosis).toBe(MOCK_VISION_DIAGNOSIS);
    expect(res.isMock).toBe(true);
    expect(res.isFallback).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('bypasses HTTP call and returns mock SAM segmentation when flag is 1', async () => {
    const fetchMock = jest.fn();
    const res = await querySamSegmentation(
      { image: { mime: 'image/jpeg', base64: 'abc' }, targetType: 'LEAF_DEFECT' },
      { MOCK_MODELS_ENABLED: '1' },
      fetchMock as unknown as typeof fetch,
    );
    expect(res.modelUsed).toBe('mock-sam-3.1');
    expect(res.isMock).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns mock transcript for audio without HTTP call when flag is 1', async () => {
    const original = process.env.MOCK_MODELS_ENABLED;
    process.env.MOCK_MODELS_ENABLED = '1';
    const originalFetch = global.fetch;
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    const transcript = await transcribeAudio(Buffer.from('audio'), 'audio/ogg');
    expect(transcript).toBe(MOCK_TRANSCRIPT);
    expect(fetchMock).not.toHaveBeenCalled();

    global.fetch = originalFetch;
    if (original === undefined) delete process.env.MOCK_MODELS_ENABLED;
    else process.env.MOCK_MODELS_ENABLED = original;
  });
});
