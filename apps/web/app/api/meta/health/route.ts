import { NextRequest, NextResponse } from 'next/server';
import { resolveInferenceConfig } from '@/src/core/ai/inference';
import { resolveVisionConfig } from '@/src/core/ai/vision';
import { resolveSamConfig } from '@/src/core/ai/sam';
import { isModelMockEnabled } from '@/src/core/ai/mock';
import { describeProvider } from '@/src/core/ai/provider-info';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  void req;
  const env = process.env;
  const mockEnabled = isModelMockEnabled(env);
  const apiKey = (env.MODEL_API_KEY || env.INFERENCE_API_KEY || '').trim();
  const apiKeyConfigured = apiKey.length > 0;
  const reasoningConfig = resolveInferenceConfig(env);
  const visionConfig = resolveVisionConfig(env);
  const samConfig = resolveSamConfig(env);
  const asrEndpoint = env.ASR_INFERENCE_ENDPOINT;
  const asrConfigured = Boolean(asrEndpoint && apiKeyConfigured);

  let auditCount = 0;
  let lastAuditAt: string | null = null;
  let lastAuditAction: string | null = null;
  try {
    const [count, latest] = await Promise.all([
      prisma.pdpAuditLog.count(),
      prisma.pdpAuditLog.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true, action: true },
      }),
    ]);
    auditCount = count;
    lastAuditAt = latest?.createdAt.toISOString() ?? null;
    lastAuditAction = latest?.action ?? null;
  } catch {
    auditCount = 0;
  }

  const reasoningProvider = describeProvider(reasoningConfig?.endpoint, mockEnabled);
  const visionProvider = describeProvider(
    visionConfig?.endpoint || reasoningConfig?.endpoint,
    mockEnabled,
  );
  const samProvider = describeProvider(samConfig?.endpoint, mockEnabled);
  const asrProvider = describeProvider(asrEndpoint, mockEnabled);

  const fullyConfigured =
    mockEnabled || Boolean(reasoningConfig && visionConfig && samConfig && asrConfigured);

  return NextResponse.json({
    status: fullyConfigured ? 'HEALTHY' : 'DEGRADED',
    mockModelsEnabled: mockEnabled,
    metaEcosystem: {
      reasoning: {
        provider: reasoningProvider.label,
        providerId: reasoningProvider.id,
        model: mockEnabled ? 'mock-meta-llama' : (reasoningConfig?.model ?? 'not-configured'),
        configured: mockEnabled || Boolean(reasoningConfig),
        endpointConfigured: Boolean(reasoningConfig?.endpoint),
      },
      vision: {
        provider: visionProvider.label,
        providerId: visionProvider.id,
        model: mockEnabled
          ? 'mock-meta-vision'
          : visionConfig?.model || env.VISION_MODEL || 'not-configured',
        configured: mockEnabled || Boolean(visionConfig),
        endpointConfigured: Boolean(visionConfig?.endpoint || reasoningConfig?.endpoint),
      },
      segmentation: {
        provider: samProvider.label,
        providerId: samProvider.id,
        model: mockEnabled ? 'mock-sam-3.1' : samConfig?.model || env.SAM_MODEL || 'not-configured',
        mode: mockEnabled ? 'MOCK_ENABLED' : samConfig ? 'LIVE_PARTNER' : 'ZERO_SHOT_SIMULATION',
        configured: mockEnabled || Boolean(samConfig),
        endpointConfigured: Boolean(samConfig?.endpoint),
      },
      asr: {
        provider: asrProvider.label,
        providerId: asrProvider.id,
        model: mockEnabled ? 'mock-asr' : env.ASR_MODEL || 'not-configured',
        configured: mockEnabled || asrConfigured,
        endpointConfigured: Boolean(asrEndpoint),
      },
      pdpCompliance: {
        active: true,
        persistedAuditLogsCount: auditCount,
        lastAuditAt,
        lastAuditAction,
      },
    },
    timestamp: new Date().toISOString(),
  });
}
