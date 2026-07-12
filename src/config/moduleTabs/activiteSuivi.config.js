import labels from '../../i18n/fr/moduleTabs.js';
import { defineModuleTabs } from './shared.js';

export default defineModuleTabs('activite_suivi', labels.activite_suivi, [
  { id: 'a-faire', component: 'ActiviteTodoView', aliases: ['À traiter maintenant', 'Tâches du jour', 'Tâches'] },
  { id: 'calendrier', component: 'ActiviteCalendarView', aliases: ['Agenda'] },
  { id: 'alertes-liees', component: 'ActiviteAlertsView', aliases: ['Cockpit & décisions', 'Alertes'] },
  { id: 'journal-exploitation', component: 'ActiviteJournalView', aliases: ['Registre & traçabilité', 'Traçabilité'] },
  { id: 'historique', component: 'ActiviteHistoryView', aliases: ['Performance & analytique', 'Graphiques', 'Annexe'] },
]);
