import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDecisionBriefing } from '../../src/utils/decisionBriefing.js';

test('buildDecisionBriefing: propose au plus 3 décisions, les critiques d’abord', () => {
  const dataMap = {
    clients: [
      { id: 'C1', nom: 'Client A' },
      { id: 'C2', nom: 'Client B' },
    ],
    salesOrders: [
      { id: 'O1', client_id: 'C1', statut: 'livree', montant_total: 300000, montant_paye: 50000 },
      { id: 'O2', client_id: 'C2', statut: 'livree', montant_total: 100000, montant_paye: 100000 },
    ],
    payments: [{ id: 'P1', order_id: 'O1', montant_paye: 50000, statut: 'paye', moyen_paiement: 'Wave' }],
    transactions: [
      { id: 'T1', type: 'sortie', montant: 900000, statut: 'paye', libelle: 'aliment', date: '2026-07-01' },
    ],
    stock: [{ id: 'S1', nom: 'Aliment', quantite: 1, seuil_alerte: 5 }],
    alertes: [{ id: 'A1', severity: 'critique', status: 'nouvelle', title: 'Mortalité' }],
  };

  const briefing = buildDecisionBriefing(dataMap);
  assert.ok(Array.isArray(briefing.decisions));
  assert.ok(briefing.decisions.length <= 3, 'au plus 3 décisions');
  assert.ok(briefing.decisions.length >= 1, 'au moins une décision');
  // La première décision doit être critique (trésorerie négative / stock / alerte).
  assert.equal(briefing.decisions[0].severity, 'critique');
  // Chaque décision porte une action et un module cible.
  briefing.decisions.forEach((d) => {
    assert.ok(d.action, 'action présente');
    assert.ok(d.module, 'module cible présent');
    assert.ok(d.title, 'titre présent');
  });
});

test('buildDecisionBriefing: identifie le plus gros client à relancer', () => {
  const dataMap = {
    clients: [
      { id: 'C1', nom: 'Petit client' },
      { id: 'C2', nom: 'Gros client' },
    ],
    salesOrders: [
      { id: 'O1', client_id: 'C1', statut: 'livree', montant_total: 50000, montant_paye: 0 },
      { id: 'O2', client_id: 'C2', statut: 'livree', montant_total: 500000, montant_paye: 0 },
    ],
    payments: [],
    transactions: [{ id: 'T1', type: 'entree', montant: 600000, statut: 'paye', libelle: 'vente', date: '2026-07-01' }],
  };
  const briefing = buildDecisionBriefing(dataMap);
  const relance = briefing.decisions.find((d) => d.key === 'relance_creance');
  assert.ok(relance, 'une décision de relance doit exister');
  assert.match(relance.title, /Gros client/, 'le plus gros débiteur est ciblé');
  assert.equal(relance.impact, 500000);
});

test('buildDecisionBriefing: ferme saine sans signal → aucune décision', () => {
  const briefing = buildDecisionBriefing({ clients: [], salesOrders: [], payments: [], transactions: [], stock: [], alertes: [] });
  assert.equal(briefing.decisions.length, 0);
});
