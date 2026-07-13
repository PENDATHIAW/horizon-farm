import labels from '../../i18n/fr/moduleTabs.js';
import { defineModuleTabs } from './shared.js';

export default defineModuleTabs('achats_stock', labels.achats_stock, [
  { id: 'tableau-bord', component: 'Tableau de bord stock', aliases: ['Résumé', 'Pilotage'] },
  { id: 'produits-categories', component: 'Produits & catégories stock', aliases: ['Produits', 'Catégories'] },
  { id: 'fournisseurs', component: 'Fournisseurs stock', aliases: ['Fournisseurs', 'Fournisseurs & dettes'] },
  { id: 'achats-receptions', component: 'Achats & réceptions stock', aliases: ['Achats', 'Réceptions & achats'] },
  { id: 'stocks-lots', component: 'Stocks & lots', aliases: ['Stock'] },
  { id: 'mouvements', component: 'Mouvements stock', aliases: ['Mouvements'] },
  { id: 'inventaires', component: 'Inventaires stock', aliases: ['Inventaire', 'Annexe', 'Graphiques'] },
]);
