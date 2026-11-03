Bertindaklah sebagai Tech Lead dan koordinasikan seluruh AI development team.

Mode: 7-PHASE SAP FIORI-DRIVEN + SPEC-DRIVEN + META AI STACK
Design Dashboard mengikuti SAP Fiori Horizon via @ui5/webcomponents-react. Antarmuka WhatsApp untuk Mandor tidak memakai Fiori. Baca .opencode/shared/sap-fiori.md, design-system.md, code-quality.md, dan i18n.md sebagai hukum wajib.

=== META AI STACK & MULTI-AGENT ORCHESTRATION (HUKUM WAJIB) ===

- Model Reasoning: Gunakan Meta's newest open-weights (Llama) atau Meta Model API via inference partner (Baseten / Modal / Fireworks / secure local endpoint) untuk penalaran rantai pasok dan Bahasa Indonesia/daerah. Paparan bisnis lewat InferenceProvider abstraction, model/endpoint dari env (`META_INFERENCE_ENDPOINT`, `MODEL_API_KEY`), tidak hardcode.
- Multimodal & Voice: WhatsApp/field app menerima 3 modality — teks, voice note (transkripsi + normalisasi slang/typo lokal), foto nota/foto kondisi komoditas (vision/Muse Vision/SAM bila relevan). Setiap modality harus punya fallback bila audio/gambar gagal diproses.
- Orkestrasi Multi-Agent (LangGraph atau custom async loop, Python/Node): pipeline tetap 4 langkah berurutan dan stateful: [1] Data Ingestion & Normalization Agent -> [2] Privacy & PDP Guard Agent (mask PII sebelum store/process) -> [3] Price & Supply Chain Intelligence Analyst (compare historis DB, deteksi anomali harga) -> [4] Report Generator/Summary Agent.
- PDP Compliance (privacy-first, UU PDP): masking nama petani/pemasok, nomor HP, alamat spesifik -> alias (`SUPPLIER_001`, `REDACTED_FOR_PRIVACY`); simpan maskedSupplierAlias, catat pdp_audit_logs, jangan log PII; inference via secure endpoint (Baseten/Modal/Fireworks/local), bukan endpoint publik tanpa kontrol.
- Muse Code Integration: gunakan Muse Code agent untuk percepatan boilerplate, pipeline API sinkronisasi lapang, dan unit testing otomatis. Readiness target: hitungan hari, bukan minggu.
- Pitching Angle (juri): Real-World Impact (inefisiensi harga smallholder + rantai pasok panjang), Technical Ambition (LLM + data lapang tidak terstruktur + otomatisasi agen), Production-Ready (Startup Track standard: layer jelas API -> Agent -> Inference -> DB, scalable, PDP compliant).

=== 4-LAYER ARCHITECTURE (HUKUM DESAIN SISTEM) ===
1. Ingestion & Multimodal Gateway — Secure API/Webhook (Fastify/Next API/FastAPI): terima voice note/text/foto nota, validasi token, rate limiting.
2. Multi-Agent Orchestration Engine — LangGraph/Custom async loop: 4 agent di atas berbagi AgentState typed (raw_input, cleaned_data, pdp_sanitized, anomaly_analysis, final_output).
3. Model & Inference Layer — Meta Model API / Llama open-weights via Baseten/Modal/Fireworks; SAM 3.1 / Muse Vision untuk gambar.
4. Persistence & Output — PostgreSQL (Prisma adapter sesuai stack existing; TypeORM hanya bila approved), Redis cache/queue untuk spike traffic, Real-time Dashboard UI. Persisten per tenantId.

=== INPUT PROYEK ===

IDE / MASALAH UTAMA:
1. Susah mengatur kerja lapangan perkebunan sawit: pembagian tugas, absensi, dan laporan mandor masih manual dan terlambat.
2. Akses internet di kebun terbatas: laporan harus bisa via WhatsApp dan offline-first, sinkronisasi otomatis saat ada sinyal.
3. Efektivitas/produktivitas rendah dan tidak terukur: Owner tidak tahu Kg/HK, Ha/HK, dan Rotasi Panen per blok/per mandor secara real-time.
4. Perawatan kebun tidak terstandar: petani/mandor bingung soal pupuk, hama, penyakit, dan dosis. Mereka butuh rekomendasi perawatan yang terpercaya.

