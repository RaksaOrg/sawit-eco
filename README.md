# Sawit Ecosystem

Sistem pencatatan operasional kebun sawit berbasis WhatsApp AI. Mandor mengirim laporan harian lewat WhatsApp, AI mengekstrak data terstruktur ke database, dan owner memantau produksi lewat dashboard web berbasis SAP Fiori (Morning Horizon theme).

## Cara Kerja

```text
Mandor chat WA ──► Meta WhatsApp Cloud API ──► Webhook (/api/whatsapp/webhook)
                                                      │
                                        ┌─────────────┴─────────────┐
                                        │  Agent Router (lib/agent)  │
                                        └──┬──────────┬──────────┬───┘
                                       mandor    agronomi    manajer
                                           │
                              Ekstrak [JSON] ──► Prisma ──► PostgreSQL (Supabase)
                                                                      │
                                              Dashboard / Rekap / Mandor (Owner)
```

## Stack

- **Next.js 16** (App Router) + TypeScript + SAP Fiori Design System (`@ui5/webcomponents-react`)
- **Prisma** + **PostgreSQL** (Supabase)
- **Meta WhatsApp Cloud API** — webhook pesan masuk & kirim balasan
- **OpenAI** (`gpt-4o-mini` untuk laporan mandor, `gpt-4o` untuk agronomi/manajer)
- **Recharts** — grafik produksi per blok

## Fitur

- **3 AI Agent** dipilih otomatis dari isi pesan:
  - `mandor` — kata kunci laporan/absen/produksi → ekstrak laporan + simpan ke `DailyReport`
  - `agronomi` — kata kunci daun/hama/pupuk/penyakit → diagnosa & rekomendasi
  - `manajer` — pertanyaan umum operasional
- **Dashboard Owner** — produksi hari ini, total HK, produktivitas Kg/HK, grafik per blok, ranking mandor, laporan terbaru
- **Rekap** — 100 laporan terakhir per tenant
- **Mandor** — performa per mandor (total produksi, rata-rata Kg/HK)
- **Multi-tenant** — data terisolasi per `tenantId`
- **Dedup pesan** — `waMessageId` unik mencegah laporan ganda saat WhatsApp retry
- **Validasi signature webhook** Meta (`x-hub-signature-256`) bila `WA_APP_SECRET` diisi

## Struktur Project

Monorepo dengan pemisahan tegas antara Web dan Mobile:

```text
sawit-ecosystem/
├── apps/
│   ├── web/                       # Next.js 16 + SAP Fiori Horizon (Web Dashboard & API)
│   │   ├── app/                   # App Router: Fiori pages + API route handlers
│   │   ├── components/fiori/      # ShellBar, FioriPage, FioriStates
│   │   ├── lib/                   # Prisma client, auth, agent, KPI, WhatsApp
│   │   ├── src/                   # Core logic: AI pipeline, PDP, RBAC, tokens, i18n
│   │   ├── postgres/              # Local database init files
│   │   ├── next.config.mjs
│   │   └── tsconfig.json
│   └── mobile/                    # React Native + Expo + React Native Paper
│       ├── App.tsx
│       └── src/                   # App* components, offline outbox, screens, theme
├── packages/
│   ├── contracts/                 # Shared Zod schemas & TypeScript API contracts
│   └── vision/                    # Node-only visual regression & design extraction CLI
├── docker-compose.yml             # Shared local PostgreSQL container
├── prisma/                        # Shared PostgreSQL schema & seed
├── jest.config.js                 # Root test runner
└── package.json                   # Root workspace scripts
```

Platform boundaries:

| Area          | Web (`apps/web`)                        | Mobile (`apps/mobile`)                   |
| ------------- | --------------------------------------- | ---------------------------------------- |
| Framework     | Next.js 16 App Router                   | Expo SDK 52 + React Native               |
| Design System | SAP Fiori Horizon `sap_horizon`         | Fiori-inspired Native + Paper tokens     |
| UI Library    | `@ui5/webcomponents-react`              | `react-native-paper` + `App*` components |
| State         | RSC + session cookie                    | TanStack Query + Zustand + SQLite outbox |
| Auth          | HMAC session cookie                     | Expo SecureStore token                   |
| Users         | Owner, Manager, Agronom, Admin Commerce | Mandor, Pekerja                          |

## Instalasi

```bash
npm install
```

Salin `apps/web/.env.example` menjadi `apps/web/.env` lalu isi kredensial:

