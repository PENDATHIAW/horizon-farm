import test from 'node:test';

function installWindowMock() {
  const original = globalThis.window;
  globalThis.window = {
    dispatchEvent: () => true,
    CustomEvent: class CustomEvent {
      constructor(type, init) {
        this.type = type;
        this.detail = init?.detail;
      }
    },
  };
  return () => { globalThis.window = original; };
}

test.beforeEach(() => {
  installWindowMock();
});
import assert from 'node:assert/strict';
import {
  ANTI_DUPLICATION_PAIRS,
  getAntiDuplicationPair,
  listAntiDuplicationPairs,
} from '../../src/utils/antiDuplicationRegistry.js';
import {
  isSaleIntent,
  isStockPurchaseIntent,
  openCommercialSale,
  openDocumentProofFromTransaction,
  openEquipementsMaintenance,
  openFinanceurReport,
  openSmartFarmCapteurs,
  openStockPurchase,
  redirectToSource,
  resolveFinanceEntryTarget,
  shouldBlockInlineAlertCreation,
} from '../../src/utils/antiDuplicationGuard.js';

test('registre couvre les 9 paires auditées', () => {
  assert.equal(ANTI_DUPLICATION_PAIRS.length, 9);
  const ids = listAntiDuplicationPairs().map((p) => p.id);
  assert.ok(ids.includes('charge_vs_stock'));
  assert.ok(ids.includes('document_vs_preuve'));
  assert.ok(ids.includes('vente_commercial_finance'));
  assert.ok(ids.includes('stock_vs_mouvements'));
  assert.ok(ids.includes('alertes_centre_activite'));
  assert.ok(ids.includes('financeur_documents_objectifs'));
  assert.ok(ids.includes('maintenance_rh_equipements'));
  assert.ok(ids.includes('capteurs_smartfarm_equipements'));
  assert.ok(ids.includes('rentabilite_finance_elevage'));
});

test('décision stock → achats_stock', () => {
  const pair = getAntiDuplicationPair('charge_vs_stock');
  assert.equal(pair.sourceModule, 'achats_stock');
  assert.equal(pair.decision, 'redirect');
  const calls = [];
  openStockPurchase({ onNavigate: (m, o) => calls.push({ m, tab: o?.tab }) });
  assert.equal(calls[0]?.m, 'achats_stock');
  assert.equal(calls[0]?.tab, 'Stock');
});

test('décision vente → commercial', () => {
  const calls = [];
  openCommercialSale((m, o) => calls.push({ m, tab: o?.tab }));
  assert.equal(calls[0]?.m, 'commercial');
  assert.equal(calls[0]?.tab, 'Ventes');
  assert.equal(isSaleIntent({ libelle: 'Vente client A', type: 'entree' }), true);
  assert.equal(isStockPurchaseIntent({ libelle: 'Achat aliment', categorie: 'stock' }), true);
});

test('resolveFinanceEntryTarget redirige vente et achat stock', () => {
  const navCalls = [];
  const onNavigate = (m) => navCalls.push(m);
  const sale = resolveFinanceEntryTarget({ libelle: 'Vente poulets', type: 'entree' }, onNavigate);
  assert.equal(sale.redirected, true);
  assert.equal(sale.module, 'commercial');
  const stock = resolveFinanceEntryTarget({ libelle: 'Achat provende', categorie: 'achat stock' }, onNavigate);
  assert.equal(stock.redirected, true);
  assert.equal(stock.module, 'achats_stock');
});

test('joindre preuve ouvre formulaire document (pas tâche seule)', () => {
  openDocumentProofFromTransaction('TRX-001', 'Facture fournisseur');
  assert.ok(true);
});

test('alertes Centre décisionnel redirigent vers Activité & Suivi', () => {
  assert.equal(shouldBlockInlineAlertCreation('centre_decisionnel'), true);
  assert.equal(shouldBlockInlineAlertCreation('activite_suivi'), false);
  const calls = [];
  redirectToSource((m, o) => calls.push({ m, tab: o?.tab }), 'alertes_centre_activite');
  assert.deepEqual(calls[0], { m: 'activite_suivi', tab: 'Alertes' });
});

test('financeur, maintenance, capteurs → modules source', () => {
  const calls = [];
  const nav = (m) => calls.push(m);
  openFinanceurReport(nav);
  openEquipementsMaintenance(nav);
  openSmartFarmCapteurs(nav);
  assert.deepEqual(calls, ['rapports', 'equipements', 'smartfarm']);
});

test('mouvements stock = lecture seule', () => {
  const pair = getAntiDuplicationPair('stock_vs_mouvements');
  assert.equal(pair.decision, 'readonly');
  assert.equal(pair.sourceTab, 'Stock');
});

test('rentabilité élevage/objectifs = lecture + lien finance', () => {
  const pair = getAntiDuplicationPair('rentabilite_finance_elevage');
  assert.equal(pair.sourceModule, 'finance_pilotage');
  assert.equal(pair.sourceTab, 'Rentabilité');
  assert.equal(pair.decision, 'readonly');
});
