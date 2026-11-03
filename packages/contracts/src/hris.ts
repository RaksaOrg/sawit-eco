import { z } from 'zod';
import { attendanceSourceSchema, attendanceStatusSchema } from './common';

export const attendanceCreateSchema = z.object({
  userId: z.string().uuid(),
  blockCode: z.string().min(1),
  workDate: z.string().min(1),
  status: attendanceStatusSchema.default('PRESENT'),
  source: attendanceSourceSchema.default('MOBILE'),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  notes: z.string().max(1000).optional(),
  idempotencyKey: z.string().min(1),
  overtimeHours: z.number().min(0).max(12).optional(),
});

export const attendanceCorrectionSchema = z.object({
  id: z.string().uuid(),
  status: attendanceStatusSchema,
  reason: z.string().min(1).max(500),
  notes: z.string().max(1000).optional(),
  actorId: z.string().optional(),
});

export const attendanceRecordSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  blockCode: z.string(),
  workDate: z.string(),
  status: attendanceStatusSchema,
  verificationStatus: z.enum(['VERIFIED', 'PENDING_VERIFICATION', 'REJECTED']),
  source: z.string(),
  hkValue: z.number().nonnegative(),
  createdAt: z.string(),
});

export const attendanceSummarySchema = z.object({
  present: z.number().int().nonnegative(),
  halfDay: z.number().int().nonnegative(),
  absent: z.number().int().nonnegative(),
  totalHk: z.number().nonnegative(),
});

export const attendanceListResponseSchema = z.object({
  records: z.array(attendanceRecordSchema),
  summary: attendanceSummarySchema,
});

export const productivityQuerySchema = z.object({
  scopeType: z.enum(['BLOCK', 'MANDOR', 'ESTATE']).default('BLOCK'),
  scopeId: z.string().min(1),
  period: z.string().regex(/^\d{4}-\d{2}$/),
});

export const productivitySchema = z.object({
  scopeType: z.enum(['BLOCK', 'MANDOR', 'ESTATE']),
  scopeId: z.string(),
  harvestKg: z.number().nonnegative(),
  treatedHa: z.number().nonnegative(),
  hkTotal: z.number().nonnegative(),
  kgPerHk: z.number().nonnegative().nullable(),
  haPerHk: z.number().nonnegative().nullable(),
  rotationDays: z.number().nonnegative().nullable(),
  sampleSize: z.number().nonnegative(),
  formulaVersion: z.string(),
});

export const mandorScoreSchema = z.object({
  mandorId: z.string(),
  period: z.string().regex(/^\d{4}-\d{2}$/),
  compositeScore: z.number().min(0).max(100).nullable(),
  eligible: z.boolean(),
  rank: z.number().int().nonnegative().nullable(),
  sampleHk: z.number().nonnegative(),
});

export type AttendanceCreateInput = z.infer<typeof attendanceCreateSchema>;
export type AttendanceCorrectionInput = z.infer<typeof attendanceCorrectionSchema>;
export type AttendanceRecord = z.infer<typeof attendanceRecordSchema>;
export type AttendanceSummary = z.infer<typeof attendanceSummarySchema>;
export type ProductivityQuery = z.infer<typeof productivityQuerySchema>;
export type Productivity = z.infer<typeof productivitySchema>;
export type MandorScore = z.infer<typeof mandorScoreSchema>;
