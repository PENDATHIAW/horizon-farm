import labels from '../../i18n/fr/moduleTabs.js';
import { defineModuleTabs } from './shared.js';

export default defineModuleTabs('smartfarm', labels.smartfarm, [
  { id: 'vue-ensemble', component: 'Vue d’ensemble' },
  { id: 'releves-eau', component: 'Relevés d’eau', aliases: ['Eau'] },
  { id: 'energie', component: 'Énergie' },
  { id: 'batiments', component: 'Bâtiments' },
  { id: 'dispositifs', component: 'Objets connectés', aliases: ['Capteurs'] },
  { id: 'releves-qualite', component: 'Flux temps réel' },
  { id: 'configuration', component: 'Configuration', aliases: ['Automatisation terrain', 'Automatisation'] },
], 'smartfarm');
