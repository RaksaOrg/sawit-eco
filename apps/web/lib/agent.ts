import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { queryMetaInferenceEngine } from '@/src/core/ai/inference';
import { queryMetaVisionInference } from '@/src/core/ai/vision';
import { isModelMockEnabled } from '@/src/core/ai/mock';
import { logServerError } from './logger';
import { getModelProvider, recordModelTrigger } from './model-trigger';

export type AgentName = 'supervisor' | 'agronomy' | 'manager';

type TriggerContext = { tenantId: string; traceId: string };

export type TenantContext = {
  nama?: string | null;
  lokasi?: string | null;
  luasHa?: number | null;
  blocks?: string;
  mandors?: string;
};

function getPrompt(agent: AgentName, tenant: TenantContext) {
  let txt = fs.readFileSync(path.join(process.cwd(), '.opencode/agents', `${agent}.md`), 'utf-8');
  txt = txt
    .replaceAll('{{nama_perusahaan}}', tenant.nama || 'Kebun Sawit')
    .replaceAll('{{lokasi_kebun}}', tenant.lokasi || '-')
    .replaceAll('{{total_luas_ha}}', String(tenant.luasHa || 0))
    .replaceAll('{{daftar_blok}}', tenant.blocks || 'A1:25Ha-TT2015, B2:30Ha-TT2018')
    .replaceAll('{{daftar_mandor}}', tenant.mandors || 'Budi, Joko')
    .replaceAll('{{sop_perusahaan}}', 'Rotasi panen 7-10 hari, pakai APD')
    .replaceAll('{{musim_saat_ini}}', 'Musim Hujan')
    .replaceAll('{{target_produksi_harian}}', '20000 Kg');
  return txt;
}

export function pickAgent(message: string, hasImage = false): AgentName {
  if (hasImage) return 'agronomy';
  const lower = message.toLowerCase();
  if (/(lapor|absen|rencana|kendala|hadir|ton|selesai)/.test(lower)) return 'supervisor';
  if (/(daun|hama|pupuk|ulat|kuning|ganoderma|penyakit)/.test(lower)) return 'agronomy';
  return 'manager';
}

async function runOpenAI(
  agent: AgentName,
  prompt: string,
  message: string,
  image: { mime: string; base64: string } | undefined,
  trigger?: TriggerContext,
) {
  const model = agent === 'supervisor' ? 'gpt-4o-mini' : 'gpt-4o';
  const startedAt = Date.now();
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const content: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
    {
      type: 'text',
      text: message || 'Tolong diagnosa kondisi daun pada foto ini.',
    },
  ];
  if (image) {
    content.push({
      type: 'image_url',
      image_url: { url: `data:${image.mime};base64,${image.base64}` },
    });
  }

  try {
    const res = await openai.chat.completions.create({
      model,
      temperature: 0.3,
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: image ? content : message },
      ],
    });
    if (trigger) {
      await recordModelTrigger({
        ...trigger,
        route: '/api/whatsapp/webhook',
        provider: 'openai',
        model,
        operation: image ? 'VISION_AGENT' : 'TEXT_AGENT',
        status: 'SUCCEEDED',
        startedAt,
      });
    }
    return res.choices[0].message.content || '';
  } catch (error) {
    if (trigger) {
      await recordModelTrigger({
        ...trigger,
        route: '/api/whatsapp/webhook',
        provider: 'openai',
        model,
        operation: image ? 'VISION_AGENT' : 'TEXT_AGENT',
        status: 'FAILED',
        startedAt,
        errorCode: error instanceof Error ? error.name : 'UNKNOWN_ERROR',
      });
    }
    throw error;
  }
}

