import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export interface VideoFrameOptions {
  count?: number;
  fps?: number;
  scale?: number;
}

export async function extractVideoFrames(
  videoPath: string,
  outputDir: string,
  options: VideoFrameOptions = {},
): Promise<string[]> {
  const { count = 8, fps = 1, scale } = options;
  await fs.mkdir(outputDir, { recursive: true });

  const filters = [`fps=${fps}`];
  if (scale) filters.push(`scale=${scale}:-1`);

  await execFileAsync('ffmpeg', [
    '-y',
    '-i',
    videoPath,
    '-vf',
    filters.join(','),
    '-frames:v',
    String(count),
    join(outputDir, 'frame_%03d.png'),
  ]);

  const files = (await fs.readdir(outputDir)).filter((file) => file.endsWith('.png')).sort();
  return files.map((file) => join(outputDir, file));
}

export async function extractAudio(videoPath: string, outputPath: string): Promise<string> {
  await fs.mkdir(dirname(outputPath), { recursive: true });
  await execFileAsync('ffmpeg', [
    '-y',
    '-i',
    videoPath,
    '-vn',
    '-acodec',
    'libmp3lame',
    '-q:a',
    '4',
    outputPath,
  ]);
  return outputPath;
}

export interface SceneOptions {
  threshold?: number;
}

export async function detectScenes(
  videoPath: string,
  options: SceneOptions = {},
): Promise<number[]> {
  const threshold = options.threshold ?? 0.3;
  const { stderr } = await execFileAsync(
    'ffmpeg',
    [
      '-i',
      videoPath,
      '-filter_complex',
      `select='gt(scene,${threshold})',showinfo`,
      '-f',
      'null',
      '-',
    ],
    { maxBuffer: 64 * 1024 * 1024 },
  );
  const matches = [...stderr.matchAll(/pts_time:([0-9.]+)/g)];
  return matches.map((match) => Number.parseFloat(match[1]));
}

export async function extractSceneFrames(
  videoPath: string,
  outputDir: string,
  options: SceneOptions & { scale?: number } = {},
): Promise<string[]> {
  const threshold = options.threshold ?? 0.3;
  await fs.mkdir(outputDir, { recursive: true });
  const filters = [`select='gt(scene,${threshold})'`, 'showinfo'];
  if (options.scale) filters.push(`scale=${options.scale}:-1`);
  await execFileAsync(
    'ffmpeg',
    [
      '-y',
      '-i',
      videoPath,
      '-vf',
      filters.join(','),
      '-vsync',
      'vfr',
      join(outputDir, 'scene_%03d.png'),
    ],
    { maxBuffer: 64 * 1024 * 1024 },
  );
  const files = (await fs.readdir(outputDir)).filter((file) => file.endsWith('.png')).sort();
  return files.map((file) => join(outputDir, file));
}

export interface TranscribeOptions {
  apiKey?: string;
  baseURL?: string;
  model?: string;
  language?: string;
}

export async function transcribeAudio(
  audioPath: string,
  options: TranscribeOptions = {},
): Promise<string> {
  const apiKey = options.apiKey || process.env.MODEL_API_KEY;
  const baseURL =
    options.baseURL || process.env.ASR_INFERENCE_ENDPOINT || process.env.ROUTER_BASE_URL;
  const model = options.model || process.env.ASR_MODEL || 'whisper-large-v3';
  if (!apiKey) throw new Error('No API key found. Set MODEL_API_KEY.');
  if (!baseURL) throw new Error('No ASR endpoint found. Set ASR_INFERENCE_ENDPOINT.');

  const fileBytes = await fs.readFile(audioPath);
  const form = new FormData();
  form.append('file', new Blob([fileBytes]), 'audio.mp3');
  form.append('model', model);
  if (options.language) form.append('language', options.language);

  const response = await fetch(`${baseURL}/audio/transcriptions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Audio transcriptions API error ${response.status}: ${err}`);
  }

  const data = (await response.json()) as { text?: string };
  return data.text || '';
}
