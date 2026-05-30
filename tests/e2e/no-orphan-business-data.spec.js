import { expect, test } from '@playwright/test';
import { buildDraftEntryFromTransaction } from '../../src/utils/accounting.js';
import { transactionHasProof } from '../../src/utils/accountingProof.js';
import { avicoleActiveCount, avicoleSickCount } from '../../src/utils/avicoleMetrics.js';
import { buildCultureHarvestWorkflow, buildCultureInputUsageWorkflow, buildCultureLossWorkflow } from '../../src/utils/cultureWorkflows.js';
import { buildDocumentProofFollowUp, documentNeedsProof } from '../../src/utils/documentWorkflows.js';
import { buildEquipmentBreakdownFollowUp, buildEquipmentRepairWorkflow } from '../../src/utils/equipmentWorkflows.js';
import { buildHealthCostTransaction, buildHealthMissingProofDocument } from '../../src/utils/healthWorkflows.js';
import { buildInvestmentAssetWorkflow, buildInvestmentRealizationWorkflow } from '../../src/utils/investmentWorkflows.js';
import { buildRhSalaryWorkflow } from '../../src/utils/rhWorkflows.js';
import { buildSaleSourcePatch } from '../../src/utils/salesWorkflows.js';
import { applyStockMovement, buildStockCriticalFollowUp } from '../../src/utils/stockWorkflows.js';
import { buildSupplierPaymentWorkflow, buildSupplierReceptionWorkflow } from '../../src/utils/supplierWorkflows.js';
import { buildTaskFromAlert, completeTaskWorkflow } from '../../src/utils/taskWorkflows.js';

const today = '2026-05-26';

function expectLinked(record, fields, label) {
  for (const field of fields) {
    expect(record?.[field], `${label}: lien manquant ${field}`).toBeTruthy();
  }
}

