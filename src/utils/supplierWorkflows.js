import { toNumber } from './format.js';
import { makeId } from './ids.js';


const today = () => new Date().toISOString().slice(0, 10);

export const supplierName = (supplier = {}) => supplier.nom || supplier.name || supplier.raison_sociale || supplier.id || 'Fournisseur';
export const supplierDebtKey = (supplier = {}) => `supplier_debt:${supplier.id}`;
export const stockProductName = (stock = {}) => stock.produit || stock.nom || stock.name || stock.id || 'Produit';

export function buildSupplierReceptionWorkflow({ supplier = {}, stock = {}, qty = 0, unitPrice = 0, date = today() } = {}) {
  const quantity = toNumber(qty);
  const currentQty = toNumber(stock.quantite ?? stock.quantity);
  const amount = quantity * toNumber(unitPrice ?? stock.prixUnit ?? stock.prixunit ?? stock.prix_unitaire ?? stock.unit_price);
  const financeId = makeId('TRX');
  const documentId = makeId('DOC');
  return {
    amount,
    quantity,
    stockPatch: {
      quantite: currentQty + quantity,
      quantity: currentQty + quantity,
      statut: 'recu',
      stock_status: 'recu',
      fournisseur_id: supplier.id,
      supplier_id: supplier.id,
      derniere_reception: date,
      last_receipt_qty: quantity,
      last_receipt_amount: amount,
      source_module: 'fournisseurs',
      source_record_id: supplier.id,
    },
    debtTransaction: {
      id: financeId,
      type: 'sortie',
      libelle: `Réception fournisseur ${supplierName(supplier)} — ${stockProductName(stock)}`,
      montant: amount,
      reste_a_payer: amount,
      date,
      categorie: 'Fournisseurs',
      module_lie: 'fournisseurs',
      related_id: supplier.id,
      fournisseur_id: supplier.id,
      stock_id: stock.id,
      statut: 'a_payer',
      status: 'a_payer',
      cash_effect: false,
      is_supplier_accrual: true,
      source_module: 'fournisseurs',
      source_record_id: supplier.id,
      notes: 'Réception enregistrée. Dette fournisseur à payer sans compter comme argent déjà dépensé.',
    },
    missingInvoiceDocument: {
      id: documentId,
      title: `Facture fournisseur à joindre — ${supplierName(supplier)}`,
      document_category: 'facture',
      module_source: 'fournisseurs',
      entity_type: 'fournisseur',
      entity_id: supplier.id,
      related_id: supplier.id,
      transaction_id: financeId,
      finance_id: financeId,
      stock_id: stock.id,
      statut: 'manquant',
      status: 'manquant',
      verification_status: 'preuve_manquante',
      notes: `Joindre la facture pour la réception ${stockProductName(stock)}.`,
    },
    event: {
      id: makeId('EVT'),
      event_type: 'reception_fournisseur_stock',
      module_source: 'fournisseurs',
      entity_type: 'fournisseur',
      entity_id: supplier.id,
      related_stock_id: stock.id,
      title: 'Réception stock fournisseur',
      description: `${supplierName(supplier)} · ${stockProductName(stock)} · ${quantity}`,
      amount,
      event_date: date,
      severity: 'info',
      linked_transaction_id: financeId,
      linked_document_id: documentId,
    },
    supplierPatch: {
      dettes: toNumber(supplier.dettes ?? supplier.dette ?? supplier.reste_a_payer) + amount,
      derniere_reception: date,
      last_receipt_finance_id: financeId,
    },
  };
}

