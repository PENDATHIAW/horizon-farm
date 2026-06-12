import { json } from './_utils.js';
import { isLlmConfigured, getLlmConfig } from './llm.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return json(res, 200, { ok: true });
  }

  const configured = isLlmConfigured();
  const { model, baseUrl } = getLlmConfig();

  return json(res, 200, {
    ok: true,
    type: 'assistant_llm_status',
    configured,
    llm_available: configured,
    model: configured ? model : null,
    base_url: configured ? baseUrl : null,
    provider: 'openai',
    routes: {
      enhance: '/api/assistant/enhance',
      agent: '/api/assistant/agent',
      document_ocr: '/api/assistant/document-ocr',
    },
    env_keys: ['OPENAI_API_KEY', 'HEY_HORIZON_LLM_API_KEY'],
    client_flag: 'VITE_HEY_HORIZON_LLM',
    setup_hint: configured
      ? 'LLM actif — formulations libres complétées via enhance/agent.'
      : 'Ajoutez OPENAI_API_KEY dans Vercel → Settings → Environment Variables (Production), puis redéployez.',
    timestamp: new Date().toISOString(),
  });
}
