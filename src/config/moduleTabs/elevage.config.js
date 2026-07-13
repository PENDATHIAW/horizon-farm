import labels from '../../i18n/fr/moduleTabs.js';
import { defineModuleTabs, INTERNAL_ROLES } from './shared.js';

const TRANSFORMATION_ROLES = [
  'promotrice_direction',
  'responsable_filiere',
  'terrain',
  'veterinaire',
  'finance',
  'admin_support',
];

export default defineModuleTabs('elevage', labels.elevage, [
  { id: 'vue-ensemble', component: 'Vue élevage', aliases: ['Résumé'] },
  { id: 'lots-animaux', component: 'Lots & animaux', aliases: ['Lots & bandes', 'Lots et bandes', 'Animaux'] },
  { id: 'alimentation', component: 'Alimentation élevage', aliases: ['Alimentation'] },
  { id: 'production', component: 'Production élevage', aliases: ['Avicole', 'Pondeuses', 'Production', 'Cycles & Reproduction', 'Cycles', 'Reproduction'] },
  { id: 'sante-biosecurite', component: 'Santé & Biosécurité', aliases: ['Santé', 'Santé & biosécurité'] },
  { id: 'transformation', component: 'Transformation', aliases: ['transformation'], requiredRoles: TRANSFORMATION_ROLES },
  { id: 'couts-performance', component: 'Coûts & performance élevage', aliases: ['Performances'] },
  { id: 'historique', component: 'Historique élevage', aliases: ['Traçabilité', 'Annexe', 'Graphiques'] },
].map((tab) => ({ ...tab, requiredRoles: tab.requiredRoles || INTERNAL_ROLES })));
