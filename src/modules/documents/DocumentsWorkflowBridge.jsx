import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import useCrudModule from '../../hooks/useCrudModule';
import { rowsOf } from '../../utils/moduleRows';
import { commitDocumentLink } from '../../utils/documentsWorkflow.js';
import { getRhDirectory, saveRhDirectory } from '../../utils/rhDirectory.js';
import DocumentsGapRepairPanel from './DocumentsGapRepairPanel.jsx';
import DocumentsLinkPanel from './DocumentsLinkPanel.jsx';

const arr = (value) => (Array.isArray(value) ? value : []);

export default function DocumentsWorkflowBridge({
  props = {},
  documents = [],
  transactions = [],
  salesOrders = [],
  payments = [],
  invoices = [],
  stocks = [],
  healthRecords = [],
  equipment = [],
  cultures = [],
  compact = false,
  showGaps = true,
  onLinked,
  onOpenProofsTab,
}) {
  const [linkDocumentId, setLinkDocumentId] = useState('');
  const docsCrud = useCrudModule('documents');
  const financesCrud = useCrudModule('finances');
  const salesCrud = useCrudModule('sales_orders');
  const paymentsCrud = useCrudModule('payments');
  const invoicesCrud = useCrudModule('invoices');
  const stockCrud = useCrudModule('stock');
  const santeCrud = useCrudModule('sante');
  const equipementsCrud = useCrudModule('equipements');
  const culturesCrud = useCrudModule('cultures');
  const tasksCrud = useCrudModule('taches');
  const alertsCrud = useCrudModule('alertes_center');
  const eventsCrud = useCrudModule('business_events');

  const people = arr(props.people?.length ? props.people : getRhDirectory().people);
  const tasks = rowsOf(props.existingTasks, tasksCrud);
  const alertes = rowsOf(props.existingAlerts, alertsCrud);

  const linkHandlers = useMemo(() => ({
    onUpdateDocument: props.onUpdateDocument || docsCrud.update,
    onUpdateFinanceTransaction: props.onUpdateFinanceTransaction || financesCrud.update,
    onUpdateOrder: props.onUpdateOrder || salesCrud.update,
    onUpdatePayment: props.onUpdatePayment || paymentsCrud.update,
    onUpdateInvoice: props.onUpdateInvoice || invoicesCrud.update,
    onUpdateStock: props.onUpdateStock || stockCrud.update,
    onUpdateHealthRecord: props.onUpdateHealthRecord || santeCrud.update,
    onUpdateEquipment: props.onUpdateEquipment || equipementsCrud.update,
    onUpdateCulture: props.onUpdateCulture || culturesCrud.update,
    onUpdatePerson: props.onUpdatePerson || (async (id, patch) => {
      const directory = getRhDirectory();
      saveRhDirectory({
        ...directory,
        people: arr(directory.people).map((person) => (String(person.id) === String(id) ? { ...person, ...patch } : person)),
      });
    }),
    onUpdateTask: props.onUpdateTask || tasksCrud.update,
    onUpdateAlert: props.onUpdateAlert || alertsCrud.update,
    onCreateBusinessEvent: props.onCreateBusinessEvent || eventsCrud.create,
  }), [props, docsCrud, financesCrud, salesCrud, paymentsCrud, invoicesCrud, stockCrud, santeCrud, equipementsCrud, culturesCrud, tasksCrud, alertsCrud, eventsCrud]);

  const linkContext = useMemo(() => ({
    documents,
    transactions,
    salesOrders,
    payments,
    invoices,
    stocks,
    healthRecords,
    equipment,
    cultures,
    people,
    tasks,
    alertes,
  }), [documents, transactions, salesOrders, payments, invoices, stocks, healthRecords, equipment, cultures, people, tasks, alertes]);

  const linkDocument = async (form) => {
    try {
      const result = await commitDocumentLink({ form, context: linkContext, handlers: linkHandlers });
      await Promise.allSettled([
        props.onRefreshDocuments?.(),
        docsCrud.refresh?.(),
        financesCrud.refresh?.(),
        salesCrud.refresh?.(),
        paymentsCrud.refresh?.(),
        invoicesCrud.refresh?.(),
        stockCrud.refresh?.(),
        santeCrud.refresh?.(),
        equipementsCrud.refresh?.(),
        culturesCrud.refresh?.(),
        eventsCrud.refresh?.(),
        tasksCrud.refresh?.(),
        alertsCrud.refresh?.(),
      ]);
      onLinked?.(result);
      return result;
    } catch (error) {
      toast.error(error.message || 'Liaison impossible');
      throw error;
    }
  };

  return (
    <div className="space-y-4">
      <DocumentsLinkPanel
        documents={documents}
        transactions={transactions}
        salesOrders={salesOrders}
        payments={payments}
        invoices={invoices}
        stocks={stocks}
        healthRecords={healthRecords}
        equipment={equipment}
        cultures={cultures}
        people={people}
        tasks={tasks}
        alertes={alertes}
        preselectedDocumentId={linkDocumentId}
        onLink={linkDocument}
        compact={compact}
      />
      {showGaps ? (
        <DocumentsGapRepairPanel
          documents={documents}
          transactions={transactions}
          salesOrders={salesOrders}
          payments={payments}
          invoices={invoices}
          onSelectOrphan={setLinkDocumentId}
          onOpenLink={() => onOpenProofsTab?.()}
        />
      ) : null}
    </div>
  );
}
