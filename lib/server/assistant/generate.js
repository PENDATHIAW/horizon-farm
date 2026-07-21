import { json, readJsonBody, requirePostOrOptions } from './_utils.js';
import { callGenerativeLlm, isLlmConfigured } from './llm.js';

/**
 * Endpoint /api/assistant/generate : le maillon serveur de la passerelle IA.
 *
 * Le client (`callClaudeModel`) poste { system, prompt, schema, max_tokens } ;
 * ici on tient la clé et on parle au modèle, puis on renvoie { ok, source, text,
 * data }. Sans clé configurée, on renvoie 503 : le client retombe proprement sur
 * sa redaction deterministe. Aucun secret ne transite cote client.
 */

const clean = (v) => String(v ?? '').trim();

/**
 * Cœur testable : décide de la réponse à partir du corps et des dépendances
 * injectées (`configured`, `generate`). Aucune E/S réseau ici directement.
 * @returns {{ status:number, payload:object }}
 */
export async function runGenerate(body = {}, { configured = false, generate } = {}) {
  const prompt = clean(body.prompt);
  if (!prompt) {
    return { status: 400, payload: { ok: false, source: 'invalid', error: 'prompt requis', text: '', data: null } };
  }
  if (!configured) {
    return { status: 503, payload: { ok: false, source: 'unconfigured', text: '', data: null } };
  }

  let result;
  try {
    result = await generate({
      system: clean(body.system),
      prompt,
      schema: body.schema ?? null,
      maxTokens: Number(body.max_tokens) || 512,
    });
  } catch (err) {
    return { status: 502, payload: { ok: false, source: 'error', text: '', data: null, error: String(err?.message || err) } };
  }

  if (!result || !result.ok) {
    return {
      status: 502,
      payload: { ok: false, source: 'error', text: '', data: null, error: result?.error || 'génération indisponible' },
    };
  }

  const text = clean(result.text);
  const data = result.data ?? null;
  if (!text && !data) {
    return { status: 502, payload: { ok: false, source: 'empty', text: '', data: null } };
  }
  return { status: 200, payload: { ok: true, source: 'model', text, data, model: result.model || null } };
}

export default async function handler(req, res) {
  if (!requirePostOrOptions(req, res)) return;
  const body = await readJsonBody(req);
  const { status, payload } = await runGenerate(body, {
    configured: isLlmConfigured(),
    generate: callGenerativeLlm,
  });
  return json(res, status, payload);
}
