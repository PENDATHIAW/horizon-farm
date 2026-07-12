import labels from '../../i18n/fr/moduleTabs.js';
import { defineModuleTabs, MANAGEMENT_ROLES } from './shared.js';

export const financementCockpitTabs = defineModuleTabs('financements', labels.financements.cockpit, [
  { id: 'tableau-bord', component: 'overview' },
  { id: 'opportunites', component: 'opportunities' },
  { id: 'contacts-echanges', component: 'contacts' },
  { id: 'candidatures', component: 'applications' },
  { id: 'pieces-dossier', component: 'documents', aliases: ['Dossiers & pieces'] },
  { id: 'fonds-utilisation', component: 'funds' },
  { id: 'publications', component: 'publications' },
  { id: 'acces-externes', component: 'access' },
], 'financements').map((tab) => Object.freeze({ ...tab, requiredRoles: MANAGEMENT_ROLES }));

export const financementExternalTabs = defineModuleTabs('financements_externe', labels.financements.externe, [
  { id: 'vue-ensemble', component: 'funder-overview' },
  { id: 'rapports', component: 'funder-reports' },
  { id: 'journal-projet', component: 'funder-journal' },
  { id: 'documents-partages', component: 'funder-documents' },
  { id: 'contact', component: 'funder-contact' },
], 'financements').map((tab) => Object.freeze({ ...tab, requiredRoles: ['financeur_externe'] }));

export default financementCockpitTabs;
