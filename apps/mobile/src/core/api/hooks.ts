import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

export interface CartItem {
  productId: string;
  productSku: string;
  productName: string;
  harga: number;
  satuan: string;
  jumlah: number;
  blokKode: string;
  alasanRekomendasi?: string;
  totalPrice: number;
}

export interface CartState {
  items: CartItem[];
  totalHarga: number;
  isEmpty: boolean;
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
      const data = await apiRequest<{ orders: MobileOrder[] }>('/api/commerce/orders?status=SUBMITTED');
      return data.orders;
    },
  });
}

export function useCart() {
  return useQuery({
    queryKey: ['cart'],
    queryFn: async () => {
      const data = await apiRequest('/api/commerce/cart') as {
        cart: CartItem[];
      };

      const items = data.cart ?? [];

      return {
        items,
        totalHarga: items.reduce(
          (sum, item) => sum + item.totalPrice,
          0,
        ),
        isEmpty: items.length === 0,
      };
    },
  });
}

export function useUpdateCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      action: 'ADD' | 'UPDATE' | 'REMOVE';
      productId?: string;
      data?: Partial<CartItem>;
    }) => {
      return apiRequest('/api/commerce/cart', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}

export function useSubmitOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      userId: string;
      estimateAcknowledged: boolean;
      idempotencyKey: string;
      items: Array<{
        productId: string;
        quantity: number;
        blockCode: string;
        recommendationReason?: string;
      }>;
    }) => {
      return apiRequest('/api/commerce/orders', {
        method: 'POST',
        body: JSON.stringify({
          action: 'mobile-checkout',
          ...payload,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      queryClient.invalidateQueries({ queryKey: ['pending-orders'] });
    },
  });
}