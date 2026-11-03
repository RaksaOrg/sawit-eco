Tujuannya adalah mendapatkan pengalaman pengguna yang konsisten dengan aplikasi enterprise SAP, tetapi tetap menggunakan ekosistem React Native, TypeScript, dan komponen native.
1. Memahami arsitektur SAP Fiori
Ada tiga hal yang perlu dibedakan:
Teknologi	Fungsi	Penggunaan
SAP Fiori	Prinsip desain dan pengalaman pengguna enterprise	Panduan UX aplikasi
SAPUI5 / OpenUI5	Framework UI berbasis web	Aplikasi web
React Native	Framework untuk aplikasi mobile native	Android dan iOS

Rekomendasi: gunakan React Native untuk implementasi aplikasi mobile, dengan SAP Fiori sebagai referensi desain dan pola interaksi.

Artinya, kamu tidak perlu mengubah aplikasi menjadi SAPUI5. Kamu menerapkan prinsip-prinsip Fiori melalui komponen React Native.
Prinsip Fiori yang perlu diterapkan
1. Role-based experience — pengguna mendapatkan fitur berdasarkan peran dan otorisasi.
2. Consistency — tombol, form, tabel, status, dan navigasi memiliki perilaku konsisten.
3. Simple and intuitive — tugas operasional dapat diselesaikan dengan langkah sesedikit mungkin.
4. Responsive design — tampilan menyesuaikan ukuran layar.
5. Enterprise information architecture — data, tindakan, status, dan navigasi mengikuti pola kerja bisnis.
6. Accessibility — komponen mendukung ukuran teks, kontras, dan aksesibilitas yang memadai.
2. Tentukan teknologi yang digunakan
Untuk aplikasi seperti Raksa Agri, saya merekomendasikan stack berikut.
Layer	Teknologi	Fungsi
Mobile framework	React Native + Expo	Aplikasi Android dan iOS
Language	TypeScript	Type safety
UI components	React Native Paper	Komponen UI dasar
Design system	Custom Fiori-inspired design system	Tokens, komponen, dan pola UI
Navigation	React Navigation	Navigasi antarlayar
Server state	TanStack Query	Fetching, caching, dan sinkronisasi data
Form	React Hook Form + Zod	Validasi form bisnis
Local state	Zustand	State UI dan state lokal
Secure storage	Expo SecureStore	Penyimpanan data rahasia yang sesuai
Networking	Fetch atau Axios	Komunikasi dengan backend
Testing	Jest + React Native Testing Library	Unit dan component testing
E2E testing	Maestro atau Detox	Pengujian alur aplikasi

Mengapa React Native Paper?

Karena kamu bisa menggunakan komponen Material Design sebagai fondasi, kemudian mengadaptasi tampilannya agar mendekati SAP Fiori. SAP sendiri menjelaskan bahwa Fiori untuk Android menggabungkan karakteristik Material Design dengan kebutuhan aplikasi enterprise. SAP

Namun, React Native Paper bukan implementasi resmi SAP Fiori. Komponen seperti object header, filter bar, status bisnis, dan pola approval mungkin tetap perlu kamu bangun sendiri.
Referensi resmi yang perlu dipelajari
- SAP Fiori for Android Design Guidelines — panduan desain aplikasi Android.
- SAP Fiori for iOS Design Guidelines — panduan desain aplikasi iOS.
- SAP Fiori Design Principles — prinsip dasar desain Fiori.
3. Bangun design system sebelum membuat fitur
Ini adalah langkah paling penting.

Jangan langsung membuat halaman Dashboard, Sales Order, Inventory, atau Approval dengan styling masing-masing. Bangun fondasi desain terlebih dahulu agar semua fitur konsisten.
A. Design tokens
Contoh struktur token:
src/
└── theme/
    ├── foundation/
    │   ├── colors.ts
    │   ├── spacing.ts
    │   ├── typography.ts
    │   ├── radius.ts
    │   ├── elevation.ts
    │   └── dimensions.ts
    │
    ├── semantic/
    │   ├── colors.ts
    │   ├── status.ts
    │   └── surfaces.ts
    │
    ├── components/
    │   ├── button.ts
    │   ├── input.ts
    │   ├── card.ts
    │   └── list.ts
    │
    ├── light-theme.ts
    └── index.ts

