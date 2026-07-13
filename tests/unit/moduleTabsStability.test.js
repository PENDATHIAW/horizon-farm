import test from 'node:test';
import assert from 'node:assert/strict';
import {
  setupTestStorage,
  MODULE_TAB_MATRIX,
  assertModuleTabStable,
  buildSimulatedProps,
  buildBaseProps,
  withSimulatedMode,
  criticalModuleIds,
} from './helpers/moduleTabTestHarness.js';

setupTestStorage();

const DATA_MODES = [
  { label: 'vide', props: () => buildBaseProps() },
  { label: 'simule', props: () => buildSimulatedProps() },
  { label: 'partiel', props: () => buildBaseProps({ clients: [{ id: 'c1', nom: 'Client test' }], stocks: [{ id: 's1', produit: 'Aliment', quantite: 10 }] }) },
  { label: 'farm-active', props: () => buildBaseProps({ farmScope: { mode: 'single' }, activeFarm: { id: 'f1', name: 'Ferme test' } }) },
];

for (const moduleId of criticalModuleIds()) {
  const tabs = MODULE_TAB_MATRIX[moduleId] || [];
  for (const tab of tabs) {
    for (const mode of DATA_MODES) {
      test(`${moduleId} / ${tab} / ${mode.label}`, async () => {
        await withSimulatedMode(mode.label === 'simule', async () => {
          await assertModuleTabStable(moduleId, tab, mode.props());
        });
      });
    }
  }
}

test('Commercial — onglets critiques avec données simulées', async () => {
  const tabs = ['Ventes', 'Opportunités', 'Clients & créances', 'Livraisons', 'Abonnements', 'Pilotage'];
  for (const tab of tabs) {
    await assertModuleTabStable('commercial', tab, buildSimulatedProps());
  }
});

test('Achats & Stock — onglets critiques', async () => {
  for (const tab of ['Inventaire', 'Réceptions & achats', 'Fournisseurs & dettes']) {
    await assertModuleTabStable('achats_stock', tab, buildSimulatedProps());
  }
});

test('Élevage — onglets critiques', async () => {
  for (const tab of ['Lots & bandes', 'Cycles & Reproduction', 'Santé', 'Transformation']) {
    await assertModuleTabStable('elevage', tab, buildSimulatedProps());
  }
});

test('Cultures — onglets critiques avec données simulées', async () => {
  for (const tab of ['Parcelles & campagnes', 'Récoltes', 'Économie circulaire']) {
    await assertModuleTabStable('cultures', tab, buildSimulatedProps());
  }
});

test('Finance — onglets critiques avec données simulées', async () => {
  for (const tab of ['Résumé', 'Trésorerie', 'Créances & dettes', 'Pilotage', 'Graphiques']) {
    await assertModuleTabStable('finance_pilotage', tab, buildSimulatedProps());
  }
});

test('Finance — deep-link Investissements (alias Pilotage)', async () => {
  await assertModuleTabStable('finance_pilotage', 'Investissements', buildSimulatedProps({
    bpInvestmentLines: [{ id: 'bp1', business_plan_id: 'BP-HF', designation: 'Abreuvoir', montant_prevu: 250000, statut: 'a_concretiser', display_in_investissements: true }],
  }));
});

test('Activité & Suivi — onglets critiques', async () => {
  for (const tab of ['Cockpit & décisions', 'À traiter maintenant', 'Registre & traçabilité', 'Performance & analytique']) {
    await assertModuleTabStable('activite_suivi', tab, buildSimulatedProps());
  }
});

test('Documents & Rapports — onglets critiques', async () => {
  for (const tab of ['Centre de contrôle', 'Gestionnaire & OCR', 'Rapprochement & preuves', 'Rapports & exports']) {
    await assertModuleTabStable('documents_rapports', tab, buildSimulatedProps());
  }
});

test('RH — onglets critiques', async () => {
  for (const tab of ['Cockpit RH & Maintenance', 'Personnel & Paie', 'Parc Matériel & Maintenance', 'Registres & Analyses']) {
    await assertModuleTabStable('rh', tab, buildSimulatedProps());
  }
});

test('Objectifs & Croissance — onglets critiques', async () => {
  for (const tab of ['Suivi du Business Plan', 'Efficacité Technique & Zootechnique', 'Simulateur Sandbox', 'Sécurisation des Flux']) {
    await assertModuleTabStable('objectifs_croissance', tab, buildSimulatedProps());
  }
});

test('Centre décisionnel — onglets critiques', async () => {
  for (const tab of ['Urgences & risques', 'Croissance & opportunités', 'Saisons & marchés']) {
    await assertModuleTabStable('centre_ia', tab, buildSimulatedProps());
  }
});

test('Matrice modules couverte', () => {
  assert.ok(criticalModuleIds().length >= 14);
  assert.equal(MODULE_TAB_MATRIX.commercial.length, 6);
  assert.equal(MODULE_TAB_MATRIX.achats_stock.length, 3);
  assert.equal(MODULE_TAB_MATRIX.elevage.length, 4);
  assert.equal(MODULE_TAB_MATRIX.cultures.length, 3);
  assert.equal(MODULE_TAB_MATRIX.objectifs_croissance.length, 4);
  assert.equal(MODULE_TAB_MATRIX.centre_ia.length, 5);
  assert.equal(MODULE_TAB_MATRIX.sync_activity.length, 3);
});
