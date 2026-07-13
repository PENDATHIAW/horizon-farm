import labels from '../../i18n/fr/moduleTabs.js';
import { defineModuleTabs } from './shared.js';

export default defineModuleTabs('cultures', labels.cultures, [
  { id: 'parcelles', component: 'Parcelles cultures', aliases: ['Parcelles & campagnes', 'Parcelles & Cultures', 'Pilotage', 'Vue d’ensemble', 'Vue d\'ensemble', 'Résumé', 'Cultures'] },
  { id: 'campagnes', component: 'Campagnes cultures', aliases: ['Cycles', 'Campagnes'] },
  { id: 'irrigation', component: 'Irrigation cultures', aliases: ['Irrigation'] },
  { id: 'intrants-fertilisation', component: 'Intrants & fertilisation cultures', aliases: ['Intrants', 'Intrants & Météo', 'Santé & Protection'] },
  { id: 'recoltes', component: 'Récoltes cultures', aliases: ['Récoltes', 'Récoltes & stock', 'Transformation'] },
  { id: 'couts-marge', component: 'Coûts & marge cultures', aliases: ['Économie circulaire', 'Marge parcelle', 'Performance', 'Économie'] },
  { id: 'historique', component: 'Historique cultures', aliases: ['Traçabilité', 'Annexe', 'Graphiques'] },
]);
