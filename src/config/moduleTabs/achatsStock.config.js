import labels from '../../i18n/fr/moduleTabs.js';
import { defineModuleTabs } from './shared.js';

export default defineModuleTabs('achats_stock', labels.achats_stock, [
  { id: 'tableau-bord', component: 'Inventaire' },
  { id: 'produits-categories', component: 'Inventaire' },
  { id: 'fournisseurs', component: 'Fournisseurs & dettes' },
  { id: 'achats-receptions', component: 'Réceptions & achats' },
  { id: 'stocks-lots', component: 'Inventaire' },
  { id: 'mouvements', component: 'Mouvements stock' },
  { id: 'inventaires', component: 'Inventaire' },
]);
