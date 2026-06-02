import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildElevageIssueKey,
  buildMortalityAlert,
  commitElevageFeeding,
  commitElevageHealth,
  commitElevageMortality,
  commitElevageTransformation,
  runBroilerLotScenario,
  validateElevageFeedingForm,
  validateElevageMortalityForm,
} from '../../src/utils/elevageWorkflow.js';
import { buildElevageGapRows } from '../../src/utils/elevageIntegrity.js';
import { avicoleActiveCount, avicoleDeadCount } from '../../src/utils/avicoleMetrics.js';

describe('elevageWorkflow', () => {
  it('issue_key stable pour traçabilité', () => {
    const key = buildElevageIssueKey('alimentation', 'ALIM-1', 'stock');
    assert.equal(key, 'elevage:alimentation:ALIM-1:stock');
  });

  it('validation alimentation exige cible', () => {
    assert.match(validateElevageFeedingForm({ stock_id: 'S1', quantite: 10 }), /lot ou animal/i);
    assert.equal(validateElevageFeedingForm({ stock_id: 'S1', quantite: 10, lot_id: 'L1' }), '');
  });

  it('validation mortalité', () => {
    assert.match(validateElevageMortalityForm({ lot_id: 'L1' }), /obligatoire/i);
    assert.equal(validateElevageMortalityForm({ lot_id: 'L1', quantite: 5 }), '');
  });

  it('alerte mortalité si seuil dépassé', () => {
    const alert = buildMortalityAlert({
      lot: { id: 'L1', name: 'Chair', initial_count: 100, mortality: 5 },
      rate: 5,
    });
    assert.ok(alert);
    assert.ok(alert.alert_dedupe_key.includes('seuil'));
  });
});

describe('elevageBroilerScenario', () => {
  it('lot chair : alimentation → mortalité → soin → prêt vente', async () => {
    const { state, lot } = await runBroilerLotScenario();

    assert.equal(state.alimentation_logs.length, 1);
    assert.ok(state.alimentation_logs[0].issue_key);
    assert.equal(state.stocks[0].quantite, 4900);

    assert.equal(avicoleDeadCount(lot), 20);
    assert.ok(avicoleActiveCount(lot) <= 980);
    assert.ok(state.events.some((e) => /mortalit/i.test(e.event_type || e.title || '')));

    assert.equal(state.sante.length, 1);
    assert.ok(state.transactions.some((t) => t.categorie === 'Sante' || /sante/i.test(t.libelle || '')));
    assert.ok(state.tasks.some((t) => /rappel/i.test(t.title || '')));

    assert.equal(lot.statut || lot.status, 'pret_vente');

    const feedCost = state.alimentation_logs.reduce((s, r) => s + Number(r.montant_total || 0), 0);
    const healthCost = state.sante.reduce((s, r) => s + Number(r.cout || 0), 0);
    const purchase = Number(lot.cout_total_achat || 0);
    const mortalityLoss = state.transactions.filter((t) => /mortalit|perte/i.test(t.libelle || '')).reduce((s, t) => s + Number(t.montant || 0), 0);
    const totalCost = purchase + feedCost + healthCost + mortalityLoss;
    assert.ok(totalCost > purchase, 'coûts alimentation et santé cumulés sur le lot');
  });

  it('intégrité détecte alimentation sans cible', () => {
    const gaps = buildElevageGapRows({
      alimentationLogs: [{ id: 'A1', quantite: 5, stock_id: 'S1', montant_total: 1000 }],
      lots: [],
      stocks: [],
    });
    assert.ok(gaps.some((g) => g.repair === 'feeding_target'));
  });
});

describe('elevageWorkflow commits isolés', () => {
  it('mortalité met à jour effectif', async () => {
    const state = { lots: [{ id: 'L1', initial_count: 100, current_count: 100, effectif_actuel: 100, mortality: 0, prix_unitaire_sujet: 100 }], alertes: [], transactions: [], events: [] };
    const handlers = {
      onUpdateLot: async (id, patch) => { state.lots[0] = { ...state.lots[0], ...patch }; },
      onCreateBusinessEvent: async (e) => state.events.push(e),
      onCreateAlert: async (a) => state.alertes.push(a),
      onCreateFinanceTransaction: async (t) => state.transactions.push(t),
    };
    await commitElevageMortality({
      form: { lot_id: 'L1', quantite: 3, date: '2026-06-01' },
      context: state,
      handlers,
    });
    assert.equal(avicoleDeadCount(state.lots[0]), 3);
    assert.equal(state.events.length, 1);
  });

  it('transformation prêt vente', async () => {
    const state = { lots: [{ id: 'L1', initial_count: 50, current_count: 50, effectif_actuel: 50 }], events: [] };
    await commitElevageTransformation({
      form: { lot_id: 'L1', kind: 'pret_vente', date: '2026-06-10' },
      context: state,
      handlers: {
        onUpdateLot: async (id, patch) => { state.lots[0] = { ...state.lots[0], ...patch }; },
        onCreateBusinessEvent: async (e) => state.events.push(e),
      },
    });
    assert.equal(state.lots[0].statut, 'pret_vente');
  });
});
