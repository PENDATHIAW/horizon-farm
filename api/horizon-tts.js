function clean(value = '') {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function detectLanguage(text = '') {
  const value = clean(text).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (/\b(naka|ndax|dafa|am na|des na|xaalis|bor|waaw|deedeet|jamm|kan|ku|moo|looy|doy)\b/.test(value)) return 'wo';
  if (/\b(how|what|which|show|today|stock|sales|customer|money|paid|unpaid|temperature|humidity)\b/.test(value)) return 'en';
  return 'fr';
}

function voiceInstructions(lang) {
  if (lang === 'wo') {
    return 'Speak like a warm Senegalese farm assistant. Use a natural Wolof rhythm, friendly and calm. Keep the delivery conversational, not robotic. If the text contains French farming words, pronounce them naturally as commonly spoken in Senegal.';
  }
  if (lang === 'en') {
    return 'Speak clearly and warmly like a practical farm assistant. Keep a calm, helpful tone.';
  }
  return 'Parle avec une voix chaleureuse, naturelle et claire, comme une assistante agricole sénégalaise qui explique simplement.';
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    res.status(200).json({
      configured: Boolean(process.env.HORIZON_TTS_KEY || process.env.HORIZON_AI_KEY),
      model: process.env.HORIZON_TTS_MODEL || 'gpt-4o-mini-tts',
      voice: process.env.HORIZON_TTS_VOICE || 'marin',
    });
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const key = process.env.HORIZON_TTS_KEY || process.env.HORIZON_AI_KEY;
  if (!key) {
    res.status(200).json({ fallback: true, reason: 'missing_tts_key' });
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const input = clean(body.text).slice(0, 1200);
    if (!input) {
      res.status(400).json({ error: 'Text required' });
      return;
    }

    const lang = body.language || detectLanguage(input);
    const model = process.env.HORIZON_TTS_MODEL || 'gpt-4o-mini-tts';
    const voice = process.env.HORIZON_TTS_VOICE || 'marin';
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        voice,
        input,
        instructions: voiceInstructions(lang),
        response_format: 'mp3',
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      res.status(200).json({ fallback: true, reason: 'tts_provider_error', status: response.status, detail: detail.slice(0, 300) });
      return;
    }

    const audio = Buffer.from(await response.arrayBuffer());
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).send(audio);
  } catch (error) {
    res.status(200).json({ fallback: true, reason: 'tts_exception', detail: clean(error?.message || error).slice(0, 300) });
  }
}
