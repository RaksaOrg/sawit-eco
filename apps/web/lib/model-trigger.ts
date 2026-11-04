import { prisma } from '@/lib/prisma';

type ModelTriggerInput = {
  tenantId: string;
  traceId: string;
  route: string;
  provider: string;
  model: string;
  operation: string;
  status: 'SUCCEEDED' | 'FAILED';
  startedAt: number;
  errorCode?: string;
};

export async function recordModelTrigger(input: ModelTriggerInput) {
  try {
    await prisma.modelTrigger.create({
      data: {
        tenantId: input.tenantId,
        traceId: input.traceId,
        route: input.route,
        provider: input.provider,
        model: input.model,
        operation: input.operation,
        status: input.status,
        durationMs: Math.max(0, Date.now() - input.startedAt),
        errorCode: input.errorCode?.slice(0, 80),
      },
    });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[model-trigger] gagal mencatat eviden', error);
    }
  }
}
