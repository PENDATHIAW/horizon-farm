function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function clean(value = '') {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function compact(value, max = 26000) {
  const text = JSON.stringify(value || {});
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

function systemPrompt() {
  return `Tu es Horizon, assistant de Horizon Farm.
Tu réponds en français, wolof ou anglais selon la langue de l'utilisateur.
Tu aides uniquement sur la ferme et les données ERP fournies.
Tu connais les ventes, stocks, clients, créances, finances, ponte, santé, animaux, cultures, tâches, documents, capteurs, humidité, température et caméras.
Tu n'inventes jamais une donnée absente.
Tu proposes une confirmation avant toute action sensible.
Tu réponds court, naturel, sans jargon technique.`;
}

function readText(payload) {
  if (payload?.text) return payload.text;
  if (payload?.output_text) return payload.output_text;
  if (payload?.choices?.[0]?.message?.content) return payload.choices[0].message.content;
  if (payload?.content?.[0]?.text) return payload.content[0].text;
  return '';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const endpoint = process.env.HORIZON_AI_URL;
  const secret = process.env.HORIZON_AI_KEY;
  const model = process.env.HORIZON_AI_MODEL || 'horizon-default';

  if (!endpoint || !secret) {
    res.status(200).json({ fallback: true, text: '' });
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const message = clean(body.message);
    if (!message) {
      res.status(400).json({ error: 'Message required' });
      return;
    }

    const history = safeArray(body.history).slice(-8).map((msg) => ({
      role: msg.direction === 'out' ? 'user' : 'assistant',
      content: clean(msg.content).slice(0, 800),
    }));

    const payload = {
      model,
      messages: [
        { role: 'system', content: systemPrompt() },
        { role: 'user', content: `Données ERP à utiliser comme source de vérité :\n${compact(body.context)}` },
        ...history,
        { role: 'user', content: message },
      ],
      temperature: 0.25,
      max_tokens: 650,
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      res.status(200).json({ fallback: true, text: '' });
      return;
    }

    const data = await response.json();
    res.status(200).json({ text: readText(data), provider: 'configured', model });
  } catch {
    res.status(200).json({ fallback: true, text: '' });
  }
}
