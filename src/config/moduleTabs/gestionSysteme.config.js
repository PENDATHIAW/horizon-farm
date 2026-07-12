import labels from '../../i18n/fr/moduleTabs.js';
import { defineModuleTabs, SYSTEM_ROLES } from './shared.js';

export default defineModuleTabs('gestion_systeme', labels.gestion_systeme, [
  { id: 'fermes', component: 'Fermes' },
  { id: 'utilisateurs-acces', component: 'Utilisateurs' },
  { id: 'roles-permissions', component: 'Rôles' },
  { id: 'modules-activation', component: 'Modules' },
  { id: 'parametres', component: 'Paramètres' },
  { id: 'referentiels', component: 'Référentiels' },
  { id: 'catalogues', component: 'Catalogues' },
  { id: 'synchronisation', component: 'Synchronisation', aliases: ['Sauvegardes'] },
  { id: 'audit-securite', component: 'Sécurité', aliases: ['Audit'] },
]).map((tab) => Object.freeze({ ...tab, requiredRoles: SYSTEM_ROLES }));
