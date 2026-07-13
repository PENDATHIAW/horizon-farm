import labels from '../../i18n/fr/moduleTabs.js';
import { defineModuleTabs } from './shared.js';

export default defineModuleTabs('equipements', labels.equipements, [
  { id: 'parc', component: 'EquipmentFleetView', aliases: ['Parc', 'Equipements', 'Équipements'] },
  { id: 'acquisitions', component: 'EquipmentAcquisitionsView', aliases: ['Acquisitions', 'Achat équipement'] },
  { id: 'pannes', component: 'EquipmentBreakdownsView', aliases: ['Pannes', 'Déclarer panne'] },
  { id: 'reparations', component: 'EquipmentRepairsView', aliases: ['Réparations', 'Maintenance'] },
  { id: 'couts-disponibilite', component: 'EquipmentCostsAvailabilityView', aliases: ['Coûts & disponibilité', 'Coûts', 'Disponibilité'] },
]);
