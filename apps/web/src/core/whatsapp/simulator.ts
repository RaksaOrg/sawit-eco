import crypto from 'node:crypto';

export interface WhatsAppIncomingMessage {
  from: string; // e.g. "6281200000001"
  body: string;
  waId?: string;
  mediaType?: 'text' | 'image' | 'audio';
  imageId?: string;
  caption?: string;
}

export function buildMetaWhatsAppWebhookPayload(msg: WhatsAppIncomingMessage) {
  const messageId = msg.waId || `wamid.HBgL${Date.now()}`;
  return {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: '109876543210',
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '628110000000',
                phone_number_id: '1234567890',
              },
              messages: [
                {
                  from: msg.from,
                  id: messageId,
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  type: msg.mediaType || 'text',
                  ...(msg.mediaType === 'image'
                    ? {
                        image: {
                          id: msg.imageId || 'media_img_001',
                          caption: msg.caption || msg.body,
                          mime_type: 'image/jpeg',
                        },
                      }
                    : {
                        text: { body: msg.body },
                      }),
                },
              ],
            },
            field: 'messages',
          },
        ],
      },
    ],
  };
}

export function signMetaWebhook(rawBody: string, appSecret: string): string {
  return 'sha256=' + crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');
}

export async function simulateIncomingWhatsAppWebhook(params: {
  endpointUrl: string;
  message: WhatsAppIncomingMessage;
  appSecret?: string;
  fetchImpl?: typeof fetch;
}): Promise<{ status: number; bodyText: string }> {
  const fetcher = params.fetchImpl || fetch;
  const payload = buildMetaWhatsAppWebhookPayload(params.message);
  const rawBody = JSON.stringify(payload);
  const headers: Record<string, string> = {
    'content-type': 'application/json',
  };

  if (params.appSecret) {
    headers['x-hub-signature-256'] = signMetaWebhook(rawBody, params.appSecret);
  }

  const response = await fetcher(params.endpointUrl, {
    method: 'POST',
    headers,
    body: rawBody,
  });

  return {
    status: response.status,
    bodyText: await response.text(),
  };
}
