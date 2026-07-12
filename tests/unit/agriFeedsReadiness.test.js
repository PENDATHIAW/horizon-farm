import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeAgriFeedsReadiness,
  normalizeAgriFeedsDataMap,
} from '../../src/services/agriFeeds/agriFeedsReadinessEngine.js';

function makeAlimLogs(n) {
  return Array.from({ length: n }, (_, i) => ({
    id: `AL${i}`,
    quantite: 20,
    montant_total: 10000,
    cible_id: 'LOT1',
    type_cible: 'lot_avicole',
    date: `2026-01-${String((i % 27) + 1).padStart(2, '0')}`,
  }));
}

test('readiness — retourne toujours la structure riche (jamais binaire)', () => {
  const readiness = computeAgriFeedsReadiness(normalizeAgriFeedsDataMap({}));
  const requiredKeys = [
    'readiness_score',
    'recommendedMode',
    'blockers',
    'warnings',
    'data_used',
    'data_missing',
    'priority_actions',
    'human_validation_required',
    'ai_disclaimer',
    'per_mode',
    'scores',
    'sales_gates',
    'pilot_breakdown',
  ];
  requiredKeys.forEach((k) => {
    assert.ok(k in readiness, `champ manquant : ${k}`);
  });
  assert.equal(readiness.human_validation_required, true);
  assert.match(readiness.ai_disclaimer, /confirmer/i);
  assert.equal(readiness.recommendedMode, 'REFERENCE');
});

test('readiness — Phase 2A distincte de Phase 2B dans per_mode', () => {
  const readiness = computeAgriFeedsReadiness(normalizeAgriFeedsDataMap({}));
  assert.ok(readiness.per_mode.PILOT_INTERNAL);
  assert.ok(readiness.per_mode.PROGRESSIVE_SALES);
  assert.match(readiness.per_mode.PILOT_INTERNAL.label, /2A|pilote/i);
  assert.match(readiness.per_mode.PROGRESSIVE_SALES.label, /2B|vente/i);
  assert.ok(Array.isArray(readiness.pilot_breakdown));
  assert.ok(readiness.pilot_breakdown.length >= 10);
});

test('readiness — Phase 2A intègre les 12 critères annoncés', () => {
  const readiness = computeAgriFeedsReadiness(normalizeAgriFeedsDataMap({}));
  const labels = readiness.pilot_breakdown.map((b) => b.label.toLowerCase());
  const mustContain = [
    'phase 1',
    'sanitaire',
    'consommation',
    'coût alimentaire',
    'marges',
    'trésorerie',
    'créances',
    'eau',
    'site',
    'fournisseurs',
    'encadrement',
    'alertes',
  ];
  mustContain.forEach((token) => {
    assert.ok(
      labels.some((l) => l.includes(token)),
      `critère absent du breakdown Phase 2A : ${token}`,
    );
  });
});

test('readiness — score Phase 2A monte avec données riches', () => {
  const baseline = computeAgriFeedsReadiness(normalizeAgriFeedsDataMap({
    alimentation_logs: makeAlimLogs(5),
    avicole: [{ id: 'LOT1', type: 'Chair', initial_count: 100, mortality: 3, current_count: 97 }],
    feed_formulas: [{ id: 'F1', name: 'V1', status: 'draft' }],
  }));

  const enriched = computeAgriFeedsReadiness(normalizeAgriFeedsDataMap({
    alimentation_logs: makeAlimLogs(30),
    stock: [{ id: 'S1', produit: 'Aliment', categorie: 'aliment_avicole', quantite: 100, prixUnit: 500 }],
    avicole: [
      { id: 'LOT1', type: 'Chair', initial_count: 500, mortality: 15, current_count: 485, indice_consommation: 1.9 },
      { id: 'LOT2', type: 'Chair', initial_count: 500, mortality: 20, current_count: 480, indice_consommation: 2.0 },
    ],
    fournisseurs: [
      { id: 'F1', nom: 'NMA', supplier_type: 'matiere_premiere' },
      { id: 'F2', nom: 'Conseil tech', supplier_type: 'technique' },
    ],
    veterinaires: [{ id: 'V1', nom: 'Dr X' }],
    finances: [
      { id: 'T1', type: 'depense', categorie: 'aliment', montant: 500000, libelle: 'Aliment' },
      { id: 'T2', type: 'recette', montant: 800000, libelle: 'Vente' },
    ],
    payments: [{ id: 'P1', montant: 300000 }],
    invoices: [{ id: 'INV1', montant_total: 200000, montant_paye: 200000 }],
    sales_orders: [{ id: 'SO1', montant_total: 800000 }],
    equipements: [{ id: 'EQ1', type: 'forage', nom: 'Forage nord' }],
    feed_facility_zones: [
      { id: 'z1', zone_type: 'raw_material_storage', status: 'available' },
      { id: 'z2', zone_type: 'production_area', status: 'in_use' },
      { id: 'z3', zone_type: 'finished_goods_storage', status: 'available' },
      { id: 'z4', zone_type: 'quality_control', status: 'available' },
    ],
    feed_raw_materials: [
      { id: 'MP1', name: 'Maïs' }, { id: 'MP2', name: 'Tourteau' }, { id: 'MP3', name: 'Son' },
    ],
    feed_raw_batches: [
      { id: 'B1', raw_material_id: 'MP1', quality_status: 'accepted', quantity_available: 100 },
      { id: 'B2', raw_material_id: 'MP2', quality_status: 'accepted', quantity_available: 80 },
      { id: 'B3', raw_material_id: 'MP3', quality_status: 'accepted', quantity_available: 50 },
    ],
    feed_formulas: [{ id: 'F1', name: 'V1', status: 'internal_testing' }],
    alertes_center: [],
  }));

  assert.ok(enriched.scores.pilot_internal > baseline.scores.pilot_internal, 'Score 2A doit augmenter');
  assert.ok(enriched.scores.pilot_internal >= 45);
  assert.equal(enriched.recommendedMode, 'PILOT_INTERNAL');
});

