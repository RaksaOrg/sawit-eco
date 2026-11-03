import {
  buildMetaWhatsAppWebhookPayload,
  signMetaWebhook,
  simulateIncomingWhatsAppWebhook,
} from './simulator';

describe('WhatsApp Live Webhook Simulator (HMAC verified)', () => {
  it('builds correct payload for text and image messages', () => {
    const textPayload = buildMetaWhatsAppWebhookPayload({
      from: '6281200000001',
      body: 'Lapor panen B2 4200 Kg selesai',
      waId: 'wamid.test_text_1',
    });
    expect(
      (textPayload.entry[0].changes[0].value.messages[0] as { text?: { body: string } }).text?.body,
    ).toBe('Lapor panen B2 4200 Kg selesai');

    const autoIdPayload = buildMetaWhatsAppWebhookPayload({
      from: '6281200000099',
      body: 'Auto ID fallback',
    });
    expect(autoIdPayload.entry[0].changes[0].value.messages[0].id).toMatch(/^wamid\./);

    const imagePayload = buildMetaWhatsAppWebhookPayload({
      from: '6281200000002',
      body: 'Daun menguning',
      mediaType: 'image',
      imageId: 'media_leaf_001',
      caption: 'Daun menguning tepi',
    });
    expect(
      (imagePayload.entry[0].changes[0].value.messages[0] as { image?: { caption: string } }).image
        ?.caption,
    ).toBe('Daun menguning tepi');

    // Branch: image without caption fallback + without imageId fallback
    const fallbackImagePayload = buildMetaWhatsAppWebhookPayload({
      from: '6281200000003',
      body: 'Foto kondisi daun',
      mediaType: 'image',
    });
    expect(
      (
        fallbackImagePayload.entry[0].changes[0].value.messages[0] as {
          image?: { caption: string };
        }
      ).image?.caption,
    ).toBe('Foto kondisi daun');
    expect(
      (fallbackImagePayload.entry[0].changes[0].value.messages[0] as { image?: { id: string } })
        .image?.id,
    ).toBe('media_img_001');

    const sig = signMetaWebhook('{"test":true}', 'app_secret_key');
    expect(sig).toMatch(/^sha256=[a-f0-9]{64}$/);
  });

  it('sends simulated webhook with signature header and returns ok', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      status: 200,
      text: async () => '{"ok":true}',
    });

    const res = await simulateIncomingWhatsAppWebhook({
      endpointUrl: 'http://localhost:3000/api/whatsapp/webhook',
      message: { from: '6281200000001', body: 'Voice note laporan hasil panen' },
      appSecret: 'app_secret_key',
      fetchImpl: mockFetch as unknown as typeof fetch,
    });

    expect(res.status).toBe(200);
    expect(res.bodyText).toBe('{"ok":true}');
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/whatsapp/webhook',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'x-hub-signature-256': expect.stringMatching(/^sha256=/),
        }),
      }),
    );

    // Test without appSecret and without fetchImpl default branch
    const origFetch = global.fetch;
    global.fetch = mockFetch as unknown as typeof fetch;
    const resNoSecret = await simulateIncomingWhatsAppWebhook({
      endpointUrl: 'http://localhost:3000/api/whatsapp/webhook',
      message: { from: '6281200000001', body: 'Pesan tanpa signature' },
    });
    expect(resNoSecret.status).toBe(200);
    global.fetch = origFetch;
  });
});
