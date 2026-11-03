import { z } from 'zod';
import { riskLevelSchema } from './common';

export const diagnosisRequestSchema = z.object({
  blockCode: z.string().min(1),
  symptoms: z.string().min(1),
  photoUrl: z.string().url().optional(),
  targetSku: z.string().min(1),
  dosageKgPerHa: z.number().positive(),
  disclaimer: z.string().min(1),
  reason: z.string().min(1),
});

export const recommendationEstimationSchema = z.object({
  luasHa: z.number().positive(),
  totalKg: z.number().positive(),
  jumlahSak: z.number().int().positive(),
  ukuranKemasanKg: z.number().positive(),
});

export const recommendedProductSchema = z.object({
  id: z.string(),
  sku: z.string(),
  nama: z.string(),
  harga: z.number().nonnegative(),
  satuan: z.string(),
  ukuranKemasan: z.number().positive(),
  isActive: z.boolean(),
});

export const diagnosisResultSchema = z.object({
  status: z.enum(['RECOMMENDED', 'PRODUCT_GAP']),
  disclaimer: z.string(),
  product: recommendedProductSchema.optional(),
  estimation: recommendationEstimationSchema.optional(),
  gapReason: z.string().optional(),
});

export const riskAssessmentSchema = z.object({
  blockCode: z.string(),
  diagnosis: z.string(),
  riskLevel: riskLevelSchema,
  confidence: z.number().min(0).max(1),
  actionsToday: z.array(z.string()),
  actionsNextDays: z.array(z.string()),
  lessonIds: z.array(z.string()),
  productSkus: z.array(z.string()),
  productGap: z.array(z.string()),
  humanReviewRequired: z.boolean(),
});

export type DiagnosisRequest = z.infer<typeof diagnosisRequestSchema>;
export type DiagnosisResult = z.infer<typeof diagnosisResultSchema>;
export type RiskAssessment = z.infer<typeof riskAssessmentSchema>;
