/**
 * Ton conversationnel Horizon — réponses naturelles, comme un directeur d'exploitation.
 * Transforme Situation / Cause / Action en prose fluide (sans labels visibles).
 */

const SOURCE_LABELS = Object.freeze({
  computefarmheadcount: 'Élevage',
  buildcarnetdomaincards: 'Carnet Horizon',
  buildconsolidatedcommercialkpis: 'Commercial',
  consolidatefinance: 'Finance',
  consolidatfinance: 'Finance',
  summarizesalesmargins: 'Commercial',
  buildobjectifscroissancedata: 'Objectifs & Croissance',
  computeculturesummary: 'Cultures',
  computestocksummary: 'Achats & Stock',
  animaux: 'Élevage',
  avicole: 'Élevage',
  sante: 'Élevage',
  stocks: 'Stock',
  finances: 'Finance',
  documents: 'Documents',
  business_events: 'Activité',
  fournisseurs: 'Achats',
  taches: 'Ressources',
  equipements: 'Équipements',
  horizon: 'Horizon',
  navigationerp: 'Navigation',
  carnethorizon: 'Carnet Horizon',
});

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

function normalizeSituation(situation = '') {
  const s = ensurePeriod(situation);
  if (!s) return '';

  if (/^(vous avez|il y a|on compte|actuellement|pour l instant|au total|ca |trésorerie|aucun|pas de|peu de|\d)/i.test(s)) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  if (/^horizon /i.test(s)) return s;
  return `Pour l'instant, ${lowerFirst(s)}`;
}

function normalizeCause(cause = '') {
  const c = ensurePeriod(cause);
  if (!c) return '';

  if (/^(c est|il s agit|aucun|pas de|peu de|données|donnees|niveaux|comptage|effectifs|synthèse|synthese)/i.test(c)) {
    return c.charAt(0).toUpperCase() + c.slice(1);
  }
  if (/^\d/.test(c)) {
    return c.charAt(0).toUpperCase() + c.slice(1);
  }
  return `C'est surtout parce que ${lowerFirst(c)}`;
}

function normalizeAction(action = '') {
  const a = clean(action);
  if (!a) return '';

  const lower = a.toLowerCase();
  if (/^(mon conseil|je vous conseille|pour la suite|n hésitez pas)/i.test(a)) {
    return ensurePeriod(a);
  }
  if (/^(consultez|ouvrez|ouvre|demandez|posez)/i.test(a)) {
    return ensurePeriod(`Mon conseil : ${lowerFirst(a)}`);
  }
  if (/surveill|relanc|prioris|planif|accélér|acceler|reporter|vérifi|verifi|trait|sécuris|securis|maintenir|poursuiv|renforcer|compléter|completer|étudiez|etudiez|confirmez|reformulez|décrivez|decrivez/i.test(lower)) {
    return ensurePeriod(`Je vous conseille de ${lowerFirst(a.replace(/^de /i, ''))}`);
  }
  if (/aucune action|rien n a|pas d action|exploitation calme|sous contrôle|sous controle|dans les normes|stable/i.test(lower)) {
    return ensurePeriod(`Pour la suite, ${lowerFirst(a)}`);
  }
  return ensurePeriod(`Pour la suite, ${lowerFirst(a)}`);
}

export function humanizeSources(sources = []) {
  const list = Array.isArray(sources) ? sources : String(sources || '').split(/[·,]/);
  const labels = new Set();

  for (const raw of list) {
    const key = clean(raw).toLowerCase().replace(/[()]/g, '');
    if (!key) continue;

    const normalized = key.replace(/[^a-z0-9_]/g, '');
    let matched = false;
    for (const [needle, label] of Object.entries(SOURCE_LABELS)) {
      if (normalized.includes(needle) || key.includes(needle)) {
        labels.add(label);
        matched = true;
        break;
      }
    }
    if (!matched && !/\.js|engine|build|compute|consolidate/i.test(key)) {
      labels.add(clean(raw));
    }
  }

  return [...labels].slice(0, 2).join(' · ');
}

/**
 * Transforme une réponse SCA en texte conversationnel.
 * @returns {{ prose: string, displayText: string, situation: string, cause: string, action: string, sources: string }}
 */
export function toConversationalAnswer({
  situation = '',
  cause = '',
  action = '',
  sources = [],
  title = '',
} = {}) {
  const sentences = [];
  const sit = normalizeSituation(situation);
  const cau = normalizeCause(cause);
  const act = normalizeAction(action);

  if (sit) sentences.push(sit);
  if (cau && !isRedundant(cau, sit)) sentences.push(cau);
  if (act && !isRedundant(act, `${sit} ${cau}`)) sentences.push(act);

  let prose = sentences.join(' ').replace(/\s+/g, ' ').trim();
  if (!prose && title) prose = ensurePeriod(title);

  const sourceLabel = humanizeSources(sources);
  const displayText = sourceLabel
    ? `${prose}\n\n— ${sourceLabel}`
    : prose;

  return {
    prose,
    displayText,
    situation: clean(situation),
    cause: clean(cause),
    action: clean(action),
    sources: sourceLabel,
  };
}

export default toConversationalAnswer;
