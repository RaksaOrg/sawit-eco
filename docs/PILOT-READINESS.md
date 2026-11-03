# Pilot & Production Submission Readiness Guide

Panduan operasional 5 langkah validasi lapangan, integrasi Meta AI, dan pembuktian dampak ekonomi.

---

## 1. Aktifkan Endpoint Meta Llama + ASR + Vision & Rekam Bukti Request/Response

### Konfigurasi Environment (`apps/web/.env`)

```env
# Kredensial Model Meta (Meta Model API / Fireworks / Baseten / Ollama)
MODEL_API_KEY="<YOUR_META_OR_PARTNER_API_KEY>"

# 1. Meta Llama Reasoning (LLM)
META_INFERENCE_ENDPOINT="https://api.meta.ai/v1/chat/completions"
META_MODEL="meta-llama/Llama-3.3-70B-Instruct"
META_INFERENCE_TIMEOUT_MS="30000"

# 2. Meta Vision (Multimodal Daun, Hama, Buah)
VISION_INFERENCE_ENDPOINT="https://api.meta.ai/v1/chat/completions"
VISION_MODEL="meta-llama/Llama-3.2-90B-Vision-Instruct"
VISION_TIMEOUT_MS="30000"

# 3. Meta Speech-to-Text (ASR)
ASR_INFERENCE_ENDPOINT="https://api.meta.ai/v1/asr/transcribe"
ASR_MODEL="muse-voice-transcribe-1.0"

# Matikan mock untuk live network call
MOCK_MODELS_ENABLED="0"
```

### Rekam Bukti Health Check & Handshake

Jalankan server Next.js (`npm run web:dev`), lalu rekam response bukti kesiapan ekosistem Meta:

```bash
# 1. Health check seluruh provider Meta AI
curl -s -X GET "http://localhost:3000/api/meta/health" | jq . > docs/evidence-meta-health.json

# 2. Rekam bukti Agent Pipeline (PDP Masking + Llama + Deteksi Anomali)
curl -s -X POST "http://localhost:3000/api/agent/pipeline" \
  -H "Content-Type: application/json" \
  -H "Cookie: sp_session=<SESSION_TOKEN>" \
  -d '{
    "text": "Lapor Budi Santoso WA 081234567890 beli pupuk urea Rp 520000 per sak",
    "channel": "WHATSAPP",
    "commodityPricePerKg": 520000,
    "supplierName": "Pak Haji Tengkulak"
  }' | jq . > docs/evidence-pipeline-response.json
```

---

## 2. Integrasikan SAM / Muse Vision & Tetapkan Scope Vision Llama

### Meta SAM 3.1 (`apps/web/src/core/ai/sam.ts`)

- **Endpoint**: `SAM_INFERENCE_ENDPOINT="https://api.meta.ai/v1/responses"`
- **Model**: `SAM_MODEL="sam-3.1"`
- **Scope Target**:
  - `LEAF_DEFECT`: Segmentasi lesi penyakit daun (*chlorosis*, *necrosis*).
  - `BUNCH_COUNT`: Deteksi dan hitung janjang panen TBS (*fresh fruit bunch*).
  - `WEED_CANOPY`: Deteksi tutupan gulma pekarangan piringan pohon.
- **Simulation Fallback**: Jika `SAM_INFERENCE_ENDPOINT` tidak diisi, modul otomatis jatuh ke *zero-shot deterministic segmentation* (`apps/web/src/core/ai/sam.ts:58`).

### Scope Vision Llama (`apps/web/src/core/ai/vision.ts`)

- **Peran**: Ahli agronomis PPKS kelapa sawit via system prompt (`vision.ts:113`).
- **Input**: Base64 image payload + deskripsi gejala blok.
- **Output Terstruktur**:
  - `Diagnosa: [kondisi/hama/defisiensi]`
  - `Risiko: [RENDAH | SEDANG | TINGGI | KRITIS]`
  - `Tindakan Hari Ini: [rekomendasi darurat]`
  - `Tindakan 7-14 Hari: [tindakan lanjutan SOP PPKS]`
  - `Disclaimer: Selalu sertakan verifikasi label resmi produk dan uji tanah.`
- **Rule-based Fallback**: `analyzeImageFallback()` aktif jika API error/timeout tanpa crash aplikasi.

---

## 3. Deploy Staging Publik, Seed Demo Tenant, & Uji WhatsApp Nyata

### Langkah Deploy Staging

1. Push schema ke database staging:
   ```bash
   npm run db:push
   ```
2. Jalankan seeding demo tenant:
   ```bash
   npm run db:seed
   ```
   *Data otomatis ter-seed:*
   - **PT Sawit Lestari Jaya** (`sawit-lestari`, 480 Ha, Kotawaringin Timur).
   - **PT Green Palm Nusantara** (`green-palm`, 360 Ha, Kampar Riau).
   - Akun Owner default: `owner@sawitlestari.co.id` / `owner123`.
   - Data 14 hari laporan harian, log agronomi, dan katalog pupuk KCl & Urea.

