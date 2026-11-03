import fs from 'fs';
import path from 'path';
const base = 'apps/web/src/i18n/locales';
const langs = ['id', 'en'];
let fail = 0;

function flatten(obj, prefix = '') {
  return Object.entries(obj).flatMap(([k, v]) =>
    typeof v === 'object' ? flatten(v, `${prefix}${k}.`) : [`${prefix}${k}`]);
}
const files = fs.readdirSync(path.join(base, 'id')).filter(f => f.endsWith('.json'));
for (const file of files) {
  const sets = langs.map(l => {
    const f = path.join(base, l, file);
    if (!fs.existsSync(f)) { console.log(`⛔ Missing file: ${f}`); fail = 1; return []; }
    return flatten(JSON.parse(fs.readFileSync(f, 'utf-8'))).sort();
  });
  const missing = sets[0].filter(k => !sets[1].includes(k));
  const extra = sets[1].filter(k => !sets[0].includes(k));
  if (missing.length || extra.length) {
    fail = 1;
    console.log(`⛔ ${file} mismatch:`);
    missing.forEach(k => console.log(`  id only: ${k}`));
    extra.forEach(k => console.log(`  en only: ${k}`));
  } else console.log(`✅ ${file}: ${sets[0].length} keys parity PASS`);
}
if (fail) { console.log('VERDICT: BLOCKED - i18n parity failed'); process.exit(1); }
console.log('VERDICT: I18N PARITY PASS');