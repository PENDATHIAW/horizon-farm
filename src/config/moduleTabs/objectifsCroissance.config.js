import labels from '../../i18n/fr/moduleTabs.js';
import { defineModuleTabs, MANAGEMENT_ROLES } from './shared.js';

export default defineModuleTabs('objectifs_croissance', labels.objectifs_croissance, [
  { id: 'objectifs', component: 'Suivi du Business Plan', aliases: ['Previsionnel vs reel'] },
  { id: 'scenarios', component: 'Simulations', aliases: ['Capacite', 'Rentabilite', 'Capacite de remboursement'] },
  { id: 'historique', component: 'Historique' },
]).map((tab) => Object.freeze({ ...tab, requiredRoles: MANAGEMENT_ROLES }));
