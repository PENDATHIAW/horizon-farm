import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildBroilerLotStartWorkflow,
  commitElevageWeighing,
} from '../../src/utils/elevageWorkflow.js';
import {
  buildCropCampaignStartWorkflow,
  buildIrrigationEventWorkflow,
} from '../../src/utils/cultureWorkflows.js';
import { buildOrganicTransferWorkflow } from '../../src/utils/manureWorkflows.js';
import { buildEquipmentPurchaseWorkflow } from '../../src/utils/equipmentWorkflows.js';
import { buildMonthlyFinancierReportWorkflow } from '../../src/utils/reportWorkflows.js';
import { buildFundingUsageWorkflow } from '../../src/utils/bpLineConcretization.js';
import { buildGrowthObjectiveWorkflow } from '../../src/utils/objectivesWorkflows.js';

test('broiler_lot_start — crée lot, coût, planning, tâche et reporting', () => {
  const workflow = buildBroilerLotStartWorkflow({
    lot: {
      id: 'LOT-CHAIR-900',
      name: 'Lot chair 900',
      initial_count: 900,
      cout_total_achat: 630000,
      prix_vente_prevu: 3600000,
    },
    batiments: [{ id: 'BAT-A' }],
    fournisseurs: [{ id: 'FOU-POUSSINS' }],
    date: '2026-07-01',
  });

  assert.equal(workflow.lot.effectif_actuel, 900);
  assert.equal(workflow.lot.batiment_id, 'BAT-A');
  assert.equal(workflow.lot.fournisseur_id, 'FOU-POUSSINS');
  assert.equal(workflow.lot.besoin_aliment_previsionnel_kg, 4050);
  assert.equal(workflow.lot.date_fin_prevue, '2026-08-15');
  assert.ok(workflow.tasks.some((task) => /Démarrer lot chair/.test(task.title)));
  assert.ok(workflow.tasks.some((task) => /Pesée J\+7/.test(task.title)));
  assert.equal(workflow.financeTransaction.montant, 630000);
  assert.equal(workflow.alert, null);
  assert.equal(workflow.blocked, false);
  assert.equal(workflow.event.event_type, 'broiler_lot_start');
  assert.equal(workflow.reporting.marge_previsionnelle, 2970000);

  const blocked = buildBroilerLotStartWorkflow({
    lot: { id: 'LOT-CHAIR-901', initial_count: 100, cout_total_achat: 100000, batiment_id: 'BAT-A' },
    lots: [{ id: 'LOT-OLD', batiment_id: 'BAT-A', current_count: 50, status: 'en_croissance' }],
    fournisseurs: [{ id: 'FOU-POUSSINS' }],
    date: '2026-07-01',
  });
  assert.equal(blocked.blocked, true);
  assert.match(blocked.blockingReasons[0], /occupé/);
});

test('bovine_weighing — calcule GMQ, coût/kg, marge, tâche et alerte retard', async () => {
  const state = {
    animaux: [{
      id: 'BOV-900',
      poids_entree: 280,
      poids_objectif: 450,
      purchase_cost: 300000,
      feed_cost: 60000,
      health_cost: 15000,
      prix_vente_estime: 520000,
      weight_history: [{ date: '2026-06-01', poids: 300 }],
    }],
    tasks: [],
    alerts: [],
    events: [],
    weights: [],
  };

  const result = await commitElevageWeighing({
    form: { animal_id: 'BOV-900', poids: 325, date: '2026-07-15', objectif_gmq: 0.9 },
    context: state,
    handlers: {
      onUpdateAnimal: async (id, patch) => { state.animaux[0] = { ...state.animaux[0], ...patch }; },
      onCreateWeightRecord: async (row) => state.weights.push(row),
      onCreateTask: async (row) => state.tasks.push(row),
      onCreateAlert: async (row) => state.alerts.push(row),
      onCreateBusinessEvent: async (row) => state.events.push(row),
    },
  });

  assert.equal(result.gmq, 0.568);
  assert.equal(result.performanceLow, true);
  assert.equal(result.staleBeforeWeighing, true);
  assert.equal(state.animaux[0].cout_par_kg_gagne, 8333);
  assert.equal(state.animaux[0].marge_previsionnelle, 145000);
  assert.ok(state.animaux[0].date_sortie_estimee);
  assert.equal(state.tasks.length, 1);
  assert.equal(state.alerts.length, 2);
  assert.ok(state.alerts.some((alert) => /Gain insuffisant/.test(alert.title)));
  assert.equal(state.animaux[0].cout_alimentaire_cumule, 60000);
  assert.equal(state.events[0].event_type, 'bovine_weighing');
  assert.equal(state.events[0].gmq, 0.568);
});

