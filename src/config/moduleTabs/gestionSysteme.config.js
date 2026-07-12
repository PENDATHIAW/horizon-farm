import labels from '../../i18n/fr/moduleTabs.js';
import { defineModuleTabs, SYSTEM_ROLES } from './shared.js';

export default defineModuleTabs('gestion_systeme', labels.gestion_systeme, [
  { id: 'fermes', component: 'SystemFarmsView', aliases: ['Fermes', 'Vue admin'] },
  { id: 'utilisateurs-acces', component: 'SystemUsersAccessView', aliases: ['Utilisateurs'] },
  { id: 'roles-permissions', component: 'SystemRolesPermissionsView', aliases: ['Rôles'] },
  { id: 'modules-activation', component: 'SystemModulesActivationView', aliases: ['Modules'] },
  { id: 'parametres', component: 'SystemSettingsView', aliases: ['Paramètres', 'Réinitialisation'] },
  { id: 'referentiels', component: 'SystemReferencesView', aliases: ['Référentiels'] },
  { id: 'catalogues', component: 'SystemCatalogsView', aliases: ['Catalogues'] },
  { id: 'synchronisation', component: 'SystemSyncView', aliases: ['Synchronisation', 'Sauvegardes'] },
  { id: 'audit-securite', component: 'SystemAuditSecurityView', aliases: ['Sécurité', 'Audit'] },
]).map((tab) => Object.freeze({ ...tab, requiredRoles: SYSTEM_ROLES }));