Contoh token warna:
export const foundationColors = {
  brand: '#6366F1',
  secondary: '#06B6D4',

  background: '#F8FAFC',
  surface: '#FFFFFF',

  textPrimary: '#1E293B',
  textSecondary: '#64748B',

  border: '#E2E8F0',

  success: '#15803D',
  warning: '#B45309',
  error: '#B91C1C',
  info: '#0369A1',
} as const;

Warna tersebut merupakan contoh awal untuk Raksa, bukan palet warna resmi SAP Fiori.

Untuk status bisnis, gunakan warna berdasarkan makna, bukan berdasarkan modul.
Status	Makna	Contoh
Draft	Belum diajukan	Sales Order draft
Pending	Menunggu tindakan	Approval pending
In Progress	Sedang diproses	Delivery in progress
Success	Berhasil diselesaikan	Payment completed
Warning	Membutuhkan perhatian	Stok menipis
Error	Gagal atau bermasalah	Payment failed

Jangan mengandalkan warna saja untuk menyampaikan status. Selalu sertakan teks atau indikator lain.
B. Komponen UI reusable
Buat komponen bersama berikut:
Komponen	Kegunaan
AppHeader	Judul halaman, navigasi, dan tindakan
AppButton	Tombol utama, sekunder, dan destruktif
AppTextField	Input teks
AppSelect	Pemilihan data
AppDatePicker	Pemilihan tanggal
AppSearchBar	Pencarian data
AppStatusBadge	Status transaksi
AppListItem	Item daftar
AppSectionHeader	Judul bagian
AppEmptyState	Tampilan ketika data kosong
AppErrorState	Tampilan kesalahan
AppLoadingState	Indikator pemuatan
AppConfirmDialog	Konfirmasi tindakan
AppBottomSheet	Pilihan atau tindakan kontekstual

Sebagai contoh, halaman Sales Order dan Purchase Order seharusnya menggunakan AppStatusBadge yang sama. Perbedaan status bisnis ditangani melalui konfigurasi, bukan melalui implementasi komponen yang berbeda.
4. Gunakan pola halaman enterprise yang konsisten
Aplikasi Fiori tidak harus membuat semua layar terlihat identik. Yang penting adalah setiap jenis tugas memiliki pola interaksi yang konsisten.

Saya menyarankan enam pola halaman utama.
4.1. Home / Overview
Untuk ringkasan pekerjaan pengguna.

Contoh informasi:
- Jumlah tugas yang belum selesai.
- Approval yang menunggu tindakan.
- Sales Order terbaru.
- Pengiriman yang sedang berlangsung.
- Peringatan stok.
- Akses cepat ke fungsi yang sering digunakan.
Dashboard harus menyesuaikan peran pengguna. Sales tidak harus melihat informasi yang sama dengan warehouse staff atau approver.
4.2. List Report
Untuk menampilkan daftar transaksi.

Contoh:
- Sales Orders.
- Purchase Orders.
- Deliveries.
- Invoices.
- Customers.
- Stock Balances.
Pola tampilannya:
┌──────────────────────────────┐
│ Sales Orders            [+]  │
│                              │
│ [ Search orders...        ]  │
│ [Status] [Date] [Customer]   │
│                              │
│  SO-2026-00125               │
│  PT Contoh Makmur            │
│  Rp 12.500.000               │
│  Pending Approval            │
│  ──────────────────────────  │
│  SO-2026-00124               │
│  PT Tani Sejahtera           │
│  Rp 8.750.000                │
│  Approved                    │
│                              │
└──────────────────────────────┘

Ini adalah ilustrasi struktur, bukan screenshot resmi SAP.

Fitur penting:
- Search dan filter.
- Sorting.
- Pagination atau infinite scrolling.
- Empty state.
- Loading state.
- Error state.
- Pull-to-refresh.
- Hak akses berdasarkan tindakan yang diizinkan.
4.3. Object Page / Detail
Untuk menampilkan satu objek bisnis secara lengkap.

Contoh detail Sales Order:
Sales Order
SO-2026-00125

[Pending Approval]

