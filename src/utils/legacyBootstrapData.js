const LEGACY_BOOTSTRAP_ROWS = Object.freeze({
  alimentation_logs: Object.freeze([
    { id: 'ALIM001', date: '2025-07-01', quantite: 900, notes: 'Aliment bovin mensuel' },
    { id: 'ALIM002', date: '2025-07-01', quantite: 380, notes: 'Ration ovins' },
    { id: 'ALIM003', date: '2025-07-02', quantite: 1200, notes: 'Aliment pondeuses' },
    { id: 'ALIM004', date: '2025-07-03', quantite: 900, notes: 'Aliment chair' },
  ]),
  production_oeufs_logs: Object.freeze([
    { id: 'PROD001', lot_id: 'LOTPO001', date: '2026-05-05', oeufs_produits: 398 },
    { id: 'PROD002', lot_id: 'LOTPO001', date: '2026-05-06', oeufs_produits: 412 },
    { id: 'PROD003', lot_id: 'LOTPO001', date: '2026-05-07', oeufs_produits: 405 },
    { id: 'PROD004', lot_id: 'LOTPO002', date: '2026-05-05', oeufs_produits: 318 },
    { id: 'PROD005', lot_id: 'LOTPO002', date: '2026-05-06', oeufs_produits: 326 },
    { id: 'PROD006', lot_id: 'LOTPO002', date: '2026-05-07', oeufs_produits: 322 },
  ]),
  sensor_devices: Object.freeze([
    { id: 'SENS001', name: 'Capteur meteo simulation', status: 'simulation' },
    { id: 'SENS002', name: 'Humidite poulailler A', status: 'simulation' },
    { id: 'SENS003', name: 'Niveau reservoir', status: 'simulation' },
  ]),
  camera_devices: Object.freeze([
    { id: 'CAM001', name: 'Camera entree principale', type: 'simulation', status: 'simulation' },
    { id: 'CAM002', name: 'Camera poulailler', type: 'simulation', status: 'simulation' },
  ]),
});

function sameValue(actual, expected) {
  if (typeof expected === 'number') return Number(actual) === expected;
  return String(actual ?? '') === expected;
}

export function isLegacyBootstrapRow(table, row = {}) {
  const signatures = LEGACY_BOOTSTRAP_ROWS[String(table || '')] || [];
  return signatures.some((signature) => Object.entries(signature)
    .every(([key, expected]) => sameValue(row?.[key], expected)));
}

export function filterLegacyBootstrapRows(table, rows = []) {
  if (!Array.isArray(rows)) return [];
  return rows.filter((row) => !isLegacyBootstrapRow(table, row));
}

export { LEGACY_BOOTSTRAP_ROWS };
