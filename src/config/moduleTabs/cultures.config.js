import labels from '../../i18n/fr/moduleTabs.js';
import { defineModuleTabs } from './shared.js';

export default defineModuleTabs('cultures', labels.cultures, [
  { id: 'parcelles', component: 'Parcelles & campagnes' },
  { id: 'campagnes', component: 'Parcelles & campagnes' },
  { id: 'irrigation', component: 'Irrigation' },
  { id: 'intrants-fertilisation', component: 'Économie circulaire' },
  { id: 'recoltes', component: 'Récoltes' },
  { id: 'couts-marge', component: 'Marge parcelle' },
  { id: 'historique', component: 'Historique', aliases: ['Tracabilite'] },
]);