export function buildSupplierPaymentWorkflow({
  supplier = {},
  debtAmount = 0,
  totalDebt = debtAmount,
  date = today(),
  paymentMethod = '',
  proofUrl = '',
  sourceTransactionId = '',
  openDebtTransactions = [],
} = {}) {
  const amount = toNumber(debtAmount);
  const transactionId = makeId('TRX');
  const documentId = makeId('DOC');
  const sourceDebt = openDebtTransactions.find((tx) => String(tx.id) === String(sourceTransactionId)) || openDebtTransactions[0] || {};
  const sourceRemaining = toNumber(sourceDebt.reste_a_payer ?? sourceDebt.amount ?? sourceDebt.montant);
  const debtAfterPayment = Math.max(0, sourceRemaining - amount);
  const supplierDebtAfterPayment = Math.max(0, toNumber(totalDebt) - amount);
  return {
    amount,
    paymentTransaction: {
      id: transactionId,
      type: 'sortie',
      libelle: `Paiement fournisseur ${supplierName(supplier)}`,
      montant: amount,
      date,
      categorie: 'Fournisseurs',
      module_lie: 'fournisseurs',
      related_id: supplier.id,
      fournisseur_id: supplier.id,
      statut: 'paye',
      status: 'paye',
      cash_effect: true,
      payment_for: 'supplier_debt',
      payment_method: paymentMethod,
      moyen_paiement: paymentMethod,
      settled_transaction_id: sourceDebt.id || '',
      purchase_or_stock_id: sourceDebt.stock_id || sourceDebt.purchase_id || sourceDebt.related_id || '',
      stock_id: sourceDebt.stock_id || '',
      source_module: 'fournisseurs',
      source_record_id: supplier.id,
    },
    paymentProofDocument: {
      id: documentId,
      title: `Preuve paiement fournisseur — ${supplierName(supplier)}`,
      document_category: 'preuve / facture',
      module_source: 'fournisseurs',
      entity_type: 'fournisseur',
      entity_id: supplier.id,
      related_id: supplier.id,
      transaction_id: transactionId,
      statut: proofUrl ? 'fourni' : 'manquant',
      status: proofUrl ? 'fourni' : 'manquant',
      verification_status: proofUrl ? 'a_verifier' : 'preuve_manquante',
      file_url: proofUrl,
      notes: 'Ajouter reçu, capture mobile money ou facture acquittée.',
    },
    debtTransactionPatches: sourceDebt.id ? [{
      id: sourceDebt.id,
      patch: {
        statut: debtAfterPayment > 0 ? 'partiel' : 'solde',
        status: debtAfterPayment > 0 ? 'partiel' : 'solde',
        reste_a_payer: debtAfterPayment,
        settled_at: debtAfterPayment > 0 ? null : date,
        settlement_transaction_id: transactionId,
        cash_effect: false,
      },
    }] : [],
    supplierPatch: { dettes: supplierDebtAfterPayment, dette: supplierDebtAfterPayment, reste_a_payer: supplierDebtAfterPayment, dernier_paiement: date, last_payment_id: transactionId },
    event: {
      id: makeId('EVT'),
      event_type: 'supplier_payment',
      legacy_event_type: 'paiement_fournisseur',
      module_source: 'fournisseurs',
      entity_type: 'fournisseur',
      entity_id: supplier.id,
      title: 'Paiement fournisseur',
      description: `${supplierName(supplier)} — ${amount}`,
      amount,
      event_date: date,
      severity: 'info',
      linked_transaction_id: transactionId,
      linked_document_id: documentId,
      source_transaction_id: sourceDebt.id || '',
      purchase_or_stock_id: sourceDebt.stock_id || sourceDebt.purchase_id || sourceDebt.related_id || '',
      payment_method: paymentMethod,
    },
  };
}

export function buildSupplierDebtFollowUp(supplier = {}, debtAmount = 0, date = today()) {
  const amount = toNumber(debtAmount);
  if (amount <= 0) return null;
  const key = supplierDebtKey(supplier);
  const taskId = makeId('TSK');
  const message = `Reste à payer ${amount} FCFA pour ${supplierName(supplier)}.`;
  return {
    key,
    task: {
      id: taskId,
      title: `Planifier paiement ${supplierName(supplier)}`,
      module_lie: 'fournisseurs',
      related_id: supplier.id,
      fournisseur_id: supplier.id,
      due_date: date,
      priority: 'haute',
      status: 'a_faire',
      source_module: 'fournisseurs',
      source_record_id: supplier.id,
      task_dedupe_key: key,
      action_key: key,
      notes: `${message} Vérifier facture puis enregistrer paiement.`,
    },
    alert: {
      id: makeId('ALT'),
      title: `Dette fournisseur: ${supplierName(supplier)}`,
      message,
      module_source: 'fournisseurs',
      entity_type: 'fournisseur',
      entity_id: supplier.id,
      related_id: supplier.id,
      severity: 'warning',
      status: 'nouvelle',
      action_recommandee: 'Vérifier facture fournisseur et planifier paiement.',
      alert_dedupe_key: key,
      linked_task_id: taskId,
    },
  };
}
