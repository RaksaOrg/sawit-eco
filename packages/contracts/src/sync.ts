import { z } from 'zod';

export const syncEventTypeSchema = z.enum([
  'ATTENDANCE',
  'TASK_COMPLETE',
  'LEARNING_PROGRESS',
  'DIAGNOSIS_MEDIA',
]);

export const syncEventSchema = z.object({
  id: z.string().uuid(),
  type: syncEventTypeSchema,
  payload: z.record(z.string(), z.unknown()),
  createdAt: z.string().min(1),
  status: z.enum(['PENDING', 'SYNCED', 'FAILED']),
});

export const syncBatchSchema = z.object({
  deviceId: z.string().min(1),
  events: z.array(syncEventSchema).min(1),
});

export const syncResultSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['SYNCED', 'FAILED']),
  errorCode: z.string().optional(),
});

export type SyncEvent = z.infer<typeof syncEventSchema>;
export type SyncBatchInput = z.infer<typeof syncBatchSchema>;
export type SyncResult = z.infer<typeof syncResultSchema>;
