import { promises as fs } from 'node:fs';
import { dirname } from 'node:path';

import { compareImageFiles, extractDesignSpec, readImageMetadata } from './image-analysis.ts';
import { readClipboardImage } from './clipboard-image.ts';
import {
  detectScenes,
  extractAudio,
  extractSceneFrames,
  extractVideoFrames,
  transcribeAudio,
} from './video.ts';

const command = process.argv[2];

if (command === 'scenes') {
  const videoPath = process.argv[3];
  const outputDir = process.argv[4];
  const threshold = Number(process.argv[5]) || 0.3;
  if (!videoPath) {
    console.error('Usage: npm run scenes -- <video-path> [output-dir] [threshold]');
    process.exit(1);
  }
  if (outputDir) {
    const files = await extractSceneFrames(videoPath, outputDir, { threshold });
    console.log(JSON.stringify({ outputDir, files }, null, 2));
  } else {
    const timestamps = await detectScenes(videoPath, { threshold });
    console.log(JSON.stringify({ timestamps }, null, 2));
  }
  process.exit(0);
}

if (command === 'transcribe') {
  const mediaPath = process.argv[3];
  const outputPath = process.argv[4];
  if (!mediaPath) {
    console.error('Usage: npm run transcribe -- <video-or-audio-path> [output.txt]');
    process.exit(1);
  }
  const isAudio = /\.(mp3|wav|m4a|aac|ogg|flac)$/i.test(mediaPath);
  const audioPath = isAudio ? mediaPath : '.artifacts/extracted-audio.mp3';
  if (!isAudio) await extractAudio(mediaPath, audioPath);
  const text = await transcribeAudio(audioPath);
  if (outputPath) {
    await fs.mkdir(dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, text, 'utf-8');
    console.error(`Transcript written to ${outputPath}`);
  }
  console.log(text);
  process.exit(0);
}

if (command === 'frames') {
  const videoPath = process.argv[3];
  const outputDir = process.argv[4] || '.artifacts/frames';
  const count = Number(process.argv[5]) || 8;
  if (!videoPath) {
    console.error('Usage: npm run frames -- <video-path> [output-dir] [count]');
    process.exit(1);
  }
  const files = await extractVideoFrames(videoPath, outputDir, { count });
  console.log(JSON.stringify({ outputDir, files }, null, 2));
  process.exit(0);
}

if (command === 'clipboard') {
  const outputPath = process.argv[3] || '.artifacts/clipboard.png';
  await fs.mkdir(dirname(outputPath), { recursive: true });
  await readClipboardImage(outputPath);
  const metadata = await readImageMetadata(outputPath);
  console.log(JSON.stringify({ outputPath, ...metadata }, null, 2));
  process.exit(0);
}

if (command === 'extract') {
  const source = process.argv[3];
  const outputPath = process.argv[4];
  if (!source) {
    console.error('Usage: npm run extract -- <image-path|--clipboard> [output.md]');
    process.exit(1);
  }
  let imagePath = source;
  if (source === '--clipboard') {
    imagePath = '.artifacts/clipboard.png';
    await fs.mkdir(dirname(imagePath), { recursive: true });
    await readClipboardImage(imagePath);
  }
  const spec = await extractDesignSpec(imagePath);
  if (outputPath) {
    await fs.mkdir(dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, spec, 'utf-8');
    console.error(`Spec written to ${outputPath}`);
  }
  console.log(spec);
  process.exit(0);
}

const [referenceArg, candidatePath, diffOutputPath] = process.argv.slice(2);
if (!referenceArg || !candidatePath) {
  console.error(
    'Usage:\n  npm run compare -- <reference|--clipboard> <candidate> [diff-output]\n  npm run extract -- <image-path|--clipboard> [output.md]\n  npm run clipboard -- [output.png]',
  );
  process.exit(1);
}

const referencePath = referenceArg === '--clipboard' ? '.artifacts/clipboard.png' : referenceArg;
if (referenceArg === '--clipboard') {
  await fs.mkdir(dirname(referencePath), { recursive: true });
  await readClipboardImage(referencePath);
}

const result = await compareImageFiles(referencePath, candidatePath, {
  threshold: 2,
  diffOutputPath,
});
console.log(JSON.stringify({ referencePath, ...result }, null, 2));
