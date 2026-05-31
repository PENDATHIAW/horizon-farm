const MAINTENANCE_CATEGORIES = new Set(['audit_erp', 'surveillance_ux']);

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

function inferTab(item = {}) {
  if (item.tab) return item.tab;
  const text = `${item.title || ''} ${item.detail || ''}`.toLowerCase();
  if (text.includes('lancement') || text.includes('vide sanitaire') || text.includes('tabaski') || text.includes('korite')) {
    return 'Cycles';
  }
  if (text.includes('vendre') || text.includes('vente') || text.includes('trésorerie') || text.includes('tresorerie')) {
    return 'Risques';
  }
  return item.navTab ? null : 'Risques';
}

/** Une seule file sans doublon : alertes terrain d'abord, puis signaux IA complémentaires. */
export function buildActionQueue(items = []) {
  const sorted = [...items].sort((a, b) => kindRank(a) - kindRank(b) || severityRank(a) - severityRank(b));

  const today = [];
  const maintenance = [];
  const seen = new Set();

  sorted.forEach((raw) => {
    const key = normalizePriorityTitle(raw.title);
    if (!key || seen.has(key)) return;
    seen.add(key);

    const item = {
      ...raw,
      sourceLabel: raw.sourceLabel || moduleLabel(raw.sourceModule),
      priorityLabel: raw.priorityLabel || raw.value || 'À traiter',
      detail: raw.detail && raw.detail !== 'Alerte ouverte' && raw.detail !== 'Tâche prioritaire'
        ? raw.detail
        : (raw.finding?.recommended_action || raw.record?.action_recommandee || raw.record?.message || raw.detail || '—'),
      targetTab: inferTab(raw),
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
      tab: 'Risques',
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
    tab: 'Risques',
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
      priorityLabel: f.severity === 'critique' || f.severity === 'haute' ? 'Analyse IA' : 'Conseil IA',
      tone: f.severity === 'critique' || f.severity === 'haute' ? 'bad' : 'warn',
      severity: f.severity,
      tab: 'À traiter',
      kind: 'ia',
      sourceModule: f.module || 'centre_decisionnel',
      sourceLabel: moduleLabel(f.module),
      finding: f,
      category: f.category,
      isEngine: true,
    }));

  return [...alertItems, ...taskItems, ...engineItems];
}
