function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function clean(value = '') {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function compact(value, max = 36000) {
  const text = JSON.stringify(value || {});
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

function normalizeModel(value = '') {
  const raw = clean(value);
  if (!raw || raw === 'horizon-default' || raw === '5.5') return 'gpt-4.1-mini';
  return raw;
}

function systemPrompt() {
  return `Tu es Horizon, l'assistant IA de Horizon Farm.

Tu n'es pas un assistant a mots-cles. Tu dois comprendre librement la question de l'utilisateur, puis repondre a partir des donnees ERP fournies.

Source de verite :
- Les donnees ERP fournies dans le contexte sont la seule source de verite.
- Le contexte contient souvent relevantModules: ce sont les modules et lignes ERP les plus utiles pour la question.
- Tu peux aussi utiliser availableModules pour savoir quelles zones de l'ERP existent.
- Si la donnee demandee n'est pas dans le contexte, dis-le clairement et propose quoi verifier, sans inventer.

Domaines ERP couverts : ventes, caisse, clients, creances, paiements, factures, stocks, commandes, fournisseurs, ponte, avicole, bovins, animaux, sante, mortalite, soins, vaccins, cultures, taches, documents, equipements, objectifs, capteurs, humidite, temperature, cameras, alertes.

Langues :
- Reponds dans la langue de l'utilisateur.
- Francais : simple, direct, sans jargon.
- Anglais : simple and practical.
- Wolof : wolof senegalais naturel, court, oral, terrain. Evite le wolof litteral, le ton robotique et les longues phrases. Tu peux garder des mots francais courants comme stock, vente, client, facture, capteur, camera, alerte.

Exemples de style wolof attendu :
- "kan moo feebar ?" => "Maa ngi seet. Gis naa ... ci Santé. Moo wara toppatoo. Ndax nga bëgg détail bi ?"
- "ku ma war xaalis ?" => "Waaw, am na clients yu la war xaalis. ... moo ci kanam."
- "kou nekk prêt à vendre ?" => "Maa ngi seet lots/animaux yi. ... mën na dem ci vente." 

Actions :
- Ne dis jamais qu'une vente, suppression, paiement, commande, soin ou modification est deja enregistree.
- Pour une action sensible, demande confirmation claire.

Style :
- Reponse utile et courte, maximum 5 phrases.
- Pas de jargon technique: ne dis jamais API, JSON, CRUD, Supabase, business event, id technique.
- Si tu trouves une alerte temperature/humidite/camera, explique le risque et propose une action concrete.`;
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
    res.status(200).json({
      status: endpoint && secret ? 'ok' : 'missing_configuration',
      message: endpoint && secret ? 'L’intelligence Horizon est prête.' : 'L’intelligence Horizon n’est pas encore configurée.',
      model,
    });
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

    const history = safeArray(body.history).slice(-6).map((msg) => ({
      role: msg.direction === 'out' ? 'user' : 'assistant',
      content: clean(msg.content).slice(0, 700),
    }));

    const payload = {
      model,
      messages: [
        { role: 'system', content: systemPrompt() },
        { role: 'user', content: `Contexte ERP structure, source de verite. Reponds a la question en utilisant ces donnees, sans inventer :\n${compact(body.context)}` },
        ...history,
        { role: 'user', content: message },
      ],
      temperature: 0.25,
      max_tokens: 800,
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
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
