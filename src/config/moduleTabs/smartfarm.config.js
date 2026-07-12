import labels from '../../i18n/fr/moduleTabs.js';
import { defineModuleTabs } from './shared.js';

export default defineModuleTabs('smartfarm', labels.smartfarm, [
  { id: 'vue-ensemble', component: 'SmartFarmOverviewView', aliases: ['Vue d’ensemble', 'Résumé'] },
  { id: 'releves-eau', component: 'SmartFarmWaterView', aliases: ['Relevés d’eau', 'Eau'] },
  { id: 'energie', component: 'SmartFarmEnergyView', aliases: ['Énergie'] },
  { id: 'batiments', component: 'SmartFarmBuildingsView', aliases: ['Bâtiments'] },
  { id: 'dispositifs', component: 'SmartFarmDevicesView', aliases: ['Objets connectés', 'Capteurs'] },
  { id: 'releves-qualite', component: 'SmartFarmReadingsView', aliases: ['Flux temps réel', 'Relevés & qualité'] },
  { id: 'configuration', component: 'SmartFarmConfigurationView', aliases: ['Configuration', 'Automatisation terrain', 'Automatisation'] },
], 'smartfarm');