CUSTOMER
PT Contoh Makmur

ORDER INFORMATION
Order Date       27 Oct 2026
Requested Date   30 Oct 2026
Payment Terms    Net 30

ITEMS
Pupuk NPK        100 sak
Pupuk Urea        50 sak

TOTAL
Rp 12.500.000

[Reject]  [Approve]

Dalam implementasi sesungguhnya, tombol Approve dan Reject hanya muncul jika pengguna memiliki izin yang sesuai dan transaksi masih berada dalam status yang memungkinkan tindakan tersebut.
4.4. Form / Create / Edit
Untuk membuat atau mengubah data.

Contoh:
- Create Sales Order.
- Create Purchase Requisition.
- Record Goods Receipt.
- Update Customer.
- Submit Payment.
Standar yang perlu diterapkan:
- Label input selalu jelas.
- Field wajib ditandai.
- Error muncul dekat field terkait.
- Data yang sudah diisi tidak hilang ketika validasi gagal.
- Tombol submit menunjukkan status loading.
- Pengiriman ganda dicegah.
- Perubahan yang belum disimpan ditangani dengan benar.
4.5. Approval Workflow
Untuk menyetujui atau menolak transaksi.

Tampilkan:
- Informasi transaksi.
- Pembuat dan tanggal pengajuan.
- Riwayat persetujuan.
- Catatan atau alasan penolakan.
- Dampak tindakan.
- Tombol tindakan yang diizinkan.
Untuk tindakan penting, tampilkan dialog konfirmasi atau minta alasan sesuai aturan bisnis.
4.6. Scanner / Operational Task
Untuk aktivitas lapangan dan gudang.

Contoh:
- Scan barcode produk.
- Picking.
- Packing.
- Goods Receipt.
- Delivery confirmation.
- Proof of Delivery.
Pola ini perlu mengutamakan kecepatan, target sentuh yang memadai, feedback yang jelas, dan penanganan jaringan tidak stabil.
5. Rancang navigasi seperti SAP Fiori, tetapi sesuai kebutuhan mobile
Untuk aplikasi Raksa Business, saya tidak menyarankan menyalin sidebar SAP Fiori Web ke layar smartphone.

Navigasi mobile perlu disederhanakan.
Struktur navigasi yang disarankan
Raksa Business
│
├── Home
│   ├── Overview
│   ├── My Tasks
│   └── Recent Activity
│
├── Work
│   ├── Sales Orders
│   ├── Deliveries
│   ├── Payments
│   └── Inventory
│
├── Approvals
│   ├── Pending
│   ├── Approved
│   └── Rejected
│
└── Profile
    ├── My Profile
    ├── Organization
    ├── Branch / Warehouse
    ├── Security
    └── Settings

Ini merupakan contoh navigasi awal. Menu sebenarnya harus dihasilkan berdasarkan hak akses pengguna.

Untuk perangkat mobile, gunakan bottom navigation dengan sekitar 3–5 tujuan utama. Fitur yang jarang digunakan dapat ditempatkan pada halaman Work atau menu tambahan.

Untuk tablet, navigasi dapat dikembangkan menjadi navigation rail atau drawer.

Penting: navigasi tidak boleh menjadi sumber otorisasi. Backend tetap harus memvalidasi setiap tindakan.

Contohnya, menyembunyikan menu Platform Administration dari pengguna biasa tidak cukup. API yang menangani administrasi platform juga harus memeriksa izin pengguna.
6. Gunakan arsitektur feature-based
Untuk aplikasi enterprise yang akan terus berkembang, saya merekomendasikan struktur berdasarkan fitur bisnis dengan pemisahan antara UI, business logic, dan akses data.

