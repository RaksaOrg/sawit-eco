export const MOCK_REASONING_TEXT =
  'Ringkasan mock: laporan lapangan telah dinormalisasi. Tidak ada anomali kritis pada data mock.';
export const MOCK_VISION_DIAGNOSIS = 'Indikasi mock: defisiensi kalium ringan pada daun sawit';
export const MOCK_TRANSCRIPT = 'Laporan mock: panen Blok B2 4200 Kg hadir 6 orang selesai';

export function isModelMockEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.MOCK_MODELS_ENABLED === '1';
}
