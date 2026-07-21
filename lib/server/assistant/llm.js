const DEFAULT_BASE_URL = 'https://api.openai.com/v1';
const DEFAULT_MODEL = 'gpt-4o-mini';

export function isLlmConfigured() {
  return Boolean(process.env.HEY_HORIZON_LLM_API_KEY || process.env.OPENAI_API_KEY);
}

export function getLlmConfig() {
  return {
    apiKey: process.env.HEY_HORIZON_LLM_API_KEY || process.env.OPENAI_API_KEY || '',
    baseUrl: (process.env.HEY_HORIZON_LLM_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, ''),
    model: process.env.HEY_HORIZON_LLM_MODEL || DEFAULT_MODEL,
  };
}

const SYSTEM_PROMPT = `Tu es Hey Horizon, l'assistant ERP agricole Horizon Farm (Sénégal, FCFA).
Réponds en français, concis et actionnable.

Règles strictes :
- Utilise UNIQUEMENT les KPI fournis dans le contexte JSON. N'invente pas de chiffres.
- Pour une QUESTION analytique : mode "answer", texte clair avec montants en FCFA.
- Pour une ACTION terrain (vente, achat, vaccin, stock, tâche, dépense) : mode "draft" avec intent et champs extraits — jamais d'exécution directe.
- Si la demande est ambiguë, demande une précision courte.
- confidence : 0-100 (règles métier = 90+, inférence = 60-85).

Réponds UNIQUEMENT en JSON valide :
{
  "mode": "answer" | "draft" | "clarify",
  "text": "réponse utilisateur",
  "confidence": 85,
  "moduleKey": "commercial|elevage|finance_pilotage|...|null",
  "draft": {
    "intent": "sale_record|health_action|stock_purchase|...",
    "primary_module": "ventes|stock|sante|...",
    "form_type": "sale_record|...",
    "draft_fields": {},
    "missing_fields": [],
    "status": "draft_incomplete|ready"
  }
}`;

export async function callHeyHorizonLlm({ question = '', summary = {}, rulesAnswer = '' } = {}) {
  const { apiKey, baseUrl, model } = getLlmConfig();
  if (!apiKey) {
    return { ok: false, error: 'LLM non configuré', configured: false };
  }

  const userContent = JSON.stringify({
    question,
    erp_summary: summary,
    rules_fallback: rulesAnswer || null,
  });

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    return { ok: false, error: `LLM HTTP ${response.status}`, detail: errText.slice(0, 200), configured: true };
  }

  const payload = await response.json();
  const raw = payload?.choices?.[0]?.message?.content || '{}';
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'Réponse LLM invalide', raw: raw.slice(0, 300), configured: true };
  }

  return {
    ok: true,
    configured: true,
    source: 'llm',
    mode: parsed.mode || 'answer',
    text: parsed.text || rulesAnswer || 'Réponse indisponible.',
    confidence: Math.min(100, Math.max(0, Number(parsed.confidence || 75))),
    moduleKey: parsed.moduleKey || null,
    draft: parsed.draft || null,
    model,
  };
}

/**
 * Génération générique (système + prompt libre), avec ou sans sortie structurée.
 * Utilisée par l'endpoint /api/assistant/generate : le client poste un prompt
 * déjà composé (relance, résumé, etc.) et récupère { text, data }. La clé reste
 * côté serveur ; sans clé, on renvoie ok:false et l'appelant retombe sur son
 * repli déterministe.
 */
export async function callGenerativeLlm({ system = '', prompt = '', schema = null, maxTokens = 512 } = {}) {
  const { apiKey, baseUrl, model } = getLlmConfig();
  if (!apiKey) {
    return { ok: false, error: 'LLM non configuré', configured: false };
  }
  const wantsJson = Boolean(schema);
  const messages = [];
  if (String(system || '').trim()) messages.push({ role: 'system', content: String(system) });
  messages.push({ role: 'user', content: String(prompt) });

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      max_tokens: Math.min(4000, Math.max(64, Number(maxTokens) || 512)),
      ...(wantsJson ? { response_format: { type: 'json_object' } } : {}),
      messages,
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    return { ok: false, error: `LLM HTTP ${response.status}`, detail: errText.slice(0, 200), configured: true };
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content || '';
  let data = null;
  let text = String(content || '').trim();
  if (wantsJson) {
    try {
      data = JSON.parse(content);
    } catch {
      data = null;
    }
    if (data && typeof data.text === 'string') text = data.text.trim();
  }
  return { ok: true, configured: true, source: 'model', text, data, model };
}

const TOOL_PICKER_PROMPT = `Tu es le routeur d'outils Hey Horizon (ERP agricole).
Choisis UN outil parmi la liste pour répondre à la question de l'exploitant.
Réponds UNIQUEMENT en JSON :
{
  "toolId": "get_receivables|get_stock_status|get_elevage_status|get_treasury|get_daily_priorities|null",
  "confidence": 75,
  "reason": "courte justification"
}
Si aucun outil correspond, toolId = null.`;

export async function callFarmToolPickerLlm({
  question = '',
  summary = {},
  toolContext = {},
  tools = [],
} = {}) {
  const { apiKey, baseUrl, model } = getLlmConfig();
  if (!apiKey) {
    return { ok: false, error: 'LLM non configuré', configured: false };
  }

  const userContent = JSON.stringify({
    question,
    erp_summary: summary,
    farm_snapshot: toolContext,
    available_tools: tools,
  });

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: TOOL_PICKER_PROMPT },
        { role: 'user', content: userContent },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    return { ok: false, error: `LLM HTTP ${response.status}`, detail: errText.slice(0, 200), configured: true };
  }

  const payload = await response.json();
  const raw = payload?.choices?.[0]?.message?.content || '{}';
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'Réponse LLM invalide', configured: true };
  }

  return {
    ok: true,
    configured: true,
    source: 'llm_tool_picker',
    toolId: parsed.toolId || null,
    confidence: Math.min(100, Math.max(0, Number(parsed.confidence || 70))),
    reason: parsed.reason || '',
    model,
  };
}
