import labels from '../../i18n/fr/moduleTabs.js';
import { defineModuleTabs } from './shared.js';

export default defineModuleTabs('commercial', labels.commercial, [
  { id: 'tableau-bord', component: 'Tableau de bord commercial', aliases: ['Pilotage', 'Résumé', 'Graphiques'] },
  { id: 'clients', component: 'Clients commercial', aliases: ['Clients', 'Prospects', 'Abonnements'] },
  { id: 'ventes-commandes', component: 'Ventes & commandes commercial', aliases: ['Ventes', 'Opportunités', 'Devis'] },
  { id: 'livraisons', component: 'Livraisons commercial', aliases: ['Livraisons', 'Livraison'] },
  { id: 'factures-paiements', component: 'Factures & paiements commercial', aliases: ['Factures', 'Paiements', 'Réconciliation'] },
  { id: 'creances-relances', component: 'Créances & relances commercial', aliases: ['Clients & créances', 'Créances', 'Relances'] },
  { id: 'reclamations', component: 'Réclamations commercial', aliases: ['Réclamations'] },
]);
