import labels from '../../i18n/fr/moduleTabs.js';
import { defineModuleTabs, MANAGEMENT_ROLES } from './shared.js';

export default defineModuleTabs('centre_decisionnel', labels.centre_decisionnel, [
  { id: 'a-traiter', component: 'Urgences & risques', aliases: ['Urgences et risques'] },
  { id: 'ecarts', component: 'Écarts & cohérence', aliases: ['Écarts et cohérence'] },
  { id: 'risques', component: 'Risques' },
  { id: 'decisions', component: 'Actions prioritaires' },
  { id: 'historique', component: 'Historique', aliases: ['Croissance & opportunites'] },
], null).map((tab) => Object.freeze({ ...tab, requiredRoles: MANAGEMENT_ROLES }));
