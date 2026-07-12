import labels from '../../i18n/fr/moduleTabs.js';
import { defineModuleTabs, INTERNAL_ROLES } from './shared.js';

export default defineModuleTabs('dashboard', labels.dashboard, [
  { id: 'vue-du-jour', component: 'Carnet Horizon', aliases: ['Priorites du jour'] },
  { id: 'pilotage', component: 'Indicateurs ferme', requiredRoles: INTERNAL_ROLES.filter((role) => role !== 'terrain'), aliases: ['Vue financeur rapide'] },
  { id: 'mes-actions', component: 'Mes actions' },
]);
