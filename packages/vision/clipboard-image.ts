import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import { promisify } from 'node:util';

import sharp from 'sharp';

const execFileAsync = promisify(execFile);

async function isValidImage(path: string): Promise<boolean> {
  try {
    await sharp(path).metadata();
    return true;
  } catch {
    return false;
  }
}

async function writeClipboardPng(outputPath: string): Promise<void> {
  const script = [
    'set pngData to the clipboard as «class PNGf»',
    `set f to open for access POSIX file "${outputPath.replace(/"/g, '\\"')}" with write permission`,
    'set eof f to 0',
    'write pngData to f',
    'close access f',
  ];
  await execFileAsync(
    'osascript',
    script.flatMap((line) => ['-e', line]),
  );
}

export async function readClipboardImage(outputPath: string): Promise<string> {
  if (process.platform !== 'darwin') {
    throw new Error('Clipboard image reading currently supports macOS only');
  }

  try {
    await execFileAsync('pngpaste', [outputPath]);
    if (await isValidImage(outputPath)) return outputPath;
  } catch {}

  try {
    const { stdout } = await execFileAsync('pbpaste', ['-Prefer', 'png'], {
      encoding: 'buffer',
      maxBuffer: 50 * 1024 * 1024,
    });
    await fs.writeFile(outputPath, stdout);
    if (await isValidImage(outputPath)) return outputPath;
  } catch {}

  try {
    await writeClipboardPng(outputPath);
    if (await isValidImage(outputPath)) return outputPath;
  } catch {}

  await fs.rm(outputPath, { force: true });
  throw new Error('Clipboard does not contain an image');
}
