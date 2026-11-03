import fs from 'node:fs';
import path from 'node:path';

const localesRoot = 'apps/web/src/i18n/locales';
const sourceRoots = ['apps/web/app', 'apps/web/components', 'apps/web/lib'];
const languages = ['id', 'en'];

function flatten(value, prefix = '') {
  return Object.entries(value).flatMap(([key, item]) => {
    const next = `${prefix}${key}`;
    return typeof item === 'object' && item !== null ? flatten(item, `${next}.`) : [next];
  });
}

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return ['.ts', '.tsx'].includes(path.extname(entry.name)) ? [full] : [];
  });
}

const resources = Object.fromEntries(
  languages.map((language) => {
    const dir = path.join(localesRoot, language);
    const namespaces = {};
    for (const file of fs.readdirSync(dir).filter((name) => name.endsWith('.json'))) {
      namespaces[path.basename(file, '.json')] = new Set(
        flatten(JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'))),
      );
    }
    return [language, namespaces];
  }),
);

const used = new Set();
const namespacePattern = /\bt\(\s*['"]([A-Za-z0-9_]+):([A-Za-z0-9_.]+)['"]/g;
const nsOptionPattern =
  /\bt\(\s*['"]([A-Za-z0-9_.]+)['"]\s*,\s*\{[^}]*\bns:\s*['"]([A-Za-z0-9_]+)['"]/g;

for (const file of sourceRoots.flatMap(walk)) {
  const source = fs.readFileSync(file, 'utf8');
  for (const match of source.matchAll(namespacePattern)) used.add(`${match[1]}:${match[2]}`);
  for (const match of source.matchAll(nsOptionPattern)) used.add(`${match[2]}:${match[1]}`);
}

const failures = [];
for (const key of [...used].sort()) {
  const [namespace, ...rest] = key.split(':');
  const translationKey = rest.join(':');
  for (const language of languages) {
    if (!resources[language][namespace]?.has(translationKey)) {
      failures.push(`${language}:${key}`);
    }
  }
}

if (failures.length > 0) {
  console.error('I18N STRICT GATE FAIL');
  for (const failure of failures) console.error(`- missing ${failure}`);
  process.exit(1);
}

console.log(`I18N STRICT PASS: ${used.size} used keys exist in id and en`);
