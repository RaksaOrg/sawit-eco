export type FioriState = 'Positive' | 'Critical' | 'Negative' | 'Information' | 'None';

export interface StatusInfo {
  state: FioriState;
  label: string;
}

export function rotasiStatusInfo(status: string): StatusInfo {
  switch (status) {
    case 'SUCCESS':
      return { state: 'Positive', label: 'Dalam Rotasi (7–14 hari)' };
    case 'WARNING':
      return { state: 'Critical', label: 'Terlalu Dini (<7 hari)' };
    case 'ERROR':
      return { state: 'Negative', label: 'Overdue (>14 hari)' };
    default:
      return { state: 'None', label: 'Belum Ada Riwayat' };
  }
}

export function taskStatusInfo(status: string, isOverdue = false): StatusInfo {
  if (isOverdue && status !== 'COMPLETED' && status !== 'CANCELLED') {
    return { state: 'Negative', label: 'Overdue' };
  }
  switch (status) {
    case 'COMPLETED':
      return { state: 'Positive', label: 'Selesai' };
    case 'IN_PROGRESS':
      return { state: 'Information', label: 'Sedang Berjalan' };
    case 'ASSIGNED':
      return { state: 'Information', label: 'Ditugaskan' };
    case 'CANCELLED':
      return { state: 'None', label: 'Dibatalkan' };
    default:
      return { state: 'None', label: status };
  }
}

export function riskStatusInfo(risiko: string): StatusInfo {
  switch (risiko.toUpperCase()) {
    case 'KRITIS':
      return { state: 'Negative', label: 'Kritis' };
    case 'TINGGI':
      return { state: 'Negative', label: 'Tinggi' };
    case 'SEDANG':
      return { state: 'Critical', label: 'Sedang' };
    case 'RENDAH':
      return { state: 'Positive', label: 'Rendah' };
    default:
      return { state: 'None', label: risiko };
  }
}

export function orderStatusInfo(status: string): StatusInfo {
  switch (status) {
    case 'APPROVED':
    case 'PAID':
    case 'DELIVERED':
      return {
        state: 'Positive',
        label: status === 'APPROVED' ? 'Disetujui' : status === 'PAID' ? 'Dibayar' : 'Terkirim',
      };
    case 'SUBMITTED':
      return { state: 'Critical', label: 'Menunggu Persetujuan' };
    case 'REJECTED':
    case 'CANCELLED':
      return { state: 'Negative', label: status === 'REJECTED' ? 'Ditolak' : 'Dibatalkan' };
    default:
      return { state: 'Information', label: status };
  }
}

export function priorityStatusInfo(prioritas: string): StatusInfo {
  switch (prioritas.toUpperCase()) {
    case 'URGENT':
      return { state: 'Negative', label: 'Mendesak' };
    case 'HIGH':
      return { state: 'Critical', label: 'Tinggi' };
    case 'MEDIUM':
      return { state: 'Information', label: 'Sedang' };
    default:
      return { state: 'None', label: 'Rendah' };
  }
}