Contoh struktur:
src/
├── app/
│   ├── App.tsx
│   ├── providers/
│   │   ├── ThemeProvider.tsx
│   │   ├── QueryProvider.tsx
│   │   └── AuthProvider.tsx
│   └── navigation/
│       ├── RootNavigator.tsx
│       ├── AuthNavigator.tsx
│       └── MainNavigator.tsx
│
├── theme/
│   ├── foundation/
│   ├── semantic/
│   ├── components/
│   └── index.ts
│
├── shared/
│   ├── components/
│   │   ├── AppButton/
│   │   ├── AppInput/
│   │   ├── AppStatusBadge/
│   │   └── AppListItem/
│   ├── hooks/
│   ├── utils/
│   └── types/
│
├── core/
│   ├── api/
│   │   ├── api-client.ts
│   │   ├── api-error.ts
│   │   └── api-types.ts
│   ├── auth/
│   ├── permissions/
│   ├── storage/
│   └── observability/
│
├── features/
│   ├── home/
│   ├── approvals/
│   ├── sales-orders/
│   ├── deliveries/
│   ├── customers/
│   ├── inventory/
│   ├── procurement/
│   ├── payments/
│   └── profile/
│
└── services/
    ├── auth.service.ts
    ├── organization.service.ts
    └── notification.service.ts

Struktur internal setiap fitur
Contohnya, fitur Sales Orders:
features/
└── sales-orders/
    ├── api/
    │   ├── sales-order.api.ts
    │   └── sales-order.keys.ts
    │
    ├── components/
    │   ├── SalesOrderCard.tsx
    │   ├── SalesOrderStatus.tsx
    │   └── SalesOrderSummary.tsx
    │
    ├── hooks/
    │   ├── useSalesOrders.ts
    │   └── useSalesOrderDetail.ts
    │
    ├── screens/
    │   ├── SalesOrderListScreen.tsx
    │   ├── SalesOrderDetailScreen.tsx
    │   └── SalesOrderCreateScreen.tsx
    │
    ├── schemas/
    │   └── sales-order.schema.ts
    │
    ├── types/
    │   └── sales-order.types.ts
    │
    └── index.ts

Keuntungannya adalah perubahan pada Sales Order tidak perlu mengganggu Inventory atau Procurement.

Selain itu, komponen UI generik tetap berada di shared, sedangkan komponen yang memahami aturan bisnis tertentu tetap berada dalam fitur masing-masing.
Contoh pemisahan tanggung jawab
SalesOrderListScreen
        │
        ▼
useSalesOrders
        │
        ▼
salesOrderApi
        │
        ▼
apiClient
        │
        ▼
Raksa Backend API

Screen tidak perlu mengetahui detail token autentikasi, URL server, mekanisme retry, atau format transport HTTP.

Dengan pendekatan ini, kamu dapat menguji setiap lapisan secara terpisah.
7. Integrasikan design system dengan React Native Paper
Saya menyarankan React Native Paper sebagai fondasi komponen, lalu membuat lapisan komponen internal agar implementasi Fiori tidak tersebar di seluruh aplikasi.

Contoh tema:
// src/theme/index.ts

import {
  MD3LightTheme,
  type MD3Theme,
} from 'react-native-paper';

const colors = {
  primary: '#6366F1',
  secondary: '#06B6D4',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  error: '#B91C1C',
};

export const raksaTheme: MD3Theme = {
  ...MD3LightTheme,

  roundness: 12,

  colors: {
    ...MD3LightTheme.colors,

    primary: colors.primary,
    secondary: colors.secondary,
    background: colors.background,
    surface: colors.surface,
    error: colors.error,
  },
};

Kemudian pasang pada root aplikasi:
import { PaperProvider } from 'react-native-paper';
import { raksaTheme } from '@/theme';

export function AppProviders({
  children,
}: React.PropsWithChildren) {
  return (
    <PaperProvider theme={raksaTheme}>
      {children}
    </PaperProvider>
  );
}

Contoh komponen tombol internal:
import {
  Button,
  type ButtonProps,
} from 'react-native-paper';

type AppButtonProps = ButtonProps & {
  variant?: 'primary' | 'secondary';
};

export function AppButton({
  variant = 'primary',
  mode,
  ...props
}: AppButtonProps) {
  return (
    <Button
      mode={mode ?? (variant === 'primary' ? 'contained' : 'outlined')}
      accessibilityRole="button"
      {...props}
    />
  );
}

Contoh tersebut masih merupakan fondasi sederhana. Implementasi produksi sebaiknya menambahkan standar ukuran, loading state, disabled state, aksesibilitas, dan perilaku tombol destruktif.

