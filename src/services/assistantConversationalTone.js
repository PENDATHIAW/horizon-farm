/**
 * Ton conversationnel Horizon V7 — directeur d'exploitation, zéro jargon ERP.
 */

const TECHNICAL_PATTERNS = [
  /\bcompute\w*/gi,
  /\bconsolidate\w*/gi,
  /\bbuild\w+\([^)]*\)/gi,
  /\bbuild[A-Z]\w+/g,
  /\bsummarize\w*/gi,
  /\breceivableFromOrders\b/gi,
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
  /\bJe vous conseille de\s+/gi,
  /\bMon conseil\s*:\s*/gi,
  /\bPour l'instant,\s*bonjour\b/gi,
];

function clean(value = '') {
  return String(value || '').replace(/\s+/g, ' ').trim();
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

function humanizeDotSeparated(text = '') {
  const parts = String(text || '')
    .split(/\s*·\s*/)
    .map((part) => clean(part))
    .filter(Boolean);
  if (parts.length <= 1) return clean(text);
  return parts.map((part, index) => {
    const sentence = ensurePeriod(part);
    return index === 0 ? sentence.charAt(0).toUpperCase() + sentence.slice(1) : sentence.charAt(0).toUpperCase() + sentence.slice(1);
  }).join(' ');
}

function humanizeNumberedList(text = '') {
  const raw = String(text || '').trim();
  if (!/^\d+\.\s/m.test(raw)) return raw;
  const items = raw
    .split(/\n+/)
    .map((line) => line.replace(/^\d+\.\s*/, '').trim())
    .filter(Boolean);
  if (items.length <= 1) return raw;
  const lead = ensurePeriod(items[0]);
  const rest = items.slice(1).map((item) => ensurePeriod(item.charAt(0).toLowerCase() + item.slice(1)));
  return [lead, ...rest].join(' ');
}

function humanizeErpPhrasing(text = '') {
  let out = String(text || '');
  out = out.replace(/\b(\d+)\s*créance\(s\)/gi, (_, n) => `${n} créance${Number(n) > 1 ? 's' : ''}`);
  out = out.replace(/\b(\d+)\s*commande\(s\)/gi, (_, n) => `${n} commande${Number(n) > 1 ? 's' : ''}`);
  out = out.replace(/\bJ\+(\d+)\b/g, 'depuis $1 jour(s)');
  out = out.replace(/\bpriorité\s+Client\b/gi, 'un client prioritaire');
  out = out.replace(/\bC'est surtout parce que\s+/gi, '');
  out = out.replace(/\bLecture consolidée des moteurs ERP[^.]*\.?/gi, '');
  out = out.replace(/\bSynthèse créances, relances et opportunités\.?/gi, '');
  return clean(out);
}

/** Supprime toute fuite technique visible par l'utilisateur. */
export function stripTechnicalLeaks(text = '') {
  let out = String(text || '');
  out = out.replace(/\n\n—\s*[^\n]+/g, '');
  out = out.replace(/\n—\s*[^\n]+/g, '');
  out = out.replace(/\s—\s*(Commercial|Horizon|Finance|Élevage|receivableFromOrders|[\w]+From\w+)\s*$/gi, '');
  for (const pattern of TECHNICAL_PATTERNS) {
    out = out.replace(pattern, '');
  }
  out = out.replace(/\s{2,}/g, ' ').trim();
  return out;
}

function softenSituation(situation = '') {
  let s = humanizeNumberedList(humanizeDotSeparated(situation));
  s = humanizeErpPhrasing(s);
  s = ensurePeriod(stripTechnicalLeaks(s));
  if (!s) return '';
  if (/^bonjour — je suis là pour suivre votre exploitation/i.test(s)) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function softenCause(cause = '') {
  let c = humanizeDotSeparated(cause);
  c = humanizeErpPhrasing(c);
  c = stripTechnicalLeaks(c);
  if (!c) return '';
  const cleaned = ensurePeriod(c);
  if (/fiches|comptage|données|donnees|issus|synthèse|synthese|moteurs|erp/i.test(cleaned)) {
    return '';
  }
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function softenAction(action = '') {
  let a = humanizeErpPhrasing(action);
  a = stripTechnicalLeaks(a);
  if (!a) return '';
  const lower = a.toLowerCase();
  if (/ouvrez|consultez|ouvre|module|élevage →|finance →|commercial →/i.test(a)) {
    return '';
  }
  if (/relanc|surveill|prioris|planif|accélér|acceler|reporter|vérifi|verifi|garder|œil|oeil|maintenir|sécuris|securis|suggère/i.test(lower)) {
    let sentence = a.charAt(0).toUpperCase() + a.slice(1);
    if (!/^je /i.test(sentence)) {
      sentence = `Je vous suggère de ${sentence.charAt(0).toLowerCase() + sentence.slice(1)}`;
    }
    return ensurePeriod(sentence);
  }
  if (/aucune action|calme|stable|normes|contrôle|controle|posez-moi une question/i.test(lower)) {
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
