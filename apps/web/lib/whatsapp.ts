export async function sendWhatsApp(to: string, text: string) {
  const url = `https://graph.facebook.com/v21.0/${process.env.WA_PHONE_NUMBER_ID}/messages`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.WA_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text },
    }),
  });

  if (!res.ok) {
    throw new Error(`WhatsApp API ${res.status}: ${await res.text()}`);
  }
}

export async function downloadMedia(mediaId: string) {
  const token = process.env.WA_ACCESS_TOKEN;
  const meta = await fetch(`https://graph.facebook.com/v21.0/${mediaId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!meta.ok) throw new Error(`Media info ${meta.status}: ${await meta.text()}`);
  const info = (await meta.json()) as { url: string; mime_type?: string };

  const file = await fetch(info.url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!file.ok) throw new Error(`Media file ${file.status}: ${await file.text()}`);

  const mime = info.mime_type || file.headers.get('content-type') || 'image/jpeg';
  const buf = Buffer.from(await file.arrayBuffer());
  return { mime, base64: buf.toString('base64'), buffer: buf };
}