Aturan arsitektur yang penting: fitur bisnis harus menggunakan AppButton, AppInput, AppStatusBadge, dan komponen internal lainnya, bukan membuat styling sendiri berulang kali.

Untuk proyek Raksa yang sudah memiliki fondasi tema, pertahankan prinsip penggunaan useTheme() serta token foundation.spacing dan foundation.radius. Hindari mengakses objek tema global secara langsung dari setiap komponen.
8. Implementasikan RBAC dan multi-tenant dengan benar
Untuk aplikasi ERP, aspek ini sama pentingnya dengan UI.

Misalnya, satu pengguna memiliki akses ke beberapa organisasi dan cabang.

Alur aplikasi:
Launch
   │
   ▼
Authentication
   │
   ▼
Load User Context
   │
   ▼
Load Organizations
   │
   ▼
Select Organization
   │
   ▼
Select Branch / Workspace
   │
   ▼
Load Effective Permissions
   │
   ▼
Build Navigation
   │
   ▼
Home / Overview

Pemilihan organisasi atau cabang dapat dilewati jika konteksnya sudah ditentukan dan pengguna tidak perlu memilih.
Pisahkan autentikasi dan otorisasi
- Authentication: siapa pengguna yang sedang login?
- Authorization: tindakan apa yang boleh dilakukan pengguna?
- Organization context: organisasi mana yang sedang aktif?
- Branch context: cabang atau lokasi kerja mana yang sedang aktif?
Contoh definisi izin:
export const Permissions = {
  SALES_ORDER_READ: 'sales-order:read',
  SALES_ORDER_CREATE: 'sales-order:create',
  SALES_ORDER_APPROVE: 'sales-order:approve',

  INVENTORY_READ: 'inventory:read',
  INVENTORY_ADJUST: 'inventory:adjust',

  PAYMENT_READ: 'payment:read',
} as const;

Menu dapat ditentukan melalui konfigurasi:
type MenuDefinition = {
  id: string;
  title: string;
  route: string;
  requiredPermissions: string[];
};

export const workMenus: MenuDefinition[] = [
  {
    id: 'sales-orders',
    title: 'Sales Orders',
    route: 'SalesOrderList',
    requiredPermissions: [
      Permissions.SALES_ORDER_READ,
    ],
  },
  {
    id: 'inventory',
    title: 'Inventory',
    route: 'InventoryOverview',
    requiredPermissions: [
      Permissions.INVENTORY_READ,
    ],
  },
];

Selanjutnya, buat permission evaluator terpusat untuk menentukan menu yang boleh ditampilkan.

Untuk aplikasi produksi, pertimbangkan pula:
- Pengelolaan token akses dan refresh token.
- Penyimpanan token secara aman.
- Pemulihan sesi setelah aplikasi dibuka kembali.
- Pembaruan izin ketika konteks organisasi berubah.
- Penanganan sesi kedaluwarsa.
- Validasi otorisasi di backend untuk setiap request.
Jangan menyimpan access token di AsyncStorage. Gunakan mekanisme penyimpanan yang sesuai, seperti Expo SecureStore, dengan mempertimbangkan karakteristik token dan platform.
9. Integrasikan API dengan pola yang konsisten
Backend Raksa sebaiknya menyediakan kontrak request dan response yang konsisten.

Contoh response:
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: {
    requestId: string;
    timestamp: string;
  };
}

Contoh tipe Sales Order:
export type SalesOrderStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'COMPLETED';

export interface SalesOrder {
  id: string;
  documentNumber: string;
  customerName: string;
  totalAmount: number;
  currency: string;
  status: SalesOrderStatus;
  createdAt: string;
}

Contoh API service:
import type { SalesOrder } from '../types/sales-order.types';
import { apiClient } from '@/core/api/api-client';

export const salesOrderApi = {
  async getList(): Promise<SalesOrder[]> {
    const response = await apiClient.get<{
      success: boolean;
      data: SalesOrder[];
    }>('/sales-orders');

    return response.data.data;
  },
};

Kemudian, gunakan TanStack Query untuk mengelola server state:
import { useQuery } from '@tanstack/react-query';
import { salesOrderApi } from '../api/sales-order.api';

