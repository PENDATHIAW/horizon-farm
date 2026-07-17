import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeAccount,
  buildTreasuryByAccount,
  buildTreasuryReconciliation,
} from '../../src/utils/treasuryByAccount.js';

test('normalizeAccount: mappe les moyens de paiement vers les comptes canoniques', () => {
  assert.equal(normalizeAccount('Espèces'), 'especes');
  assert.equal(normalizeAccount('cash'), 'especes');
  assert.equal(normalizeAccount('Wave'), 'wave');
  assert.equal(normalizeAccount('Orange Money'), 'orange_money');
  assert.equal(normalizeAccount('OM'), 'orange_money');
  assert.equal(normalizeAccount('Virement bancaire'), 'banque');
  assert.equal(normalizeAccount('chèque'), 'banque');
  assert.equal(normalizeAccount('Free Money'), 'autre');
  assert.equal(normalizeAccount(''), 'non_ventile');
});

test('normalizeAccount: Carte bancaire → banque', () => {
  assert.equal(normalizeAccount('Carte bancaire'), 'banque');
});

test('buildTreasuryByAccount: attribue les dépenses saisies via le champ « paiement »', () => {
  // Le formulaire finance stocke le compte dans `paiement` (pas moyen_paiement).
  const transactions = [
    { id: 'T1', type: 'sortie', montant: 40000, paiement: 'Wave', statut: 'paye', libelle: 'retrait aliment' },
    { id: 'T2', type: 'sortie', montant: 10000, treasury_account_id: 'Espèces', statut: 'paye', libelle: 'petite caisse' },
  ];
  const result = buildTreasuryByAccount({ consolidated: { cashNet: -50000 }, payments: [], transactions });
  const wave = result.accounts.find((a) => a.key === 'wave');
  const especes = result.accounts.find((a) => a.key === 'especes');
  assert.equal(wave.net, -40000, 'la dépense Wave doit être attribuée au compte Wave');
  assert.equal(especes.net, -10000);
  assert.equal(result.accounts.reduce((s, a) => s + a.net, 0), -50000);
});

test('buildTreasuryByAccount: la somme des comptes égale toujours cashNet', () => {
  const payments = [
    { id: 'P1', montant_paye: 100000, moyen_paiement: 'Wave', statut: 'paye' },
    { id: 'P2', montant_paye: 50000, moyen_paiement: 'Espèces', statut: 'paye' },
    { id: 'P3', montant_paye: 30000, moyen_paiement: 'Orange Money', statut: 'annule' }, // ignoré
  ];
  const transactions = [
    { id: 'T1', type: 'entree', montant: 20000, moyen_paiement: 'Banque', statut: 'paye', libelle: 'subvention' }, // other cash in
    { id: 'T2', type: 'sortie', montant: 40000, moyen_paiement: 'Espèces', statut: 'paye', libelle: 'aliment' }, // dépense payée
  ];
  // cashNet fourni par la consolidation (source de vérité).
  const consolidated = { cashNet: 130000 };

  const result = buildTreasuryByAccount({ consolidated, payments, transactions });
  const sum = result.accounts.reduce((s, a) => s + a.net, 0);
  assert.equal(sum, 130000, 'la somme des comptes doit égaler cashNet');

  const wave = result.accounts.find((a) => a.key === 'wave');
  const especes = result.accounts.find((a) => a.key === 'especes');
  const banque = result.accounts.find((a) => a.key === 'banque');
  assert.equal(wave.net, 100000);
  assert.equal(especes.net, 50000 - 40000); // 10000
  assert.equal(banque.net, 20000);
});

test('buildTreasuryByAccount: le résidu de consolidation va dans « Non ventilé »', () => {
  const payments = [{ id: 'P1', montant_paye: 100000, moyen_paiement: 'Wave', statut: 'paye' }];
  // cashNet plus petit que les entrées brutes (plafonnement CA côté consolidation).
  const consolidated = { cashNet: 70000 };
  const result = buildTreasuryByAccount({ consolidated, payments, transactions: [] });
  const nonVentile = result.accounts.find((a) => a.key === 'non_ventile');
  assert.equal(result.ventile, 100000);
  assert.equal(result.residual, -30000);
  assert.equal(nonVentile.net, -30000);
  assert.equal(result.accounts.reduce((s, a) => s + a.net, 0), 70000);
});

test('buildTreasuryReconciliation: écart = réel − ERP par compte', () => {
  const treasury = buildTreasuryByAccount({
    consolidated: { cashNet: 150000 },
    payments: [
      { id: 'P1', montant_paye: 100000, moyen_paiement: 'Wave', statut: 'paye' },
      { id: 'P2', montant_paye: 50000, moyen_paiement: 'Espèces', statut: 'paye' },
    ],
    transactions: [],
  });
  const recon = buildTreasuryReconciliation(treasury, { wave: 95000, especes: 50000 });
  const wave = recon.accounts.find((a) => a.key === 'wave');
  const especes = recon.accounts.find((a) => a.key === 'especes');
  assert.equal(wave.ecart, -5000, 'Wave : réel 95000 − ERP 100000');
  assert.equal(wave.reconcilie, false);
  assert.equal(especes.ecart, 0);
  assert.equal(especes.reconcilie, true);
  assert.equal(recon.ecartTotal, -5000);
  assert.equal(recon.comptesControles, 2);
});

test('buildTreasuryReconciliation: sans solde réel, aucun écart calculé', () => {
  const treasury = buildTreasuryByAccount({ consolidated: { cashNet: 100000 }, payments: [{ id: 'P1', montant_paye: 100000, moyen_paiement: 'Wave', statut: 'paye' }], transactions: [] });
  const recon = buildTreasuryReconciliation(treasury, {});
  assert.equal(recon.comptesControles, 0);
  assert.equal(recon.aligne, false);
  recon.accounts.forEach((a) => assert.equal(a.ecart, null));
});