test('readiness — Phase 2B bloquée si formule non testée', () => {
  const readiness = computeAgriFeedsReadiness(normalizeAgriFeedsDataMap({
    feed_formulas: [{ id: 'F1', status: 'draft' }],
  }));
  const gates = readiness.per_mode.PROGRESSIVE_SALES.gates;
  assert.equal(gates.formulaTested, false);
  assert.equal(gates.hasCommercializable, false);
  assert.ok(readiness.blockers.some((b) => /formule tes|commercialisable/i.test(b)));
  assert.notEqual(readiness.recommendedMode, 'PROGRESSIVE_SALES');
});

test('readiness — Phase 2B bloquée sans coût réel', () => {
  const readiness = computeAgriFeedsReadiness(normalizeAgriFeedsDataMap({
    feed_formulas: [{ id: 'F1', status: 'commercializable' }],
    feed_quality_checks: [{ id: 'QC1', related_type: 'finished_batch', related_id: 'B1', result: 'accepted' }],
    feed_finished_batches: [{ id: 'B1', quality_status: 'accepted', active: true }],
    feed_trials: [{ id: 'T1', decision: 'validate', reviewed_by_human: true, phase1_comparison: true }],
    feed_production_orders: [{ id: 'OF1', real_cost_per_kg: 0 }],
  }));
  const gates = readiness.per_mode.PROGRESSIVE_SALES.gates;
  assert.equal(gates.realCost, false);
  assert.ok(readiness.blockers.some((b) => /coût réel/i.test(b)));
});

test('readiness — Phase 2B bloquée sans comparaison Phase 1', () => {
  const readiness = computeAgriFeedsReadiness(normalizeAgriFeedsDataMap({
    feed_formulas: [{ id: 'F1', status: 'commercializable' }],
    feed_quality_checks: [{ id: 'QC1', related_type: 'finished_batch', related_id: 'B1', result: 'accepted' }],
    feed_finished_batches: [{ id: 'B1', quality_status: 'accepted', active: true, unit_cost: 320 }],
    feed_trials: [{ id: 'T1', decision: 'validate', reviewed_by_human: true }],
    feed_production_orders: [{ id: 'OF1', real_cost_per_kg: 320 }],
  }));
  const gates = readiness.per_mode.PROGRESSIVE_SALES.gates;
  assert.equal(gates.phase1Comparison, false);
  assert.ok(readiness.blockers.some((b) => /comparaison/i.test(b)));
});

test('readiness — Phase 2B bloquée sans QC ni validation humaine', () => {
  const readiness = computeAgriFeedsReadiness(normalizeAgriFeedsDataMap({
    feed_formulas: [{ id: 'F1', status: 'commercializable' }],
    feed_finished_batches: [{ id: 'B1', quality_status: 'accepted', active: true, unit_cost: 320 }],
    feed_trials: [{ id: 'T1', decision: 'validate', phase1_comparison: true }],
    feed_production_orders: [{ id: 'OF1', real_cost_per_kg: 320 }],
  }));
  const gates = readiness.per_mode.PROGRESSIVE_SALES.gates;
  assert.equal(gates.qcMinimum, false);
  // hasCommercializable ok mais human validation absente (pas reviewed_by_human)
  assert.ok(readiness.blockers.some((b) => /contrôle qualité|qualité/i.test(b)));
});

