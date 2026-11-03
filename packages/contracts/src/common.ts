import { z } from 'zod';

export const roleSchema = z.enum([
  'OWNER',
  'MANAGER',
  'AGRONOM',
  'ADMIN_COMMERCE',
  'MANDOR',
  'PEKERJA',
]);

export const riskLevelSchema = z.enum(['RENDAH', 'SEDANG', 'TINGGI', 'KRITIS']);

export const attendanceStatusSchema = z.enum(['PRESENT', 'HALF_DAY', 'ABSENT', 'LEAVE']);

export const attendanceSourceSchema = z.enum(['WHATSAPP', 'MOBILE', 'WEB']);

export const orderStatusSchema = z.enum([
  'SUBMITTED',
  'APPROVED',
  'REJECTED',
  'PAID',
  'DELIVERED',
  'CANCELLED',
]);

export const approvalStatusSchema = z.enum(['PENDING', 'APPROVED', 'REJECTED']);

export const paymentStatusSchema = z.enum(['UNPAID', 'PENDING_VERIFICATION', 'PAID', 'FAILED']);

export const businessStatusSchema = z.enum([
  'DRAFT',
  'PENDING',
  'IN_PROGRESS',
  'SUCCESS',
  'WARNING',
  'ERROR',
]);

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const apiMetaSchema = z.object({
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().optional(),
  total: z.number().int().nonnegative().optional(),
  traceId: z.string().optional(),
});

export const apiErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string().min(1),
    message: z.string().min(1),
    details: z.record(z.string(), z.unknown()).optional(),
    traceId: z.string().optional(),
  }),
});

export function apiSuccessSchema<T extends z.ZodType>(data: T) {
  return z.object({
    success: z.literal(true),
    data,
    meta: apiMetaSchema.optional(),
  });
}

export type Role = z.infer<typeof roleSchema>;
export type RiskLevel = z.infer<typeof riskLevelSchema>;
export type AttendanceStatus = z.infer<typeof attendanceStatusSchema>;
export type AttendanceSource = z.infer<typeof attendanceSourceSchema>;
export type OrderStatus = z.infer<typeof orderStatusSchema>;
export type ApprovalStatus = z.infer<typeof approvalStatusSchema>;
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;
export type BusinessStatus = z.infer<typeof businessStatusSchema>;
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
export type ApiError = z.infer<typeof apiErrorSchema>;