test('crop_campaign_start — préselectionne parcelle, calcule rendement, marge et tâches', () => {
  const workflow = buildCropCampaignStartWorkflow({
    culture: {
      id: 'CULT-TOMATE-900',
      nom: 'Tomate',
      budget_prevu: 120000,
      prix_vente_prevu_unitaire: 600,
    },
    parcelles: [{ id: 'PARC-A', name: 'Parcelle A', surface: 0.5, unite_surface: 'ha' }],
    stocks: [{ id: 'STK-ENG', produit: 'Engrais tomate', categorie: 'engrais' }],
    date: '2026-07-01',
  });

  assert.equal(workflow.culture.parcelle_id, 'PARC-A');
  assert.equal(workflow.culture.surface, 0.5);
  assert.equal(workflow.culture.rendement_cible, 6000);
  assert.equal(workflow.culture.date_recolte_estimee, '2026-09-29');
  assert.equal(workflow.culture.marge_previsionnelle, 3480000);
  assert.ok(workflow.tasks.some((task) => /Irrigation/.test(task.title)));
  assert.equal(workflow.alert, null);
  assert.equal(workflow.event.event_type, 'crop_campaign_start');
  assert.equal(workflow.financeTransaction.montant, 120000);

  const blocked = buildCropCampaignStartWorkflow({
    culture: { id: 'CULT-PIMENT', nom: 'Piment', budget_prevu: 100000, parcelle_id: 'PARC-A', surface: 0.5 },
    cultures: [{ id: 'CULT-OLD', parcelle_id: 'PARC-A', statut: 'en_cours', nom: 'Tomate ancienne' }],
    date: '2026-07-01',
  });
  assert.equal(blocked.blocked, true);
  assert.match(blocked.blockingReasons[0], /parcelle/);
});

test('irrigation_event — consomme Smart Farm, impacte coût parcelle et alerte anomalie', () => {
  const workflow = buildIrrigationEventWorkflow({
    culture: { id: 'CULT-TOMATE-900', nom: 'Tomate', statut: 'en_cours', surface: 0.5, cout_total_reel: 120000 },
    payload: { cout_unitaire_litre: 2, seuil_anormal_litres: 1000 },
    smartReadings: [{ id: 'READ-EAU-1', metric: 'water_volume', value: 1400, device_id: 'SENS-EAU' }],
    date: '2026-07-10',
  });

  assert.equal(workflow.culturePatch.cout_irrigation, 2800);
  assert.equal(workflow.culturePatch.cout_total_reel, 122800);
  assert.equal(workflow.culturePatch.irrigation_history[0].volume_litres, 1400);
  assert.match(workflow.alert.title, /Consommation eau anormale/);
  assert.ok(workflow.task);
  assert.equal(workflow.financeTransaction.montant, 2800);
  assert.equal(workflow.event.event_type, 'irrigation_event');
  assert.equal(workflow.event.smartfarm_source_id, 'READ-EAU-1');
});

test('organic_transfer — sort stock organique, fertilise parcelle et bloque contaminé', () => {
  const ok = buildOrganicTransferWorkflow({
    stock: { id: 'STK-FUMIER', produit: 'Fumier chair', quantite: 20, prix_unitaire: 1500, statut_sanitaire: 'normal' },
    culture: { id: 'CULT-TOMATE-900', parcelle: 'Parcelle A', cout_total_reel: 120000 },
    payload: { sacs: 5, poids_estime_par_sac: 20, preuve_url: 'photo.jpg' },
    date: '2026-07-11',
  });

  assert.equal(ok.stockPatch.quantite, 15);
  assert.equal(ok.culturePatch.fertilisation_organique_sacs, 5);
  assert.equal(ok.culturePatch.economie_intrants, 7500);
  assert.equal(ok.document.status, 'fourni');
  assert.equal(ok.alert, null);
  assert.equal(ok.event.event_type, 'organic_transfer');

  const blocked = buildOrganicTransferWorkflow({
    stock: { id: 'STK-FUMIER', quantite: 20, statut_sanitaire: 'contamine' },
    culture: { id: 'CULT-TOMATE-900' },
    payload: { sacs: 2 },
  });
  assert.equal(blocked.blocked, true);
  assert.equal(blocked.stockPatch, null);
  assert.match(blocked.alert.title, /bloqué/i);

  const overStock = buildOrganicTransferWorkflow({
    stock: { id: 'STK-FUMIER', quantite: 1, statut_sanitaire: 'normal' },
    culture: { id: 'CULT-TOMATE-900' },
    payload: { sacs: 2 },
  });
  assert.equal(overStock.blocked, true);
  assert.match(overStock.alert.message, /stock disponible/);
});

