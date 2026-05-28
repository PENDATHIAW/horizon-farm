const MAX_AUDIO_BYTES = 8 * 1024 * 1024;

function normalizeBase64(value = '') {
  return String(value).replace(/^data:audio\/[a-z0-9+.-]+;base64,/i, '').trim();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'OPENAI_API_KEY is missing in Vercel environment variables.' });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const audioBase64 = normalizeBase64(body.audioBase64);
    const mimeType = body.mimeType || 'audio/webm';
    const language = body.language || 'wo';

    if (!audioBase64) {
      return res.status(400).json({ error: 'Missing audioBase64.' });
    }

    const audioBuffer = Buffer.from(audioBase64, 'base64');
    if (!audioBuffer.length) {
      return res.status(400).json({ error: 'Empty audio payload.' });
    }

    if (audioBuffer.length > MAX_AUDIO_BYTES) {
      return res.status(413).json({ error: 'Audio note is too large. Please keep it shorter.' });
    }

    const extension = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('mpeg') ? 'mp3' : mimeType.includes('wav') ? 'wav' : 'webm';
    const form = new FormData();
    form.append('model', process.env.OPENAI_TRANSCRIBE_MODEL || 'gpt-4o-mini-transcribe');
    form.append('file', new Blob([audioBuffer], { type: mimeType }), `voice-note.${extension}`);
    form.append('prompt', 'This is a short farming voice note for Horizon Farm. It may be in Wolof, French, or English. Preserve Wolof words as accurately as possible.');
    if (language && language !== 'auto') form.append('language', language === 'wo-SN' ? 'wo' : language);

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return res.status(response.status).json({ error: data?.error?.message || 'Transcription failed.' });
    }

    return res.status(200).json({ text: data.text || '', provider: 'openai', model: process.env.OPENAI_TRANSCRIBE_MODEL || 'gpt-4o-mini-transcribe' });
  } catch (error) {
    return res.status(500).json({ error: error?.message || 'Unexpected transcription error.' });
  }
}
