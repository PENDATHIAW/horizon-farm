import labels from '../../i18n/fr/moduleTabs.js';
import { defineModuleTabs } from './shared.js';

export default defineModuleTabs('equipements', labels.equipements, [
  { id: 'parc', component: 'Parc', aliases: ['Equipements'] },
  { id: 'acquisitions', component: 'Acquisitions' },
  { id: 'pannes', component: 'Pannes' },
  { id: 'reparations', component: 'Réparations', aliases: ['Maintenance'] },
  { id: 'couts-disponibilite', component: 'Coûts & disponibilité', aliases: ['Coûts', 'Disponibilité'] },
]);
