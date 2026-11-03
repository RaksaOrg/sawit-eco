import { isModelMockEnabled, MOCK_TRANSCRIPT } from '@/src/core/ai/mock';

export async function transcribeAudio(buffer: Buffer, mime: string): Promise<string | null> {
  if (isModelMockEnabled(process.env)) return MOCK_TRANSCRIPT;

  const endpoint = process.env.ASR_INFERENCE_ENDPOINT;
  const apiKey = process.env.MODEL_API_KEY;

  if (!endpoint || !apiKey) return null;

  const form = new FormData();
  const extension = mime.split('/')[1]?.split(';')[0] || 'ogg';
  const uint8 = new Uint8Array(buffer);
  form.append('file', new Blob([uint8], { type: mime }), `voice.${extension}`);
  form.append('model', process.env.ASR_MODEL || 'whisper-large-v3');
  form.append('language', 'id');

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { authorization: `Bearer ${apiKey}` },
      body: form,
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as { text?: string };
    return payload.text?.trim() || null;
  } catch {
    return null;
  }
}