test('readiness — Phase 2B ok quand toutes les portes sont passées', () => {
  const readiness = computeAgriFeedsReadiness(normalizeAgriFeedsDataMap({
    alimentation_logs: makeAlimLogs(30),
    stock: [{ id: 'S1', produit: 'Aliment', categorie: 'aliment_avicole', quantite: 100, prixUnit: 500 }],
    avicole: [
      { id: 'LOT1', type: 'Chair', initial_count: 500, mortality: 10, current_count: 490, indice_consommation: 1.9 },
      { id: 'LOT2', type: 'Chair', initial_count: 500, mortality: 12, current_count: 488, indice_consommation: 2.0 },
    ],
    fournisseurs: [
      { id: 'F1', nom: 'NMA', supplier_type: 'matiere_premiere' },
      { id: 'F2', nom: 'Conseil', supplier_type: 'technique' },
    ],
    veterinaires: [{ id: 'V1' }],
    finances: [
      { id: 'T1', type: 'depense', categorie: 'aliment', montant: 300000, libelle: 'Aliment' },
      { id: 'T2', type: 'recette', montant: 800000, libelle: 'Vente' },
    ],
    payments: [{ id: 'P1', montant: 500000 }],
    invoices: [{ id: 'INV1', montant_total: 100000, montant_paye: 100000 }],
    sales_orders: [{ id: 'SO1', montant_total: 800000, source: 'agri_feeds' }],
    equipements: [{ id: 'EQ1', type: 'forage' }],
    feed_facility_zones: [
      { id: 'z1', zone_type: 'raw_material_storage', status: 'in_use' },
      { id: 'z2', zone_type: 'production_area', status: 'in_use' },
      { id: 'z3', zone_type: 'finished_goods_storage', status: 'in_use' },
      { id: 'z4', zone_type: 'quality_control', status: 'in_use' },
    ],
    feed_raw_materials: [
      { id: 'MP1', name: 'Maïs' }, { id: 'MP2', name: 'Tourteau' }, { id: 'MP3', name: 'Son' },
    ],
    feed_raw_batches: [
      { id: 'B1', raw_material_id: 'MP1', quality_status: 'accepted', quantity_available: 100 },
      { id: 'B2', raw_material_id: 'MP2', quality_status: 'accepted', quantity_available: 80 },
      { id: 'B3', raw_material_id: 'MP3', quality_status: 'accepted', quantity_available: 50 },
    ],
    feed_formulas: [{ id: 'F1', status: 'commercializable', validated_by: 'DG', human_validation_at: '2026-06-01' }],
    feed_formula_versions: [{ id: 'V1', formula_id: 'F1', status: 'commercializable' }],
    feed_production_orders: [{ id: 'OF1', real_cost_per_kg: 320 }],
    feed_finished_batches: [{ id: 'FB1', quality_status: 'accepted', active: true, unit_cost: 320 }],
    feed_quality_checks: [{ id: 'QC1', related_type: 'finished_batch', related_id: 'FB1', result: 'accepted' }],
    feed_trials: [{ id: 'T1', decision: 'validate', reviewed_by_human: true, end_date: '2026-06-01', phase1_comparison: true }],
    alertes_center: [],
  }));
  const gates = readiness.per_mode.PROGRESSIVE_SALES.gates;
  assert.equal(gates.formulaTested, true);
  assert.equal(gates.realCost, true);
  assert.equal(gates.phase1Comparison, true);
  assert.equal(gates.qcMinimum, true);
  assert.equal(gates.humanValidation, true);
  assert.equal(gates.hasCommercializable, true);
  assert.equal(readiness.recommendedMode, 'PROGRESSIVE_SALES');
  assert.equal(readiness.modeFlags.allowsSales, true);
  assert.equal(readiness.human_validation_required, true);
});

test('readiness — alertes critiques ouvertes pénalisent Phase 2A', () => {
  const withoutAlerts = computeAgriFeedsReadiness(normalizeAgriFeedsDataMap({
    alimentation_logs: makeAlimLogs(10),
    feed_formulas: [{ id: 'F1', status: 'draft' }],
    alertes_center: [],
  }));
  const withAlerts = computeAgriFeedsReadiness(normalizeAgriFeedsDataMap({
    alimentation_logs: makeAlimLogs(10),
    feed_formulas: [{ id: 'F1', status: 'draft' }],
    alertes_center: [
      { id: 'A1', severity: 'critique', status: 'ouverte' },
      { id: 'A2', gravite: 'haute', statut: 'ouverte' },
      { id: 'A3', priority: 'urgent', status: 'open' },
    ],
  }));
  assert.ok(withoutAlerts.scores.pilot_internal > withAlerts.scores.pilot_internal);
});
