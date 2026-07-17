import labels from '../../i18n/fr/moduleTabs.js';
import { defineModuleTabs, MANAGEMENT_ROLES } from './shared.js';

export default defineModuleTabs('finance_pilotage', labels.finance_pilotage, [
  { id: 'vue-ensemble', component: 'Vue finance', aliases: ['Résumé', 'Cockpit', 'Graphiques'] },
  { id: 'tresorerie', component: 'Trésorerie finance', aliases: ['Saisie & trésorerie', 'Trésorerie', 'Finances', 'Saisie & flux', 'Réconciliation', 'Transactions', 'Dépenses', 'Dépense'] },
  { id: 'couts-marges', component: 'Coûts & marges finance', aliases: ['Coûts & marges', 'Coûts par filière', 'Rentabilité'] },
  { id: 'budget-ecarts', component: 'Budget & écarts finance', aliases: ['Budget & financements', 'Pilotage', 'Échéancier', 'Financement', 'Créances', 'Créances & dettes', 'Budget', 'Écarts budget', 'Annexe'] },
  { id: 'investissements-dettes', component: 'Investissements & dettes finance', aliases: ['Investissements', 'Dettes'] },
]).map((tab) => Object.freeze({ ...tab, requiredRoles: MANAGEMENT_ROLES }));
