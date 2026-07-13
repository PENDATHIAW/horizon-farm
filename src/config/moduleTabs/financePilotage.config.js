import labels from '../../i18n/fr/moduleTabs.js';
import { defineModuleTabs, MANAGEMENT_ROLES } from './shared.js';

export default defineModuleTabs('finance_pilotage', labels.finance_pilotage, [
  { id: 'vue-ensemble', component: 'Vue finance', aliases: ['Résumé', 'Cockpit', 'Graphiques'] },
  { id: 'transactions', component: 'Transactions finance', aliases: ['Transactions', 'Dépenses', 'Dépense'] },
  { id: 'tresorerie', component: 'Trésorerie finance', aliases: ['Trésorerie', 'Finances', 'Saisie & flux', 'Réconciliation'] },
  { id: 'budget-ecarts', component: 'Budget & écarts finance', aliases: ['Pilotage', 'Échéancier', 'Financement', 'Créances', 'Créances & dettes', 'Budget', 'Écarts budget', 'Annexe'] },
  { id: 'couts-marges', component: 'Coûts & marges finance', aliases: ['Coûts par filière', 'Rentabilité'] },
  { id: 'investissements-dettes', component: 'Investissements & dettes finance', aliases: ['Investissements', 'Dettes'] },
]).map((tab) => Object.freeze({ ...tab, requiredRoles: MANAGEMENT_ROLES }));
