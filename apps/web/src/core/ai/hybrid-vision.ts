import {
  queryMetaVisionInference,
  analyzeImageFallback,
  type VisionInferenceRequest,
  type VisionInferenceResult,
} from './vision';
import { querySamSegmentation, type SamSegmentationRequest } from './sam';

/**
 * EXPLICIT ARCHITECTURAL VISION SCOPE MATRIX:
 * -------------------------------------------------------------
 * Model              | Functional Scope               | Primary Output
 * -------------------------------------------------------------
 * Meta Llama 3.2     | Qualitative Visual Pathology   | Disease classification,
 * (90B Vision)       | Agronomic SOP Advisory         | Risk Level (RENDAH/SEDANG/
 *                    | Clinical symptom reasoning     | TINGGI/KRITIS), Actions today
 * -------------------------------------------------------------
 * Meta SAM 3.1       | Sub-pixel Geometry             | Binary/RLE masks,
 * (Segment Anything) | Quantitative Necrosis Area %   | Area percentage,
 *                    | Bunch / Fruitlet count         | Defoliation / canopy metrics
 * -------------------------------------------------------------
 */

export interface UnifiedAgronomyVisionResult {
  qualitative: {
    diagnosis: string;
    riskLevel: 'RENDAH' | 'SEDANG' | 'TINGGI' | 'KRITIS';
    actionsToday: string[];
    actionsNextDays: string[];
    confidence: number;
    modelUsed: string;
    isFallback: boolean;
  };
  quantitative: {
    targetType: 'LEAF_DEFECT' | 'BUNCH_COUNT' | 'WEED_CANOPY';
    masksCount: number;
    affectedAreaPercentage: number;
    confidenceScore: number;
    detectedFeatures: string[];
    modelUsed: string;
    isSimulated: boolean;
  };
  synthesis: {
    summary: string;
    requiresImmediateIntervention: boolean;
    estimatedYieldLossRiskPct: number;
  };
}

/**
 * Runs a coordinated hybrid vision pipeline where:
 * 1. Llama 3.2 Vision diagnoses the qualitative biological pathogen.
 * 2. SAM 3.1 segments the exact physical necrotic lesion or fruit bunch.
 * 3. The synthesis combines both without hallucinating medical dosage.
 */
export async function executeHybridAgronomyVision(
  request: {
    image: { mime: string; base64: string };
    blockCode?: string;
    symptoms?: string;
    caption?: string;
    targetType?: 'LEAF_DEFECT' | 'BUNCH_COUNT' | 'WEED_CANOPY';
  },
  env: Record<string, string | undefined> = process.env,
  fetchImpl: typeof fetch = fetch,
): Promise<UnifiedAgronomyVisionResult> {
  const targetType = request.targetType || 'LEAF_DEFECT';

  // 1. Qualitative diagnosis via Llama 3.2 Vision (with seamless fallback)
  const llamaReq: VisionInferenceRequest = {
    image: request.image,
    blockCode: request.blockCode,
    symptoms: request.symptoms,
    caption: request.caption,
  };
  let qualitative: VisionInferenceResult;
  try {
    qualitative = await queryMetaVisionInference(llamaReq, env, fetchImpl);
  } catch {
    qualitative = analyzeImageFallback(llamaReq);
  }

  // 2. Quantitative geometry via Meta SAM 3.1
  const samReq: SamSegmentationRequest = {
    image: request.image,
    targetType,
  };
  const quantitative = await querySamSegmentation(samReq, env, fetchImpl);

  // 3. Synthesis logic
  const isHighRisk =
    qualitative.riskLevel === 'TINGGI' ||
    qualitative.riskLevel === 'KRITIS' ||
    quantitative.primaryMaskAreaPercentage > 30;

  // Estimated yield loss based on combined necrotic percentage and disease severity
  let estimatedLoss = 0;
  if (qualitative.riskLevel === 'KRITIS') {
    estimatedLoss = Math.min(80, Math.round(quantitative.primaryMaskAreaPercentage * 1.8));
  } else if (qualitative.riskLevel === 'TINGGI') {
    estimatedLoss = Math.min(50, Math.round(quantitative.primaryMaskAreaPercentage * 1.2));
  } else if (qualitative.riskLevel === 'SEDANG') {
    estimatedLoss = Math.min(25, Math.round(quantitative.primaryMaskAreaPercentage * 0.7));
  } else {
    estimatedLoss = Math.min(10, Math.round(quantitative.primaryMaskAreaPercentage * 0.3));
  }

  const summary = `Diagnosa Llama 3.2: ${qualitative.diagnosis} (${qualitative.riskLevel}). Segmentasi SAM 3.1: ${quantitative.primaryMaskAreaPercentage}% area terdampak (${quantitative.detectedFeatures.join(', ')}).`;

  return {
    qualitative: {
      diagnosis: qualitative.diagnosis,
      riskLevel: qualitative.riskLevel,
      actionsToday: qualitative.actionsToday,
      actionsNextDays: qualitative.actionsNextDays,
      confidence: qualitative.confidence,
      modelUsed: qualitative.modelUsed,
      isFallback: qualitative.isFallback,
    },
    quantitative: {
      targetType,
      masksCount: quantitative.masksCount,
      affectedAreaPercentage: quantitative.primaryMaskAreaPercentage,
      confidenceScore: quantitative.confidenceScore,
      detectedFeatures: quantitative.detectedFeatures,
      modelUsed: quantitative.modelUsed,
      isSimulated: quantitative.isSimulated,
    },
    synthesis: {
      summary,
      requiresImmediateIntervention: isHighRisk,
      estimatedYieldLossRiskPct: estimatedLoss,
    },
  };
}
