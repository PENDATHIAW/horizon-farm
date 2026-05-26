import { expect, test } from '@playwright/test';
import { readFileSync } from 'fs';
import { buildCalculatedCycleDates } from '../../src/services/productionCycleDates.js';
import { computeFinanceCash } from '../../src/utils/financeCash.js';
import { normalizeLot, normalizeProductionOeufsLog } from '../../src/utils/normalize.js';
import { applyStockMovement, buildStockCriticalFollowUp } from '../../src/utils/stockWorkflows.js';
import { avicoleActiveCount, avicoleSickCount } from '../../src/utils/avicoleMetrics.js';
import { buildHealthCostTransaction, buildHealthFollowUp, buildHealthProofDocument } from '../../src/utils/healthWorkflows.js';
import { buildClientReminderFollowUp, buildClientSalesSummary, canDeleteClient, normalizeClientFromSales } from '../../src/utils/clientWorkflows.js';
import { buildSaleSourcePatch, capSalePayment } from '../../src/utils/salesWorkflows.js';
import { buildSupplierDebtFollowUp, buildSupplierPaymentWorkflow, buildSupplierReceptionWorkflow } from '../../src/utils/supplierWorkflows.js';
import { calculateSupplierSettlement } from '../../src/utils/supplierSettlement.js';
import { transactionHasProof } from '../../src/utils/accountingProof.js';
import { buildDocumentProofFollowUp } from '../../src/utils/documentWorkflows.js';
import { normalizeDocumentPayload } from '../../src/utils/documentForms.js';
import { buildTaskFromAlert, completeTaskWorkflow, normalizeTaskChecklist } from '../../src/utils/taskWorkflows.js';
import { normalizeTaskPayload } from '../../src/utils/taskForms.js';
import { dedupeAlertsBySource, isAlertResolved } from '../../src/utils/alertWorkflows.js';
import { buildCultureHarvestWorkflow, buildCultureInputUsageWorkflow, buildCultureLossWorkflow, buildCultureWeatherRiskFollowUp } from '../../src/utils/cultureWorkflows.js';
import { buildInvestmentAssetWorkflow, buildInvestmentRealizationWorkflow } from '../../src/utils/investmentWorkflows.js';
import { buildImpactImprovementTask, buildImpactMissingProofWorkflow, buildImpactRiskFollowUp } from '../../src/utils/impactWorkflows.js';
import { buildEquipmentBreakdownFollowUp, buildEquipmentRepairWorkflow } from '../../src/utils/equipmentWorkflows.js';
import { buildRhAbsenceFollowUp, buildRhAssignedTask, buildRhSalaryWorkflow } from '../../src/utils/rhWorkflows.js';
import { buildReportGenerationWorkflow, buildReportScheduleTask } from '../../src/utils/reportWorkflows.js';
import { buildSmartFarmDeviceFollowUp, isSmartFarmDeviceCritical, smartDeviceSource } from '../../src/utils/smartFarmWorkflows.js';
import { interpretHorizonCommand } from '../../src/services/aiIntentEngine.js';
import { buildDecisionRecommendationTask } from '../../src/utils/decisionCenterWorkflows.js';
import { buildObjectiveActionTask, buildObjectiveStatus } from '../../src/utils/objectivesWorkflows.js';
import { buildSensitiveActionTrace, buildTraceCoverage, normalizeTraceEvent, routeForTrace } from '../../src/utils/traceabilityWorkflows.js';
import { auditErpInterconnections } from '../../src/utils/interconnectionAudit.js';
import { buildSyncRepairTask, routeForSyncIssue, syncIssueActionLabel } from '../../src/utils/syncAuditWorkflows.js';
import { buildSystemAuditEvent, canPerformSystemAction, isLastActiveAdmin, roleCanAccess, validateSystemResetConfirmation } from '../../src/utils/systemAccessWorkflows.js';

const n = (value = 0) => Number(value || 0) || 0;
const today = () => '2026-01-01';
const paidOf = (sale, payments) => n(sale.montant_paye) || payments.filter((p) => p.order_id === sale.id).reduce((sum, p) => sum + n(p.montant), 0);
const totalOf = (sale) => n(sale.montant_total || sale.total || sale.total_amount || sale.amount || n(sale.quantity || sale.quantite) * n(sale.unit_price || sale.prix_unitaire));
const remainingOf = (sale, payments) => Math.max(0, totalOf(sale) - paidOf(sale, payments));
const isPaid = (sale, payments) => remainingOf(sale, payments) <= 0;

function animalReadyOpportunity(animal) {
  return {
    opportunity_key: `animal-sale:${animal.id}`,
    source_module: 'animaux',
    source_type: 'animal',
    source_id: animal.id,
    quantity: 1,
    unite: 'tête',
    statut: 'ouverte',
    montant_estime: n(animal.prix_vente_estime),
  };
}

function avicoleLotOpportunity(lot) {
  return {
    opportunity_key: `avicole-sale:${lot.id}`,
    source_module: 'avicole',
    source_type: lot.type === 'chair' ? 'poulets_chair' : 'lot_pondeuses',
    source_id: lot.id,
    quantity: n(lot.effectif_actuel),
    unite: 'tête',
    statut: 'ouverte',
  };
}

function eggOpportunity(lot, eggs, date = today()) {
  return {
    opportunity_key: `avicole-eggs:${lot.id}:${date}`,
    source_module: 'avicole',
    source_type: 'oeufs',
    source_id: lot.id,
    quantity: Math.floor(n(eggs) / 30),
    unite: 'tablette',
    eggs_count: n(eggs),
    statut: 'ouverte',
  };
}

function cultureHarvestSync(culture) {
  const qty = n(culture.quantite_recoltee);
  return {
    stock: {
      stock_key: `culture-stock:${culture.id}`,
      source_module: 'cultures',
      source_type: 'culture',
      source_id: culture.id,
      quantite: qty,
      unite: culture.unite_recolte || 'kg',
    },
    opportunity: {
      opportunity_key: `culture-sale:${culture.id}`,
      source_module: 'cultures',
      source_type: 'recolte_culture',
      source_id: culture.id,
      quantity: qty,
      unite: culture.unite_recolte || 'kg',
      statut: 'ouverte',
    },
  };
}

function normalizeClient(client, sales, payments) {
  const clientSales = sales.filter((sale) => sale.client_id === client.id || sale.client_label === client.nom);
  const debt = clientSales.reduce((sum, sale) => sum + remainingOf(sale, payments), 0);
  return { ...client, creance_reelle: debt, statut: debt > 0 ? 'a_relancer' : 'a_jour' };
}

