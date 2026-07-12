import labels from '../../i18n/fr/moduleTabs.js';
import { defineModuleTabs } from './shared.js';

export default defineModuleTabs('documents_rapports', labels.documents_rapports, [
  { id: 'bibliotheque', component: 'Gestionnaire & OCR', aliases: ['Documents'] },
  { id: 'preuves-justificatifs', component: 'Rapprochement & preuves', aliases: ['Justificatifs'] },
  { id: 'rapports', component: 'Rapports & exports', aliases: ['Modeles'] },
  { id: 'publications', component: 'Publications' },
  { id: 'archives', component: 'Centre de contrôle' },
]);
