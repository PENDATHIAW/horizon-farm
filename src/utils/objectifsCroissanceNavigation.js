export const OBJECTIFS_NAV_TARGETS = {
  performance: { module: 'objectifs_croissance', tab: 'Suivi du Business Plan' },
  previsions: { module: 'objectifs_croissance', tab: 'Efficacité Technique & Zootechnique' },
  plans: { module: 'objectifs_croissance', tab: 'Sécurisation des Flux' },
  financeurs: { module: 'financements', tab: 'cockpit-dashboard' },
  financeur_dossier: { module: 'documents_rapports', tab: 'Rapports & exports' },
  financeur_preuves: { module: 'documents_rapports', tab: 'Rapprochement & preuves' },
  financeur_chiffres: { module: 'finance_pilotage', tab: 'Pilotage' },
  commercial: { module: 'commercial', tab: 'Pilotage' },
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
