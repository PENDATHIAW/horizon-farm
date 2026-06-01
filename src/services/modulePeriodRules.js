/** Règle période globale ERP — quelles données sont filtrées vs cumul global. */
export const MODULE_PERIOD_RULES = {
  sales_orders: { filtered: true, reason: 'KPI commercial période' },
  payments: { filtered: true, reason: 'Encaissements période' },
  finances: { filtered: true, reason: 'Résultat période' },
  production_oeufs_logs: { filtered: true, reason: 'Performance période' },
  taches: { filtered: 'mixed', reason: 'Période sauf ouvertes critiques' },
  documents: { filtered: 'mixed', reason: 'Période avec accès global' },
  stock: { filtered: false, reason: 'État présent' },
  clients: { filtered: false, reason: 'Référentiel global' },
  fournisseurs: { filtered: false, reason: 'Référentiel global' },
  creances_clients: { filtered: 'mixed', reason: 'Total global + mouvement période' },
  dettes_fournisseurs: { filtered: 'mixed', reason: 'Total global + mouvement période' },
  animaux: { filtered: false, reason: 'Historique global' },
  avicole: { filtered: false, reason: 'Cycle global' },
  alertes_center: { filtered: false, reason: 'Alertes ouvertes restent visibles' },
  business_plans: { filtered: false, reason: 'Données stratégiques' },
  investissements: { filtered: 'mixed', reason: 'Liste globale + dépenses période' },
};

export function shouldFilterByPeriod(datasetKey = '') {
  const rule = MODULE_PERIOD_RULES[datasetKey];
  if (!rule) return true;
  return rule.filtered === true;
}

export function isGlobalDataset(datasetKey = '') {
  const rule = MODULE_PERIOD_RULES[datasetKey];
  return rule?.filtered === false;
}

export function periodRuleLabel(datasetKey = '') {
  return MODULE_PERIOD_RULES[datasetKey]?.reason || 'Filtré par période par défaut';
}
