import { z } from 'zod';
import { approvalStatusSchema, orderStatusSchema, paymentStatusSchema } from './common';

// Error codes for structured API responses
export const ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_REQUEST: 'INVALID_REQUEST',
  PRODUCT_NOT_FOUND: 'PRODUCT_NOT_FOUND',
  OUT_OF_STOCK: 'OUT_OF_STOCK',
  PRICE_CHANGED: 'PRICE_CHANGED',
  INVALID_PRODUCT: 'INVALID_PRODUCT',
  BLOCK_ACCESS_DENIED: 'BLOCK_ACCESS_DENIED',
  RECOMMENDATION_INVALID: 'RECOMMENDATION_INVALID',
  IDEMPOTENCY_CONFLICT: 'IDEMPOTENCY_CONFLICT',
  ORDER_ALREADY_EXISTS: 'ORDER_ALREADY_EXISTS',
  ORDER_PROCESSING: 'ORDER_PROCESSING',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
} as const;

// Error message templates (never expose internal details)
export const ERROR_MESSAGES = {
  [ERROR_CODES.UNAUTHORIZED]: 'Tidak terautentikasi. Silakan login kembali.',
  [ERROR_CODES.FORBIDDEN]: 'Akses ditolak. Anda tidak berwenang untuk aksi ini.',
  [ERROR_CODES.INVALID_REQUEST]: 'Permintaan tidak valid. Periksa input Anda.',
  [ERROR_CODES.PRODUCT_NOT_FOUND]: 'Produk tidak ditemukan.',
  [ERROR_CODES.OUT_OF_STOCK]: 'Stok produk tidak mencukupi.',
  [ERROR_CODES.PRICE_CHANGED]: 'Harga produk telah berubah sejak ditambahkan ke keranjang.',
  [ERROR_CODES.INVALID_PRODUCT]: 'ID produk tidak valid atau tidak aktif.',
  [ERROR_CODES.BLOCK_ACCESS_DENIED]: 'Tidak memiliki akses ke blok yang diminta.',
  [ERROR_CODES.RECOMMENDATION_INVALID]: 'Referensi rekomendasi tidak valid atau sudah kadaluarsa.',
  [ERROR_CODES.IDEMPOTENCY_CONFLICT]: 'Permintaan duplikat dengan idempotency key yang sama.',
  [ERROR_CODES.ORDER_ALREADY_EXISTS]: 'Pesanan dengan permintaan ini sudah diproses sebelumnya.',
  [ERROR_CODES.ORDER_PROCESSING]: 'Pesanan sedang diproses oleh sistem. Silakan coba lagi nanti.',
  [ERROR_CODES.INTERNAL_SERVER_ERROR]: 'Terjadi kesalahan server. Silakan hubungi administrator.',
} as const;

export const catalogProductSchema = z.object({
  id: z.string(),
  sku: z.string(),
  name: z.string(),
  category: z.string(),
  unit: z.string(),
  packSize: z.number().positive(),
  price: z.number().nonnegative(),
  currency: z.string().length(3),
  stock: z.number().int().nonnegative(),
  isActive: z.boolean(),
  regulatoryStatus: z.enum(['VALID', 'EXPIRED', 'RESTRICTED']).default('VALID'),
  restricted: z.boolean().default(false),
});

export const addCartItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
  blockCode: z.string().min(1),
  recommendationId: z.string().optional(),
  recommendationReason: z.string().optional(),
});

export const orderItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().nonnegative(),
  blockCode: z.string().min(1),
  recommendationId: z.string().optional(),
});

// Mobile checkout input - minimal client payload, userId from auth token only
export const mobileCheckoutInputSchema = z.object({
  action: z.literal('mobile-checkout'),
  idempotencyKey: z.string().uuid().or(z.string().min(1)), // UUID preferred, fallback to string
  items: z.array(
    z.object({
      productId: z.string().uuid(),
      quantity: z.number().int().positive(),
      blockCode: z.string().min(1),
      recommendationId: z.string().optional(),
      recommendationReason: z.string().optional(),
    })
  ),
  estimateAcknowledged: z.boolean(), // Client-side preview acknowledgement
});

// Full order submit input (for cart-based checkout)
export const orderSubmitSchema = z.object({
  cartId: z.string().uuid(),
  estimateAcknowledged: z.boolean(),
  paymentMethod: z.enum(['MANUAL_TRANSFER', 'VIRTUAL_ACCOUNT', 'INVOICE']).default('MANUAL_TRANSFER'),
  notes: z.string().max(1000).optional(),
  idempotencyKey: z.string().min(1),
});

export const orderDecisionSchema = z.object({
  orderId: z.string().uuid(),
  approverId: z.string().uuid(),
  decision: z.enum(['APPROVED', 'REJECTED']),
  reason: z.string().max(1000).optional(),
});

export const paymentProofSchema = z.object({
  orderId: z.string().uuid(),
  amount: z.number().positive(),
  reference: z.string().min(1),
  proofUrl: z.string().url().optional(),
});

export const orderSchema = z.object({
  id: z.string().uuid(),
  orderNo: z.string(),
  status: orderStatusSchema,
  approvalStatus: approvalStatusSchema,
  paymentStatus: paymentStatusSchema,
  total: z.number().nonnegative(),
  currency: z.string().length(3),
  createdAt: z.string(),
});

export const recommendationProductCardSchema = z.object({
  recommendationId: z.string(),
  sku: z.string(),
  productName: z.string(),
  reason: z.string(),
  blockCode: z.string(),
  blockAreaHa: z.number().positive(),
  estimatedQty: z.number().positive(),
  qtyUnit: z.string(),
  estimateBasis: z.string(),
  isFinalDosage: z.literal(false),
  warningKey: z.string(),
  priceEstimate: z.number().nonnegative(),
  stockStatus: z.enum(['AVAILABLE', 'LOW', 'OUT_OF_STOCK']),
});

export type CatalogProduct = z.infer<typeof catalogProductSchema>;
export type AddCartItemInput = z.infer<typeof addCartItemSchema>;
export type OrderSubmitInput = z.infer<typeof orderSubmitSchema>;
export type OrderDecisionInput = z.infer<typeof orderDecisionSchema>;
export type PaymentProofInput = z.infer<typeof paymentProofSchema>;
export type Order = z.infer<typeof orderSchema>;
export type RecommendationProductCard = z.infer<typeof recommendationProductCardSchema>;
export type MobileCheckoutInput = z.infer<typeof mobileCheckoutInputSchema>;
