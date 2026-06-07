const arr = (value) => (Array.isArray(value) ? value : []);
const clean = (value = '') => String(value || '').trim().toLowerCase();
const num = (value = 0) => Number(value || 0) || 0;

const STRUCTURED_TYPES = new Set([
  'impact_sante',
  'impact_vente',
  'impact_stock',
  'impact_production',
  'impact_finance',
  'impact_rh',
  'impact_culture',
  'perte_avicole',
  'paiement_remuneration',
  'smartfarm_signal_critique',
]);

function inferModule(row = {}) {
  const source = clean(row.module_source || row.module || row.source_module);
  if (source) return source;
  const type = clean(row.event_type || row.type_evenement || row.type);
  if (type.includes('sante') || type.includes('vaccin')) return 'sante';
  if (type.includes('vente') || type.includes('sale')) return 'ventes';
  if (type.includes('stock')) return 'stock';
  if (type.includes('avicole') || type.includes('oeuf') || type.includes('ponte')) return 'avicole';
  if (type.includes('culture') || type.includes('recolte')) return 'cultures';
  if (type.includes('rh') || type.includes('salaire')) return 'rh';
  if (type.includes('smartfarm')) return 'smartfarm';
  return 'business_events';
}

function inferLevel(row = {}) {
  const severity = clean(row.severity || row.niveau || row.level);
  if (['critique', 'critical', 'danger'].includes(severity)) return 'critique';
  if (['warning', 'warn', 'eleve', 'élevé', 'haute'].includes(severity)) return 'eleve';
  if (num(row.montant ?? row.amount) >= 100000) return 'eleve';
  return 'normal';
}

export function normalizeBusinessImpactEvent(row = {}) {
  const amount = num(row.montant ?? row.amount ?? row.estimated_amount ?? row.montant_estime);
  const module = inferModule(row);
  const level = inferLevel(row);
  const structured = Boolean(row.impact_structured || row.impact_level || STRUCTURED_TYPES.has(clean(row.event_type || row.type_evenement)));
  return {
    id: row.id,
    title: row.title || row.libelle || row.event_type || 'Impact métier',
    description: row.description || row.notes || '',
    module,
    level,
    amount,
    action: row.action_recommandee || row.recommended_action || row.next_action || '',
    structured,
    date: row.event_date || row.date || row.created_at || '',
    raw: row,
  };
}

export function auditBusinessImpactEvents(events = []) {
  const normalized = arr(events).map(normalizeBusinessImpactEvent);
  const unstructured = normalized.filter((row) => !row.structured && (row.amount > 0 || row.description.length > 20));
  const withoutModule = normalized.filter((row) => row.module === 'business_events');
  const withoutAmount = normalized.filter((row) => row.amount <= 0 && /perte|coût|cout|charge|vente|stock/.test(clean(`${row.title} ${row.description}`)));
  return {
    total: normalized.length,
    structured: normalized.filter((row) => row.structured).length,
    unstructured: unstructured.slice(0, 20),
    withoutModule: withoutModule.slice(0, 12),
    withoutAmount: withoutAmount.slice(0, 12),
    score: normalized.length ? Math.round((normalized.filter((row) => row.structured && row.module !== 'business_events').length / normalized.length) * 100) : 100,
  };
}

export function buildStructuredImpactPatch(row = {}) {
  const normalized = normalizeBusinessImpactEvent(row);
  return {
    impact_structured: true,
    impact_level: normalized.level,
    impact_module: normalized.module,
    impact_amount: normalized.amount,
    impact_action: normalized.action,
    module_source: row.module_source || normalized.module,
    severity: normalized.level === 'critique' ? 'critique' : normalized.level === 'eleve' ? 'warning' : row.severity || 'info',
  };
}