EKSPANSI PRODUK YANG WAJIB DIBANGUN SEBAGAI SATU EKOSISTEM:
Aplikasi ini BUKAN 4 aplikasi terpisah. Ini adalah 1 platform multi-tenant dengan 4 modul terintegrasi:

1. MODUL HRIS (Untuk mengatur manusia)
   Fungsi: Data karyawan/mandor/pekerja, struktur tim per blok, absensi via WhatsApp, pembagian rencana kerja harian, kehadiran (HK), perhitungan produktivitas per orang/tim, dan ranking mandor.
   Output modul ini adalah data HK yang dipakai untuk menghitung KPI Kg/HK dan Ha/HK.

2. MODUL LEARNING (Untuk meningkatkan skill)
   Fungsi: Materi belajar singkat untuk Mandor/Pekerja: cara panen yang benar, pruning, pemupukan, pengenalan hama, K3/APD.
   Format harus ringan untuk internet terbatas: teks singkat, gambar, dan video pendek yang bisa diakses offline setelah diunduh.
   Setiap materi yang selesai dipelajari harus tercatat sebagai progres belajar per user.

3. MODUL REKOMENDASI PERAWATAN / AGRONOMI (Mesin diagnosa)
   Fungsi: User memilih blok / mengirim foto daun, buah, atau hama via WhatsApp/Dashboard, sistem memberikan diagnosa awal, tingkat risiko (Rendah/Sedang/Tinggi/Kritis), tindakan hari ini, dan tindakan 7-14 hari ke depan.
   Modul ini WAJIB terhubung ke Learning dan Commerce. Contoh alur: Diagnosa "Defisiensi Kalium di Blok B2" -> tampilkan materi Learning terkait -> tampilkan rekomendasi produk yang relevan dari Commerce.

4. MODUL COMMERCE (Mesin pendapatan platform)
   Tujuan Bisnis Utama: Mengkonversi kebutuhan perawatan menjadi pembelian produk pertanian di dalam platform.
   Fungsi: Katalog produk pertanian (pupuk, pestisida/herbisida sesuai aturan, alat panen, APD), keranjang, checkout, pembayaran, dan riwayat pembelian per perusahaan/blok.
   Setiap rekomendasi dari Modul Agronomi yang membutuhkan produk WAJIB menghasilkan Product Recommendation Card berisi: Nama Produk/SKU dari katalog Commerce, alasan produk ini direkomendasikan untuk diagnosa tersebut, perkiraan kebutuhan berdasarkan luas blok, dan tombol CTA "Tambah ke Keranjang".
   DILARANG merekomendasikan produk yang tidak ada di katalog Commerce. Jika produk tidak tersedia, laporkan sebagai PRODUCT GAP.
   DILARANG memberikan dosis final pasti. Wajib tampilkan peringatan: "Sesuaikan dengan hasil analisa daun/tanah dan label resmi produk."
   Semua pembelian harus bisa dilacak per Tenant, per Blok, dan per Rekomendasi asal (Recommendation-to-Purchase Tracking).

TARGET USER:
1. OWNER / MANAGER KEBUN: via Dashboard Web Fiori. Melihat HRIS, KPI produktivitas, rekap produksi, dan menyetujui pembelian Commerce.
2. MANDOR LAPANGAN: via WhatsApp. Menerima rencana kerja, lapor absen/hasil, kirim foto untuk diagnosa, menerima materi Learning singkat.
3. ASISTEN AGRONOMI / ADMIN PERUSAHAAN: via Dashboard Web. Mengelola rekomendasi, katalog produk, dan materi Learning.

PLATFORM:
- Dashboard Web: Next.js + SAP Fiori (@ui5/webcomponents-react)
- Lapangan: WhatsApp Cloud API + Offline-First PWA jika dibutuhkan
- Backend: Ikuti stack existing di repo ini, Multi-Tenant (setiap perusahaan kebun datanya terpisah total by tenantId)

=== PLATFORM ARCHITECTURE: WEB + MOBILE FIORI ===

Patuhi .opencode/shared/fiori-platforms.md dan .opencode/references/fiori-platform-reference.md sebagai hukum platform.

Bangun DUA aplikasi dari SATU backend & SATU sistem permission yang sama:

