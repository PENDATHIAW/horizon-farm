import labels from '../../i18n/fr/moduleTabs.js';
import { defineModuleTabs } from './shared.js';

export default defineModuleTabs('commercial', labels.commercial, [
  { id: 'tableau-bord', component: 'Pilotage' },
  { id: 'clients', component: 'Clients & créances' },
  { id: 'ventes-commandes', component: 'Ventes', aliases: ['Opportunites', 'Prospects'] },
  { id: 'livraisons', component: 'Livraisons' },
  { id: 'factures-paiements', component: 'Factures' },
  { id: 'creances-relances', component: 'Clients & créances' },
  { id: 'reclamations', component: 'Réclamations' },
]);
