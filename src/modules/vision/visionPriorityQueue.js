import { getDismissedPriorityKeys, isPriorityDismissed } from '../../services/centrePriorityDismissService.js';

const MAINTENANCE_CATEGORIES = new Set(['audit_erp', 'surveillance_ux']);

const CENTRE_TABS = new Set(['À traiter', 'Recommandations', 'Cycles', 'Risques', 'Historique', 'Graphiques', 'Annexe']);

const MODULE_LABELS = {
  centre_decisionnel: 'Centre décisionnel',
  activite_suivi: 'Activité & Suivi',
  commercial: 'Commercial',
  elevage: 'Élevage',
  achats_stock: 'Achats & Stock',
  finance_pilotage: 'Finance & Pilotage',
  documents_rapports: 'Documents & Rapports',
  objectifs_croissance: 'Objectifs & Croissance',
  gestion_systeme: 'Gestion système',
};

const KIND_ORDER = { alerte: 0, tache: 1, finance: 2, preuve: 3, ia: 4 };
const TONE_ORDER = { bad: 0, warn: 1, good: 2, neutral: 3 };
const SEV_ORDER = { critique: 0, haute: 0, eleve: 0, warning: 1, moyenne: 2, moyen: 2, basse: 3, faible: 3 };

export function normalizePriorityTitle(title = '') {
  return String(title)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/^(risque|tache|alerte)\s*:\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function moduleLabel(moduleId = '') {
  const key = String(moduleId || '').trim().toLowerCase();
  return MODULE_LABELS[key] || (key ? key.replace(/_/g, ' ') : 'ERP');
}

function severityRank(item = {}) {
  const tone = TONE_ORDER[item.tone] ?? 2;
  const sev = SEV_ORDER[item.severity || item.finding?.severity] ?? 2;
  return Math.min(tone, sev);
}

function kindRank(item = {}) {
  return KIND_ORDER[item.kind] ?? 5;
}

function isMaintenanceItem(item = {}) {
  const cat = item.category || item.finding?.category;
  return MAINTENANCE_CATEGORIES.has(cat);
}

function itemText(item = {}) {
  return `${item.title || ''} ${item.detail || ''} ${item.finding?.recommended_action || ''} ${item.finding?.description || ''}`.toLowerCase();
}

function inferTab(item = {}) {
  if (item.tab && CENTRE_TABS.has(item.tab)) return item.tab;

  const text = itemText(item);

  if (
    text.includes('lancement')
    || text.includes('vide sanitaire')
    || text.includes('tabaski')
    || text.includes('korite')
    || text.includes('bande')
    || text.includes(' ith')
    || text.includes('ith ')
  ) {
    return 'Cycles';
  }

  if (
    text.includes('demande')
    || text.includes('couverture')
    || text.includes('écart ca')
    || text.includes('ecart ca')
    || text.includes('marge commerciale')
    || text.includes('investissement')
    || text.includes('business plan')
  ) {
    return 'Recommandations';
  }

  if (
    text.includes('vendre')
    || text.includes('surconsommation')
    || text.includes('mortalité')
    || text.includes('mortalite')
    || item.kind === 'finance'
    || text.includes('trésorerie')
    || text.includes('tresorerie')
    || text.includes('encaissement')
  ) {
    return 'Risques';
  }

  if (item.kind === 'alerte' || item.kind === 'tache' || item.kind === 'preuve') return null;

  return null;
}

function buildWhatToDo(item = {}) {
  const action = item.finding?.recommended_action || item.record?.action_recommandee;
  if (action && String(action).trim().length > 12) return String(action).trim();

  switch (item.kind) {
    case 'alerte':
      return action || item.record?.message || 'Ouvrir l\'alerte, traiter ou transformer en tâche.';
    case 'tache':
      return item.record?.notes || item.record?.description || 'Exécuter ou clôturer la tâche urgente.';
    case 'finance':
      return 'Sécuriser la trésorerie : accélérer encaissements et contrôler les charges.';
    case 'preuve':
      return 'Rattacher les justificatifs manquants aux opérations.';
    case 'ia':
      return action || item.detail || 'Appliquer la suggestion ou ouvrir la source.';
    default:
      return item.detail || 'Consulter la source et décider.';
  }
}

/** Une seule file sans doublon : alertes terrain d'abord, puis signaux d’analyse complémentaires. */
export function buildActionQueue(items = [], { includeDismissed = false } = {}) {
  const dismissed = includeDismissed ? new Set() : getDismissedPriorityKeys();
  const sorted = [...items].sort((a, b) => kindRank(a) - kindRank(b) || severityRank(a) - severityRank(b));

  const today = [];
  const maintenance = [];
  const seen = new Set();

  sorted.forEach((raw) => {
    const key = normalizePriorityTitle(raw.title);
    if (!key || seen.has(key)) return;
    if (isPriorityDismissed(raw, dismissed)) return;
    seen.add(key);

    const detail = raw.detail && raw.detail !== 'Alerte ouverte' && raw.detail !== 'Tâche prioritaire'
      ? raw.detail
      : (raw.finding?.recommended_action || raw.record?.action_recommandee || raw.record?.message || raw.detail || '—');

    const item = {
      ...raw,
      sourceLabel: raw.sourceLabel || moduleLabel(raw.sourceModule),
      priorityLabel: raw.priorityLabel || raw.value || 'À traiter',
      detail,
      whatToDo: buildWhatToDo({ ...raw, detail }),
      targetTab: inferTab({ ...raw, detail }),
    };

    if (isMaintenanceItem(item)) maintenance.push(item);
    else today.push(item);
  });

  return {
    today: today.slice(0, 10),
    maintenance: maintenance.slice(0, 4),
  };
}

export function enrichOperationalPriorities(openAlerts = [], openTasks = [], extras = []) {
  const alertKeys = new Set(openAlerts.map((r) => normalizePriorityTitle(r.title || r.nom || r.name || r.libelle)));

  const alertItems = openAlerts.slice(0, 8).map((r) => {
    const title = r.title || r.nom || r.name || r.libelle || 'Alerte';
    const sev = String(r.severity || r.severite || r.priority || '').toLowerCase();
    return {
      id: `a-${r.id || title}`,
      title,
      detail: r.action_recommandee || r.message || r.description || 'Consulter et traiter cette alerte.',
      value: sev.includes('critique') ? 'Critique' : 'Alerte',
      priorityLabel: sev.includes('critique') ? 'Critique' : 'Alerte',
      tone: sev.includes('critique') ? 'bad' : 'warn',
      severity: sev.includes('critique') ? 'critique' : 'warning',
      kind: 'alerte',
      sourceModule: r.module_source || 'activite_suivi',
      sourceLabel: moduleLabel(r.module_source),
      record: r,
      category: r.category,
    };
  });

  const taskItems = openTasks.slice(0, 5).map((r) => ({
    id: `t-${r.id || r.title}`,
    title: r.title || r.nom || 'Tâche',
    detail: r.description || r.notes || 'Exécuter ou réassigner cette tâche.',
    value: 'Tâche',
    priorityLabel: String(r.priority || r.priorite || '').toLowerCase().includes('critique') ? 'Critique' : 'Tâche',
    tone: String(r.priority || r.priorite || '').toLowerCase().includes('critique') ? 'bad' : 'warn',
    kind: 'tache',
    sourceModule: r.module_lie || 'activite_suivi',
    sourceLabel: moduleLabel(r.module_lie),
    record: r,
  }));

  const engineItems = extras
    .filter((f) => !alertKeys.has(normalizePriorityTitle(f.title)))
    .slice(0, 8)
    .map((f) => ({
      id: f.id,
      title: f.title,
      detail: f.recommended_action || f.description || '—',
      value: 'Analyse',
      priorityLabel: f.severity === 'critique' || f.severity === 'haute' ? 'Analyse' : 'Conseil',
      tone: f.severity === 'critique' || f.severity === 'haute' ? 'bad' : 'warn',
      severity: f.severity,
      kind: 'ia',
      sourceModule: f.module || 'centre_decisionnel',
      sourceLabel: moduleLabel(f.module),
      finding: f,
      category: f.category,
      isEngine: true,
    }));

  return [...alertItems, ...taskItems, ...engineItems];
}