```bash
cp apps/web/.env.example apps/web/.env
```

## Panduan Mendapatkan Kredensial Environment Variables

### 1. Meta AI Reasoning (Muse Wonder / Muse Spark / Llama)

- **`META_INFERENCE_ENDPOINT`**: URL endpoint inferensi chat/reasoning.
  - **Opsi A (Meta Model API - Resmi)**: `https://api.meta.ai/v1/chat/completions`. Dapatkan API key dari [Meta Model API](https://dev.meta.ai/docs/authentication).
  - **Opsi B (Fireworks AI)**: `https://api.fireworks.ai/inference/v1/chat/completions`.
  - **Opsi C (Baseten)**: URL deployment model Anda, misalnya `https://model-xxxx.api.baseten.co/production/predict`.
  - **Opsi D (Modal Labs)**: URL web endpoint dari deploy vLLM/SGLang Anda.
  - **Opsi E (Local / Self-hosted via Docker)**: Jalankan Ollama dari `docker-compose.yml`:

    ```bash
    docker compose up -d --build ollama
    docker compose logs -f ollama
    ```

    Container `sawit-ollama` otomatis menarik model reasoning (`llama3.2`) dan vision (`llama3.2-vision`) pada start pertama dan menyimpannya di volume `ollama-models`. Ganti model:

    ```bash
    OLLAMA_MODEL=llama3.3 VISION_MODEL=llama3.2-vision docker compose up -d --build ollama
    ```

    Lalu set:

    ```env
    META_INFERENCE_ENDPOINT="http://localhost:11434/v1/chat/completions"
    META_MODEL="llama3.2"
    MODEL_API_KEY="ollama-local"
    META_INFERENCE_TIMEOUT_MS="120000"
    ```

    > Di macOS, Docker memakai CPU Linux VM. Untuk akselerasi Metal Apple Silicon, jalankan Ollama native via `brew install ollama`.
- **`META_MODEL`**: Identifier model yang sesuai dengan endpoint.
  - Meta Model API: `muse-spark-1.3`, `muse-spark-1.3-contributor`, `muse-spark-1.2`, `muse-spark-1.1`, atau `muse-wonder-1.0`.
  - Fireworks: `accounts/fireworks/models/llama-v3p3-70b-instruct`.
  - Baseten / open-weight: `meta-llama/Llama-3.3-70B-Instruct`.
  - Ollama: `llama3.2` atau `llama3.3`.
  - **Catatan:** `Muse Wonder Full` hanya tersedia di Muse Code, bukan Model API. `Muse Spark Open` dan `Muse Glimmer` adalah open-weight dan harus di-host sendiri.
- **`META_INFERENCE_TIMEOUT_MS`**: Batas waktu request dalam milidetik. Gunakan `"30000"` untuk cloud, `"120000"` untuk model lokal besar.
- **`MODEL_API_KEY`**: Satu-satunya API key untuk reasoning, vision, SAM, dan ASR.
  - Meta Model API: Bearer API key dari dashboard Meta.
  - Baseten: `sec_...`; Fireworks: `fw_...`; Modal: token dari `modal token new`.
  - Ollama lokal: isi string apa pun, misalnya `"ollama-local"`.

---

### 2. Meta Vision (Image Understanding)

- **`VISION_INFERENCE_ENDPOINT`**: Endpoint untuk analisis visual daun, buah, dan hama.
  - **Meta Model API**: `https://api.meta.ai/v1/chat/completions` dengan model multimodal `muse-spark-1.3` atau `muse-wonder-1.0`.
  - **Fireworks / Baseten**: endpoint chat completions untuk `meta-llama/Llama-3.2-90B-Vision-Instruct`.
  - **Ollama lokal**: `http://localhost:11434/v1/chat/completions` dengan `llama3.2-vision`.
  - Jika dikosongkan, sistem memakai `META_INFERENCE_ENDPOINT`.
- **`VISION_MODEL`**: `muse-spark-1.3`, `muse-wonder-1.0`, `meta-llama/Llama-3.2-90B-Vision-Instruct`, atau `llama3.2-vision`.
- **`VISION_TIMEOUT_MS`**: `"30000"` cloud, `"180000"` lokal.

---

### 3. Meta SAM 3.1 (Segment Anything Model)

- **`SAM_INFERENCE_ENDPOINT`**:
  - **Meta Model API (Resmi)**: `https://api.meta.ai/v1/responses`.
  - **Self-hosted / Baseten**: endpoint yang mengikuti kontrak Responses API aplikasi.
  - Jika dikosongkan, sistem berjalan dalam mode simulasi zero-shot deterministik.
- **`SAM_MODEL`**: `"sam-3.1"` untuk Meta Model API.
- **`SAM_TIMEOUT_MS`**: default `"60000"`.
- Aplikasi mengirim `input_text` (misalnya `diseased oil palm leaf lesion`) dan `input_image`, lalu mem-parsing output `box` dan `mask` dari respons Meta.

---

### 4. Meta Speech to Text (ASR)

- **`ASR_INFERENCE_ENDPOINT`**:
  - **Meta Model API (Resmi)**: `https://api.meta.ai/v1/asr/transcribe`.
  - **Fireworks**: `https://api.fireworks.ai/inference/v1/audio/transcriptions`.
  - **Groq**: `https://api.groq.com/openai/v1/audio/transcriptions`.
  - **Local Whisper Server**: URL `/audio/transcriptions` OpenAI-compatible.
- **`ASR_MODEL`**: `"muse-voice-transcribe-1.0"` atau `"whisper-large-v3"`.
- Jika endpoint kosong, voice note akan meminta pengiriman ulang sebagai teks.

---

### 4b. Mock Model Mode (Development / Offline Demo)

Aktifkan mock deterministik tanpa `MODEL_API_KEY` dan tanpa HTTP call:

```env
MOCK_MODELS_ENABLED="1"
```

Efeknya:

- `META_INFERENCE_ENDPOINT`: dilewati, reasoning mengembalikan teks mock.
- `VISION_INFERENCE_ENDPOINT`: dilewati, vision mengembalikan diagnosis mock.
- `SAM_INFERENCE_ENDPOINT`: dilewati, SAM mengembalikan segmentasi mock.
- `ASR_INFERENCE_ENDPOINT`: dilewati, ASR mengembalikan transkrip mock.

Gunakan hanya untuk development, demo offline, atau CI. Set `"0"` di staging dan production.
Verifikasi lewat `GET /api/meta/health`; respons memuat `"mockModelsEnabled": true`.

---

### 5. OpenAI API (Jalur Cadangan / Fallback Only)

- **`OPENAI_API_KEY`**: Dipakai murni sebagai secondary failover jika inference Meta tidak dikonfigurasi atau sedang down.
  - Dapatkan dari [platform.openai.com/api-keys](https://platform.openai.com/api-keys) → Create new secret key (format: `sk-proj-...`).
  - Model yang dipakai: `gpt-4o-mini` (laporan cepat) dan `gpt-4o` (diagnosa mendalam).

---

### 6. WhatsApp Cloud API & Lainnya

- **`WA_VERIFY_TOKEN`**: Buat string acak bebas (contoh: `sawit_rahasia_123`) untuk verifikasi webhook Meta Developer.
- **`WA_ACCESS_TOKEN`**: Dari Meta for Developers → App Dashboard → **WhatsApp → API Setup** → Salin Temporary/Permanent Access Token (`EAAB...`).
- **`WA_PHONE_NUMBER_ID`**: Dari halaman API Setup Meta → Bagian **Phone number ID**.
- **`WA_APP_SECRET`**: Dari App Dashboard → **App settings → Basic → App secret** (untuk validasi signature `x-hub-signature-256`).
- **`AUTH_SECRET`**: Jalankan perintah `openssl rand -base64 32` di terminal.
- **`DATABASE_URL`**: Connection string PostgreSQL dari Supabase, Neon, atau local container (`postgresql://postgres:password@localhost:5432/sawit`).

### Generate AUTH_SECRET

```bash
openssl rand -base64 32
```

Atau langsung tulis ke env target:

```bash
sed -i '' "s|^AUTH_SECRET=.*|AUTH_SECRET=\"$(openssl rand -base64 32)\"|" .env.development
```

Gunakan secret berbeda per environment. Nilai contoh `change-me-min-32-characters` hanya placeholder — ganti sebelum deploy dan jangan commit `.env.production` / `.env.staging` berisi secret asli.

> **Penting:** panggilan OpenAI memakai parameter `messages` (Chat Completions).
> Parameter `input` hanya untuk Responses API — mencampurnya memicu error
> `400: unknown parameter 'input'`.

## Setup Database

```bash
npm run db:push      # buat tabel di Supabase
npm run db:studio    # buka Prisma Studio untuk seed data
```

Seed minimal lewat Prisma Studio:

1. Buat 1 baris **Tenant** (`nama`, `lokasi`, `luasHa`).
2. Buat **User** dengan `tenantId` tenant di atas, `waNumber` format `62812xxx` (tanpa `+`), `role`: `MANDOR` / `MANAGER` / `OWNER`.
3. (Opsional) Buat **Block** (`kode`, `luasHa`, `tahunTanam`) — dipakai sebagai konteks prompt AI.

## Shared API Contracts

`packages/contracts` berisi skema Zod dan tipe TypeScript yang dipakai Web dan Mobile. Paket ini **tidak mengimpor Prisma**. Mobile tetap mengakses data lewat HTTP API.

```bash
npm run contracts:install
npm run contracts:typecheck
npm run contracts:test
```

Vision clipboard helper:

```bash
npm run vision:clipboard
npm run vision:extract -- --clipboard .opencode/artifacts/design-spec.md
```

```ts
import { attendanceCreateSchema, type AttendanceCreateInput } from '@sawit/contracts';
```

## Menjalankan

```bash

# Web Dashboard

npm run dev                # Next.js dev server (http://localhost:3000)
npm run build              # Production build

# Mobile Field App

npm run mobile:install     # Install mobile dependencies
npm run dev:mobile         # Expo dev server (Metro bundler)
npm run mobile:android     # Run Android emulator / device
npm run mobile:ios         # Run iOS simulator / device
npm run mobile:typecheck   # Typecheck mobile TypeScript
npm run mobile:test        # Run mobile unit tests
```

Halaman:

| Route                 | Fungsi                              |
| --------------------- | ----------------------------------- |
| `/`                   | Redirect ke `/dashboard`            |
| `/dashboard`          | Ringkasan produksi & ranking mandor |
| `/reports`            | Tabel laporan harian                |
| `/supervisors`        | Performa per mandor                 |
| `/hris/attendance`    | Presensi & HK                       |
| `/commerce/approvals` | Inbox persetujuan pembelian         |

## Tes WhatsApp Asli

1. Buka [developers.facebook.com](https://developers.facebook.com) → Create App (Business) → Add Product: WhatsApp.
2. Di **WhatsApp → API Setup**, ambil `WA_ACCESS_TOKEN` dan `WA_PHONE_NUMBER_ID`, tambahkan nomor HP kamu sebagai recipient test.
3. Jalankan app ke internet:

   ```bash
   npm run dev
   npx ngrok http 3000
   ```

4. Di **WhatsApp → Configuration → Webhook**:
   - Callback URL: `https://xxxx.ngrok-free.app/api/whatsapp/webhook`
   - Verify Token: sesuai `WA_VERIFY_TOKEN` di `.env`
   - Subscribe field: `messages`
5. Chat ke nomor test Meta, contoh:

   ```text
   lapor A1 budi 8 orang 12 ton selesai
   ```

Bot membalas konfirmasi rapi, data tersimpan ke `DailyReport`, dan langsung muncul di `/dashboard` serta `/reports`.

## Model Data

| Model         | Fungsi                                          |
| ------------- | ----------------------------------------------- |
| `Tenant`      | Perusahaan kebun (multi-tenant)                 |
| `User`        | Pengguna terdaftar berdasarkan nomor WhatsApp   |
| `Block`       | Blok kebun (kode, luas, tahun tanam)            |
| `DailyReport` | Laporan harian hasil ekstraksi AI dari pesan WA |
| `AgronomyLog` | Log diagnosa agronomi                           |

## Scripts

| Perintah            | Fungsi                        |
| ------------------- | ----------------------------- |
| `npm run dev`       | Development server            |
| `npm run build`     | Build production              |
| `npm run start`     | Jalankan build production     |
| `npm run db:push`   | Sinkronkan schema ke database |
| `npm run db:studio` | Buka Prisma Studio            |

## Catatan

- Dashboard belum memiliki autentikasi — tambahkan login (mis. NextAuth) sebelum deploy publik.
- Prompt agent mendukung placeholder `{{nama_perusahaan}}`, `{{lokasi_kebun}}`, `{{total_luas_ha}}`, `{{daftar_blok}}`, `{{daftar_mandor}}`, `{{sop_perusahaan}}`, `{{musim_saat_ini}}`, `{{target_produksi_harian}}` yang diisi otomatis dari data tenant.
