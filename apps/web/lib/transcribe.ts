import { spawn } from 'node:child_process';
import { isModelMockEnabled, MOCK_TRANSCRIPT } from '@/src/core/ai/mock';
import { getModelProvider, recordModelTrigger } from './model-trigger';

type TriggerContext = { tenantId: string; traceId: string };

function toMetaWav(buffer: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn(process.env.FFMPEG_PATH || 'ffmpeg', [
      '-hide_banner',
      '-loglevel',
      'error',
      '-i',
      'pipe:0',
      '-ac',
      '1',
      '-ar',
      '24000',
      '-c:a',
      'pcm_s16le',
      '-f',
      'wav',
      'pipe:1',
    ]);
    const chunks: Buffer[] = [];
    let outputSize = 0;
    ffmpeg.stdout.on('data', (chunk: Buffer) => {
      outputSize += chunk.length;
      if (outputSize > 32_000_000) {
        ffmpeg.kill();
        reject(new Error('AUDIO_CONVERSION_TOO_LARGE'));
        return;
      }
      chunks.push(chunk);
    });
    ffmpeg.once('error', reject);
    ffmpeg.once('close', (code) => {
      if (code === 0) resolve(Buffer.concat(chunks));
      else reject(new Error('AUDIO_CONVERSION_FAILED'));
    });
    ffmpeg.stdin.end(buffer);
  });
}

export async function transcribeAudio(
  buffer: Buffer,
  mime: string,
  trigger?: TriggerContext,
): Promise<string | null> {
  if (isModelMockEnabled(process.env)) {
    if (trigger) {
      await recordModelTrigger({
        ...trigger,
        route: '/api/whatsapp/webhook',
        provider: 'mock',
        model: process.env.ASR_MODEL || 'mock-transcription',
        operation: 'AUDIO_TRANSCRIPTION',
        status: 'SUCCEEDED',
        startedAt: Date.now(),
      });
    }
    return MOCK_TRANSCRIPT;
  }

  const endpoint = process.env.ASR_INFERENCE_ENDPOINT;
  const apiKey = process.env.META_API_KEY;

  if (!endpoint || !apiKey) return null;

  const model = process.env.ASR_MODEL || 'muse-voice-transcribe-1.0';
  const startedAt = Date.now();
  let requestStarted = false;

  try {
    const wav = await toMetaWav(buffer);
    const form = new FormData();
    form.append(
      'request',
      new Blob([JSON.stringify({ model, mode: 'ENDPOINTING', audioEncoding: 'WAV' })], {
        type: 'application/json',
      }),
    );
    form.append('audio', new Blob([new Uint8Array(wav)], { type: 'audio/wav' }), 'voice.wav');
    requestStarted = true;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { authorization: `Bearer ${apiKey}` },
      body: form,
    });
    if (!response.ok) {
      if (trigger) {
        await recordModelTrigger({
          ...trigger,
          route: '/api/whatsapp/webhook',
          provider: getModelProvider(endpoint),
          model,
          operation: 'AUDIO_TRANSCRIPTION',
          status: 'FAILED',
          startedAt,
          errorCode: `HTTP_${response.status}`,
        });
      }
      return null;
    }
    const payload = (await response.json()) as { text?: string };
    const transcript = payload.text?.trim() || null;
    if (trigger) {
      await recordModelTrigger({
        ...trigger,
        route: '/api/whatsapp/webhook',
        provider: getModelProvider(endpoint),
        model,
        operation: 'AUDIO_TRANSCRIPTION',
        status: transcript ? 'SUCCEEDED' : 'FAILED',
        startedAt,
        errorCode: transcript ? undefined : 'EMPTY_TRANSCRIPT',
      });
    }
    return transcript;
  } catch (error) {
    if (trigger) {
      await recordModelTrigger({
        ...trigger,
        route: '/api/whatsapp/webhook',
        provider: requestStarted ? getModelProvider(endpoint) : 'audio-converter',
        model: requestStarted ? model : 'ffmpeg',
        operation: requestStarted ? 'AUDIO_TRANSCRIPTION' : 'AUDIO_PREPARATION',
        status: 'FAILED',
        startedAt,
        errorCode: error instanceof Error ? error.name : 'UNKNOWN_ERROR',
      });
    }
    return null;
  }
}