export async function runAgent(
  message: string,
  tenant: TenantContext,
  image?: { mime: string; base64: string },
  trigger?: TriggerContext,
) {
  const agent = pickAgent(message, Boolean(image));

  if (image) {
    const startedAt = Date.now();
    try {
      const vision = await queryMetaVisionInference(
        {
          image,
          caption: message,
          symptoms: message,
        },
        process.env,
        fetch,
        async (error, model) => {
          if (!trigger) return;
          await recordModelTrigger({
            ...trigger,
            route: '/api/whatsapp/webhook',
            provider: getModelProvider(
              process.env.VISION_INFERENCE_ENDPOINT || process.env.META_INFERENCE_ENDPOINT,
            ),
            model,
            operation: 'VISION_AGENT',
            status: 'FAILED',
            startedAt,
            errorCode: error instanceof Error ? error.name : 'UNKNOWN_ERROR',
          });
        },
      );
      if (trigger) {
        await recordModelTrigger({
          ...trigger,
          route: '/api/whatsapp/webhook',
          provider: vision.isMock
            ? 'mock'
            : vision.isFallback
              ? 'rule-based-fallback'
              : getModelProvider(
                  process.env.VISION_INFERENCE_ENDPOINT || process.env.META_INFERENCE_ENDPOINT,
                ),
          model: vision.modelUsed,
          operation: 'VISION_AGENT',
          status: 'SUCCEEDED',
          startedAt,
        });
      }

      const blockHint = tenant.blocks || 'A1, B2';
      const reply =
        `Gejala: ${message || 'Foto kondisi tanaman'}\n` +
        `Diagnosa: ${vision.diagnosis}\n` +
        `Risiko: ${vision.riskLevel}\n` +
        `Tindakan Hari Ini: ${vision.actionsToday.join(', ')}\n` +
        `Tindakan 7-14 Hari: ${vision.actionsNextDays.join(', ')}\n` +
        `Monitoring: Amati penyebaran pada blok ${blockHint} dalam 3 hari. Sesuaikan dengan hasil analisa daun/tanah dan label resmi produk.`;

      return { agent, reply };
    } catch (error) {
      if (trigger) {
        await recordModelTrigger({
          ...trigger,
          route: '/api/whatsapp/webhook',
          provider: getModelProvider(
            process.env.VISION_INFERENCE_ENDPOINT || process.env.META_INFERENCE_ENDPOINT,
          ),
          model: process.env.VISION_MODEL || process.env.META_MODEL || 'unknown',
          operation: 'VISION_AGENT',
          status: 'FAILED',
          startedAt,
          errorCode: error instanceof Error ? error.name : 'UNKNOWN_ERROR',
        });
      }
      logServerError('Meta vision gagal, fallback ke OpenAI', error);
    }
    const prompt = getPrompt(agent, tenant);
    return { agent, reply: await runOpenAI(agent, prompt, message, image, trigger) };
  }

  const prompt = getPrompt(agent, tenant);
  if (isModelMockEnabled() || (process.env.META_INFERENCE_ENDPOINT && process.env.META_API_KEY)) {
    const startedAt = Date.now();
    try {
      const result = await queryMetaInferenceEngine({
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: message },
        ],
      });
      if (trigger) {
        await recordModelTrigger({
          ...trigger,
          route: '/api/whatsapp/webhook',
          provider: result.model.startsWith('mock-')
            ? 'mock'
            : getModelProvider(process.env.META_INFERENCE_ENDPOINT, result.provider),
          model: result.model,
          operation: 'TEXT_AGENT',
          status: 'SUCCEEDED',
          startedAt,
        });
      }
      return { agent, reply: result.text };
    } catch (error) {
      if (trigger) {
        await recordModelTrigger({
          ...trigger,
          route: '/api/whatsapp/webhook',
          provider: getModelProvider(process.env.META_INFERENCE_ENDPOINT),
          model: process.env.META_MODEL || 'meta-llama/Llama-3.3-70B-Instruct',
          operation: 'TEXT_AGENT',
          status: 'FAILED',
          startedAt,
          errorCode: error instanceof Error ? error.name : 'UNKNOWN_ERROR',
        });
      }
      logServerError('Meta inference gagal, fallback ke OpenAI', error);
    }
  }

  return { agent, reply: await runOpenAI(agent, prompt, message, image, trigger) };
}
