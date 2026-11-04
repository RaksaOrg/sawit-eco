import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { queryMetaInferenceEngine } from '@/src/core/ai/inference';
import { queryMetaVisionInference } from '@/src/core/ai/vision';
import { isModelMockEnabled } from '@/src/core/ai/mock';
import { logServerError } from './logger';

export type AgentName = 'supervisor' | 'agronomy' | 'manager';

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
  image?: { mime: string; base64: string },
) {
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

  const res = await openai.chat.completions.create({
    model: agent === 'supervisor' ? 'gpt-4o-mini' : 'gpt-4o',
    temperature: 0.3,
    messages: [
      { role: 'system', content: prompt },
      { role: 'user', content: image ? content : message },
    ],
  });
  return res.choices[0].message.content || '';
}

export async function runAgent(
  message: string,
  tenant: TenantContext,
  image?: { mime: string; base64: string },
) {
  const agent = pickAgent(message, Boolean(image));

  if (image) {
    try {
      const vision = await queryMetaVisionInference(
        {
          image,
          caption: message,
          symptoms: message,
        },
        process.env,
        fetch,
      );

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
      logServerError('Meta vision gagal, fallback ke OpenAI', error);
    }
    // Fallback to OpenAI if Meta Vision provider dies
    const prompt = getPrompt(agent, tenant);
    return { agent, reply: await runOpenAI(agent, prompt, message, image) };
  }

  const prompt = getPrompt(agent, tenant);
  if (isModelMockEnabled() || (process.env.META_INFERENCE_ENDPOINT && process.env.MODEL_API_KEY)) {
    try {
      const result = await queryMetaInferenceEngine({
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: message },
        ],
      });
      return { agent, reply: result.text };
    } catch (error) {
      logServerError('Meta inference gagal, fallback ke OpenAI', error);
    }
  }

  return { agent, reply: await runOpenAI(agent, prompt, message, image) };
}
