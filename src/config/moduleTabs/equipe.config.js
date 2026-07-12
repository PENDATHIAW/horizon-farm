import labels from '../../i18n/fr/moduleTabs.js';
import { defineModuleTabs, SYSTEM_ROLES } from './shared.js';

export default defineModuleTabs('equipe', labels.equipe, [
  { id: 'vue-ensemble', component: 'TeamOverviewView', aliases: ['Résumé', 'Cockpit RH & Maintenance'] },
  { id: 'membres', component: 'TeamMembersView', aliases: ['Équipe', 'Personnel & Paie', 'Rôles opérationnels'] },
  { id: 'affectations', component: 'TeamAssignmentsView', aliases: ['Responsabilités', 'Affectations'] },
  { id: 'absences', component: 'TeamAbsencesView', aliases: ['Planning', 'Temps de travail', 'Incidents'] },
]).map((tab) => Object.freeze({ ...tab, requiredRoles: SYSTEM_ROLES }));
