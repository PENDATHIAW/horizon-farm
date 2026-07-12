import labels from '../../i18n/fr/moduleTabs.js';
import { defineModuleTabs } from './shared.js';

export default defineModuleTabs('agri_feeds', labels.agri_feeds, [
  { id: 'vue-ensemble', component: 'Tableau de bord', aliases: ['Reference Phase 1'] },
  { id: 'matieres-fournisseurs', component: 'Matières & fournisseurs' },
  { id: 'formulations', component: 'Formulations' },
  { id: 'production', component: 'Production' },
  { id: 'essais-performance', component: 'Tests & comparaison' },
  { id: 'qualite', component: 'Qualité & reporting' },
  { id: 'commercial', component: 'Commercial' },
  { id: 'couts-decisions', component: 'Coûts & décisions' },
], 'agri_feeds');
