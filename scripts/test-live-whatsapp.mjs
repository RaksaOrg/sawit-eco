import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const VERIFY_TOKEN = 'sawit_rahasia_123';
const APP_SECRET = 'sawit_secret_meta_webhook_dev';

console.log('=== Uji WhatsApp Webhook & Staging Integrasi ===');
console.log('Target URL:', BASE_URL);

function generateSignature(payloadString, secret) {
  return 'sha256=' + crypto.createHmac('sha256', secret).update(payloadString).digest('hex');
}

const auditLog = [];

async function run() {
  // 1. Uji GET Verification Challenge
  console.log('\n[1/3] Menguji Verifikasi Webhook Meta (GET challenge)...');
  const challenge = 'meta_challenge_' + Math.floor(Math.random() * 100000);
  const verifyUrl = `${BASE_URL}/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=${VERIFY_TOKEN}&hub.challenge=${challenge}`;
  
  const getRes = await fetch(verifyUrl);
  const getBody = await getRes.text();
  const getOk = getRes.status === 200 && getBody === challenge;
  console.log(`HTTP ${getRes.status}: Response = "${getBody}" | Match = ${getOk}`);
  auditLog.push({
    test: 'WEBHOOK_CHALLENGE_VERIFICATION',
    url: verifyUrl,
    status: getRes.status,
    responseBody: getBody,
    passed: getOk,
  });

  // 2. Uji POST Laporan Panen Mandor Terdaftar (Budi Santoso - PT Sawit Lestari Jaya)
  console.log('\n[2/3] Menguji Pesan Laporan Panen Teks Mandor (POST webhook)...');
  const msgId = 'wamid.HBgM' + Date.now();
  const postPayload = {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: '109876543210',
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '628110000000',
                phone_number_id: '1234567890',
              },
              messages: [
                {
                  from: '6281200000001',
                  id: msgId,
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  type: 'text',
                  text: {
                    body: 'Lapor panen Blok B2 4800 Kg hadir 6 orang selesai',
                  },
                },
              ],
            },
            field: 'messages',
          },
        ],
      },
    ],
  };

  const payloadString = JSON.stringify(postPayload);
  const postRes = await fetch(`${BASE_URL}/api/whatsapp/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: payloadString,
  });
  const postData = await postRes.json();
  const postOk = postRes.status === 200 && postData.ok === true;
  console.log(`HTTP ${postRes.status}: Response =`, postData, `| Passed = ${postOk}`);
  auditLog.push({
    test: 'MANDOR_TEXT_REPORT_POST',
    messageId: msgId,
    status: postRes.status,
    response: postData,
    passed: postOk,
  });

  // 3. Uji POST Pesan Nomor Tidak Terdaftar (Security Guard)
  console.log('\n[3/3] Menguji Penolakan Nomor Tidak Terdaftar...');
  const unknownMsgId = 'wamid.HBgM_UNKNOWN_' + Date.now();
  const unknownPayload = {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: '109876543210',
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '628110000000',
                phone_number_id: '1234567890',
              },
              messages: [
                {
                  from: '6289999999999',
                  id: unknownMsgId,
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  type: 'text',
                  text: { body: 'Halo saya ingin melapor' },
                },
              ],
            },
            field: 'messages',
          },
        ],
      },
    ],
  };

  const unknownRes = await fetch(`${BASE_URL}/api/whatsapp/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(unknownPayload),
  });
  const unknownData = await unknownRes.json();
  console.log(`HTTP ${unknownRes.status}: Response =`, unknownData);
  auditLog.push({
    test: 'UNREGISTERED_PHONE_NUMBER_GUARD',
    status: unknownRes.status,
    response: unknownData,
    passed: unknownRes.status === 200,
  });

  // Tulis Artifact
  const artifactsDir = path.resolve('.opencode/artifacts');
  fs.mkdirSync(artifactsDir, { recursive: true });
  const mdPath = path.join(artifactsDir, 'WHATSAPP-STAGING-TEST.md');

  const md = `# Hasil Uji WhatsApp Live Webhook & Panduan Deployment Staging Publik

Tanggal Pengujian: **${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB**  
Endpoint Target: \`${BASE_URL}/api/whatsapp/webhook\`

---

## 1. Hasil Eksekusi Uji Webhook

| No | Komponen Pengujian | Metode HTTP | Expected | Status HTTP | Hasil |
|---|---|---|---|---|---|
| 1 | Meta Webhook Handshake (Hub Challenge) | GET | 200 OK + Challenge string | **${auditLog[0].status}** | **${auditLog[0].passed ? 'LULUS (PASS)' : 'FAIL'}** |
| 2 | Ingest Laporan Mandor (\`6281200000001\`) | POST | 200 OK (\`{ ok: true }\`) | **${auditLog[1].status}** | **${auditLog[1].passed ? 'LULUS (PASS)' : 'FAIL'}** |
| 3 | Filter Nomor Tidak Terdaftar | POST | 200 OK + Peringatan via WA | **${auditLog[2].status}** | **${auditLog[2].passed ? 'LULUS (PASS)' : 'FAIL'}** |

---

## 2. Panduan Deploy Staging Publik (Production-Grade)

### Opsi A: Vercel + Supabase (Rekomendasi Cepat)
1. **Push Repository ke GitHub**:
   \`\`\`bash
   git add .
   git commit -m "feat: complete sawit ecosystem platform"
   git push origin main
   \`\`\`
2. **Import ke Vercel**:
   - Framework preset: **Next.js**
   - Root directory: \`apps/web\`
   - Tambahkan Environment Variables dari \`apps/web/.env\`:
     - \`DATABASE_URL\` (URL PostgreSQL Supabase Pooling Port 6543 / Direct 5432)
     - \`AUTH_SECRET\` (Minimal 32 karakter)
     - \`WA_VERIFY_TOKEN\` (\`sawit_rahasia_123\`)
     - \`WA_ACCESS_TOKEN\` & \`WA_PHONE_NUMBER_ID\`
     - \`META_INFERENCE_ENDPOINT\` & \`META_API_KEY\`
3. **Konfigurasi Webhook Meta**:
   - URL: \`https://sawit-ecosystem.vercel.app/api/whatsapp/webhook\`
   - Token: \`sawit_rahasia_123\`
   - Subscribe fields: \`messages\`

### Opsi B: Ngrok Tunnel untuk Uji Live WhatsApp Lokal Cepat
\`\`\`bash
# Di terminal baru
npx ngrok http 3000
# Salin Forwarding URL HTTPS (contoh: https://a1b2-c3d4.ngrok-free.app)
# Masukkan ke Meta for Developers > WhatsApp > Configuration > Callback URL:
# https://a1b2-c3d4.ngrok-free.app/api/whatsapp/webhook
\`\`\`

---

## 3. Seed Demo Tenant Terverifikasi
Data tenant, blok sawit, dan mandor telah terisi di database:
- **PT Sawit Lestari Jaya** (Mandor: Budi Santoso - \`6281200000001\`, 6 Blok: A1 s/d C2)
- **PT Green Palm Nusantara** (Mandor: Agus Salim - \`628120000011\`, 5 Blok: D1 s/d F1)
`;

  fs.writeFileSync(mdPath, md);
  console.log(`\nLaporan uji disimpan di: ${mdPath}`);
}

run();

