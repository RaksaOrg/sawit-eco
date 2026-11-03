# FIORI PLATFORMS - WEB & MOBILE - MANDATORY

## 1. Definisi yang tidak boleh dicampur

| Layer | Fungsi | Teknologi Wajib |
| SAP Fiori | Prinsip desain & UX enterprise | Panduan untuk semua platform |
| Web | Dashboard enterprise | Next.js + @ui5/webcomponents-react + Theme Morning Horizon `sap_horizon` |
| Mobile | Aplikasi lapangan native | React Native + Expo + TypeScript + React Native Paper |

Dilarang menggunakan SAPUI5/OpenUI5 di Mobile.
Dilarang mengklaim React Native Paper adalah implementasi resmi SAP Fiori.
Mobile adalah Fiori-INSPIRED: mengikuti pola Fiori melalui komponen native.

## 2. Prinsip Fiori yang wajib di kedua platform

1.  Role-based: Fitur, menu, dan tombol mengikuti role & permission user. Menyembunyikan menu BUKAN keamanan, backend wajib validasi ulang.
2.  Consistency: Tombol, form, list, status, navigasi berperilaku sama di semua modul.
3.  Simple: Tugas operasional selesai dalam langkah sesedikit mungkin.
4.  Responsive: Web mengikuti breakpoint Fiori. Mobile mengikuti phone & tablet (bottom nav di phone, rail/drawer di tablet).
5.  Enterprise IA: Data, tindakan, status, dan navigasi mengikuti proses bisnis.
6.  Accessibility: Kontras cukup, area sentuh min. 44-48px di mobile, tidak mengandalkan warna saja untuk status.

## 3. Status Bisnis Semantik - Sama di Web & Mobile

Gunakan makna yang sama, token boleh beda per platform:
Draft, Pending, In Progress, Success, Warning, Error
Selalu tampilkan teks status, jangan hanya warna. Gunakan komponen bersama: ObjectStatus di Web, AppStatusBadge di Mobile.

## 4. Pemetaan Pola Halaman Fiori

Designer wajib memakai tabel ini di 03-UI-SPEC.md.

| Pola Fiori | Penggunaan | Implementasi Web UI5 | Implementasi Mobile RN Paper |
| Overview / Home | Ringkasan kerja per role | Overview Page + Card | Home Screen + AppCard KPI |
| List Report | Daftar transaksi | List Report Floorplan + AnalyticalTable | List Screen + AppListItem + Filter Bar |
| Object Page | Detail 1 objek bisnis | Object Page Floorplan + ObjectHeader | Detail Screen + AppHeader + Section |
| Form Create/Edit | Buat/ubah data | Object Page Form Section | Form Screen + AppTextField |
| Approval | Persetujuan transaksi | Object Page + Approval History | Approval Screen + AppConfirmDialog |
| Scanner / Operational | Tugas lapangan, gudang, panen | Tidak diutamakan di Web | Scanner Screen, target sentuh besar, offline-first |

## 5. Navigasi

Mobile: Bottom Navigation 3-5 tujuan utama di phone, Navigation Rail/Drawer di tablet. Menu dibangun dari permission.
Web: ShellBar + SideNavigation sesuai Floorplan Fiori.
Navigasi BUKAN sumber otorisasi. Setiap API wajib cek permission di backend.

## 6. Aturan Token Bersama

Sumber kebenaran semantik sama untuk Web & Mobile: color purpose, spacing scale, status meaning.
Implementasi token boleh berbeda: CSS Variables SAP di Web, `foundation.spacing / radius / borderWidth` + `useTheme()` di Mobile.
Dilarang meng-copy nilai token ke local constant. Dilarang hardcode warna/spacing/radius/typography yang sudah ada tokennya di platform manapun.
