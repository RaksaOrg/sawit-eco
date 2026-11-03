#!/usr/bin/env bash
set -u
TARGET="${1:-apps/web/app}"
echo "=== I18N CHECK: $TARGET ==="
echo "--- 1. Hardcoded literal check (ESLint) ---"
npm --prefix apps/web exec -- eslint apps/web/app --ext .ts,.tsx --rule 'i18next/no-literal-string: error' --max-warnings=0 || { echo "⛔ Hardcoded text found"; exit 1; }
echo "--- 2. Locale parity id vs en ---"
node .opencode/scripts/check-i18n.mjs || exit 1
echo "--- 3. Used-key strict check ---"
node .opencode/scripts/check-i18n-keys.mjs || exit 1
echo "VERDICT: I18N GATE PASS"