test.describe('Recette anti-donnees orphelines', () => {
  test('soin coute: Sante, Finances, Comptabilite et Documents restent alignes', () => {
    const soin = { id: 'SAN-JURY-001', nom: 'Vaccination BOV002', animal_id: 'BOV002', cout: 15000, effectuee: today, statut: 'realise' };
    const finance = buildHealthCostTransaction(soin);
    const document = buildHealthMissingProofDocument(soin, finance);
    const accounting = buildDraftEntryFromTransaction(finance);

    expect(finance).toMatchObject({ type: 'sortie', module_lie: 'sante', related_id: soin.id, montant: 15000, cash_effect: true });
    expect(document).toMatchObject({ module_source: 'sante', entity_id: soin.id, transaction_id: finance.id, montant: 15000, status: 'manquant' });
    expect(accounting.entry).toMatchObject({ source_module: 'sante', reference: finance.id, total_debit: 15000, total_credit: 15000 });
    expect(transactionHasProof(finance, [document])).toBe(false);
    expectLinked(finance, ['id', 'source_record_id', 'related_id'], 'depense sante');
    expectLinked(document, ['transaction_id', 'entity_id'], 'preuve sante');
  });

  test('ventes: chaque source met a jour son module sans double vente', () => {
    const animalPatch = buildSaleSourcePatch({
      sourceType: 'animal',
      sourceRow: { id: 'BOV-JURY-001', status: 'actif' },
      quantity: 1,
      total: 425000,
      date: today,
      orderId: 'VTE-BOV-JURY',
      clientId: 'CLI-JURY',
    });
    const lotPatch = buildSaleSourcePatch({
      sourceType: 'lot_avicole',
      sourceRow: { id: 'LOT-JURY-001', initial_count: 100, current_count: 85, vendus: 10 },
      quantity: 15,
      total: 60000,
      date: today,
      orderId: 'VTE-LOT-JURY',
      clientId: 'CLI-JURY',
    });
    const eggsPatch = buildSaleSourcePatch({
      sourceType: 'stock',
      sourceRow: { id: 'STK-OEUFS-JURY', produit: 'Tablettes oeufs', quantite: 10, vendus: 0 },
      quantity: 4,
      total: 12000,
      date: today,
      orderId: 'VTE-OEUFS-JURY',
      clientId: 'CLI-JURY',
    });
    const culturePatch = buildSaleSourcePatch({
      sourceType: 'culture',
      sourceRow: { id: 'CUL-TOMATE-JURY', quantite_disponible: 100, prix_unitaire: 900 },
      quantity: 35,
      total: 31500,
      date: today,
      orderId: 'VTE-CULT-JURY',
      clientId: 'CLI-JURY',
    });

    expect(animalPatch.patch).toMatchObject({ status: 'vendu', statut: 'vendu', sale_price: 425000, last_sale_id: 'VTE-BOV-JURY' });
    expect(lotPatch.patch).toMatchObject({ current_count: 70, effectif_actuel: 70, vendus: 25, status: 'vendu_partiellement' });
    expect(eggsPatch.patch).toMatchObject({ quantite: 6, vendus: 4, quantity_sold: 4 });
    expect(culturePatch.patch).toMatchObject({ quantite_disponible: 65, quantite_vendue: 35, revenu_reel: 31500 });
  });

  test('avicole: morts et vendus sortent de l effectif, malades restent a surveiller', () => {
    const lot = { id: 'LOT-EFF-JURY', initial_count: 100, morts: 5, vendus: 10, malades: 3, current_count: 90 };

    expect(avicoleActiveCount(lot)).toBe(85);
    expect(avicoleSickCount(lot)).toBe(3);
  });

  test('stock, cultures et documents ferment les boucles metier', () => {
    const stock = { id: 'STK-ALIM-JURY', produit: 'Aliment pondeuses', quantite: 40, seuil: 50, stock_max: 200, prixUnit: 350, unite: 'kg' };
    const critical = buildStockCriticalFollowUp(stock);
    const reappro = applyStockMovement(stock, { type: 'entree', qty: 180, motif: 'Reception fournisseur', date: today });
    const culture = { id: 'CUL-JURY-001', nom: 'Tomates', quantite_recoltee: 100, quantite_disponible: 100, prix_unitaire: 900 };
    const harvest = buildCultureHarvestWorkflow({ after: culture, date: today });
    const input = buildCultureInputUsageWorkflow({ culture, stock: { id: 'STK-ENGRAIS-JURY', quantite: 30, seuil: 8, prixUnit: 600, unite: 'kg' }, qty: 12, date: today });
    const loss = buildCultureLossWorkflow({ culture, qty: 20, unitPrice: 900, date: today });
    const missingDoc = { id: 'DOC-JURY-001', title: 'Facture soin', transaction_id: 'TRX-JURY-001', status: 'manquant' };
    const proofFollowUp = buildDocumentProofFollowUp({ document: missingDoc, transaction: { id: 'TRX-JURY-001', montant: 150000 }, date: today });

    expect(critical.task).toMatchObject({ module_lie: 'stock', related_id: stock.id, status: 'a_faire' });
    expect(critical.alert).toMatchObject({ module_source: 'stock', entity_id: stock.id, status: 'nouvelle', linked_task_id: critical.task.id });
    expect(reappro.stock.quantite).toBe(220);
    expect(buildStockCriticalFollowUp(reappro.stock)).toBeNull();
    expect(harvest.stock).toMatchObject({ source_module: 'cultures', related_id: culture.id, quantite: 100 });
    expect(harvest.opportunity).toMatchObject({ source_module: 'cultures', source_id: culture.id, quantity: 100, status: 'ouverte' });
    expect(input.stockPatch).toMatchObject({ quantite: 18, last_movement_type: 'sortie_intrant_culture' });
    expect(input.culturePatch.cout_intrants).toBe(7200);
    expect(loss.culturePatch).toMatchObject({ quantite_disponible: 80, pertes: 20, valeur_perte_estimee: 18000 });
    expect(documentNeedsProof(missingDoc)).toBe(true);
    expect(proofFollowUp.task).toMatchObject({ module_lie: 'documents', source_record_id: missingDoc.id, status: 'a_faire' });
  });

  test('fournisseur, equipement, RH et investissement creent finance, preuve et historique', () => {
    const reception = buildSupplierReceptionWorkflow({
      supplier: { id: 'FOU-JURY', nom: 'Aliments Diop', dettes: 0 },
      stock: { id: 'STK-MAIS-JURY', produit: 'Mais', quantite: 5 },
      qty: 20,
      unitPrice: 5000,
      date: today,
    });
    const payment = buildSupplierPaymentWorkflow({
      supplier: { id: 'FOU-JURY', nom: 'Aliments Diop' },
      debtAmount: 100000,
      openDebtTransactions: [reception.debtTransaction],
      date: today,
    });
    const breakdown = buildEquipmentBreakdownFollowUp({ id: 'EQP-JURY', nom: 'Pompe irrigation' }, { date: today });
    const repair = buildEquipmentRepairWorkflow({
      equipment: { id: 'EQP-JURY', nom: 'Pompe irrigation' },
      task: breakdown.task,
      alert: breakdown.alert,
      cost: 45000,
      date: today,
    });
    const salary = buildRhSalaryWorkflow({ person: { id: 'EMP-JURY', nom: 'Awa Fall', salaire: 85000, modules: ['cultures'] }, date: today });
    const investment = buildInvestmentRealizationWorkflow({ id: 'BPLI-JURY', designation: 'Pompe irrigation', montant_reel: 350000, quantite: 1 }, { date: today });
    const asset = buildInvestmentAssetWorkflow({ id: 'BPLI-JURY', designation: 'Pompe irrigation', montant_reel: 350000, quantite: 1, linked_finance_transaction_id: investment.financeTransaction.id }, { date: today });

    expect(reception.stockPatch).toMatchObject({ quantite: 25, fournisseur_id: 'FOU-JURY' });
    expect(reception.debtTransaction).toMatchObject({ cash_effect: false, statut: 'a_payer', montant: 100000 });
    expect(payment.paymentTransaction).toMatchObject({ cash_effect: true, montant: 100000, module_lie: 'fournisseurs' });
    expect(payment.supplierPatch).toMatchObject({ dettes: 0, reste_a_payer: 0 });
    expect(repair.taskPatch.patch.status).toBe('termine');
    expect(repair.alertPatch.patch.status).toBe('resolue');
    expect(repair.financeTransaction).toMatchObject({ montant: 45000, module_lie: 'equipements', proof_document_id: repair.document.id });
    expect(salary.financeTransaction).toMatchObject({ montant: 85000, module_lie: 'rh', proof_document_id: salary.document.id });
    expect(investment.financeTransaction).toMatchObject({ montant: 350000, module_lie: 'investissements', proof_document_id: investment.proofDocument.id });
    expect(asset.module).toBe('equipements');
    expect(asset.payloads).toHaveLength(1);
    expect(buildInvestmentAssetWorkflow({ ...asset.linePatch, id: 'BPLI-JURY', designation: 'Pompe irrigation' })).toBeNull();
  });

  test('alerte transformee en tache puis cloturee garde un lien unique', () => {
    const alert = { id: 'ALT-JURY-001', title: 'Stock aliment critique', module_source: 'stock', entity_type: 'stock', entity_id: 'STK-JURY', severity: 'critique', action_recommandee: 'Commander aliment' };
    const created = buildTaskFromAlert(alert, [], today);
    const done = completeTaskWorkflow(created.task, today, '2026-05-26T10:00:00.000Z');

    expect(created.task.task_dedupe_key).toBe(created.task.alert_dedupe_key);
    expect(created.alertPatch.linked_task_id).toBe(created.task.id);
    expect(done.taskPatch.status).toBe('termine');
    expect(done.alertPatch.patch.status).toBe('traitee');
    expect(done.event).toMatchObject({ linked_task_id: created.task.id, linked_alert_id: alert.id });
  });
});
