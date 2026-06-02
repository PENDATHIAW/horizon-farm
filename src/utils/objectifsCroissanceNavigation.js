export const OBJECTIFS_NAV_TARGETS = {
  performance: { module: 'objectifs_croissance', tab: 'Performance' },
  previsions: { module: 'objectifs_croissance', tab: 'Prévisions' },
  plans: { module: 'objectifs_croissance', tab: 'Plans' },
  financeurs: { module: 'objectifs_croissance', tab: 'Financeurs' },
  financeur_dossier: { module: 'documents_rapports', tab: 'Exports' },
  financeur_preuves: { module: 'documents_rapports', tab: 'Preuves' },
  financeur_chiffres: { module: 'finance_pilotage', tab: 'Rentabilité' },
  commercial: { module: 'commercial', tab: 'Résumé' },
};

export function buildObjectifsIssueKey(scope = 'objectif', id = '') {
  return `objectifs:${scope}:${String(id || 'unknown')}`;
}

export function resolveObjectifsNavigation(kind = 'financeurs') {
  return OBJECTIFS_NAV_TARGETS[kind] || OBJECTIFS_NAV_TARGETS.financeurs;
}

export function navigateObjectifsTarget(onNavigate, kind = 'financeurs') {
  if (!onNavigate) return null;
  const target = resolveObjectifsNavigation(kind);
  onNavigate(target.module, { tab: target.tab });
  return target;
}