export function useSalesOrders() {
  return useQuery({
    queryKey: ['sales-orders'],
    queryFn: salesOrderApi.getList,
  });
}

Untuk transaksi yang mengubah data, gunakan mutation dan lakukan invalidasi cache setelah perubahan berhasil.

Untuk aplikasi lapangan, jangan menganggap cache TanStack Query otomatis menyediakan sistem offline yang andal. Jika Raksa Agri harus tetap beroperasi ketika koneksi terputus, dibutuhkan strategi penyimpanan lokal, antrean perubahan, sinkronisasi, dan penyelesaian konflik yang dirancang secara khusus.
10. Tentukan standar visual yang mendekati Fiori
Berikut baseline awal untuk aplikasi mobile Raksa. Nilai ini adalah rekomendasi implementasi, bukan angka baku dari SAP.
Elemen	Rekomendasi awal
Padding horizontal	16 px
Jarak antarkomponen	8–16 px
Jarak antarseksi	24 px
Tinggi input	48–56 px
Tinggi tombol utama	48–52 px
Radius kartu	12–16 px
Radius input	8–12 px
Ukuran judul halaman	22–28 px
Ukuran teks isi	14–16 px
Ukuran teks pendukung	12–14 px
Area sentuh	Minimal sekitar 44–48 px, dengan penyesuaian platform

Perhatikan beberapa aturan berikut.

Warna
- Gunakan warna brand untuk tindakan utama dan elemen identitas.
- Gunakan warna semantik untuk status bisnis.
- Hindari penggunaan warna berbeda untuk setiap kartu tanpa alasan fungsional.
Tipografi
- Bedakan judul halaman, judul bagian, label, nilai, dan teks pendukung.
- Untuk nominal transaksi, gunakan format angka dan mata uang yang konsisten.
Spacing
- Gunakan token, bukan nilai acak pada setiap komponen.
- Hindari tampilan terlalu padat seperti spreadsheet desktop yang dipindahkan langsung ke smartphone.
Interaksi
- Sediakan loading, empty, error, success, dan disabled state.
- Hindari tombol terlalu kecil.
- Jangan mengandalkan swipe sebagai satu-satunya cara melakukan tindakan penting.
Konsistensi platform
- Pertahankan sistem desain yang sama pada Android dan iOS, tetapi jangan memaksakan semua perilaku native agar identik.
Panduan resmi SAP memang membedakan desain Fiori untuk Android, iOS, dan Web. Karena itu, pendekatan yang paling tepat adalah mengikuti pola Fiori sambil tetap menghormati perilaku native masing-masing platform. sap.com
11. Urutan implementasi yang saya rekomendasikan
Jangan membangun seluruh modul ERP sekaligus. Bangun fondasi dan satu alur bisnis lengkap terlebih dahulu.
Phase 1 — Foundation
Bangun:
1. Setup React Native dan TypeScript.
2. Struktur folder dan aturan import.
3. Theme dan design tokens.
4. Komponen UI dasar.
5. Navigation.
6. API client.
7. Authentication dan secure storage.
8. Error handling dan logging.
Hasil: aplikasi memiliki fondasi yang siap dikembangkan.
Phase 2 — Core UX
Bangun:
1. Splash screen.
2. Login.
3. OTP/2FA sesuai kebijakan autentikasi.
4. Pemilihan organisasi dan cabang jika diperlukan.
5. Home / Overview.
6. Profil pengguna.
7. Permission-based navigation.
8. Loading, error, dan empty state.
Hasil: pengguna dapat login dan mengakses aplikasi berdasarkan konteks serta izinnya.
Phase 3 — Business Workflow
Untuk Raksa Agri, saya akan memprioritaskan:
1. Sales Order List.
2. Sales Order Detail.
3. Sales Order Create.
4. Approval List.
5. Approval Detail.
6. Delivery List.
7. Delivery Confirmation.
8. Payment List.
9. Stock Balance.
Mulai dari satu alur, misalnya:
Sales Order
    ↓
Detail
    ↓
Submit for Approval
    ↓
Approval
    ↓
Approved
    ↓
Delivery

