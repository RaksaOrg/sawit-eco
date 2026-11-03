import { promises as fs } from 'node:fs';
import { dirname } from 'node:path';

import sharp, { OutputInfo } from 'sharp';

export interface DesignVisionMetadata {
  width: number;
  height: number;
  format: string;
}

export interface DesignVisionComparison {
  reference: DesignVisionMetadata;
  candidate: DesignVisionMetadata;
  sameDimensions: boolean;
  mismatchedPixels: number;
  totalPixels: number;
  similarity: number;
  diffRatio: number;
  diffOutputPath?: string;
}

export interface DesignVisionCompareOptions {
  threshold?: number;
  diffOutputPath?: string;
  normalizeSize?: boolean;
}

async function image(path: string, width?: number, height?: number) {
  const pipeline = sharp(path).ensureAlpha();
  const resized = width && height ? pipeline.resize(width, height, { fit: 'fill' }) : pipeline;
  return resized.raw().toBuffer({ resolveWithObject: true });
}

export async function toRgbImage(
  input: string | Buffer,
  outputPath?: string,
): Promise<{ data: Buffer; info: OutputInfo }> {
  if (outputPath) {
    await fs.mkdir(dirname(outputPath), { recursive: true });
    await sharp(input).toColorspace('srgb').removeAlpha().png().toFile(outputPath);
  }
  return sharp(input)
    .toColorspace('srgb')
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
}

export async function readImageMetadata(path: string): Promise<DesignVisionMetadata> {
  const metadata = await sharp(path).metadata();
  return {
    width: metadata.width ?? 0,
    height: metadata.height ?? 0,
    format: metadata.format ?? 'unknown',
  };
}

export async function compareImageFiles(
  referencePath: string,
  candidatePath: string,
  options: DesignVisionCompareOptions = {},
): Promise<DesignVisionComparison> {
  const [reference, candidate] = await Promise.all([
    readImageMetadata(referencePath),
    readImageMetadata(candidatePath),
  ]);
  const sameDimensions =
    reference.width === candidate.width && reference.height === candidate.height;
  const width = options.normalizeSize
    ? Math.max(reference.width, candidate.width)
    : Math.min(reference.width, candidate.width);
  const height = options.normalizeSize
    ? Math.max(reference.height, candidate.height)
    : Math.min(reference.height, candidate.height);
  const [a, b] = await Promise.all([
    image(referencePath, width, height),
    image(candidatePath, width, height),
  ]);
  const threshold = Math.min(255, Math.max(0, options.threshold ?? 0));
  const totalPixels = width * height;
  const diff = options.diffOutputPath ? Buffer.alloc(totalPixels * 4) : undefined;
  let mismatchedPixels = 0;

  for (let pixel = 0; pixel < totalPixels; pixel += 1) {
    const offset = pixel * 4;
    const mismatch =
      Math.max(
        ...[0, 1, 2, 3].map((channel) =>
          Math.abs(a.data[offset + channel] - b.data[offset + channel]),
        ),
      ) > threshold;
    if (mismatch) mismatchedPixels += 1;
    if (diff) {
      diff[offset] = mismatch ? 255 : a.data[offset];
      diff[offset + 1] = mismatch ? 0 : a.data[offset + 1];
      diff[offset + 2] = mismatch ? 255 : a.data[offset + 2];
      diff[offset + 3] = 255;
    }
  }

  if (diff && options.diffOutputPath) {
    await fs.mkdir(dirname(options.diffOutputPath), { recursive: true });
    await sharp(diff, { raw: { width, height, channels: 4 } })
      .png()
      .toFile(options.diffOutputPath);
  }

  const diffRatio = totalPixels ? mismatchedPixels / totalPixels : 1;
  return {
    reference,
    candidate,
    sameDimensions,
    mismatchedPixels,
    totalPixels,
    similarity: 1 - diffRatio,
    diffRatio,
    diffOutputPath: options.diffOutputPath,
  };
}

export interface DesignVisionExtractOptions {
  apiKey?: string;
  baseURL?: string;
  model?: string;
  prompt?: string;
}

export async function extractDesignSpec(
  imagePath: string,
  options: DesignVisionExtractOptions = {},
): Promise<string> {
  const apiKey = options.apiKey || process.env.MODEL_API_KEY;
  const baseURL =
    options.baseURL || process.env.VISION_INFERENCE_ENDPOINT || process.env.META_INFERENCE_ENDPOINT;
  const model =
    options.model || process.env.VISION_MODEL || 'meta-llama/Llama-3.2-90B-Vision-Instruct';
  if (!apiKey) throw new Error('No API key found. Set MODEL_API_KEY.');
  if (!baseURL) {
    throw new Error('No vision endpoint found. Set VISION_INFERENCE_ENDPOINT.');
  }

  const metadata = await readImageMetadata(imagePath);
  const buffer = await fs.readFile(imagePath);
  const base64 = buffer.toString('base64');
  const mimeType =
    metadata.format === 'png'
      ? 'image/png'
      : metadata.format === 'jpeg'
        ? 'image/jpeg'
        : `image/${metadata.format}`;

  const systemPrompt =
    'You are a UI design analyst for a SAP Fiori Horizon enterprise application. Extract a complete design specification from the provided screenshot. Be precise about Fiori floorplans, semantic status, and design tokens.';

  const userPrompt =
    options.prompt ||
    `Analyze this application screen screenshot (${metadata.width}x${metadata.height}) and extract a complete design specification.

Return a structured spec in this exact format:

## Screen Overview
- Screen purpose and type
- Fiori floorplan (Overview Page, List Report, Object Page, Form, Approval, Scanner)
- Overall background color (hex)
- Dimensions/aspect ratio observed

## Layout (top to bottom, every visible element)
For each element describe:
- Type (image, text, button, icon, container, table, status)
- Position (top/center/bottom, left/center/right)
- Approximate size (width x height in relative terms or px if estimatable)
- Content (actual text, image description)

## Typography
For each text element:
- Content (exact text)
- Approximate font size (px)
- Font weight (regular/medium/semibold/bold)
- Color (hex, estimate from screenshot)
- Alignment

## Colors
- All unique colors observed with hex values
- Background colors
- Text colors
- Button/accent colors
- Border/divider colors
- Semantic colors (success, warning, error, information)

## Spacing
- Margins between elements (approximate px)
- Padding within containers
- Gaps between repeated items

## Components
- Buttons: variant, size, border radius, colors, text style
- Cards/containers: border radius, shadow, background
- Status: ObjectStatus semantics and text label
- Tables: analytical vs standard, columns, row height
- Icons: size, color, type

## Fiori Compliance
- Is the screen using SAP Fiori Horizon?
- Any non-Fiori custom styling?
- Missing loading, empty, error, or success states

Be specific with hex colors - estimate from the screenshot pixels.`;

  const response = await fetch(`${baseURL.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      stream: false,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: userPrompt },
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
          ],
        },
      ],
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Vision API error ${response.status}: ${errorBody}`);
  }

  const rawText = await response.text();
  let fullContent = '';

  if (rawText.trim().startsWith('data:')) {
    const lines = rawText.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:') || trimmed === 'data: [DONE]') continue;
      try {
        const parsed = JSON.parse(trimmed.slice(5).trim());
        const delta =
          parsed.choices?.[0]?.delta?.content || parsed.choices?.[0]?.message?.content || '';
        fullContent += delta;
      } catch {}
    }
  } else {
    try {
      const data = JSON.parse(rawText);
      fullContent = data.choices?.[0]?.message?.content ?? 'No content returned';
    } catch {
      fullContent = rawText;
    }
  }

  return fullContent || 'No content returned';
}
