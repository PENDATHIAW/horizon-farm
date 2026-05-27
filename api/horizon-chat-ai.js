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

function normalizeModel(value = '') {
  const raw = clean(value);
  if (!raw || raw === 'horizon-default') return 'gpt-5.5';
  if (raw === '5.5') return 'gpt-5.5';
  if (raw === '5.4') return 'gpt-5.4';
  if (raw === '5.4-mini') return 'gpt-5.4-mini';
  return raw;
}

function systemPrompt() {
  return `Tu es Horizon, assistant conversationnel de Horizon Farm.

Mission : aider Penda et son equipe a comprendre et piloter la ferme depuis les donnees ERP fournies.
Domaines : ventes, caisse, clients, creances, paiements, stocks, commandes, fournisseurs, ponte, avicole, animaux malades, mortalite, soins, vaccins, cultures, taches, documents, equipements, capteurs, humidite, temperature, cameras et alertes.

Langues :
- Si l'utilisateur parle francais, reponds en francais simple.
- Si l'utilisateur parle anglais, reponds en anglais simple.
- Si l'utilisateur parle wolof, reponds en wolof senegalais naturel, court et terrain. Evite le wolof litteral ou robotique. Tu peux melanger quelques mots francais courants comme stock, vente, client, alerte, facture si c'est naturel.
- Exemples wolof naturels :
  * "Kaan mo febar ?" => "Ci donnees yi, gis naa ... moo wara toppatoo."
  * "Ku ma war xaalis ?" => "Client yii laa gis, dañu am bor..."
  * "Naka stock aliment bi ?" => "Aliment bi des na... Ndax ma waajal commande ?"

Regles :
- N'invente jamais une donnee absente. Si tu ne vois pas l'info, dis-le et propose ou verifier dans l'ERP.
- Pas de jargon technique. Ne dis pas JSON, API, CRUD, Supabase, business event, id technique.
- Avant une action sensible, demande confirmation.
- Reponse courte, claire, utile. Maximum 5 phrases sauf si l'utilisateur demande un detail.
- Pour temperature, humidite ou camera, explique le risque et propose une action concrete.`;
}

function readText(payload) {
  if (payload?.text) return payload.text;
  if (payload?.output_text) return payload.output_text;
  if (payload?.choices?.[0]?.message?.content) return payload.choices[0].message.content;
  if (payload?.content?.[0]?.text) return payload.content[0].text;
  return '';
}

export default async function handler(req, res) {
  const endpoint = process.env.HORIZON_AI_URL;
  const secret = process.env.HORIZON_AI_KEY;
  const model = normalizeModel(process.env.HORIZON_AI_MODEL);

  if (req.method === 'GET') {
    res.status(200).json({ configured: Boolean(endpoint && secret), model, endpointConfigured: Boolean(endpoint), keyConfigured: Boolean(secret) });
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!endpoint || !secret) {
    res.status(200).json({ fallback: true, reason: 'missing_ai_env', text: '', model });
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
        { role: 'user', content: `Donnees ERP a utiliser comme source de verite :\n${compact(body.context)}` },
        ...history,
        { role: 'user', content: message },
      ],
      temperature: 0.2,
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
      const detail = await response.text().catch(() => '');
      res.status(200).json({ fallback: true, reason: 'provider_error', status: response.status, detail: detail.slice(0, 300), text: '', model });
      return;
    }

    const data = await response.json();
    const text = clean(readText(data));
    if (!text) {
      res.status(200).json({ fallback: true, reason: 'empty_ai_response', text: '', model });
      return;
    }

    res.status(200).json({ text, provider: 'configured', model });
  } catch (error) {
    res.status(200).json({ fallback: true, reason: 'exception', detail: clean(error?.message || error).slice(0, 300), text: '', model });
  }
}