1. WEB DASHBOARD (Owner, Manager, Agronomi, Admin Commerce):
Next.js + @ui5/webcomponents-react, theme Morning Horizon. Gunakan Floorplan Fiori asli: Overview Page, List Report, Object Page.
Fungsinya: HRIS & KPI (Kg/HK, Ha/HK, Rotasi Panen), persetujuan pembelian Commerce, pengelolaan Learning & Katalog Produk, Laporan.

2. MOBILE APP (Mandor & Pekerja Lapangan):
React Native + Expo + TypeScript + React Native Paper. Bukan SAPUI5.
Paper adalah fondasi, lalu bangun Custom Fiori-Inspired Design System di atasnya di folder src/theme/ dengan foundation, semantic, dan component tokens.
Gunakan React Navigation, TanStack Query, React Hook Form + Zod, Zustand untuk local state, Expo SecureStore untuk token.
Fungsinya: Menerima rencana kerja HRIS, absensi & laporan offline-first, scanner/operasional, materi Learning ringan, kirim foto untuk rekomendasi perawatan.
Jangan paksa Mobile terlihat seperti Web. Gunakan pola Mobile Fiori: Overview, List Report, Object Page, Form, Approval, Scanner dengan Bottom Navigation 3-5 menu berdasarkan permission.

URUTAN IMPLEMENTASI WAJIB DI FASE 4 & 5:
Fondasi dulu, fitur kemudian.
Sprint 0: Theme & tokens kedua platform, komponen App* (Mobile) dan shell UI5 (Web), navigasi berbasis permission, API client standar, auth & secure storage.
Sprint berikutnya: Bangun 1 alur bisnis lengkap dari ujung ke ujung dulu (contoh: Rekomendasi Perawatan -> Learning -> Commerce -> Approval Owner) di Web dan Mobile, baru tambah modul lain.

Di Fase 2, Architect wajib tentukan struktur monorepo/feature-based dan kontrak API yang sama untuk Web & Mobile.
Di Fase 3, Designer wajib menyerahkan tabel Halaman -> Pola Fiori -> Komponen Web UI5 -> Komponen Mobile App* -> Token. Setelah saya DESIGN APPROVED, tabel ini terkunci.
Di Fase 5, Developer dilarang styling per halaman. Halaman hanya boleh menyusun komponen App*/UI5 yang sudah ada.
Di Fase 6, QA wajib membuktikan konsistensi antar platform: status bisnis yang sama maknanya, permission yang sama ditegakkan, dan semua state tersedia.

MODEL BISNIS & FUNNEL WAJIB:
Learning (Edukasi) -> Rekomendasi (Diagnosa Kebutuhan) -> Commerce (Pembelian Produk) -> Aplikasi di Lapangan via HRIS (Eksekusi & Laporan) -> Produktivitas Naik -> User kembali belajar & membeli lagi.
Sistem harus bisa mengukur funnel ini: Berapa rekomendasi dibuat, berapa yang diklik ke produk, berapa yang checkout, dan berapa GMV per tenant.

KPI SUKSES WAJIB ADA DI DASHBOARD:
- Operasional: Kg/HK, Ha/HK, Rotasi Panen (hari), Kehadiran %
- Agronomi: Jumlah diagnosa, blok risiko tinggi, rekomendasi selesai vs belum ditindaklanjuti
- Learning: Completion rate per mandor/tim
- Commerce: Recommendation-to-Click Rate, Recommendation-to-Purchase Conversion Rate, GMV per Bulan, Repeat Purchase Rate

ARTIFACT FOLDER: .opencode/artifacts/sawit-ecosystem/
BATASAN: Ikuti stack existing. Patuhi quality gate 100%: tsc, eslint, prettier, jest coverage, i18n parity, dan Fiori compliance untuk setiap perubahan.

Jalankan Fase 1 -> 2 -> 3 secara berurutan, tampilkan ringkasan tiap fase.
STOP TOTAL setelah Fase 3 dan tunggu saya ketik DESIGN APPROVED.
Setelah DESIGN APPROVED, lanjutkan Fase 4 sampai Fase 7 hingga production-ready.
Di Fase 1, Product Manager WAJIB memetakan hubungan antar 4 modul ini dalam User Flow utama. Jangan perlakukan mereka sebagai fitur yang berdiri sendiri.
