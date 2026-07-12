import labels from '../../i18n/fr/moduleTabs.js';
import { defineModuleTabs, MANAGEMENT_ROLES } from './shared.js';

export default defineModuleTabs('finance_pilotage', labels.finance_pilotage, [
  { id: 'vue-ensemble', component: 'Résumé' },
  { id: 'transactions', component: 'Transactions' },
  { id: 'tresorerie', component: 'Trésorerie' },
  { id: 'budget-ecarts', component: 'Pilotage' },
  { id: 'couts-marges', component: 'Coûts par filière' },
  { id: 'investissements-dettes', component: 'Créances & dettes' },
]).map((tab) => Object.freeze({ ...tab, requiredRoles: MANAGEMENT_ROLES }));
