import { z } from 'zod';
import { approvalStatusSchema, orderStatusSchema, paymentStatusSchema } from './common';

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

export const orderSubmitSchema = z.object({
  cartId: z.string().uuid(),
  estimateAcknowledged: z.boolean(),
  paymentMethod: z
    .enum(['MANUAL_TRANSFER', 'VIRTUAL_ACCOUNT', 'INVOICE'])
    .default('MANUAL_TRANSFER'),
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
  proofUrl: z.string().optional(),
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
