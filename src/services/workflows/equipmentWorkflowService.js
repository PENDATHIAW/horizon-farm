/** Équipement ↔ investissement ↔ maintenance ↔ Smart Farm. */
export function buildEquipmentMaintenanceTask(equipment = {}, overrides = {}) {
  return {
    title: `Maintenance : ${equipment.nom || equipment.name || equipment.id}`,
    description: equipment.notes || equipment.panne_description || 'Intervention équipement requise',
    module_lie: 'equipements',
    source_record_id: equipment.id,
    priority: 'haute',
    task_type: 'real',
    origin_type: 'workflow',
    ...overrides,
  };
}

export function linkEquipmentToInvestment(equipment = {}, investmentId = '') {
  return {
    ...equipment,
    investment_id: investmentId || equipment.investment_id,
    source_module: 'investissements',
    source_record_id: investmentId,
  };
}