function healthFollowUp(health) {
  const key = `health-action:${health.id}`;
  if (['retard', 'en_retard', 'overdue'].includes(health.statut)) {
    return {
      task: { task_dedupe_key: key, status: 'a_faire', module_lie: 'sante' },
      alert: { alert_dedupe_key: key, status: 'nouvelle', module_source: 'sante' },
    };
  }
  if (['fait', 'termine', 'realise', 'administre', 'ok'].includes(health.statut)) {
    return {
      task: { task_dedupe_key: key, status: 'termine', module_lie: 'sante' },
      alert: { alert_dedupe_key: key, status: 'resolue', module_source: 'sante' },
    };
  }
  return null;
}

test.describe('Audit métier avec données simulées Horizon Farm', () => {
  test('animal prêt à vendre crée une opportunité unique exploitable', () => {
    const animal = { id: 'BOV002', statut: 'pret_a_la_vente', prix_vente_estime: 450000 };
    const opportunity = animalReadyOpportunity(animal);
    expect(opportunity).toMatchObject({ opportunity_key: 'animal-sale:BOV002', source_module: 'animaux', source_id: 'BOV002', statut: 'ouverte', quantity: 1 });
    expect(opportunity.montant_estime).toBe(450000);
  });

  test('avicole prépare les ventes lot et œufs sans doublons métier', () => {
    const lot = { id: 'LOT-CHAIR-001', type: 'chair', effectif_actuel: 480 };
    const lotOpp = avicoleLotOpportunity(lot);
    const eggsOpp = eggOpportunity({ id: 'LOT-PONDEUSE-001' }, 300, today());
    expect(lotOpp).toMatchObject({ opportunity_key: 'avicole-sale:LOT-CHAIR-001', source_type: 'poulets_chair', quantity: 480, statut: 'ouverte' });
    expect(eggsOpp).toMatchObject({ opportunity_key: 'avicole-eggs:LOT-PONDEUSE-001:2026-01-01', source_type: 'oeufs', quantity: 10, eggs_count: 300, unite: 'tablette' });
  });

  test('récolte culture devient stock vendable et opportunité vente', () => {
    const culture = { id: 'CULT-TOMATE-001', nom: 'Tomates serre 1', quantite_recoltee: 120, unite_recolte: 'kg', prix_vente_estime: 900 };
    const result = buildCultureHarvestWorkflow({ after: culture, date: today() });
    expect(result.stock).toMatchObject({ stock_key: 'culture-stock:CULT-TOMATE-001', source_module: 'cultures', quantite: 120, unite: 'kg' });
    expect(result.opportunity).toMatchObject({ opportunity_key: 'culture-sale:CULT-TOMATE-001', source_type: 'recolte_culture', quantity: 120, statut: 'ouverte' });
    expect(result.event).toMatchObject({ event_type: 'recolte_culture_disponible', entity_id: 'CULT-TOMATE-001' });
  });

  test('vente soldée bloque les encaissements supplémentaires', () => {
    const sale = { id: 'CMD001', montant_total: 100000, montant_paye: 100000, client_id: 'CLI001' };
    const payments = [];
    expect(remainingOf(sale, payments)).toBe(0);
    expect(isPaid(sale, payments)).toBe(true);
  });

  test('client payé ne reste pas à relancer', () => {
    const client = { id: 'CLI001', nom: 'Client test', statut: 'a_relancer' };
    const sales = [{ id: 'CMD001', client_id: 'CLI001', montant_total: 100000, montant_paye: 100000 }];
    const normalized = normalizeClient(client, sales, []);
    expect(normalized.creance_reelle).toBe(0);
    expect(normalized.statut).toBe('a_jour');
  });

  test('finance ne compte pas le reste à encaisser comme argent reçu', () => {
    const cash = computeFinanceCash({
      salesOrders: [{ id: 'CMD-CREDIT-001', montant_total: 100000 }],
      payments: [{ id: 'PAY-001', order_id: 'CMD-CREDIT-001', montant: 40000 }],
      transactions: [],
      fournisseurs: [{ id: 'FOU-001', dette: 15000 }],
    });
    expect(cash.cashIn).toBe(40000);
    expect(cash.receivables).toBe(60000);
    expect(cash.debts).toBe(15000);
    expect(cash.cashBalance).toBe(40000);
  });

  test('soin en retard ouvre tâche/alerte et soin fait les clôture', () => {
    const overdue = healthFollowUp({ id: 'VAC001', statut: 'retard' });
    const done = healthFollowUp({ id: 'VAC001', statut: 'fait' });
    expect(overdue.task).toMatchObject({ task_dedupe_key: 'health-action:VAC001', status: 'a_faire' });
    expect(overdue.alert).toMatchObject({ alert_dedupe_key: 'health-action:VAC001', status: 'nouvelle' });
    expect(done.task.status).toBe('termine');
    expect(done.alert.status).toBe('resolue');
  });

  test('ramassage œufs normalisé ne bloque pas et calcule les tablettes', () => {
    const log = normalizeProductionOeufsLog({
      id: 'PONTE-TERRAIN-001',
      lot_id: 'LOT-PONDEUSE-001',
      date: '2026-05-26',
      oeufs_produits: 300,
      oeufs_casses: 0,
      type_evenement: 'ramassage_oeufs',
    });
    expect(log).toMatchObject({ lot_id: 'LOT-PONDEUSE-001', oeufs_produits: 300, oeufs_vendables: 300, plateaux: 10 });
    expect(Math.floor(log.oeufs_vendables / 30)).toBe(10);
  });

  test('effectif actuel avicole exclut morts/vendus/sorties mais pas malades', () => {
    const lot = normalizeLot({
      id: 'LOT-EFFECTIF-001',
      type: 'Pondeuse',
      initial_count: 100,
      mortality: 5,
      vendus: 10,
      sorties: 0,
      malades: 3,
      current_count: 100,
    });
    expect(avicoleActiveCount(lot)).toBe(85);
    expect(lot.current_count).toBe(85);
    expect(lot.effectif_actuel).toBe(85);
    expect(avicoleSickCount(lot)).toBe(3);
  });

  test('cycles avicoles ne dupliquent pas les lots et ne classent pas les pondeuses en chair', () => {
    const cycles = buildCalculatedCycleDates({
      lots: [
        { id: 'LOT-CHAIR-001', type: 'Chair', name: 'Lot chair test', date_debut: '2026-05-01', initial_count: 100 },
        { id: 'LOT-PONDEUSE-001', type: 'Pondeuse', name: 'Lot pondeuses test', date_debut: '2026-05-01', initial_count: 100 },
      ],
    });
    expect(cycles.chairSales.map((row) => row.id)).toEqual(['LOT-CHAIR-001']);
    expect(cycles.layerReform.map((row) => row.id)).toEqual(['LOT-PONDEUSE-001']);
  });

  test('fiche animal complète affiche les champs terrain importants', () => {
    const source = readFileSync('src/modules/AnimauxSpeciesFocused.jsx', 'utf8');
    [
      'Identifiant / boucle',
      'Nom / repère',
      'Espèce',
      'Sexe',
      'Race',
      'Âge',
      'Date naissance',
      'Date entrée',
      'Origine',
      'Statut actuel',
      'État de santé',
      'Localisation',
      'Poids entrée',
      'Poids actuel',
      'Prix achat',
      'Coût cumulé',
      'Valeur estimée',
      'Documents / photos',
      'Historique de vie',
      'Notes terrain',
    ].forEach((label) => expect(source).toContain(label));
    expect(source).toContain('Non renseigné');
  });

  test('comptabilité reste centrée sur preuves et contrôle sans jargon inutile', () => {
    const compta = [
      readFileSync('src/modules/ComptabiliteV6.jsx', 'utf8'),
      readFileSync('src/modules/AutomaticAccountingPanel.jsx', 'utf8'),
      readFileSync('src/modules/AccountingAutoEntriesPreview.jsx', 'utf8'),
    ].join('\n');
    ['Preuves manquantes', 'Reste à encaisser', 'Reste à payer', 'Vérification caisse/banque', 'Lignes comptables'].forEach((label) => expect(compta).toContain(label));
    ['Créances suivies', 'Dettes a regulariser', 'Justificatifs manquants'].forEach((label) => expect(compta).not.toContain(label));
  });

  test('stock critique crée une alerte, une tâche et une trace liées', () => {
    const stock = { id: 'STK-ALIM-001', produit: 'Aliment pondeuses', quantite: 4, seuil: 10, stock_max: 30, unite: 'kg', prixUnit: 250 };
    const followUp = buildStockCriticalFollowUp(stock);
    expect(followUp.task).toMatchObject({ module_lie: 'stock', source_module: 'stock', source_record_id: 'STK-ALIM-001', status: 'a_faire' });
    expect(followUp.alert).toMatchObject({ module_source: 'stock', entity_id: 'STK-ALIM-001', status: 'nouvelle' });
    expect(followUp.event).toMatchObject({ event_type: 'stock_critique_detecte', module_source: 'stock', entity_id: 'STK-ALIM-001' });
    expect(followUp.task.task_dedupe_key).toBe(followUp.alert.alert_dedupe_key);
  });

  test('entrée fournisseur augmente le stock et la sortie alimentation le décrémente', () => {
    const stock = { id: 'STK-MAIS-001', produit: 'Maïs concassé', quantite: 12, seuil: 5, unite: 'kg', prixUnit: 180 };
    const reception = applyStockMovement(stock, { type: 'entree', qty: 20, motif: 'Réception fournisseur' });
    expect(reception.stock.quantite).toBe(32);
    expect(reception.event).toMatchObject({ event_type: 'reception_stock', entity_id: 'STK-MAIS-001', quantity: 20 });
    const sortie = applyStockMovement(reception.stock, { type: 'sortie', qty: 7, motif: 'Alimentation lot pondeuses' });
    expect(sortie.stock.quantite).toBe(25);
    expect(sortie.event).toMatchObject({ event_type: 'sortie_stock', quantity: 7 });
  });

  test('perte stock crée une trace avec impact valeur', () => {
    const stock = { id: 'STK-OEUFS-001', produit: 'Tablettes œufs', quantite: 15, seuil: 4, unite: 'tablette', prixUnit: 2500 };
    const loss = applyStockMovement(stock, { type: 'perte', qty: 2, motif: 'Casse transport' });
    expect(loss.stock.quantite).toBe(13);
    expect(loss.event).toMatchObject({ event_type: 'perte_stock', entity_id: 'STK-OEUFS-001', severity: 'warning', amount: 5000 });
  });

  test('stock n’affiche pas de valeurs techniques dans les libellés terrain', () => {
    const source = [
      readFileSync('src/modules/StocksV3.jsx', 'utf8'),
      readFileSync('src/modules/StocksV4.jsx', 'utf8'),
      readFileSync('src/modules/StockOperationalHealthPanel.jsx', 'utf8'),
      readFileSync('src/modules/StockReorderTasksBridge.jsx', 'utf8'),
    ].join('\n');
    ['undefined', '[object Object]', 'NaN'].forEach((technicalText) => expect(source).not.toContain(`>${technicalText}<`));
    ['Créer / réceptionner stock', 'Utiliser aliment', 'Perte', 'Source liée', 'Preuve / facture'].forEach((label) => expect(source).toContain(label));
  });

  test('santé crée une tâche et une alerte liées pour un soin en retard', () => {
    const followUp = buildHealthFollowUp({
      id: 'SAN-RETARD-001',
      nom: 'Vaccin rappel bovin',
      statut: 'retard',
      related_id: 'BOV002',
      prevue: '2026-05-20',
    }, 'test terrain');
    expect(followUp.task).toMatchObject({ module_lie: 'sante', source_module: 'sante', related_id: 'SAN-RETARD-001', status: 'a_faire' });
    expect(followUp.alert).toMatchObject({ module_source: 'sante', entity_id: 'SAN-RETARD-001', status: 'nouvelle' });
    expect(followUp.task.task_dedupe_key).toBe(followUp.alert.alert_dedupe_key);
  });

  test('coût santé crée une dépense finance non doublonnée', () => {
    const first = buildHealthCostTransaction({ id: 'SAN-COUT-001', nom: 'Traitement respiratoire', cout: 12500, target_summary: 'BOV002' });
    const second = buildHealthCostTransaction({ id: 'SAN-COUT-001', nom: 'Traitement respiratoire', cout: 12500, linked_finance_transaction_id: first.id });
    expect(first).toMatchObject({ type: 'sortie', module_lie: 'sante', source_record_id: 'SAN-COUT-001', montant: 12500 });
    expect(second).toBeNull();
  });

  test('preuve santé devient un document fourni à vérifier', () => {
    const document = buildHealthProofDocument({
      id: 'SAN-PREUVE-001',
      nom: 'Ordonnance véto',
      preuve_type: 'ordonnance_photo',
      preuve_photo_data: 'data:image/jpeg;base64,abc',
      preuve_file_name: 'ordonnance.jpg',
    });
    expect(document).toMatchObject({ module_source: 'sante', entity_id: 'SAN-PREUVE-001', document_category: 'ordonnance', status: 'fourni', verification_status: 'a_verifier' });
  });

  test('vente plafonne un encaissement trop élevé au reste à payer', () => {
    const sale = { id: 'CMD-OVERPAY-001', montant_total: 100000, montant_paye: 60000 };
    expect(capSalePayment(sale, [], 80000)).toBe(40000);
    expect(capSalePayment({ ...sale, montant_paye: 100000 }, [], 10000)).toBe(0);
  });

  test('vente stock décrémente la source vendue', () => {
    const patch = buildSaleSourcePatch({
      sourceType: 'stock',
      sourceRow: { id: 'STK-TOMATE-001', produit: 'Tomates récoltées', quantite: 100, vendus: 10 },
      quantity: 25,
      total: 25000,
      date: '2026-05-26',
      orderId: 'CMD-STOCK-001',
      clientId: 'CLI-001',
    });
    expect(patch).toMatchObject({ module: 'stock', id: 'STK-TOMATE-001' });
    expect(patch.patch.quantite).toBe(75);
    expect(patch.patch.vendus).toBe(35);
  });

  test('vente animal sort l’animal des actifs', () => {
    const patch = buildSaleSourcePatch({
      sourceType: 'animal',
      sourceRow: { id: 'BOV002', statut: 'actif' },
      quantity: 1,
      total: 450000,
      date: '2026-05-26',
      orderId: 'CMD-ANIMAL-001',
    });
    expect(patch).toMatchObject({ module: 'animal', id: 'BOV002' });
    expect(patch.patch.statut).toBe('vendu');
    expect(patch.patch.prix_vente_reel).toBe(450000);
  });

  test('client crédit passe à relancer et client payé reste à jour', () => {
    const client = { id: 'CLI-TERRAIN-001', nom: 'Restaurant Keur Horizon' };
    const credit = normalizeClientFromSales(client, [{ id: 'CMD-CLI-001', client_label: 'Restaurant Keur Horizon', montant_total: 90000, montant_paye: 40000 }], []);
    const paid = normalizeClientFromSales(client, [{ id: 'CMD-CLI-002', client_id: 'CLI-TERRAIN-001', montant_total: 90000, montant_paye: 90000 }], []);
    expect(credit).toMatchObject({ statut: 'a_relancer', creance_reelle: 50000, relance_requise: true });
    expect(paid).toMatchObject({ statut: 'a_jour', creance_reelle: 0, relance_requise: false });
  });

  test('fiche client conserve paiements et dernière commande lisibles', () => {
    const client = { id: 'CLI-FICHE-001', nom: 'Cantine Horizon' };
    const summary = buildClientSalesSummary(
      client,
      [
        { id: 'CMD-FICHE-001', client_id: 'CLI-FICHE-001', montant_total: 25000, date: '2026-05-20' },
        { id: 'CMD-FICHE-002', client_label: 'Cantine Horizon', montant_total: 30000, date: '2026-05-22' },
      ],
      [{ id: 'PAY-FICHE-001', order_id: 'CMD-FICHE-001', montant: 25000 }],
    );
    expect(summary.clientPayments).toHaveLength(1);
    expect(summary.derniereCommandeVente).toBe('2026-05-22');
  });

  test('relance client crée tâche, alerte et trace liées', () => {
    const client = { id: 'CLI-RELANCE-001', nom: 'Boutique Awa' };
    const followUp = buildClientReminderFollowUp(client, { resteAPayer: 35000 });
    expect(followUp.task).toMatchObject({ module_lie: 'clients', source_module: 'clients', related_id: 'CLI-RELANCE-001', status: 'a_faire' });
    expect(followUp.alert).toMatchObject({ module_source: 'clients', entity_id: 'CLI-RELANCE-001', status: 'nouvelle' });
    expect(followUp.event).toMatchObject({ event_type: 'relance_client_preparee', module_source: 'clients', amount: 35000 });
    expect(followUp.task.task_dedupe_key).toBe(followUp.alert.alert_dedupe_key);
  });

  test('suppression client liée à une vente est bloquée', () => {
    const client = { id: 'CLI-BLOCK-001', nom: 'Client historique' };
    expect(canDeleteClient(client, [{ id: 'CMD-BLOCK-001', client_id: 'CLI-BLOCK-001', montant_total: 10000 }])).toBe(false);
    expect(canDeleteClient(client, [])).toBe(true);
  });

  test('réception fournisseur crée stock, dette et facture manquante', () => {
    const supplier = { id: 'FOU-ALIMENT-001', nom: 'Aliments Diop', dettes: 0 };
    const stock = { id: 'STK-ALIMENT-001', produit: 'Aliment pondeuses', quantite: 4, prix_unitaire: 12500 };
    const workflow = buildSupplierReceptionWorkflow({ supplier, stock, qty: 8, unitPrice: 12500, date: today() });
    expect(workflow.stockPatch.quantite).toBe(12);
    expect(workflow.debtTransaction).toMatchObject({ type: 'sortie', statut: 'a_payer', cash_effect: false, is_supplier_accrual: true, montant: 100000 });
    expect(workflow.missingInvoiceDocument).toMatchObject({ module_source: 'fournisseurs', status: 'manquant', verification_status: 'preuve_manquante' });
    expect(workflow.supplierPatch.dettes).toBe(100000);
  });

  test('paiement fournisseur solde la dette sans double compter la réception', () => {
    const supplier = { id: 'FOU-PAIE-001', nom: 'Fournisseur suivi', dettes: 100000 };
    const openDebt = { id: 'TRX-DETTE-001', type: 'sortie', statut: 'a_payer', montant: 100000, cash_effect: false, is_supplier_accrual: true, fournisseur_id: supplier.id };
    const payment = buildSupplierPaymentWorkflow({ supplier, debtAmount: 100000, openDebtTransactions: [openDebt], date: today() });
    const settledDebt = { ...openDebt, ...payment.debtTransactionPatches[0].patch };
    const settlement = calculateSupplierSettlement(
      { ...supplier, ...payment.supplierPatch },
      { transactions: [settledDebt, payment.paymentTransaction], stocks: [], documents: [payment.paymentProofDocument] },
    );
    expect(payment.paymentTransaction).toMatchObject({ type: 'sortie', cash_effect: true, payment_for: 'supplier_debt', montant: 100000 });
    expect(payment.paymentProofDocument.status).toBe('manquant');
    expect(settlement.dettes).toBe(0);
    expect(settlement.paiements).toBe(100000);
  });

  test('retard paiement fournisseur crée tâche et alerte liées', () => {
    const supplier = { id: 'FOU-RETARD-001', nom: 'Semences Ndiaye' };
    const followUp = buildSupplierDebtFollowUp(supplier, 45000, today());
    expect(followUp.task).toMatchObject({ module_lie: 'fournisseurs', related_id: 'FOU-RETARD-001', status: 'a_faire' });
    expect(followUp.alert).toMatchObject({ module_source: 'fournisseurs', entity_id: 'FOU-RETARD-001', status: 'nouvelle' });
    expect(followUp.task.task_dedupe_key).toBe(followUp.alert.alert_dedupe_key);
  });

  test('document manquant ne compte pas comme preuve valide', () => {
    const tx = { id: 'TRX-DOC-001', montant: 175000, type: 'sortie' };
    const missingDoc = { id: 'DOC-MISS-001', transaction_id: 'TRX-DOC-001', title: 'Facture à joindre', status: 'fourni', verification_status: 'preuve_manquante' };
    const validDoc = { id: 'DOC-OK-001', transaction_id: 'TRX-DOC-001', title: 'Facture fournisseur', status: 'fourni', file_url: 'simulation://facture.pdf' };
    expect(transactionHasProof(tx, [missingDoc])).toBe(false);
    expect(transactionHasProof(tx, [validDoc])).toBe(true);
  });

  test('dépense importante sans preuve crée tâche et alerte document', () => {
    const document = { id: 'DOC-TASK-001', title: 'Facture pompe à joindre', transaction_id: 'TRX-POMPE-001', status: 'manquant', montant: 240000 };
    const followUp = buildDocumentProofFollowUp({ document, transaction: { id: 'TRX-POMPE-001', montant: 240000 }, date: today() });
    expect(followUp.task).toMatchObject({ module_lie: 'documents', related_id: 'DOC-TASK-001', priority: 'haute', status: 'a_faire' });
    expect(followUp.alert).toMatchObject({ module_source: 'documents', entity_id: 'DOC-TASK-001', severity: 'warning', status: 'nouvelle' });
    expect(followUp.task.task_dedupe_key).toBe(followUp.alert.alert_dedupe_key);
  });

  test('document lié conserve module source et statut preuve lisible', () => {
    const payload = normalizeDocumentPayload(
      { id: 'DOC-LINK-001', title: 'Ordonnance BOV002', module_source: 'animaux', entity_id: 'BOV002', document_category: 'ordonnance' },
      { animaux: [{ id: 'BOV002', nom: 'Taureau BOV002' }] },
    );
    expect(payload).toMatchObject({ entity_type: 'animal', related_id: 'BOV002', status: 'manquant', verification_status: 'preuve_manquante' });
  });

  test('alerte crée une tâche liée sans doublon de checklist', () => {
    const alert = { id: 'ALT-TASK-001', title: 'Stock aliment critique', message: 'Commander aliment', module_source: 'stock', entity_type: 'stock', entity_id: 'STK-ALIM-001', severity: 'critique', action_recommandee: 'Commander aliment' };
    const workflow = buildTaskFromAlert(alert, [], today());
    expect(workflow.task).toMatchObject({ module_lie: 'stock', source_module: 'alertes', source_record_id: 'ALT-TASK-001', priority: 'critique', status: 'a_faire' });
    expect(workflow.alertPatch).toMatchObject({ linked_task_id: workflow.task.id, status: 'lue' });
    expect(workflow.task.checklist).not.toContain('Stock aliment critique');
  });

  test('tâche terminée clôture alerte liée et trace action', () => {
    const workflow = completeTaskWorkflow({ id: 'TSK-DONE-001', title: 'Planifier paiement', source_module: 'alertes', source_record_id: 'ALT-DONE-001', module_lie: 'fournisseurs', related_id: 'FOU-001' }, today(), '2026-01-01T08:00:00.000Z');
    expect(workflow.taskPatch).toMatchObject({ status: 'termine', statut: 'termine' });
    expect(workflow.alertPatch).toMatchObject({ id: 'ALT-DONE-001', patch: { status: 'traitee', completed_task_id: 'TSK-DONE-001' } });
    expect(workflow.event).toMatchObject({ event_type: 'tache_terminee', linked_task_id: 'TSK-DONE-001', linked_alert_id: 'ALT-DONE-001' });
  });

  test('checklist tâche ne duplique pas le titre ni les étapes génériques', () => {
    expect(normalizeTaskChecklist('Réparer pompe; À faire; Vérifier; Tester après réparation', 'Réparer pompe')).toEqual(['Tester après réparation']);
    const payload = normalizeTaskPayload({ title: 'Réparer pompe', checklist: 'Réparer pompe\nVérifier\nCommander pièce', module_lie: 'equipements' });
    expect(payload.checklist).toBe('Commander pièce');
  });

  test('alertes même source sont dédupliquées en gardant l’ouverte récente', () => {
    const alerts = dedupeAlertsBySource([
      { id: 'ALT-OLD', module_source: 'stock', entity_type: 'stock', entity_id: 'STK-1', action_recommandee: 'Commander', status: 'resolue', updated_at: '2026-01-01T08:00:00Z' },
      { id: 'ALT-NEW', module_source: 'stock', entity_type: 'stock', entity_id: 'STK-1', action_recommandee: 'Commander', status: 'nouvelle', updated_at: '2026-01-02T08:00:00Z' },
    ]);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].id).toBe('ALT-NEW');
    expect(isAlertResolved(alerts[0])).toBe(false);
  });

  test('alerte ignorée est considérée fermée', () => {
    expect(isAlertResolved({ status: 'ignoree' })).toBe(true);
  });

  test('intrant culture décrémente le stock et augmente le coût culture', () => {
    const workflow = buildCultureInputUsageWorkflow({
      culture: { id: 'CULT-INTRANT-001', nom: 'Tomates bloc A', cout_total_reel: 50000 },
      stock: { id: 'STK-ENGRAIS-001', produit: 'Engrais maraîchage', quantite: 40, seuil: 10, unite: 'kg', prix_unitaire: 900 },
      qty: 12,
      motif: 'Fertilisation après arrosage',
      date: today(),
    });
    expect(workflow.stockPatch).toMatchObject({ quantite: 28, last_movement_type: 'sortie_intrant_culture', last_movement_qty: 12 });
    expect(workflow.culturePatch).toMatchObject({ cout_total_reel: 60800, cout_intrants: 10800, derniere_sortie_intrant_stock_id: 'STK-ENGRAIS-001' });
    expect(workflow.event).toMatchObject({ event_type: 'intrant_culture_utilise', module_source: 'cultures', linked_stock_id: 'STK-ENGRAIS-001', amount: 10800 });
  });

  test('perte culture réduit le disponible et crée une trace de valeur', () => {
    const workflow = buildCultureLossWorkflow({
      culture: { id: 'CULT-PERTE-001', nom: 'Oignons parcelle 2', quantite_disponible: 80, unite_recolte: 'kg', prix_vente_unitaire: 700, statut: 'recolte' },
      qty: 25,
      reason: 'Dégâts chaleur',
      date: today(),
    });
    expect(workflow.culturePatch).toMatchObject({ quantite_disponible: 55, pertes: 25, quantite_perdue: 25, valeur_perte_estimee: 17500, statut: 'recolte' });
    expect(workflow.event).toMatchObject({ event_type: 'perte_culturale', entity_id: 'CULT-PERTE-001', severity: 'warning', amount: 17500 });
  });

  test('risque météo culture propose une tâche et une alerte liées', () => {
    const workflow = buildCultureWeatherRiskFollowUp({ culture: { id: 'CULT-METEO-001', nom: 'Piments serre' }, reason: 'Fort risque de chaleur sur serre', severity: 'critique', date: today() });
    expect(workflow.task).toMatchObject({ module_lie: 'cultures', related_id: 'CULT-METEO-001', priority: 'critique', status: 'a_faire' });
    expect(workflow.alert).toMatchObject({ module_source: 'cultures', entity_id: 'CULT-METEO-001', severity: 'critique', status: 'nouvelle' });
    expect(workflow.task.task_dedupe_key).toBe(workflow.alert.alert_dedupe_key);
  });

  test('investissement réalisé crée sortie finance, preuve et trace BP', () => {
    const workflow = buildInvestmentRealizationWorkflow({
      id: 'BPLI-POMPE-001',
      designation: 'Pompe irrigation solaire',
      total: 350000,
      business_plan_id: 'BP-HORIZON-FARM',
    }, { date: today() });
    expect(workflow.financeTransaction).toMatchObject({ type: 'sortie', module_lie: 'investissements', source_record_id: 'BPLI-POMPE-001', montant: 350000, cash_effect: true });
    expect(workflow.proofDocument).toMatchObject({ module_source: 'investissements', entity_id: 'BPLI-POMPE-001', status: 'manquant', verification_status: 'preuve_manquante' });
    expect(workflow.linePatch).toMatchObject({ statut: 'effectif', montant_reel: 350000 });
    expect(workflow.event).toMatchObject({ event_type: 'investissement_realise', amount: 350000 });
  });

  test('investissement payé crée un actif métier une seule fois', () => {
    const workflow = buildInvestmentAssetWorkflow({
      id: 'BPLI-POUSSINS-001',
      designation: 'Poussins pondeuses',
      quantite: 100,
      prix_unitaire: 900,
      business_plan_id: 'BP-HORIZON-FARM',
      linked_finance_transaction_id: 'TRX-INV-001',
      statut: 'effectif',
    }, { date: today() });
    expect(workflow.module).toBe('avicole');
    expect(workflow.payloads).toHaveLength(1);
    expect(workflow.payloads[0]).toMatchObject({ type: 'Pondeuse', initial_count: 100, current_count: 100, source_module: 'investissements' });
    expect(workflow.linePatch).toMatchObject({ asset_module: 'avicole', asset_status: 'cree', statut: 'lie_metier' });
    expect(buildInvestmentAssetWorkflow({ ...workflow.linePatch, id: 'BPLI-POUSSINS-001', designation: 'Poussins pondeuses' })).toBeNull();
  });

  test('rapport généré conserve le brouillon modifié dans le document', () => {
    const workflow = buildReportGenerationWorkflow({
      existing: { id: 'RPT-MENSUEL-001', draft_content: 'Brouillon terrain modifié par Penda' },
      type: 'mensuel_erp',
      period: '2026-05',
      content: { summary: 'Résumé automatique', sales: 150000, paid: 120000, receivables: 30000, recommendations: ['Relancer clients'] },
      date: today(),
    });
    expect(workflow.reportPayload).toMatchObject({ id: 'RPT-MENSUEL-001', status: 'genere', draft_content: 'Brouillon terrain modifié par Penda' });
    expect(workflow.document).toMatchObject({ module_source: 'rapports', entity_id: 'RPT-MENSUEL-001', content: 'Brouillon terrain modifié par Penda' });
    expect(workflow.event.event_type).toBe('rapport_mis_a_jour');
  });

  test('rapport programmé crée une tâche de préparation claire', () => {
    const task = buildReportScheduleTask({ report: { id: 'RPT-PROG-001', title: 'Rapport mensuel mai' }, type: 'mensuel_erp', period: '2026-05', dueDate: today() });
    expect(task).toMatchObject({ module_lie: 'rapports', source_module: 'rapports', source_record_id: 'RPT-PROG-001', status: 'a_faire' });
    expect(task.checklist).toContain('Générer PDF');
  });

  test('indicateur impact faible crée une tâche actionnable', () => {
    const task = buildImpactImprovementTask({
      indicator: 'Stocks sous seuil',
      module: 'stock',
      entityId: 'STK-CRIT-001',
      reason: 'Stock aliment sous seuil dans Impact & Valeur',
      priority: 'haute',
      date: today(),
    });
    expect(task).toMatchObject({ module_lie: 'stock', source_module: 'impact_business', source_record_id: 'STK-CRIT-001', priority: 'haute', status: 'a_faire' });
    expect(task.checklist).toContain('Vérifier la donnée source');
  });

  test('preuve manquante impact crée document, tâche et trace', () => {
    const workflow = buildImpactMissingProofWorkflow({
      module: 'ventes',
      entityId: 'CMD-IMPACT-001',
      title: 'Facture vente tomates',
      amount: 150000,
      reason: 'Preuve demandée pour dossier financeur',
      date: today(),
    });
    expect(workflow.document).toMatchObject({ module_source: 'ventes', entity_id: 'CMD-IMPACT-001', status: 'manquant', verification_status: 'preuve_manquante' });
    expect(workflow.task).toMatchObject({ module_lie: 'documents', source_module: 'impact_business', priority: 'haute', status: 'a_faire' });
    expect(workflow.event).toMatchObject({ event_type: 'preuve_impact_demandee', linked_document_id: workflow.document.id, linked_task_id: workflow.task.id });
  });

  test('risque impact fort crée alerte et tâche liées', () => {
    const workflow = buildImpactRiskFollowUp({
      riskTitle: 'Soins en retard',
      module: 'sante',
      entityId: 'SAN-RETARD-IMPACT',
      severity: 'critique',
      date: today(),
    });
    expect(workflow.task).toMatchObject({ module_lie: 'sante', source_module: 'impact_business', related_id: 'SAN-RETARD-IMPACT', priority: 'critique' });
    expect(workflow.alert).toMatchObject({ module_source: 'sante', entity_id: 'SAN-RETARD-IMPACT', severity: 'critique', status: 'nouvelle', linked_task_id: workflow.task.id });
    expect(workflow.event).toMatchObject({ event_type: 'risque_impact_signale', linked_task_id: workflow.task.id, linked_alert_id: workflow.alert.id });
  });

  test('panne équipement crée tâche, alerte et trace liées', () => {
    const workflow = buildEquipmentBreakdownFollowUp(
      { id: 'EQP-POMPE-001', name: 'Pompe irrigation' },
      { date: today(), note: 'Pompe arrêtée pendant arrosage', priority: 'critique' },
    );
    expect(workflow.equipmentPatch).toMatchObject({ status: 'panne', statut: 'panne', last_incident_date: today() });
    expect(workflow.task).toMatchObject({ module_lie: 'equipements', source_module: 'equipements', related_id: 'EQP-POMPE-001', priority: 'critique', status: 'a_faire' });
    expect(workflow.alert).toMatchObject({ module_source: 'equipements', entity_id: 'EQP-POMPE-001', severity: 'critique', status: 'nouvelle', linked_task_id: workflow.task.id });
    expect(workflow.event).toMatchObject({ event_type: 'panne_equipement_declaree', linked_task_id: workflow.task.id, linked_alert_id: workflow.alert.id });
  });

  test('réparation équipement clôture tâche/alerte et crée finance/document', () => {
    const workflow = buildEquipmentRepairWorkflow({
      equipment: { id: 'EQP-POMPE-001', name: 'Pompe irrigation', status: 'panne' },
      task: { id: 'TSK-EQP-001', status: 'a_faire' },
      alert: { id: 'ALT-EQP-001', status: 'nouvelle' },
      cost: 45000,
      note: 'Courroie remplacée',
      date: today(),
    });
    expect(workflow.equipmentPatch).toMatchObject({ status: 'operationnel', statut: 'operationnel', maintenance_status: 'termine', repair_cost: 45000 });
    expect(workflow.taskPatch).toMatchObject({ id: 'TSK-EQP-001', patch: { status: 'termine', statut: 'termine' } });
    expect(workflow.alertPatch).toMatchObject({ id: 'ALT-EQP-001', patch: { status: 'resolue', statut: 'resolue' } });
    expect(workflow.financeTransaction).toMatchObject({ type: 'sortie', module_lie: 'equipements', source_record_id: 'EQP-POMPE-001', montant: 45000, cash_effect: true });
    expect(workflow.document).toMatchObject({ module_source: 'equipements', entity_id: 'EQP-POMPE-001', status: 'manquant', verification_status: 'preuve_manquante' });
    expect(workflow.event).toMatchObject({ event_type: 'reparation_equipement_cloturee', linked_task_id: 'TSK-EQP-001', linked_alert_id: 'ALT-EQP-001', amount: 45000 });
  });

  test('salaire RH payé crée finance, preuve salaire et trace', () => {
    const workflow = buildRhSalaryWorkflow({
      person: { id: 'RH-AWA-001', nom: 'Awa Diop', equipe_id: 'TEAM-FERME', modules: ['avicole', 'stock'], salaire_mensuel: 90000, prime_mensuelle: 10000, avance_mois: 15000 },
      teams: [{ id: 'TEAM-FERME', name: 'Équipe ferme' }],
      date: today(),
    });
    expect(workflow.financeTransaction).toMatchObject({ type: 'sortie', module_lie: 'rh', source_record_id: 'RH-AWA-001', montant: 85000, cash_effect: true });
    expect(workflow.document).toMatchObject({ module_source: 'rh', entity_id: 'RH-AWA-001', status: 'manquant', verification_status: 'preuve_manquante', montant: 85000 });
    expect(workflow.personPatch).toMatchObject({ avance_mois: 0, dernier_paiement: today(), last_payment_amount: 85000 });
    expect(workflow.event).toMatchObject({ event_type: 'paiement_remuneration', linked_transaction_id: workflow.financeTransaction.id, linked_document_id: workflow.document.id });
  });

  test('absence RH crée suivi terrain et tâche assignée', () => {
    const absence = buildRhAbsenceFollowUp({ person: { id: 'RH-IBRA-001', nom: 'Ibrahima Sarr' }, date: today(), reason: 'Absence marché' });
    expect(absence.personPatch).toMatchObject({ presence_status: 'absent', last_absence_date: today() });
    expect(absence.task).toMatchObject({ module_lie: 'rh', assigned_to: 'RH-IBRA-001', status: 'a_faire' });
    expect(absence.event).toMatchObject({ event_type: 'absence_rh_signalee', linked_task_id: absence.task.id });
  });

  test('tâche RH assignée reste visible dans le module métier', () => {
    const workflow = buildRhAssignedTask({ person: { id: 'RH-CULT-001', nom: 'Mamadou Culture' }, module: 'cultures', title: 'Arroser parcelle tomates', dueDate: today() });
    expect(workflow.task).toMatchObject({ module_lie: 'cultures', source_module: 'rh', assigned_to: 'RH-CULT-001', status: 'a_faire' });
    expect(workflow.event).toMatchObject({ event_type: 'tache_rh_assignee', linked_task_id: workflow.task.id });
  });

  test('capteur Smart Farm critique crée tâche, alerte et trace', () => {
    const workflow = buildSmartFarmDeviceFollowUp({
      device: { id: 'SENS-SERRE-001', name: 'Humidité serre tomate', status: 'online', source_type: 'reel', value: 92, seuil_max: 85, zone: 'Serre tomates' },
      kind: 'capteur',
      date: today(),
    });
    expect(isSmartFarmDeviceCritical({ value: 92, seuil_max: 85 })).toBe(true);
    expect(workflow.task).toMatchObject({ module_lie: 'smartfarm', source_record_id: 'SENS-SERRE-001', status: 'a_faire' });
    expect(workflow.alert).toMatchObject({ module_source: 'smartfarm', entity_type: 'capteur', entity_id: 'SENS-SERRE-001', status: 'nouvelle', linked_task_id: workflow.task.id });
    expect(workflow.event).toMatchObject({ event_type: 'smartfarm_signal_critique', source_type: 'reel', linked_alert_id: workflow.alert.id });
  });

  test('Smart Farm distingue données simulées et données réelles', () => {
    expect(smartDeviceSource({ id: 'SIM-SENS-01', status: 'simulation' })).toBe('simulation');
    expect(smartDeviceSource({ id: 'SENS-REAL-01', status: 'online', source_type: 'reel' })).toBe('reel');
  });

  test('caméra Smart Farm hors ligne crée une action terrain', () => {
    const workflow = buildSmartFarmDeviceFollowUp({
      device: { id: 'CAM-ENTREE-001', name: 'Caméra entrée', status: 'offline', source_type: 'reel', zone: 'Entrée principale' },
      kind: 'camera',
      date: today(),
    });
    expect(workflow.task).toMatchObject({ module_lie: 'smartfarm', related_id: 'CAM-ENTREE-001', priority: 'haute' });
    expect(workflow.alert).toMatchObject({ module_source: 'smartfarm', entity_type: 'camera', entity_id: 'CAM-ENTREE-001' });
  });

  test('Hey Horizon prépare les intentions terrain sans confondre les modules', () => {
    expect(interpretHorizonCommand('Créer une fiche de vaccination pour BOV002')).toMatchObject({ primary_module: 'sante', form_type: 'health_action', draft_fields: { target_id: 'BOV002' } });
    expect(interpretHorizonCommand('J’ai ramassé 300 œufs')).toMatchObject({ primary_module: 'avicole', form_type: 'egg_production', draft_fields: { eggs_count: 300, tablettes: 10 } });
    expect(interpretHorizonCommand('J’ai récolté 100 kg tomate')).toMatchObject({ primary_module: 'cultures', form_type: 'culture_harvest', draft_fields: { culture_name: 'tomate', quantity: 100, unit: 'kg' } });
    expect(interpretHorizonCommand('Déclarer panne pompe irrigation')).toMatchObject({ primary_module: 'equipements', form_type: 'equipment_action', draft_fields: { action_type: 'panne' } });
    expect(interpretHorizonCommand('Ajouter facture fournisseur aliments')).toMatchObject({ primary_module: 'documents', form_type: 'supplier_invoice', draft_fields: { module_source: 'fournisseurs' } });
    expect(interpretHorizonCommand('Ouvre fiche BOV002')).toMatchObject({ primary_module: 'animaux', form_type: 'entity_lookup', draft_fields: { target_id: 'BOV002' } });
    expect(interpretHorizonCommand('Montre les stocks critiques')).toMatchObject({ primary_module: 'stock', form_type: 'stock_critical_lookup', draft_fields: { filter: 'stocks_critiques' } });
  });

  test('Centre décisionnel transforme une recommandation sourcée en tâche actionnable', () => {
    const workflow = buildDecisionRecommendationTask({
      id: 'RECO-STOCK-001',
      title: 'Réapprovisionner aliment pondeuses',
      activity: 'stock',
      source_module: 'stock',
      source_id: 'STK-ALIM-001',
      priority: 'haute',
      recommendation: 'Commander 5 sacs avant rupture.',
    }, { date: today() });
    expect(workflow.task).toMatchObject({ module_lie: 'stock', source_module: 'centre_ia', source_record_id: 'STK-ALIM-001', status: 'a_faire', priority: 'haute' });
    expect(workflow.event).toMatchObject({ event_type: 'decision_action_task_created', module_source: 'centre_ia', source_module: 'stock', source_record_id: 'STK-ALIM-001', linked_task_id: workflow.task.id });
  });

  test('Objectifs & Croissance marque atteint et crée une action si objectif en retard', () => {
    expect(buildObjectiveStatus({ activity: 'oeufs', target: 100000, realized: 112000 })).toMatchObject({ key: 'atteint', label: 'Atteint' });
    const workflow = buildObjectiveActionTask({
      activity: 'poulets_chair',
      label: 'Poulets de chair',
      target: 250000,
      realized: 125000,
      remaining: 125000,
    }, { date: today() });
    expect(workflow.status).toMatchObject({ key: 'en_retard', priority: 'haute' });
    expect(workflow.task).toMatchObject({ module_lie: 'avicole', source_module: 'objectifs_croissance', source_record_id: 'poulets_chair', status: 'a_faire' });
    expect(workflow.event).toMatchObject({ event_type: 'objectif_plan_action', module_source: 'objectifs_croissance', source_module: 'avicole', linked_task_id: workflow.task.id });
  });

  test('Traçabilité source les actions sensibles et ouvre le bon module', () => {
    const saleTrace = normalizeTraceEvent({ id: 'EVT-SALE-001', event_type: 'vente_complete', module_source: 'sales_orders', linked_sale_id: 'CMD-001', title: 'Vente tomate' });
    const adminTrace = buildSensitiveActionTrace({ action: 'system_user_deleted', module: 'gestion_systeme', entityId: 'USR-001', title: 'Utilisateur supprimé', date: today() });
    const coverage = buildTraceCoverage([
      saleTrace,
      normalizeTraceEvent({ id: 'EVT-SOIN-001', event_type: 'soin_realise', module_source: 'sante', entity_id: 'BOV002', title: 'Vaccin BOV002' }),
      normalizeTraceEvent({ id: 'EVT-ORPHAN', event_type: 'paiement', title: 'Paiement sans source' }),
      adminTrace,
    ]);
    expect(routeForTrace(saleTrace)).toBe('ventes');
    expect(adminTrace).toMatchObject({ module_source: 'gestion_systeme', entity_id: 'USR-001', has_source: true });
    expect(coverage.sensitive.length).toBe(4);
    expect(coverage.sensitiveMissing.map((event) => event.id)).toContain('EVT-ORPHAN');
  });

  test('Activité & Sync détecte les incohérences et propose une action terrain', () => {
    const dataMap = {
      sales_orders: [{ id: 'CMD-001', client_id: 'CLI-001', montant_total: 50000, statut_paiement: 'non_paye' }],
      clients: [{ id: 'CLI-001', nom: 'Boutique Dakar' }],
      payments: [{ id: 'PAY-ORPHELIN', montant: 12000 }],
      invoices: [],
      finances: [],
      documents: [{ id: 'DOC-LOST', module_source: 'ventes', entity_id: 'CMD-INCONNUE', title: 'Facture introuvable' }],
      sales_opportunities: [{ id: 'OPP-001', source_id: 'STK-TOMATE-001', statut: 'ouverte' }],
      stock: [],
      taches: [],
      alertes_center: [],
      sante: [],
      business_events: [],
    };
    dataMap.sales_orders.push({ id: 'CMD-002', source_id: 'STK-TOMATE-001', montant_total: 15000 });
    const audit = auditErpInterconnections(dataMap);
    const orphanPayment = audit.issues.find((issue) => issue.module === 'payments' && issue.row_id === 'PAY-ORPHELIN');
    const missingDocument = audit.issues.find((issue) => issue.module === 'documents' && issue.row_id === 'DOC-LOST');
    const staleOpportunity = audit.issues.find((issue) => issue.module === 'sales_opportunities');
    expect(orphanPayment).toBeTruthy();
    expect(missingDocument).toBeTruthy();
    expect(staleOpportunity).toBeTruthy();
    expect(routeForSyncIssue(orphanPayment)).toBe('ventes');
    expect(syncIssueActionLabel(missingDocument)).toBe('Créer preuve / facture');
    expect(buildSyncRepairTask(staleOpportunity, { date: today() })).toMatchObject({ module_lie: 'ventes', source_module: 'sync_activity', status: 'a_faire' });
  });

  test('Gestion système protège les actions admin et trace les changements', () => {
    const users = [
      { id: 'USR-ADMIN', role: 'admin', statut: 'actif' },
      { id: 'USR-VISITEUR', role: 'visiteur', statut: 'pending' },
    ];
    expect(roleCanAccess('visiteur', 'dashboard')).toBeTruthy();
    expect(roleCanAccess('visiteur', 'finances')).toBeFalsy();
    expect(canPerformSystemAction('visiteur', 'modifier')).toBeFalsy();
    expect(canPerformSystemAction('admin', 'supprimer')).toBeTruthy();
    expect(isLastActiveAdmin(users[0], users)).toBeTruthy();
    expect(validateSystemResetConfirmation('EFFACER')).toBeTruthy();
    expect(validateSystemResetConfirmation('effacer')).toBeFalsy();
    expect(buildSystemAuditEvent('system_user_deleted', { id: 'USR-VISITEUR', nom: 'Visiteur', role: 'visiteur' }, { actorEmail: 'admin@horizon.test', createdAt: '2026-01-01T00:00:00.000Z' })).toMatchObject({
      module_source: 'gestion_systeme',
      entity_id: 'USR-VISITEUR',
      actor_email: 'admin@horizon.test',
      title: 'Utilisateur retiré',
    });
  });
});
