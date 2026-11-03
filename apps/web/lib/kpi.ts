export interface RotasiStatus {
  blokKode: string;
  terakhirPanen: Date | null;
  hariSejakPanen: number | null;
  status: 'SUCCESS' | 'WARNING' | 'ERROR' | 'UNKNOWN';
  label: string;
}

export function getRotasiStatusList(
  blocks: Array<{ blokKode: string; terakhirPanen: Date | null }>,
  refDate = new Date(),
): RotasiStatus[] {
  return blocks.map((b) => {
    const status = evaluasiRotasiPanen(b.terakhirPanen, refDate);
    const hariSejak = b.terakhirPanen
      ? Math.floor(
          (refDate.getTime() - new Date(b.terakhirPanen).getTime()) / (1000 * 60 * 60 * 24),
        )
      : null;
    const labels: Record<string, string> = {
      SUCCESS: 'Dalam Rotasi (7-14 hari)',
      WARNING: 'Terlalu Dini (<7 hari)',
      ERROR: 'Overdue (>14 hari)',
      UNKNOWN: 'Belum Ada Riwayat',
    };
    return {
      blokKode: b.blokKode,
      terakhirPanen: b.terakhirPanen,
      hariSejakPanen: hariSejak,
      status,
      label: labels[status],
    };
  });
}

export function hitungProduktivitas(
  aktivitas: string,
  produksiKg: number,
  luasHa: number,
  hadir: number,
): number {
  if (!hadir || hadir <= 0) return 0;
  if (aktivitas.toLowerCase() === 'panen') {
    return Number((produksiKg / hadir).toFixed(2));
  }
  return Number((luasHa / hadir).toFixed(2));
}

export function evaluasiRotasiPanen(
  terakhirPanen: Date | null,
  refDate = new Date(),
): RotasiStatus['status'] {
  if (!terakhirPanen) return 'UNKNOWN';
  const msDiff = refDate.getTime() - new Date(terakhirPanen).getTime();
  const daysDiff = Math.floor(msDiff / (1000 * 60 * 60 * 24));

  if (daysDiff < 7) {
    return 'WARNING'; // Terlalu dini
  }
  if (daysDiff <= 14) {
    return 'SUCCESS'; // Ideal (7 - 14 hari)
  }
  return 'ERROR'; // Overdue > 14 hari (potensi buah busuk/restan)
}
