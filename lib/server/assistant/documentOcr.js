import { getLlmConfig, isLlmConfigured } from './llm.js';

const clean = (value) => String(value || '').trim();

export default async function documentOcrHandler(req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: false, error: 'Method not allowed' }));
    return;
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  } catch {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: false, error: 'Invalid JSON body' }));
    return;
  }

  const base64 = clean(body.base64);
  const mime = clean(body.mime) || 'image/jpeg';
  const fileName = clean(body.fileName);

  if (!base64) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: false, error: 'base64 required' }));
    return;
  }

  if (!isLlmConfigured()) {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      ok: false,
      text: '',
      source: 'llm_not_configured',
      hint: 'Collez le texte du document dans le scanner.',
      fileName,
    }));
    return;
  }

  const { apiKey, baseUrl, model } = getLlmConfig();
  const dataUrl = `data:${mime};base64,${base64}`;

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        messages: [
          {
            role: 'system',
            content: 'Tu extrais le texte lisible d\'un document agricole (facture, ordonnance, reçu, bon de livraison). Réponds uniquement avec le texte brut extrait, en français, sans commentaire.',
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: `Nom fichier: ${fileName || 'document'}. Extrais tout le texte.` },
              { type: 'image_url', image_url: { url: dataUrl } },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ ok: false, text: '', source: 'ocr_api_error', status: response.status }));
      return;
    }

    const data = await response.json();
    const text = clean(data?.choices?.[0]?.message?.content);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      ok: Boolean(text),
      text,
      source: 'vision_ocr',
      confidence: text ? 0.8 : 0,
      fileName,
    }));
  } catch (err) {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: false, text: '', source: 'ocr_exception', error: err?.message }));
  }
}
