/**
 * Ton conversationnel Horizon V7 — directeur d'exploitation, zéro jargon ERP.
 */

const TECHNICAL_PATTERNS = [
  /\bcompute\w*/gi,
  /\bconsolidate\w*/gi,
  /\bbuild\w+\([^)]*\)/gi,
  /\bbuild[A-Z]\w+/g,
  /\bsummarize\w*/gi,
  /\bERP\b/g,
  /\bSource ERP\b/gi,
  /\(\)\./g,
  /\.js\b/gi,
  /\bmoteur\b/gi,
  /\bengine\b/gi,
  /\bcanonical\b/gi,
  /\bfiches?\s+ERP\b/gi,
  /\bdonnées?\s+ERP\b/gi,
  /\bmodule\b/gi,
  /\bnavigation\s+erp\b/gi,
];

function clean(value = '') {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function lowerFirst(value = '') {
  const text = clean(value);
  if (!text) return '';
  return text.charAt(0).toLowerCase() + text.slice(1);
}

function ensurePeriod(value = '') {
  const text = clean(value);
  if (!text) return '';
  return /[.!?…]$/.test(text) ? text : `${text}.`;
}

function isRedundant(cause = '', situation = '') {
  const c = clean(cause).toLowerCase();
  const s = clean(situation).toLowerCase();
  if (!c || c === s) return true;
  if (s.includes(c) || c.includes(s)) return true;
  return false;
}

/** Supprime toute fuite technique visible par l'utilisateur. */
export function stripTechnicalLeaks(text = '') {
  let out = String(text || '');
  for (const pattern of TECHNICAL_PATTERNS) {
    out = out.replace(pattern, '');
  }
  out = out.replace(/\s*—\s*$/g, '');
  out = out.replace(/\n\n—\s*[^\n]+/g, '');
  out = out.replace(/\s{2,}/g, ' ').trim();
  return out;
}

function softenSituation(situation = '') {
  const s = ensurePeriod(stripTechnicalLeaks(situation));
  if (!s) return '';
  if (/^(dans l ensemble|vous avez|il y a|on compte|actuellement|au total|bonjour|aucun|pas de)/i.test(s)) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function softenCause(cause = '') {
  const c = stripTechnicalLeaks(cause);
  if (!c) return '';
  const cleaned = ensurePeriod(c);
  if (/^(les ventes|le stock|les créances|les creances|parmi eux|c est|il y a|aucun)/i.test(cleaned)) {
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }
  if (/fiches|comptage|données|donnees|issus|synthèse|synthese/i.test(cleaned)) {
    return '';
  }
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function softenAction(action = '') {
  const a = stripTechnicalLeaks(action);
  if (!a) return '';
  const lower = a.toLowerCase();
  if (/ouvrez|consultez|ouvre|module|élevage →|finance →/i.test(a)) {
    return '';
  }
  if (/relanc|surveill|prioris|planif|accélér|acceler|reporter|vérifi|verifi|garder|œil|oeil|maintenir|sécuris|securis/i.test(lower)) {
    return ensurePeriod(a.charAt(0).toUpperCase() + a.slice(1));
  }
  if (/aucune action|calme|stable|normes|contrôle|controle/i.test(lower)) {
    return '';
  }
  return ensurePeriod(a.charAt(0).toUpperCase() + a.slice(1));
}

/**
 * Transforme SCA interne en prose humaine — jamais de sources visibles.
 */
export function toConversationalAnswer({
  situation = '',
  cause = '',
  action = '',
  title = '',
} = {}) {
  const sentences = [];
  const sit = softenSituation(situation);
  const cau = softenCause(cause);
  const act = softenAction(action);

  if (sit) sentences.push(sit);
  if (cau && !isRedundant(cau, sit)) sentences.push(cau);
  if (act && !isRedundant(act, sentences.join(' '))) sentences.push(act);

  let prose = stripTechnicalLeaks(sentences.join(' '));
  if (!prose && title) prose = ensurePeriod(stripTechnicalLeaks(title));

  return {
    prose,
    displayText: prose,
    situation: clean(situation),
    cause: clean(cause),
    action: clean(action),
    sources: '',
  };
}

export default toConversationalAnswer;
