import labels from '../../i18n/fr/moduleTabs.js';
import { defineModuleTabs, MANAGEMENT_ROLES } from './shared.js';

export default defineModuleTabs('finance_pilotage', labels.finance_pilotage, [
  { id: 'vue-ensemble', component: 'Vue finance', aliases: ['Résumé', 'Cockpit', 'Graphiques'] },
  { id: 'transactions', component: 'Transactions finance', aliases: ['Transactions', 'Dépenses', 'Dépense', 'Réconciliation'] },
  { id: 'tresorerie', component: 'Trésorerie finance', aliases: ['Trésorerie', 'Finances', 'Saisie & flux'] },
  { id: 'budget-ecarts', component: 'Budget & écarts finance', aliases: ['Pilotage', 'Échéancier', 'Budget', 'Écarts budget', 'Annexe'] },
  { id: 'couts-marges', component: 'Coûts & marges finance', aliases: ['Coûts par filière', 'Rentabilité'] },
  { id: 'investissements-dettes', component: 'Investissements & dettes finance', aliases: ['Investissements', 'Financement', 'Créances & dettes', 'Dettes'] },
]).map((tab) => Object.freeze({ ...tab, requiredRoles: MANAGEMENT_ROLES }));
