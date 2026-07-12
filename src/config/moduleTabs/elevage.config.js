import labels from '../../i18n/fr/moduleTabs.js';
import { defineModuleTabs, INTERNAL_ROLES } from './shared.js';

export default defineModuleTabs('elevage', labels.elevage, [
  { id: 'vue-ensemble', component: 'Lots & bandes' },
  { id: 'lots-animaux', component: 'Animaux', aliases: ['Lots & bandes', 'Lots et bandes'] },
  { id: 'alimentation', component: 'Alimentation' },
  { id: 'production', component: 'Avicole', aliases: ['Pondeuses'] },
  { id: 'sante-biosecurite', component: 'Santé', aliases: ['Santé & biosécurité'] },
  { id: 'couts-performance', component: 'Performances' },
  { id: 'historique', component: 'Historique', aliases: ['Tracabilite'] },
].map((tab) => ({ ...tab, requiredRoles: INTERNAL_ROLES })));
