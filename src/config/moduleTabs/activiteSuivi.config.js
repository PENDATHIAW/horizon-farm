import labels from '../../i18n/fr/moduleTabs.js';
import { defineModuleTabs } from './shared.js';

export default defineModuleTabs('activite_suivi', labels.activite_suivi, [
  { id: 'a-faire', component: 'À traiter maintenant', aliases: ['Tâches du jour'] },
  { id: 'calendrier', component: 'Calendrier' },
  { id: 'alertes-liees', component: 'Cockpit & décisions', aliases: ['Alertes'] },
  { id: 'journal-exploitation', component: 'Registre & traçabilité' },
  { id: 'historique', component: 'Performance & analytique' },
]);
