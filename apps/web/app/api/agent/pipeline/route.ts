import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenant } from '@/lib/auth';
import { runFourStageAgentPipeline } from '@/src/core/agent/multi-stage-pipeline';
import { queryMetaInferenceEngine } from '@/src/core/ai/inference';
import { agentPipelineRequestSchema } from '@sawit/contracts';
import { isModelMockEnabled } from '@/src/core/ai/mock';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const tenant = await requireTenant(req);
  const parsed = agentPipelineRequestSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Payload pipeline tidak valid',
          details: parsed.error.flatten(),
        },
      },
      { status: 400 },
    );
  }
  const body = parsed.data;
  const traceId = body.traceId || `trace-${Date.now()}`;
  const rawText = body.text;
  if (!rawText.trim() && !body.voiceTranscript && !body.imageCaption) {
    return NextResponse.json(
      { success: false, error: { code: 'EMPTY_INPUT', message: 'Teks input wajib diisi' } },
      { status: 400 },
    );
  }

  const result = await runFourStageAgentPipeline(
    {
      text: rawText,
      voiceTranscript: body.voiceTranscript,
      imageCaption: body.imageCaption,
      channel: body.channel,
      commodityPricePerKg: body.commodityPricePerKg,
      stockVolumeKg: body.stockVolumeKg,
      supplierName: body.supplierName,
    },
    traceId,
    {
      getHistoricalMedianPrice: async () => {
        const product = await prisma.product.findFirst({
          where: { tenantId: tenant.id, isActive: true },
          select: { harga: true },
        });
        return product?.harga || 2500;
      },
      recordPdpAuditLog: async (entry) => {
        await prisma.pdpAuditLog.create({
          data: {
            tenantId: tenant.id,
            traceId: entry.traceId,
            actorId: 'system-agent',
            action: 'MASK_PII',
            dataSubjectRef: entry.alias,
            fieldsMasked: entry.fields.join(','),
            purpose: 'MULTI_AGENT_PIPELINE',
            modelEndpoint: process.env.META_INFERENCE_ENDPOINT || 'LOCAL_FALLBACK',
          },
        });
      },
      queryInference: async (reqPayload) => {
        if (
          !isModelMockEnabled() &&
          (!process.env.META_INFERENCE_ENDPOINT || !process.env.MODEL_API_KEY)
        ) {
          throw new Error('Endpoint not configured');
        }
        return queryMetaInferenceEngine(reqPayload, process.env, fetch);
      },
    },
  );

  await prisma.agentRun.create({
    data: {
      tenantId: tenant.id,
      traceId,
      actorId: 'web-user',
      channel: body.channel,
      rawInputJson: JSON.stringify({ text: result.pdp_sanitized.text }),
      cleanedDataJson: JSON.stringify({
        ...result.cleaned_data,
        text: result.pdp_sanitized.text,
        rawSupplierName: result.pdp_sanitized.maskedSupplierAlias,
      }),
      pdpSanitizedJson: JSON.stringify(result.pdp_sanitized),
      anomalyAnalysisJson: JSON.stringify(result.anomaly_analysis),
      finalOutputJson: JSON.stringify(result.final_output),
      status: 'SUCCEEDED',
    },
  });

  return NextResponse.json({ success: true, data: result });
}
