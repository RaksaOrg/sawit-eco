# CODE QUALITY COMPLIANCE - MANDATORY FOR EVERY CHANGE

Aturan ini berlaku untuk SETIAP perubahan kode, tanpa pengecualian.

## Perintah Wajib

Developer WAJIB menjalankan dan MEMPERBAIKI sampai lulus:
1. `npx tsc --noEmit`
2. `npx eslint . --fix`
3. `npx prettier --write .`
4. `npm test -- --coverage`

QA WAJIB menjalankan ulang TANPA --fix / --write untuk verifikasi:
1. `npx tsc --noEmit`
2. `npx eslint .`
3. `npx prettier --check .`
4. `npm test -- --coverage`

## Standar Lulus

- TypeScript: 0 error. Dilarang pakai `// @ts-ignore` tanpa approval tertulis.
- ESLint: 0 error, 0 warning.
- Prettier: Semua file sudah ter-format. `prettier --check` harus PASS.
- Jest: Semua test PASS.
- Coverage: 100% untuk Statements, Branches, Functions, Lines.

## Aturan Coverage 100%

- File yang dikecualikan dari coverage hanya boleh: file config, file type `.d.ts`, entry point, dan file yang disetujui Tech Lead.
- Setiap pengecualian WAJIB ditulis di 05-IMPLEMENTATION.md sebagai `COVERAGE EXCEPTION: [file] - [alasan] - BUTUH APPROVAL`.
- Dilarang menurunkan threshold, menambah `istanbul ignore` , atau skip test untuk menaikkan coverage.
- Test harus mencakup: happy path, error path, empty state, dan edge case dari Acceptance Criteria PRD.

## Bukti Wajib

Developer & QA tidak boleh menulis "semua lulus" tanpa bukti.
Wajib tempel output terminal terakhir di artifact masing-masing.

Jika 1 saja gagal: Status = BLOCKED. Dilarang lanjut ke fase berikutnya.
