import labels from '../../i18n/fr/moduleTabs.js';
import { defineModuleTabs } from './shared.js';

export default defineModuleTabs('agri_feeds', labels.agri_feeds, [
  { id: 'vue-ensemble', component: 'AgriFeedsOverviewView', aliases: ['Tableau de bord', 'Référence Phase 1', 'Reference Phase 1'] },
  { id: 'matieres-fournisseurs', component: 'AgriFeedsMaterialsView', aliases: ['Matières & fournisseurs'] },
  { id: 'formulations', component: 'AgriFeedsFormulationsView', aliases: ['Formulations'] },
  { id: 'production', component: 'AgriFeedsProductionView', aliases: ['Production'] },
  { id: 'essais-performance', component: 'AgriFeedsTrialsView', aliases: ['Tests & comparaison'] },
  { id: 'qualite', component: 'AgriFeedsQualityView', aliases: ['Qualité & reporting'] },
  { id: 'commercial', component: 'AgriFeedsCommercialView', aliases: ['Commercial'] },
  { id: 'couts-decisions', component: 'AgriFeedsCostsView', aliases: ['Coûts & décisions'] },
], 'agri_feeds');
