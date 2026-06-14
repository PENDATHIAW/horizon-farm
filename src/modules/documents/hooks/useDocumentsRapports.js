import { useMemo } from 'react';
import useCrudModule from '../../../hooks/useCrudModule';
import { rowsOf } from '../../../utils/moduleRows';
import { buildDocumentsGapRows } from '../../../utils/documentsIntegrity.js';
import {
  aggregateMissingProofItems,
  buildDocumentsCoherenceRows,
  buildDocumentsDomainCoverage,
  buildDocumentsHealthSnapshot,
} from '../documentsVisionHelpers.js';
import {
  arr,
  docIsMedia,
  docIsProof,
  docIsReport,
  labelOf,
  typeOf,
  dateOf,
  low,
} from '../documentsModuleUi.jsx';

export function useDocumentsRapports(props = {}) {
  const docsCrud = useCrudModule('documents');
  const financesCrud = useCrudModule('finances');
  const tasksCrud = useCrudModule('taches');
  const alertsCrud = useCrudModule('alertes_center');
  const eventsCrud = useCrudModule('business_events');
  const salesCrud = useCrudModule('sales_orders');
  const paymentsCrud = useCrudModule('payments');
  const invoicesCrud = useCrudModule('invoices');
  const stockCrud = useCrudModule('stock');
  const santeCrud = useCrudModule('sante');
  const equipementsCrud = useCrudModule('equipements');
  const culturesCrud = useCrudModule('cultures');

  const periodFiltered = Boolean(props.periodFiltered);
  const documents = rowsOf(props.documents, docsCrud, periodFiltered);
  const transactions = rowsOf(props.transactions || props.finances, financesCrud, periodFiltered);
  const salesOrders = rowsOf(props.salesOrders, salesCrud, periodFiltered);
  const payments = rowsOf(props.payments, paymentsCrud, periodFiltered);
  const invoices = rowsOf(props.invoices, invoicesCrud, periodFiltered);
  const stocks = rowsOf(props.stocks, stockCrud, periodFiltered);
  const healthRecords = rowsOf(props.sante || props.healthRecords, santeCrud, periodFiltered);
  const equipment = rowsOf(props.equipements || props.equipment, equipementsCrud, periodFiltered);
  const cultures = rowsOf(props.cultures, culturesCrud, periodFiltered);
  const businessEvents = rowsOf(props.businessEvents, eventsCrud, periodFiltered);

  const data = useMemo(() => {
    const docs = [...documents, ...arr(props.rapports), ...arr(props.reports)].filter(Boolean);
    const tx = transactions.length ? transactions : [];
    const proofs = docs.filter(docIsProof);
    const invoiceDocs = docs.filter((d) => /facture|recu|reçu|paiement/.test(low(`${typeOf(d)} ${labelOf(d)}`)));
    const reportDocs = docs.filter(docIsReport);
    const media = docs.filter(docIsMedia);
    const templates = docs.filter((d) => /modele|modèle|template/.test(low(`${typeOf(d)} ${labelOf(d)}`)));
    const exportsList = docs.filter((d) => /export|csv|excel|pdf/.test(low(`${typeOf(d)} ${labelOf(d)}`)));
    const missingProofItems = aggregateMissingProofItems(tx, docs);
    const missingProof = missingProofItems.map((item) => tx.find((r) => r.id === item.id)).filter(Boolean);
    const missingProofAmount = missingProofItems.reduce((sum, row) => sum + row.amount, 0);
    const coveredModules = [...new Set(docs.map((d) => d.module_source || d.module || d.related_type).filter(Boolean))];
    const healthSnap = buildDocumentsHealthSnapshot({ documents: docs, transactions: tx, salesOrders });
    const coherenceRows = buildDocumentsCoherenceRows(docs, tx, salesOrders);
    const gaps = buildDocumentsGapRows({
      documents: docs,
      transactions: tx,
      salesOrders,
      payments,
      invoices,
    });
    const domainCoverage = buildDocumentsDomainCoverage({ documents: docs, transactions: tx, gaps });
    const priorities = missingProofItems.slice(0, 8).map((row) => ({
      id: `proof-${row.id}`,
      title: row.title,
      detail: `${String(row.date || '—').slice(0, 10)} · justificatif manquant`,
      amount: row.amount,
      trxId: row.id,
    }));
    const history = [...docs, ...businessEvents].sort((a, b) => String(dateOf(b)).localeCompare(String(dateOf(a))));

    return {
      documents: docs,
      proofs,
      invoiceDocs,
      reports: reportDocs,
      media,
      templates,
      exports: exportsList,
      missingProof,
      missingProofItems,
      missingProofAmount,
      coveredModules,
      priorities,
      history,
      gaps,
      domainCoverage,
      healthScore: healthSnap.score,
      healthFindings: healthSnap.findings,
      healthPredictions: healthSnap.predictions,
      coherenceRows,
      transactions: tx,
      salesOrders,
      payments,
      invoices,
      stocks,
      healthRecords,
      equipment,
      cultures,
      animaux: arr(props.animaux),
      lots: arr(props.lots),
      clients: arr(props.clients),
      fournisseurs: arr(props.fournisseurs),
      businessPlans: arr(props.businessPlans),
      investissements: arr(props.investissements),
      businessEvents,
    };
  }, [
    documents,
    props.rapports,
    props.reports,
    transactions,
    salesOrders,
    payments,
    invoices,
    businessEvents,
    props.animaux,
    props.lots,
    props.clients,
    props.fournisseurs,
    props.businessPlans,
    props.investissements,
  ]);

  const actionHandlers = useMemo(() => ({
    onNavigate: props.onNavigate,
    onCreateTask: props.onCreateTask || tasksCrud.create,
    onCreateAlert: props.onCreateAlert || alertsCrud.create,
    onUpdateAlert: props.onUpdateAlert || alertsCrud.update,
    onCreateBusinessEvent: props.onCreateBusinessEvent || eventsCrud.create,
    existingTasks: rowsOf(props.existingTasks, tasksCrud),
    existingAlerts: rowsOf(props.existingAlerts, alertsCrud),
  }), [props, tasksCrud, alertsCrud, eventsCrud]);

  const scannerHandlers = useMemo(() => ({
    onCreateDocument: props.onCreateDocument || docsCrud.create,
    onUpdateDocument: props.onUpdateDocument || docsCrud.update,
    onRefreshDocuments: props.onRefreshDocuments || docsCrud.refresh,
    onCreateFinanceTransaction: props.onCreateFinanceTransaction || financesCrud.create,
    onUpdateFinanceTransaction: props.onUpdateFinanceTransaction || financesCrud.update,
    onRefreshFinances: props.onRefreshFinances || financesCrud.refresh,
    onCreateStock: props.onCreateStock || stockCrud.create,
    onUpdateStock: props.onUpdateStock || stockCrud.update,
    onCreateStockMovement: props.onCreateStockMovement,
    onCreateHealth: props.onCreateHealth || santeCrud.create,
    onCreateBusinessEvent: props.onCreateBusinessEvent || eventsCrud.create,
    onRefreshBusinessEvents: props.onRefreshBusinessEvents || eventsCrud.refresh,
  }), [props, docsCrud, financesCrud, stockCrud, santeCrud, eventsCrud]);

  const scannerContext = useMemo(() => ({
    documents: data.documents,
    transactions: data.transactions,
    salesOrders: data.salesOrders,
    payments: data.payments,
    stocks: data.stocks,
    sante: data.healthRecords,
    animaux: data.animaux,
    lots: data.lots,
    fournisseurs: data.fournisseurs,
  }), [data]);

  const refresh = async () => {
    await Promise.allSettled([
      docsCrud.refresh?.(),
      financesCrud.refresh?.(),
      salesCrud.refresh?.(),
      paymentsCrud.refresh?.(),
      eventsCrud.refresh?.(),
    ]);
    props.onRefresh?.();
  };

  return {
    data,
    periodFiltered,
    actionHandlers,
    scannerHandlers,
    scannerContext,
    refresh,
    crud: { docsCrud, financesCrud, salesCrud, paymentsCrud, invoicesCrud, stockCrud, santeCrud, equipementsCrud, culturesCrud, eventsCrud, tasksCrud, alertsCrud },
  };
}
