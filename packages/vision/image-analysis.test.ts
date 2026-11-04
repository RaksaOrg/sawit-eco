import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import sharp from 'sharp';

import {
  compareImageFiles,
  extractDesignSpec,
  readImageMetadata,
  toRgbImage,
} from './image-analysis';

describe('vision image analysis', () => {
  let tempDir: string;
  let redImage: string;
  let blueImage: string;
  let smallImage: string;

  beforeAll(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sawit-vision-'));
    redImage = path.join(tempDir, 'red.png');
    blueImage = path.join(tempDir, 'blue.png');
    smallImage = path.join(tempDir, 'small.png');

    await sharp({
      create: { width: 2, height: 2, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 1 } },
    })
      .png()
      .toFile(redImage);
    await sharp({
      create: { width: 2, height: 2, channels: 4, background: { r: 0, g: 0, b: 255, alpha: 1 } },
    })
      .png()
      .toFile(blueImage);
    await sharp({
      create: { width: 1, height: 1, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 1 } },
    })
      .png()
      .toFile(smallImage);
  });

  afterAll(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('reads image metadata', async () => {
    await expect(readImageMetadata(redImage)).resolves.toEqual({
      width: 2,
      height: 2,
      format: 'png',
    });
  });

  it('compares identical images', async () => {
    const result = await compareImageFiles(redImage, redImage);
    expect(result.sameDimensions).toBe(true);
    expect(result.similarity).toBe(1);
    expect(result.mismatchedPixels).toBe(0);
  });

  it('compares different images and writes diff output', async () => {
    const diffPath = path.join(tempDir, 'diff.png');
    const result = await compareImageFiles(redImage, blueImage, {
      threshold: 0,
      diffOutputPath: diffPath,
    });
    expect(result.sameDimensions).toBe(true);
    expect(result.mismatchedPixels).toBe(4);
    expect(result.similarity).toBe(0);
    expect(result.diffOutputPath).toBe(diffPath);
    await expect(fs.stat(diffPath)).resolves.toBeDefined();
  });

  it('normalizes different dimensions when requested', async () => {
    const result = await compareImageFiles(smallImage, redImage, { normalizeSize: true });
    expect(result.sameDimensions).toBe(false);
    expect(result.totalPixels).toBe(4);
  });

  it('converts images to RGB output', async () => {
    const outputPath = path.join(tempDir, 'rgb.png');
    const result = await toRgbImage(redImage, outputPath);
    expect(result.info.channels).toBe(3);
    await expect(fs.stat(outputPath)).resolves.toBeDefined();
  });

  it('extracts design spec via configured vision endpoint', async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ choices: [{ message: { content: 'SPEC_RESULT' } }] }),
    }) as unknown as typeof fetch;

    const spec = await extractDesignSpec(redImage, {
      apiKey: 'test-key',
      baseURL: 'https://vision.mock/v1',
      model: 'vision-model',
    });
    expect(spec).toBe('SPEC_RESULT');
    global.fetch = originalFetch;
  });

  it('handles SSE vision responses', async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        'data: {"choices":[{"delta":{"content":"SSE_"}}]}\ndata: {"choices":[{"delta":{"content":"SPEC"}}]}\ndata: [DONE]',
    }) as unknown as typeof fetch;

    const spec = await extractDesignSpec(redImage, {
      apiKey: 'test-key',
      baseURL: 'https://vision.mock/v1',
    });
    expect(spec).toBe('SSE_SPEC');
    global.fetch = originalFetch;
  });

  it('rejects missing credentials or endpoint and API failures', async () => {
    const originalKey = process.env.META_API_KEY;
    const originalEndpoint = process.env.VISION_INFERENCE_ENDPOINT;
    delete process.env.META_API_KEY;
    delete process.env.VISION_INFERENCE_ENDPOINT;
    delete process.env.META_INFERENCE_ENDPOINT;
    await expect(extractDesignSpec(redImage)).rejects.toThrow('No API key');
    process.env.META_API_KEY = 'k';
    await expect(extractDesignSpec(redImage)).rejects.toThrow('No vision endpoint');
    if (originalKey) process.env.META_API_KEY = originalKey;
    else delete process.env.META_API_KEY;
    if (originalEndpoint) process.env.VISION_INFERENCE_ENDPOINT = originalEndpoint;
    else delete process.env.VISION_INFERENCE_ENDPOINT;

    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 502,
      text: async () => 'bad gateway',
    }) as unknown as typeof fetch;
    await expect(
      extractDesignSpec(redImage, { apiKey: 'k', baseURL: 'https://vision.mock/v1' }),
    ).rejects.toThrow('Vision API error 502');
    global.fetch = originalFetch;
  });
});
