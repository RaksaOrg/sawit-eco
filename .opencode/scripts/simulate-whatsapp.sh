#!/usr/bin/env bash
set -e
BASE_URL="${1:-http://localhost:3000}"
echo "=== Live WhatsApp Webhook Simulator ==="
echo "Target: $BASE_URL/api/whatsapp/webhook"

PAYLOAD='{"object":"whatsapp_business_account","entry":[{"id":"109876543210","changes":[{"value":{"messaging_product":"whatsapp","metadata":{"display_phone_number":"628110000000","phone_number_id":"1234567890"},"messages":[{"from":"6281200000001","id":"wamid.test.'$(date +%s)'","timestamp":"'$(date +%s)'","type":"text","text":{"body":"Lapor panen Blok B2 4800 Kg hadir 6 orang selesai"}}]},"field":"messages"}]}]}'

RESP=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$BASE_URL/api/whatsapp/webhook" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")

echo "$RESP"
echo "=== Simulation Completed ==="
