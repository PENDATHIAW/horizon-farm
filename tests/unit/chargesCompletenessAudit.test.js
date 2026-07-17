import test from 'node:test';
import assert from 'node:assert/strict';
import { buildChargesCompletenessAudit } from '../../src/utils/chargesCompletenessAudit.js';

const thisMonth = new Date().toISOString().slice(0, 10);

test('détecte la masse salariale non enregistrée', () => {
  const audit = buildChargesCompletenessAudit({
    transactions: [{ type: 'sortie', montant: 40000, categorie: 'Aliment', date: thisMonth, statut: 'paye' }],
    team: [
      { id: 'RH1', salaire: 95000, statut: 'actif' },
      { id: 'RH2', salaire: 85000, statut: 'actif' },
      { id: 'RH3', salaire: 70000, statut: 'inactif' }, // exclu
    ],
  });
  const gap = audit.gaps.find((g) => g.key === 'main_oeuvre');
  assert.ok(gap, 'un écart main d’œuvre doit être signalé');
  assert.equal(gap.severity, 'critique');
  assert.equal(audit.expectedPayroll, 180000);
  assert.equal(gap.estimatedImpact, 180000);
});

test('ne signale pas la paie si elle est enregistrée', () => {
  const audit = buildChargesCompletenessAudit({
    transactions: [
      { type: 'sortie', montant: 95000, categorie: 'Rémunérations', source_module: 'rh', date: thisMonth, statut: 'paye' },
      { type: 'sortie', montant: 30000, libelle: 'Loyer parcelle', date: thisMonth, statut: 'paye' },
    ],
    team: [{ id: 'RH1', salaire: 95000, statut: 'actif' }],
  });
  assert.equal(audit.gaps.find((g) => g.key === 'main_oeuvre'), undefined);
});

test('signale l’absence de charges fixes quand la ferme est active', () => {
  const audit = buildChargesCompletenessAudit({
    transactions: [{ type: 'sortie', montant: 40000, categorie: 'Aliment', date: thisMonth, statut: 'paye' }],
    payments: [{ id: 'P1', montant_paye: 100000, moyen_paiement: 'Wave' }],
  });
  assert.ok(audit.gaps.find((g) => g.key === 'charges_fixes'));
});

test('estime les commissions mobile money non tracées', () => {
  const audit = buildChargesCompletenessAudit({
    transactions: [{ type: 'sortie', montant: 30000, libelle: 'Loyer', date: thisMonth, statut: 'paye' }],
    payments: [
      { id: 'P1', montant_paye: 100000, moyen_paiement: 'Wave' },
      { id: 'P2', montant_paye: 100000, moyen_paiement: 'Orange Money' },
    ],
    mobileMoneyFeeRate: 0.01,
  });
  const gap = audit.gaps.find((g) => g.key === 'commissions_mm');
  assert.ok(gap);
  assert.equal(gap.estimatedImpact, 2000); // 1% de 200000
});

test('signale l’absence d’amortissement des investissements', () => {
  const audit = buildChargesCompletenessAudit({
    transactions: [{ type: 'sortie', montant: 30000, libelle: 'Loyer', date: thisMonth, statut: 'paye' }],
    investissements: [{ montant: 5000000 }],
  });
  assert.ok(audit.gaps.find((g) => g.key === 'amortissement'));
});

test('score = 100 et complete quand tout est tracé', () => {
  const audit = buildChargesCompletenessAudit({
    transactions: [
      { type: 'sortie', montant: 95000, categorie: 'Rémunérations', source_module: 'rh', date: thisMonth, statut: 'paye' },
      { type: 'sortie', montant: 30000, libelle: 'Loyer + électricité', date: thisMonth, statut: 'paye' },
      { type: 'sortie', montant: 2000, libelle: 'Commission Wave', date: thisMonth, statut: 'paye' },
    ],
    payments: [{ id: 'P1', montant_paye: 100000, moyen_paiement: 'Wave' }],
    team: [{ id: 'RH1', salaire: 95000, statut: 'actif' }],
    investissements: [],
  });
  assert.equal(audit.complete, true);
  assert.equal(audit.score, 100);
});
