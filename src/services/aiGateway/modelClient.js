/**
 * Connecteur modèle - le maillon final de la passerelle IA.
 *
 * Le client n'appelle JAMAIS l'API Claude en direct (la clé resterait exposée) :
 * il poste sur un endpoint serveur (`/api/assistant/generate`) qui, lui, détient
 * la clé et parle au modèle. Tant que l'endpoint n'existe pas ou que le réseau
 * est absent, `callClaudeModel` échoue proprement (source `unavailable`/`offline`)
 * et l'appelant retombe sur sa rédaction déterministe. Aucune clé ici, aucun
 * secret : poser la variable d'environnement côté serveur suffit à tout activer.
 */

const DEFAULT_ENDPOINT = '/api/assistant/generate';

const clean = (v) => String(v ?? '').trim();

/**
 * Demande une génération structurée au modèle via l'endpoint serveur.
 * @returns {Promise<{ ok:boolean, source:string, text:string, data:(object|null), status?:number }>}
 */
export async function callClaudeModel({
  system = '',
  prompt = '',
  schema = null,
  maxTokens = 512,
  endpoint = DEFAULT_ENDPOINT,
  signal,
  fetchImpl,
} = {}) {
  const doFetch = fetchImpl || (typeof fetch === 'function' ? fetch : null);
  if (!doFetch || !clean(prompt)) {
    return { ok: false, source: 'unavailable', text: '', data: null };
  }
  try {
    const res = await doFetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ system, prompt, schema, max_tokens: maxTokens }),
      signal,
    });
    if (!res || !res.ok) {
      return { ok: false, source: 'error', status: res ? res.status : 0, text: '', data: null };
    }
    const json = await res.json();
    const text = clean(json.text ?? json.completion ?? json.message ?? '');
    const data = json.data ?? json.structured ?? null;
    if (!text && !data) return { ok: false, source: 'empty', text: '', data: null };
    return { ok: true, source: 'model', text, data };
  } catch {
    return { ok: false, source: 'offline', text: '', data: null };
  }
}

/** Un modèle est-il joignable ? (pour afficher « assisté » vs « modèle personnalisé »). */
export function isModelReachable(result = {}) {
  return Boolean(result && result.ok && result.source === 'model');
}

export default callClaudeModel;
