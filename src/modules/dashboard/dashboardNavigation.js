import { navigationOptionsForFinding, resolveRouteModule } from '../../utils/commercialNavigation';

const ACTION_TABS = {
  money: { module: 'commercial', tab: 'Ventes' },
  alert: { module: 'activite_suivi', tab: 'À traiter maintenant' },
  stock: { module: 'achats_stock', tab: 'Inventaire' },
  health: { module: 'elevage', tab: 'Santé' },
  smart: { module: 'smartfarm' },
  task: { module: 'activite_suivi', tab: 'À traiter maintenant' },
  document: { module: 'documents_rapports', tab: 'Rapprochement & preuves' },
  sync: { module: 'sync_activity' },
};

export function navigateForDashboardAction(action = {}, onNavigate) {
  if (!onNavigate) return;
  const mapped = ACTION_TABS[action.iconKey];
  if (mapped) {
    if (mapped.tab) onNavigate(mapped.module, { tab: mapped.tab });
    else onNavigate(mapped.module);
    return;
  }
  const module = resolveRouteModule(action.moduleKey || 'activite_suivi');
  onNavigate(module);
}

export function navigateForDashboardFinding(finding = {}, onNavigate) {
  if (!onNavigate) return;
  const { module, tab } = navigationOptionsForFinding(finding);
  if (tab) onNavigate(module, { tab });
  else onNavigate(module);
}
