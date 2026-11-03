# SAP FIORI DESIGN SYSTEM - MANDATORY SOURCE OF TRUTH

Design System proyek ini adalah SAP Fiori (Horizon Theme), BUKAN design custom.
Semua agent WAJIB patuh ke SAP Fiori Design Guidelines for Web.

## Library Wajib

- Framework: @ui5/webcomponents-react (UI5 Web Components for React)
- Theme: Morning Horizon (`sap_horizon`)
- Font: "72" / "72full" - font resmi SAP
- DILARANG membuat komponen custom jika sudah ada di UI5/Fiori
- DILARANG hardcode warna. Gunakan CSS Variables SAP: var(--sapBrandColor), var(--sapBackgroundColor), var(--sapTextColor), var(--sapErrorColor), var(--sapSuccessColor)

## Floorplan Wajib Per Jenis Halaman

- Dashboard Owner: Overview Page / Analytical List Page
- Daftar Data (Blok, Mandor, Laporan): List Report Floorplan
- Detail Data (Detail Blok, Detail Mandor): Object Page Floorplan
- Form Input: Object Page dengan Form Section
- DILARANG membuat layout dashboard bebas di luar floorplan ini

## Komponen Wajib

Gunakan komponen UI5: ShellBar, SideNavigation, DynamicPage, FlexibleColumnLayout, AnalyticalTable, Table, Card, ObjectStatus, ObjectHeader, Form, Input, DatePicker, Button (Emphasized/Default/Transparent), MessageStrip, MessageBox, BusyIndicator.

## Aturan Visual Fiori

1. Primary Action = Emphasized Button
2. Delete/Critical = Negative Button
3. Success/Warning/Error = ObjectStatus & MessageStrip dengan warna semantik SAP
4. Spacing & radius mengikuti Horizon theme, jangan diubah manual
5. Wajib Responsive: Desktop, Tablet, Mobile sesuai Fiori Responsive Behavior
6. Wajib ada state: Loading (BusyIndicator), Empty (IllustratedMessage), Error (MessageStrip)

Jika Fiori tidak punya pola untuk kebutuhan tertentu, laporkan sebagai DESIGN GAP. Jangan mengarang design sendiri.
