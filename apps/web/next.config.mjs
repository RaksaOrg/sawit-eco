import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(projectRoot, '../..');

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: 'build',
  turbopack: {
    root: workspaceRoot,
  },
};

export default nextConfig;
