import { useQuery } from '@tanstack/react-query';
import { apiRequest } from './client';

export interface MobileTask {
  id: string;
  kodeTugas: string;
  blokKode: string;
  aktivitas: string;
  deskripsi: string | null;
  targetKuantitas: number;
  satuanTarget: string;
  tanggalTarget: string;
  prioritas: string;
  status: string;
  mandorNama: string | null;
  isOverdue: boolean;
}

export interface LearningModule {
  id: string;
  judul: string;
  kategori: string;
  deskripsi: string;
  durasiMenit: number;
  konten: string;
  videoUrl: string | null;
}

export interface CatalogProduct {
  id: string;
  sku: string;
  nama: string;
  kategori: string;
  harga: number;
  satuan: string;
  ukuranKemasan: number;
  satuanKemasan: string;
  stok: number;
  isActive: boolean;
}

export interface MobileOrder {
  id: string;
  status: string;
  approvalStatus: string;
  paymentStatus: string;
  totalHarga: number;
  createdAt: string;
  user: { nama: string };
  items: Array<{ blokKode: string; alasanRekomendasi: string | null; kuantitas: number }>;
}

export function useTasks() {
  return useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const data = await apiRequest<{ tasks: MobileTask[] }>('/api/tasks?status=ASSIGNED');
      return data.tasks;
    },
  });
}

export function useLearningModules() {
  return useQuery({
    queryKey: ['learning-modules'],
    queryFn: async () => {
      const data = await apiRequest<{ modules: LearningModule[] }>('/api/learning/modules');
      return data.modules;
    },
  });
}

export function useCatalog() {
  return useQuery({
    queryKey: ['catalog'],
    queryFn: async () => {
      const data = await apiRequest<{ products: CatalogProduct[] }>('/api/commerce/catalog');
      return data.products;
    },
  });
}

export function usePendingOrders() {
  return useQuery({
    queryKey: ['pending-orders'],
    queryFn: async () => {
      const data = await apiRequest<{ orders: MobileOrder[] }>(
        '/api/commerce/orders?status=SUBMITTED',
      );
      return data.orders;
    },
  });
}
