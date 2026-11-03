import { z } from 'zod';

export const lessonProgressSchema = z.object({
  userId: z.string().uuid(),
  moduleId: z.string().uuid(),
  isCompleted: z.boolean(),
});

export const courseSummarySchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  topic: z.enum(['HARVEST', 'PRUNING', 'FERTILIZING', 'PEST_DISEASE', 'K3']),
  durationSeconds: z.number().int().positive(),
  offlineReady: z.boolean(),
  completed: z.boolean(),
});

export type LessonProgressInput = z.infer<typeof lessonProgressSchema>;
export type CourseSummary = z.infer<typeof courseSummarySchema>;
