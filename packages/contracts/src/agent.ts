import { z } from 'zod';

export const agentChannelSchema = z.enum(['WHATSAPP', 'MOBILE', 'WEB']);

export const rawFieldInputSchema = z.object({
  text: z.string(),
  voiceTranscript: z.string().optional(),
  imageCaption: z.string().optional(),
  channel: agentChannelSchema.default('WEB'),
  commodityPricePerKg: z.number().nonnegative().optional(),
  stockVolumeKg: z.number().nonnegative().optional(),
  supplierName: z.string().optional(),
});

export const anomalySeveritySchema = z.enum(['NONE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

export const anomalyAnalysisSchema = z.object({
  medianPrice: z.number().nonnegative(),
  quotedPrice: z.number().nonnegative(),
  deviationPercentage: z.number(),
  severity: anomalySeveritySchema,
  isAnomaly: z.boolean(),
  reasoning: z.string(),
});

export const agentStateSchema = z.object({
  raw_input: rawFieldInputSchema,
  cleaned_data: z.object({
    text: z.string(),
    slangNormalized: z.boolean(),
    commodityPricePerKg: z.number().nonnegative().optional(),
    stockVolumeKg: z.number().nonnegative().optional(),
    rawSupplierName: z.string().optional(),
  }),
  pdp_sanitized: z.object({
    text: z.string(),
    maskedSupplierAlias: z.string(),
    fieldsMasked: z.array(z.string()),
    auditLogged: z.boolean(),
  }),
  anomaly_analysis: anomalyAnalysisSchema,
  final_output: z.object({
    summary: z.string(),
    headline: z.string(),
    actionRequired: z.boolean(),
    pdpProtected: z.boolean(),
    anomalyDetected: z.boolean(),
  }),
});

export const agentPipelineRequestSchema = rawFieldInputSchema.extend({
  traceId: z.string().optional(),
});

export type AgentChannel = z.infer<typeof agentChannelSchema>;
export type RawFieldInput = z.infer<typeof rawFieldInputSchema>;
export type AgentState = z.infer<typeof agentStateSchema>;
export type AgentPipelineRequest = z.infer<typeof agentPipelineRequestSchema>;
