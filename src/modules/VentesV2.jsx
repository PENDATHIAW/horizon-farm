import { CheckCircle2, CreditCard, FileText, Receipt, RefreshCw, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import useCrudModule from '../hooks/useCrudModule';
import { commitSaleWorkflow, prepareSaleWorkflow, useSuggestion } from '../services/workflowService';
import { buildSaleAssetPatch, cleanPatchForWrite } from '../services/saleAssetPatchService';
import {
  buildCoherentOrderPatch,
  capPaymentToRemaining,
  findExistingFinanceForPayment,
  findExistingPayment,
} from '../services/salesIntegrityService';
import { fmtCurrency, toNumber } from '../utils/format';
import { makeId } from '../utils/ids';
import {
  enrichSalesOrderStatus,
  isOpenForPayment,
  paidForOrder,
  remainingForOrder,
} from '../utils/salesStatuses';
import {
  getFinanceActivityFromSale,
  getFinanceCategoryFromSale,
} from '../services/financeSyncService';
import SalesDeliveryControl from './SalesDeliveryControl.jsx';
import SalesOpportunitiesBridge from './SalesOpportunitiesBridge.jsx';
import SalesQualityControl from './SalesQualityControl.jsx';
import Ventes from './Ventes.jsx';

const arr = (value) => (Array.isArray(value) ? value : []);
const today = () => new Date().toISOString().slice(0, 10);

const total = (order = {}) =>
  toNumber(order.montant_total ?? order.total ?? order.amount ?? order.total_amount);

const clientName = (clients, id) =>
  arr(clients).find((client) => client.id === id)?.nom ||
  arr(clients).find((client) => client.id === id)?.name ||
  id ||
  'Client non renseigné';

const badgeClass = (kind) =>
  kind === 'Modifié'
    ? 'bg-amber-100 text-amber-700 border-amber-200'
    : 'bg-emerald-100 text-emerald-700 border-emerald-200';

const paymentMethods = [
  { value: 'especes', label: 'Espèces' },
  { value: 'wave', label: 'Wave' },
  { value: 'orange_money', label: 'Orange Money' },
  { value: 'virement', label: 'Virement' },
  { value: 'cheque', label: 'Chèque' },
];

async function secureSale(order, props, setPreview) {
  const payments = arr(props.paymentsList || props.payments);

  if (!isOpenForPayment(order, payments)) {
    toast.success('Commande déjà soldée');
    setPreview(null);
    return;
  }

  const preview = prepareSaleWorkflow(enrichSalesOrderStatus(order, payments), {
    invoices: props.invoicesList || props.invoices,
    payments,
    transactions: props.transactions,
    documents: props.documents,
    clients: props.clients,
    stocks: props.stocks,
    events: props.businessEvents,
    alerts: props.alertes,
  });

  const rawPaymentValue = toNumber(
    preview?.fields?.payment_to_record?.final_value ?? preview?.fields?.paid?.final_value
  );

  const paymentValue = capPaymentToRemaining(order, payments, rawPaymentValue);

  if (paymentValue <= 0 || remainingForOrder(order, payments) <= 0) {
    toast.success('Aucun encaissement restant pour cette commande');
    setPreview(null);
    return;
  }

  preview.fields.payment_to_record = {
    ...preview.fields.payment_to_record,
    final_value: paymentValue,
    auto_value: paymentValue,
  };

  preview.records.payment = {
    ...preview.records.payment,
    montant: paymentValue,
    montant_paye: paymentValue,
    amount: paymentValue,
  };

  preview.records.finance = {
    ...preview.records.finance,
    montant: paymentValue,
  };

  setPreview(preview);
}

function findAsset(activity, id, props) {
  const key = String(activity || '').toLowerCase();

  if (key === 'animaux' || key.includes('animal')) {
    return arr(props.animaux).find(
      (row) => String(row.id) === String(id) || String(row.tag) === String(id)
    );
  }

  if (key.includes('avicole') || key.includes('lot')) {
    return arr(props.lots).find((row) => String(row.id) === String(id));
  }

  if (key === 'cultures' || key.includes('culture')) {
    return arr(props.cultures).find((row) => String(row.id) === String(id));
  }

  if (key === 'stock' || key.includes('stock')) {
    return arr(props.stocks).find((row) => String(row.id) === String(id));
  }

  return null;
}

async function updateSourceAsset(activity, id, patch, props, order = {}) {
  if (!id) return null;

  const baseAsset = findAsset(activity, id, props) || {};

  const typedPatch = buildSaleAssetPatch(
    {
      ...baseAsset,
      ...order,
      source_id: id,
      stock_id: id,
    },
    activity
  );

  const finalPatch = cleanPatchForWrite({
    ...(patch || {}),
    ...(typedPatch || {}),
  });

  if (activity === 'animaux') return props.onUpdateAnimal?.(id, finalPatch);
  if (activity === 'cultures') return props.onUpdateCulture?.(id, finalPatch);
  if (activity === 'stock') return props.onUpdateStock?.(id, finalPatch);
  if (String(activity || '').startsWith('avicole')) return props.onUpdateLot?.(id, finalPatch);

  return null;
}

async function refreshRelated(props) {
  await Promise.allSettled([
    props.onRefresh?.(),
    props.onRefreshWorkflow?.(),
    props.onRefreshDocuments?.(),
    props.onRefreshAlertes?.(),
    props.onRefreshFinances?.(),
    props.onRefreshBusinessEvents?.(),
    props.onRefreshInvoices?.(),
    props.onRefreshPayments?.(),
    props.onRefreshOpportunities?.(),
    props.onRefreshStocks?.(),
    props.onRefreshAnimals?.(),
    props.onRefreshLots?.(),
    props.onRefreshCultures?.(),
  ]);
}

async function commitPreview(preview, props, setPreview) {
  try {
    const payments = arr(props.paymentsList || props.payments);
    const transactions = arr(props.transactions);
    const order = preview.source_order || {};

    const requested = toNumber(
      preview?.fields?.payment_to_record?.final_value ?? preview?.fields?.paid?.final_value
    );

    const paymentValue = capPaymentToRemaining(order, payments, requested);

    if (paymentValue <= 0) {
      toast.success('Commande déjà soldée ou aucun reste à encaisser');
      setPreview(null);
      return;
    }

    const existingPayment = findExistingPayment({
      orderId: order.id,
      amount: paymentValue,
      payments,
      paymentId: preview.records?.payment?.id,
    });

    const paymentId = existingPayment?.id || preview.records?.payment?.id || makeId('PAY');

    const existingFinance = findExistingFinanceForPayment({
      orderId: order.id,
      paymentId,
      amount: paymentValue,
      transactions,
    });

    await commitSaleWorkflow(preview, {
      onCreateInvoice: props.onCreateInvoice,

      onCreatePayment: existingPayment
        ? undefined
        : async (record) =>
            props.onCreatePayment?.({
              ...record,
              id: paymentId,
              montant: paymentValue,
              montant_paye: paymentValue,
              amount: paymentValue,
            }),

      onCreateFinanceTransaction: existingFinance
        ? undefined
        : async (record) =>
            props.onCreateFinanceTransaction?.({
              ...record,
              payment_id: paymentId,
              montant: paymentValue,
            }),

      onUpdateOrder: async (id, patch) =>
        props.onUpdate?.(
          id,
          buildCoherentOrderPatch(
            {
              ...order,
              ...patch,
            },
            [
              ...payments,
              existingPayment || {
                id: paymentId,
                order_id: order.id,
                montant: paymentValue,
                montant_paye: paymentValue,
                amount: paymentValue,
                statut: 'paye',
              },
            ],
            patch
          )
        ),

      onUpdateClient: props.onUpdateClient,

      onUpdateSourceAsset: (activity, id, patch) =>
        updateSourceAsset(activity, id, patch, props, order),

      onCreateDocument: props.onCreateDocument,
      onCreateBusinessEvent: props.onCreateBusinessEvent,
      onCreateAlert: props.onCreateAlert,
    });

    await refreshRelated(props);

    toast.success(
      existingPayment || existingFinance
        ? 'Vente sécurisée sans doublon'
        : 'Vente validée et informations mises à jour'
    );

    setPreview(null);
  } catch (error) {
    toast.error(error.message || 'Validation de la vente impossible');
  }
}

function PaymentCapturePanel(props) {
  const [form, setForm] = useState({
    order_id: '',
    montant: '',
    moyen_paiement: 'wave',
    date_paiement: today(),
    notes: '',
  });

  const [saving, setSaving] = useState(false);
  const payments = arr(props.paymentsList || props.payments);
  const transactions = arr(props.transactions);

  const orders = useMemo(
    () => arr(props.rows).map((order) => enrichSalesOrderStatus(order, payments)),
    [props.rows, payments]
  );

  const openOrders = useMemo(
    () => orders.filter((order) => isOpenForPayment(order, payments)),
    [orders, payments]
  );

  const selectedOrder = openOrders.find((order) => String(order.id) === String(form.order_id));
  const remaining = selectedOrder ? remainingForOrder(selectedOrder, payments) : 0;
  const amount = capPaymentToRemaining(selectedOrder || {}, payments, toNumber(form.montant || remaining));

  const set = (key, value) =>
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));

  const chooseOrder = (id) => {
    const order = openOrders.find((item) => String(item.id) === String(id));

    setForm((prev) => ({
      ...prev,
      order_id: id,
      montant: order ? remainingForOrder(order, payments) : '',
    }));
  };

  const submit = async () => {
    if (saving) return;
    if (!selectedOrder) return toast.error('Choisis une commande à encaisser');
    if (amount <= 0) return toast.error('Aucun reste à encaisser');

    try {
      setSaving(true);

      const paymentId = makeId('PAY');
      const transactionId = makeId('TRX');

      const existingPayment = findExistingPayment({
        orderId: selectedOrder.id,
        amount,
        payments,
      });

      const finalPaymentId = existingPayment?.id || paymentId;

      const existingFinance = findExistingFinanceForPayment({
        orderId: selectedOrder.id,
        paymentId: finalPaymentId,
        amount,
        transactions,
      });

      const virtualPayment = existingPayment || {
        id: finalPaymentId,
        order_id: selectedOrder.id,
        sale_id: selectedOrder.id,
        source_record_id: selectedOrder.id,
        montant_paye: amount,
        montant: amount,
        amount,
        statut: 'paye',
      };

      const nextPayments = [...payments, virtualPayment];

      if (!existingPayment) {
        await props.onCreatePayment?.({
          id: finalPaymentId,
          order_id: selectedOrder.id,
          sale_id: selectedOrder.id,
          source_record_id: selectedOrder.id,
          client_id: selectedOrder.client_id,
          invoice_id: selectedOrder.invoice_id || '',
          date_paiement: form.date_paiement || today(),
          date: form.date_paiement || today(),
          montant_paye: amount,
          montant: amount,
          amount,
          moyen_paiement: form.moyen_paiement,
          mode_paiement: form.moyen_paiement,
          statut: 'paye',
          notes: form.notes || `Paiement commande ${selectedOrder.id}`,
        });
      }

      if (!existingFinance) {
        await props.onCreateFinanceTransaction?.({
          id: transactionId,
          type: 'entree',
          libelle: `Encaissement ${selectedOrder.product_name || selectedOrder.libelle || selectedOrder.id}`,
          montant: amount,
          date: form.date_paiement || today(),
          categorie: getFinanceCategoryFromSale(selectedOrder),
          module_lie: 'ventes',
          related_id: selectedOrder.id,
          activite: getFinanceActivityFromSale(selectedOrder),
          client_id: selectedOrder.client_id || '',
          statut: 'paye',
          source_module: 'ventes',
          source_record_id: selectedOrder.id,
          source_type: selectedOrder.source_type || selectedOrder.type_vente || selectedOrder.product_type,
          source_id: selectedOrder.source_id || selectedOrder.product_id || selectedOrder.entity_id,
          invoice_id: selectedOrder.invoice_id || '',
          payment_id: finalPaymentId,
          moyen_paiement: form.moyen_paiement,
          notes: form.notes || `Encaissement rapide commande ${selectedOrder.id}`,
        });
      }

      await props.onUpdate?.(
        selectedOrder.id,
        buildCoherentOrderPatch(selectedOrder, nextPayments, {
          moyen_paiement: form.moyen_paiement,
          last_payment_id: finalPaymentId,
          last_payment_date: form.date_paiement || today(),
          last_transaction_id: existingFinance?.id || transactionId,
        })
      );

      await refreshRelated(props);

      toast.success(
        existingPayment || existingFinance
          ? 'Paiement déjà présent : vente remise à jour'
          : 'Paiement enregistré et vente mise à jour'
      );

      setForm({
        order_id: '',
        montant: '',
        moyen_paiement: 'wave',
        date_paiement: today(),
        notes: '',
      });
    } catch (error) {
      toast.error(error.message || 'Paiement impossible');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-[#d6c3a0] bg-white p-5 space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#8a7456]">Paiement</p>
          <h3 className="font-black text-[#2f2415]">Encaisser une commande ouverte</h3>
        </div>

        <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] px-3 py-2 text-sm text-[#7d6a4a]">
          {openOrders.length} commande(s) à encaisser
        </div>
      </div>

      {openOrders.length ? (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <label className="space-y-1 md:col-span-2">
            <span className="text-xs text-[#8a7456]">Commande</span>
            <select
              className="w-full bg-[#fffdf8] border border-[#d6c3a0] rounded-lg px-3 py-2 text-sm"
              value={form.order_id}
              onChange={(event) => chooseOrder(event.target.value)}
            >
              <option value="">Choisir une commande</option>
              {openOrders.map((order) => (
                <option key={order.id} value={order.id}>
                  {order.id} · {clientName(props.clients, order.client_id)} · reste{' '}
                  {fmtCurrency(remainingForOrder(order, payments))}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-xs text-[#8a7456]">Montant</span>
            <input
              type="number"
              className="w-full bg-[#fffdf8] border border-[#d6c3a0] rounded-lg px-3 py-2 text-sm"
              value={form.montant}
              onChange={(event) => set('montant', event.target.value)}
            />
          </label>

          <label className="space-y-1">
            <span className="text-xs text-[#8a7456]">Moyen</span>
            <select
              className="w-full bg-[#fffdf8] border border-[#d6c3a0] rounded-lg px-3 py-2 text-sm"
              value={form.moyen_paiement}
              onChange={(event) => set('moyen_paiement', event.target.value)}
            >
              {paymentMethods.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-xs text-[#8a7456]">Date</span>
            <input
              type="date"
              className="w-full bg-[#fffdf8] border border-[#d6c3a0] rounded-lg px-3 py-2 text-sm"
              value={form.date_paiement}
              onChange={(event) => set('date_paiement', event.target.value)}
            />
          </label>

          <label className="space-y-1 md:col-span-4">
            <span className="text-xs text-[#8a7456]">Notes</span>
            <input
              className="w-full bg-[#fffdf8] border border-[#d6c3a0] rounded-lg px-3 py-2 text-sm"
              value={form.notes}
              onChange={(event) => set('notes', event.target.value)}
            />
          </label>

          <div className="flex items-end justify-end">
            <button
              type="button"
              disabled={saving}
              className="w-full rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
              onClick={submit}
            >
              {saving ? 'Enregistrement...' : 'Encaisser'}
            </button>
          </div>

          {selectedOrder ? (
            <div className="md:col-span-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
              Reste à payer : <b>{fmtCurrency(remaining)}</b> · Après paiement :{' '}
              <b>{fmtCurrency(Math.max(0, remaining - amount))}</b>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3 text-sm text-[#8a7456]">
          <CheckCircle2 size={14} className="inline" /> Aucune commande en attente de paiement.
        </div>
      )}
    </div>
  );
}

function SalesPreviewModal({ preview, setPreview, props }) {
  const [committing, setCommitting] = useState(false);

  if (!preview) return null;

  const amount = preview.fields.amount;
  const paidField = preview.fields.payment_to_record || preview.fields.paid;
  const remainingField = preview.fields.remaining_after_payment;
  const activity = preview.fields.activity;
  const category = preview.fields.category;

  const overridePaid = (value) =>
    setPreview((current) => ({
      ...current,
      fields: {
        ...current.fields,
        payment_to_record: {
          ...current.fields.payment_to_record,
          final_value: toNumber(value),
          manual_override: true,
          manual_override_at: new Date().toISOString(),
        },
      },
    }));

  const resetPaid = () => setPreview((current) => useSuggestion(current, 'fields.payment_to_record'));

  const validate = async () => {
    if (committing) return;

    try {
      setCommitting(true);
      await commitPreview(preview, props, setPreview);
    } finally {
      setCommitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/40 p-4 flex items-center justify-center">
      <div className="w-full max-w-2xl rounded-2xl bg-[#fffdf8] border border-[#d6c3a0] shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-[#eadcc2] flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-[#8a7456]">Avant validation</p>
            <h3 className="text-xl font-black text-[#2f2415]">Vérifier la vente avant enregistrement</h3>
            <p className="text-sm text-[#8a7456] mt-1">
              Tu peux corriger avant de mettre à jour les paiements, documents, client et historique.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setPreview(null)}
            className="text-[#8a7456] font-bold"
          >
            ×
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Info
              title="Montant vente"
              value={fmtCurrency(amount.auto_value)}
              badge={amount.manual_override ? 'Modifié' : 'Auto'}
            />

            <div className="rounded-xl border border-[#eadcc2] bg-white p-3">
              <span className={`text-xs border rounded-full px-2 py-0.5 ${badgeClass(paidField.manual_override ? 'Modifié' : 'Auto')}`}>
                {paidField.manual_override ? 'Modifié' : 'Auto'}
              </span>

              <p className="text-xs text-[#8a7456] mt-2">Montant encaissé maintenant</p>

              <input
                className="mt-1 w-full rounded-lg border border-[#d6c3a0] px-2 py-1 font-bold"
                type="number"
                value={paidField.final_value}
                onChange={(event) => overridePaid(event.target.value)}
              />

              <button
                className="mt-2 text-xs font-bold text-emerald-700"
                type="button"
                onClick={resetPaid}
              >
                <RefreshCw size={12} className="inline" /> Reprendre le montant proposé
              </button>
            </div>

            <Info
              title="Reste après validation"
              value={fmtCurrency(remainingField?.auto_value || 0)}
              badge={remainingField?.manual_override ? 'Modifié' : 'Auto'}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Info
              title="Activité"
              value={activity.final_value}
              badge={activity.manual_override ? 'Modifié' : 'Auto'}
            />

            <Info
              title="Catégorie"
              value={category?.final_value || 'Ventes'}
              badge={category?.manual_override ? 'Modifié' : 'Auto'}
            />
          </div>

          <div className="rounded-xl border border-[#eadcc2] bg-white p-3">
            <p className="font-bold text-[#2f2415] mb-2">Ce qui sera mis à jour</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {preview.actions.map((action) => (
                <div key={action.id} className="text-sm text-[#7d6a4a]">
                  <CheckCircle2 size={13} className="inline text-emerald-600" /> {action.label}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            Une seule validation met à jour les informations liées à cette vente.
          </div>
        </div>

        <div className="p-4 border-t border-[#eadcc2] flex justify-end gap-2">
          <button
            type="button"
            className="px-4 py-2 rounded-xl border border-[#d6c3a0]"
            onClick={() => setPreview(null)}
          >
            Annuler
          </button>

          <button
            type="button"
            disabled={committing}
            className="px-4 py-2 rounded-xl bg-[#c9a96a] text-white font-bold disabled:opacity-60"
            onClick={validate}
          >
            {committing ? 'Validation...' : 'Valider la vente'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Info({ title, value, badge }) {
  return (
    <div className="rounded-xl border border-[#eadcc2] bg-white p-3">
      <span className={`text-xs border rounded-full px-2 py-0.5 ${badgeClass(badge)}`}>
        {badge}
      </span>

      <p className="text-xs text-[#8a7456] mt-2">{title}</p>
      <p className="text-lg font-black text-[#2f2415]">{value}</p>
    </div>
  );
}

function SalesBridge(props) {
  const [preview, setPreview] = useState(null);
  const payments = arr(props.paymentsList || props.payments);
  const orders = arr(props.rows).map((order) => enrichSalesOrderStatus(order, payments));
  const ca = orders.reduce((sum, order) => sum + total(order), 0);
  const cash = orders.reduce((sum, order) => sum + paidForOrder(order, payments), 0);
  const creances = Math.max(0, ca - cash);
  const toSecure = orders.filter((order) => isOpenForPayment(order, payments)).slice(0, 6);

  return (
    <div className="rounded-2xl border border-[#d6c3a0] bg-white p-5 space-y-4">
      <SalesPreviewModal preview={preview} setPreview={setPreview} props={props} />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#8a7456]">Validation de vente</p>
          <h3 className="font-black text-[#2f2415]">1 vente = les informations liées se mettent à jour</h3>
          <p className="text-sm text-[#8a7456] mt-1">
            Tu vérifies avant validation, puis les paiements, preuves, client et historique sont suivis ensemble.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 text-sm">
          <Mini icon={Receipt} label="CA" value={fmtCurrency(ca)} />
          <Mini icon={CreditCard} label="Cash" value={fmtCurrency(cash)} />
          <Mini icon={Users} label="Créances" value={fmtCurrency(creances)} />
        </div>
      </div>

      {toSecure.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
          {toSecure.map((order) => (
            <div
              key={order.id}
              className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3"
            >
              <p className="font-bold text-[#2f2415]">
                <FileText size={14} className="inline" /> {order.product_name || order.libelle || order.id}
              </p>

              <p className="text-xs text-[#8a7456] mt-1">
                {clientName(props.clients, order.client_id)} · reste {fmtCurrency(remainingForOrder(order, payments))}
              </p>

              <p className="text-xs text-[#8a7456] mt-1">
                Commande: {order.order_status_label} · Paiement: {order.payment_status_label} · Facture:{' '}
                {order.invoice_status_label}
              </p>

              <button
                type="button"
                className="mt-3 text-sm font-bold text-emerald-700"
                onClick={() => secureSale(order, props, setPreview)}
              >
                <CheckCircle2 size={14} className="inline" /> Vérifier avant validation
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3 text-sm text-[#8a7456]">
          <CheckCircle2 size={14} className="inline" /> Aucune vente à sécuriser.
        </div>
      )}
    </div>
  );
}

function Mini({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl bg-[#fffdf8] border border-[#eadcc2] px-3 py-2 min-w-[110px]">
      <Icon size={14} className="text-[#9a6b12]" />

      <b className="block text-[#2f2415]">{value}</b>

      <span className="text-xs text-[#8a7456]">{label}</span>
    </div>
  );
}

export default function VentesV2(props) {
  const documentsCrud = useCrudModule('documents');
  const alertesCrud = useCrudModule('alertes_center');
  const financesCrud = useCrudModule('finances');
  const eventsCrud = useCrudModule('business_events');
  const invoicesCrud = useCrudModule('invoices');
  const paymentsCrud = useCrudModule('payments');

  const payments = props.paymentsList || props.payments || paymentsCrud.rows;
  const transactions = props.transactions || props.finances || financesCrud.rows;
  const invoices = props.invoicesList || props.invoices || invoicesCrud.rows;

  const mergedProps = {
    ...props,
    rows: arr(props.rows).map((order) => enrichSalesOrderStatus(order, payments)),
    paymentsList: payments,
    payments,
    transactions,
    invoicesList: invoices,
    invoices,
    documents: props.documents || documentsCrud.rows,
    alertes: props.alertes || alertesCrud.rows,

    onCreateDocument: props.onCreateDocument || documentsCrud.create,
    onRefreshDocuments: props.onRefreshDocuments || documentsCrud.refresh,

    onCreateAlert: props.onCreateAlert || alertesCrud.create,
    onRefreshAlertes: props.onRefreshAlertes || alertesCrud.refresh,

    onCreateFinanceTransaction: props.onCreateFinanceTransaction || financesCrud.create,
    onRefreshFinances: props.onRefreshFinances || financesCrud.refresh,

    onCreateInvoice: props.onCreateInvoice || invoicesCrud.create,
    onRefreshInvoices: props.onRefreshInvoices || invoicesCrud.refresh,

    onCreatePayment: props.onCreatePayment || paymentsCrud.create,
    onRefreshPayments: props.onRefreshPayments || paymentsCrud.refresh,

    onRefreshBusinessEvents: props.onRefreshBusinessEvents || eventsCrud.refresh,
  };

  return (
    <div className="space-y-6">
      <SalesOpportunitiesBridge {...mergedProps} />
      <SalesQualityControl {...mergedProps} />
      <SalesDeliveryControl {...mergedProps} />
      <SalesBridge {...mergedProps} />
      <PaymentCapturePanel {...mergedProps} />
      <Ventes {...mergedProps} />
    </div>
  );
}