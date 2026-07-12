import labels from '../../i18n/fr/moduleTabs.js';
import { defineModuleTabs, SYSTEM_ROLES } from './shared.js';

export default defineModuleTabs('equipe', labels.equipe, [
  { id: 'vue-ensemble', component: 'Équipe' },
  { id: 'membres', component: 'Équipe', aliases: ['Rôles opérationnels'] },
  { id: 'affectations', component: 'Responsabilités' },
  { id: 'absences', component: 'Planning', aliases: ['Temps de travail', 'Incidents'] },
]).map((tab) => Object.freeze({ ...tab, requiredRoles: SYSTEM_ROLES }));
