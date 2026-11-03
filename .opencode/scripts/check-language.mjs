#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOTS = ['apps', 'packages'];
const EXCLUDED_DIRS = new Set(['node_modules', '.next', 'coverage', 'i18n', '.expo', 'android', 'ios']);
const NON_ENGLISH_TOKENS = new Set([
  'tugas',
  'rekap',
  'mandor',
  'pesanan',
  'persetujuan',
  'agronomi',
  'rotasi',
  'baru',
  'pengaturan',
  'laporan',
  'kehadiran',
  'penjualan',
  'pembelian',
  'produk',
  'karyawan',
  'blok',
  'kebun',
  'panen',
  'pupuk',
]);
const NON_ENGLISH_QUERY_KEYS = new Set([
  'blok',
  'blokKode',
  'aktivitas',
  'catatan',
  'mandorId',
  'fromAgronomi',
  'dariAgronomi',
]);
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.json']);

const violations = [];

function tokenize(value) {
  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (EXCLUDED_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      for (const token of tokenize(entry.name)) {
        if (NON_ENGLISH_TOKENS.has(token)) {
          violations.push(`${full}: non-English directory token "${token}"`);
        }
      }
      walk(full);
    } else {
      const base = path.basename(entry.name, path.extname(entry.name));
      for (const token of tokenize(base)) {
        if (NON_ENGLISH_TOKENS.has(token)) {
          violations.push(`${full}: non-English file token "${token}"`);
        }
      }
      if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) scanFile(full);
    }
  }
}

function scanFile(file) {
  const source = fs.readFileSync(file, 'utf8');
  const routePattern = /['"`](\/(?:[^'"`\s?#]|\?[^'"`\s]*)?)/g;
  let match;
  while ((match = routePattern.exec(source)) !== null) {
    const raw = match[1];
    const pathPart = raw.split('?')[0];
    for (const segment of pathPart.split('/').filter(Boolean)) {
      for (const token of tokenize(segment)) {
        if (NON_ENGLISH_TOKENS.has(token)) {
          violations.push(`${file}: non-English route path "${raw}"`);
        }
      }
    }
    const query = raw.split('?')[1];
    if (query) {
      for (const pair of query.split('&')) {
        const key = pair.split('=')[0];
        if (NON_ENGLISH_QUERY_KEYS.has(key)) {
          violations.push(`${file}: non-English query key "${key}"`);
        }
      }
    }
  }
}

for (const root of ROOTS) walk(root);

if (violations.length > 0) {
  console.error('LANGUAGE GATE FAIL');
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log('LANGUAGE GATE PASS: paths and route keys are English (i18n/API values excluded)');
