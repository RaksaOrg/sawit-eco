#!/usr/bin/env bash
set -e
echo "=== 0/9 LANGUAGE GATE ==="; npm run check:language; echo "✅ LANGUAGE PASS"
echo "=== 1/9 WEB TSC ==="; npm run typecheck; echo "✅ TSC PASS"
echo "=== 2/9 CONTRACTS TSC ==="; npm run contracts:typecheck; echo "✅ CONTRACTS TSC PASS"
echo "=== 3/9 VISION TSC ==="; npm run vision:typecheck; echo "✅ VISION TSC PASS"
echo "=== 4/9 MOBILE TSC ==="; npm run mobile:typecheck; echo "✅ MOBILE TSC PASS"
echo "=== 5/9 WEB ESLINT ==="; npm run lint; echo "✅ ESLINT PASS"
echo "=== 6/9 PRETTIER ==="; npm run format:check; echo "✅ PRETTIER PASS"
echo "=== 7/9 I18N ==="; bash .opencode/scripts/check-i18n.sh apps/web/app; echo "✅ I18N PASS"
echo "=== 8/9 WEB JEST COVERAGE 100% ==="; npm run test:coverage; echo "✅ JEST PASS"
echo "=== 9/9 CONTRACTS, VISION & MOBILE JEST ==="
npm run contracts:test:coverage
npm run test:vision
npm run mobile:test
echo "✅ ALL UNIT TESTS PASS"
echo "VERDICT: QUALITY GATE PASS"
