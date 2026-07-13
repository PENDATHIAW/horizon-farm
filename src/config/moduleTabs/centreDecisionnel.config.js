import labels from '../../i18n/fr/moduleTabs.js';
import { defineModuleTabs, MANAGEMENT_ROLES } from './shared.js';

export default defineModuleTabs('centre_decisionnel', labels.centre_decisionnel, [
  { id: 'a-traiter', component: 'Urgences & risques', aliases: ['Urgences et risques', 'Priorités', 'Priorités & risques', 'Flux & stocks', 'Résumé'] },
  { id: 'ecarts', component: 'Écarts & cohérence', aliases: ['Écarts et cohérence', 'Efficacité'] },
  { id: 'risques', component: 'Risques', aliases: ['Saisons & marchés', 'Cycles', 'Annexe'] },
  { id: 'decisions', component: 'Décisions', aliases: ['Actions prioritaires', 'Croissance & opportunités', 'Opportunités', 'Opportunités & cycles', 'Recommandations', 'Graphiques', 'Efficacité Technique', 'Performance', 'Rentabilité lots'] },
  { id: 'historique', component: 'Historique', aliases: ['Croissance & opportunites'] },
], null).map((tab) => Object.freeze({ ...tab, requiredRoles: MANAGEMENT_ROLES }));
