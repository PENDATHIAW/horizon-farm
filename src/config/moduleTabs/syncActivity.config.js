import labels from '../../i18n/fr/moduleTabs.js';
import { defineModuleTabs } from './shared.js';

export default defineModuleTabs('sync_activity', labels.sync_activity, [
  { id: 'verifications', component: 'SyncVerificationView', aliases: ['Résumé', 'Audit', 'audit'] },
  { id: 'connexion-envoi', component: 'SyncConnectionView', aliases: ['Connexion', 'Synchronisation', 'sync'] },
  { id: 'journal-activite', component: 'SyncJournalView', aliases: ['Journal', 'Historique', 'journal'] },
]);