3. Hubungkan Webhook WhatsApp ke URL Publik (Ngrok / Vercel):
   ```bash
   # Bila testing via local tunnel:
   npx ngrok http 3000
   ```
   - Masuk ke Meta Developer Console → WhatsApp → Configuration → Edit Webhook.
   - **Callback URL**: `https://<YOUR-DOMAIN>/api/whatsapp/webhook`
   - **Verify Token**: Nilai sama dengan `WA_VERIFY_TOKEN` di `.env`.
   - Centang subscription: `messages`.

4. Uji Kirim Pesan Lapangan Nyata via WhatsApp:
   - **Format Panen**:
     ```text
     lapor A1 budi 8 orang 12 ton selesai
     ```
   - **Format Foto Agronomi**: Kirim foto daun bercak disertai caption:
     ```text
     Blok B2 daun menguning bercak coklat
     ```
   - Bot memvalidasi PII PDP, mengeksekusi agent, dan membalas konfirmasi langsung ke nomor WhatsApp.

---

## 4. Video Demo 2–3 Menit Sesuai Script

### Skenario E2E (Sesuai `apps/web/src/core/demo/e2e-demo.test.ts`)

| Durasi | Segmen | Aksi di Layar |
|---|---|---|
| **0:00 - 0:30** | **Unstructured Intake** | Mandor mengirim voice note / teks laporan via WhatsApp berisi PII dan harga beli pupuk lokal yang mahal. |
| **0:30 - 1:00** | **PDP Guard & Price Anomaly** | Tampilkan log sistem: nomor telepon/nama dimasking otomatis (`apps/web/src/core/privacy/pdp-guard.ts`). AI mendeteksi anomali harga (>20% selisih dari HET). |
| **1:00 - 1:45** | **Vision & Closed-Loop Commerce** | Kirim foto daun sakit. Vision Llama + SAM mendiagnosa defisiensi kalium. Rekomendasi memunculkan kartu Pupuk KCl resmi. Owner menyetujui approval di Fiori Web. |
| **1:45 - 2:30** | **Owner Dashboard & Productivity** | Buka `/dashboard`: produksi harian terupdate, metrik Kg/HK dan Ha/HK naik, status rotasi panen hijau (7–14 hari). |

### Utilitas Ekstraksi Media (`packages/vision`)

```bash
# Ekstrak audio dari rekaman video demo
npm run vision:transcribe -- <path/to/demo-video.mp4>

# Ekstrak frames resolusi tinggi untuk slide pitch/laporan
npm run vision:frames -- <path/to/demo-video.mp4> docs/frames/
```

---

## 5. Studi Kasus & Metrics Pilot (Harga, Kg/HK, Ha/HK, Rotasi)

Data benchmark tervalidasi di `apps/web/src/core/impact/market-benchmarks.ts`:

### A. Transparansi Harga: Resmi vs Tengkulak

| Komoditas | Wilayah | Harga Resmi (HET/Disbun) | Harga Tengkulak | Margin Tengkulak | Penghematan Petani |
|---|---|---|---|---|---|
| **TBS Sawit** | Kotawaringin Timur & Riau | Rp 2.850 / kg | Rp 2.250 / kg | **26.6%** | Rp 1.440.000 / ha |
| **Pupuk KCl** | Kalimantan Tengah | Rp 533.333 / sak | Rp 720.000 / sak | **35.0%** | Rp 2.240.000 / ha |
| **Pupuk Urea** | Kampar, Riau | Rp 420.000 / sak | Rp 520.000 / sak | **23.8%** | Rp 1.200.000 / ha |

### B. Dampak Produktivitas Pilot Kebun

| Metrik | Baseline Manual | Pilot Sawit Ecosystem | Peningkatan (%) | Dampak Finansial (IDR/Ha) |
|---|---|---|---|---|
| **Kg / HK** *(Tonase per Hari Kerja)* | 142.0 Kg/HK | **215.0 Kg/HK** | **+51.4%** | Rp 3.650.000 / ha |
| **Ha / HK** *(Cakupan Perawatan)* | 0.65 Ha/HK | **1.25 Ha/HK** | **+92.3%** | Rp 1.850.000 / ha |
| **Rotasi Panen** *(Siklus Hari)* | 17.5 Hari *(buah restan/busuk)* | **9.0 Hari** *(siklus optimal)* | **+48.6%** *(percepatan)* | Rp 4.200.000 / ha |

### C. Lokasi Verifikasi Kode & Tampilan Dashboard

- **Logic Perhitungan**:
  - Produktivitas & Rotasi: `apps/web/lib/kpi.ts`
  - Market Anomaly & Savings: `apps/web/src/core/impact/market-benchmarks.ts`
- **Dashboard UI**:
  - Tabel benchmark harga: `apps/web/app/(app)/dashboard/page.tsx:170`
  - Kartu dampak & savings: `apps/web/app/(app)/dashboard/DashboardOverview.tsx:435`
  - Endpoint Monitoring Rotasi: `apps/web/app/api/rotation/route.ts`
- **Unit Test Pembuktian**:
  ```bash
  npm run test -- apps/web/src/core/impact/market-benchmarks.test.ts
  npm run test -- apps/web/src/core/demo/e2e-demo.test.ts
  ```