test('equipment_purchase — crée actif, finance, document, maintenance et amortissement', () => {
  const workflow = buildEquipmentPurchaseWorkflow({
    payload: {
      id: 'EQP-POMPE-900',
      name: 'Pompe irrigation',
      purchase_cost: 600000,
      justificatif_url: 'facture.pdf',
    },
    supplier: { id: 'FOU-EQP' },
    fundingSource: { id: 'FUND-BNDE' },
    date: '2026-07-01',
  });

  assert.equal(workflow.equipment.status, 'operationnel');
  assert.equal(workflow.equipment.fournisseur_id, 'FOU-EQP');
  assert.equal(workflow.equipment.maintenance_due, '2026-09-29');
  assert.equal(workflow.equipment.amortissement_mensuel, 10000);
  assert.equal(workflow.financeTransaction.funding_source_id, 'FUND-BNDE');
  assert.equal(workflow.document.status, 'fourni');
  assert.match(workflow.maintenanceTask.title, /maintenance/);
  assert.equal(workflow.alert, null);
  assert.equal(workflow.event.event_type, 'equipment_purchase');
});

test('monthly_financier_report — consolide données et impose validation humaine', () => {
  const workflow = buildMonthlyFinancierReportWorkflow({
    dataMap: {
      sales_orders: [{ id: 'SO-1', total: 300000, reste_a_payer: 50000, marge: 90000 }],
      finances: [{ id: 'TRX-1', type: 'entree', montant: 250000 }, { id: 'TRX-2', type: 'sortie', montant: 100000, statut: 'paye' }],
      stocks: [{ id: 'STK-1', quantite: 10, prix_unitaire: 5000 }],
      alertes: [{ id: 'ALT-1', severity: 'critique' }],
      taches: [{ id: 'TSK-1', status: 'a_faire' }],
      documents: [{ id: 'DOC-1', status: 'manquant' }],
      business_events: [{ id: 'EVT-1' }],
      bp_investment_lines: [{ id: 'BPLI-1', montant_reel: 600000 }],
      lots: [{ id: 'LOT-1' }],
      animaux: [{ id: 'BOV-1' }],
      cultures: [{ id: 'CULT-1' }],
    },
    period: '2026-07',
    humanValidated: false,
  });

  assert.equal(workflow.reportPayload.status, 'brouillon');
  assert.equal(workflow.reportPayload.sales_total, 300000);
  assert.equal(workflow.reportPayload.paid_total, 250000);
  assert.equal(workflow.reportPayload.expenses_total, 100000);
  assert.equal(workflow.reportPayload.funding_used, 600000);
  assert.equal(workflow.reportPayload.proof_missing_count, 1);
  assert.ok(workflow.validationTask);
  assert.equal(workflow.auditLog.action, 'generate_financier_report_draft');
  assert.equal(workflow.event.event_type, 'monthly_financier_report');
});

test('funding_usage — calcule reste disponible, écart budget, preuve et alerte', () => {
  const workflow = buildFundingUsageWorkflow({
    fundingSource: { id: 'FUND-BNDE', montant: 1000000, montant_utilise: 200000 },
    budgetLine: { id: 'BPLI-EQP', designation: 'Pompe irrigation', total: 400000, categorie: 'equipement', business_plan_id: 'BP-1' },
    expense: { id: 'TRX-EQP', amount: 450000, module_lie: 'equipements' },
    documents: [],
    date: '2026-07-01',
  });

  assert.equal(workflow.fundingPatch.reste_disponible, 350000);
  assert.equal(workflow.budgetLinePatch.ecart_budget, 50000);
  assert.equal(workflow.financeTransaction.funding_source_id, 'FUND-BNDE');
  assert.equal(workflow.reportEntry.amount_used, 450000);
  assert.match(workflow.alert.message, /Justificatif/);
  assert.equal(workflow.event.event_type, 'funding_usage');
});

test('growth_objective — calcule progression, besoins, tâche, alerte et simulation', () => {
  const workflow = buildGrowthObjectiveWorkflow(
    {
      activity: 'poulets_chair',
      label: 'Ventes chair',
      current: 300000,
      target: 1000000,
      stock_need: 500,
      cash_need: 800000,
      capacity_need: 2,
      echeance: '2026-08-01',
    },
    { availableStock: 200, availableCash: 300000, availableCapacity: 1 },
  );

  assert.equal(workflow.status.key, 'en_retard');
  assert.equal(workflow.progress.attainment, 30);
  assert.ok(workflow.task);
  assert.match(workflow.alert.message, /stock insuffisant/);
  assert.equal(workflow.simulation.cash_need, 800000);
  assert.equal(workflow.event.event_type, 'growth_objective');
  assert.equal(workflow.sourceModule, 'avicole');
});
