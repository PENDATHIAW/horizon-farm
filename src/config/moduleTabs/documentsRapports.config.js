import labels from '../../i18n/fr/moduleTabs.js';
import { defineModuleTabs } from './shared.js';

export default defineModuleTabs('documents_rapports', labels.documents_rapports, [
  { id: 'bibliotheque', component: 'DocumentsLibraryView', aliases: ['Gestionnaire & OCR', 'Documents'] },
  { id: 'preuves-justificatifs', component: 'DocumentsEvidenceView', aliases: ['Rapprochement & preuves', 'Preuves', 'Justificatifs'] },
  { id: 'rapports', component: 'ReportsLifecycleView', aliases: ['Rapports & exports', 'Modèles', 'Modeles', 'Exports'] },
  { id: 'publications', component: 'ReportsPublicationsView', aliases: ['Diffusions'] },
  { id: 'archives', component: 'ReportsArchivesView', aliases: ['Centre de contrôle', 'Historique'] },
]);