Pastikan setiap tahap benar-benar terintegrasi dengan API, status transaksi, permission, dan penanganan error.
Phase 4 — Operational Features
Setelah alur utama stabil, lanjutkan dengan:
- Barcode scanning.
- Goods Receipt.
- Picking dan packing.
- Proof of Delivery.
- Push notifications.
- Offline support jika diperlukan.
- Audit trail untuk tindakan penting.
Phase 5 — Production Readiness
Sebelum rilis:
- Unit dan component testing.
- Integration testing.
- E2E testing.
- Pengujian akses tanpa izin.
- Pengujian session expiry.
- Pengujian jaringan lambat dan terputus.
- Pemeriksaan performa daftar besar.
- Monitoring error dan crash.
- Build dan release Android/iOS.
12. Gunakan pendekatan design-led development
Agar hasilnya benar-benar menyerupai pengalaman SAP Fiori, prosesnya sebaiknya tidak langsung dimulai dari coding.

Gunakan urutan berikut:
Business Requirements
        ↓
User Roles & Permissions
        ↓
User Journeys
        ↓
Information Architecture
        ↓
Fiori Design References
        ↓
Wireframes
        ↓
Design System
        ↓
Reusable Components
        ↓
Feature Implementation
        ↓
Automated Testing
        ↓
UX & Accessibility Review

Sebelum implementasi, tentukan terlebih dahulu siapa pengguna setiap fitur dan pekerjaan apa yang harus mereka selesaikan. Pendekatan ini sejalan dengan panduan SAP tentang desain aplikasi berdasarkan peran dan proses bisnis. SAP Design System
Standar evaluasi setiap halaman
Setiap halaman setidaknya harus memenuhi kriteria berikut:
Aspek	Kriteria
UX	Pengguna dapat menyelesaikan tugas tanpa langkah yang tidak perlu
Visual	Mengikuti token dan komponen design system
Responsiveness	Tidak terpotong pada ukuran layar yang didukung
Accessibility	Label, kontras, dan area sentuh memadai
State handling	Loading, error, empty, dan success tersedia
Authorization	Tindakan mengikuti izin pengguna
Performance	Daftar besar tidak membuat UI tersendat
Testing	Alur kritis memiliki pengujian otomatis

13. Rekomendasi akhir untuk Raksa Business
Untuk proyekmu, saya akan memilih pendekatan berikut:
Area	Keputusan
Framework	React Native + Expo
Bahasa	TypeScript
UI foundation	React Native Paper
Design language	SAP Fiori-inspired mobile UX
Design tokens	Custom foundation dan semantic tokens
Navigasi	Role-based, permission-driven
State server	TanStack Query
Form	React Hook Form + Zod
Local state	Zustand jika diperlukan
API	Standardized API client dan response contract
Security	Secure storage, session management, server-side authorization
Arsitektur	Feature-based modular architecture
Testing	Jest, React Native Testing Library, dan E2E testing

Ada satu keputusan desain yang sangat penting: jangan membuat aplikasi yang hanya terlihat seperti SAP Fiori; buat aplikasi yang juga mengikuti cara Fiori menyederhanakan pekerjaan pengguna.

Contohnya, staf gudang seharusnya dapat memindai barang dan mengonfirmasi penerimaan tanpa harus melewati banyak halaman yang tidak relevan. Approver seharusnya dapat melihat konteks transaksi dan mengambil keputusan tanpa mencari informasi di berbagai menu.

Itulah perbedaan antara sekadar meniru tampilan Fiori dan membangun aplikasi enterprise dengan pendekatan Fiori.
Langkah selanjutnya
Untuk Raksa Business, saya menyarankan memulai dengan membangun SAP Fiori-inspired Mobile Design System yang menjadi fondasi semua fitur.

Fondasi itu mencakup:
- Design tokens dan theme.
- Navigasi mobile.
- App header dan bottom navigation.
- Button, input, select, date picker.
- Status badge.
- List report dan object detail.
- Form layout.
- Approval components.
- Dialog dan bottom sheet.
- Loading, empty, dan error state.
- Dokumentasi aturan penggunaan komponen.
Setelah fondasi tersebut stabil, implementasi Sales Order, Approval, Inventory, dan Delivery akan lebih konsisten, cepat, dan mudah dipelihara.
