/* eslint-disable react-refresh/only-export-components */
import { CreditCard, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import useWorkflowSubmit from '../../hooks/useWorkflowSubmit.js';
import { t } from '../../i18n/fr/index.js';
import {
  commitCommercialSale,
  prepareCommercialSaleCommit,
  validateCommercialSaleForm,
} from '../../utils/commercialSaleWorkflow.js';
import {
  connectedUserId,
  DAILY_ENTRY_TYPES,
  dailyEntryConfirmation,
} from '../../utils/dailyQuickEntryContract.js';
import { fmtCurrency } from '../../utils/format.js';
import { makeId } from '../../utils/ids.js';
import { buildSaleFormFromDraft } from '../../utils/saleFormDraft.js';
import { isMeatStock } from '../../utils/saleSourceHints.js';
import { buildSellableStockSaleOptions } from '../../utils/sellableStock.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const clean = (value) => String(value || '').trim();
const num = (value) => Number(value || 0) || 0;
const today = () => new Date().toISOString().slice(0, 10);
const WALK_IN = 'client_passage';
const inputClass = 'min-h-[44px] w-full rounded-lg border border-[#d6c3a0] bg-white px-3 py-2 text-sm text-[#2f2415]';

function targetLabel(row = {}) {
  return row.name || row.nom || row.produit || row.culture || row.id || t('dailyEntries.sale.product');
}

function activeCount(row = {}) {
  return num(row.current_count ?? row.effectif_actuel ?? row.active_count ?? row.initial_count ?? 1);
}

export function buildDailySaleOptions(props = {}) {
  const stocks = buildSellableStockSaleOptions(props.stocks, { meatChecker: isMeatStock })
    .map((option) => ({ ...option, source_type: 'stock', key: `stock:${option.value}` }));
  const lots = arr(props.lots)
    .filter((row) => activeCount(row) > 0 && !/vendu|termine|terminé|perdu/.test(String(row.status || row.statut || '').toLowerCase()))
    .map((row) => ({
      key: `lot_avicole:${row.id}`,
      value: row.id,
      source_type: 'lot_avicole',
      label: t('dailyEntries.sale.availableHeads', { name: targetLabel(row), quantity: activeCount(row) }),
      name: targetLabel(row),
      qty: activeCount(row),
      unit: 'tête',
      price: num(row.prix_vente_prevu ?? row.prix_unitaire_vente),
      sale_kind: 'chair',
      sourceRow: row,
    }));
  const animals = arr(props.animaux)
    .filter((row) => !/vendu|mort|vole|volé/.test(String(row.status || row.statut || '').toLowerCase()))
    .map((row) => ({
      key: `animal:${row.id}`,
      value: row.id,
      source_type: 'animal',
      label: targetLabel(row),
      name: targetLabel(row),
      qty: 1,
      unit: 'tête',
      price: num(row.prix_vente_estime ?? row.sale_price ?? row.prix_vente),
      sale_kind: 'animal',
      sourceRow: row,
    }));
  const cultures = arr(props.cultures)
    .filter((row) => num(row.quantite_disponible ?? row.quantite_recoltee) > 0)
    .map((row) => ({
      key: `culture:${row.id}`,
      value: row.id,
      source_type: 'culture',
      label: t('dailyEntries.sale.availableQuantity', {
        name: targetLabel(row),
        quantity: num(row.quantite_disponible ?? row.quantite_recoltee),
        unit: row.unite || 'kg',
      }),
      name: targetLabel(row),
      qty: num(row.quantite_disponible ?? row.quantite_recoltee),
      unit: row.unite || 'kg',
      price: num(row.prix_vente_kg ?? row.prix_vente_unitaire),
      sale_kind: 'culture',
      sourceRow: row,
    }));
  return [...stocks, ...lots, ...animals, ...cultures];
}

function initialForm(props, prefill, options) {
  const draft = prefill ? buildSaleFormFromDraft(prefill, props) : {};
  const draftOption = options.find((option) => (
    clean(option.source_type) === clean(draft.source_type)
    && clean(option.value) === clean(draft.source_id)
  ));
  const selected = draftOption || (options.length === 1 ? options[0] : null);
  return {
    entry_id: clean(prefill?.entry_id || draft.entry_id) || makeId('ENTRY'),
    date: draft.date || today(),
    client_id: draft.client_id || WALK_IN,
    source_type: selected?.source_type || draft.source_type || 'stock',
    source_id: selected?.value || draft.source_id || '',
    product_name: selected?.name || draft.product_name || '',
    quantity: draft.quantity || 1,
    unit: selected?.unit || draft.unit || 'unité',
    sale_kind: selected?.sale_kind || draft.sale_kind || '',
    unit_price: draft.unit_price || selected?.price || 0,
    payment_status: draft.payment_status || 'paye',
    paid_amount: draft.paid_amount || '',
    payment_method: draft.payment_method || 'especes',
    fulfillment_mode: draft.fulfillment_mode || 'recupere',
    delivery_fee: draft.delivery_fee || 0,
    invoice_issued: draft.invoice_issued !== false,
    notes: draft.notes || '',
    opportunity_id: draft.opportunity_id || '',
  };
}

function Label({ title, children }) {
  return <label className="block text-sm"><span className="mb-1 block text-xs font-bold text-[#7d6a4a]">{title}</span>{children}</label>;
}

export default function DailySaleModal({ props, onClose, onDone, prefill = null }) {
  const options = useMemo(() => buildDailySaleOptions(props), [props]);
  const [form, setForm] = useState(() => initialForm(props, prefill, options));
  const [error, setError] = useState('');
  const { submit: workflowSubmit, busy } = useWorkflowSubmit();
  const selected = options.find((option) => option.source_type === form.source_type && String(option.value) === String(form.source_id));
  const total = num(form.quantity) * num(form.unit_price) + num(form.delivery_fee);

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const chooseSource = (key) => {
    const option = options.find((candidate) => candidate.key === key);
    setForm((current) => ({
      ...current,
      source_type: option?.source_type || '',
      source_id: option?.value || '',
      product_name: option?.name || '',
      quantity: option?.source_type === 'animal' ? 1 : current.quantity || 1,
      unit: option?.unit || 'unité',
      sale_kind: option?.sale_kind || '',
      unit_price: option?.price || 0,
    }));
  };

  const submit = async (event) => {
    event.preventDefault();
    const message = validateCommercialSaleForm(form, {
      walkInOnlyPaid: true,
      farmScope: props.farmScope,
      accessibleFarms: props.accessibleFarms,
      activeFarm: props.activeFarm,
      stocks: props.stocks,
      lots: props.lots,
      cultures: props.cultures,
      animaux: props.animaux,
      strictSourceRequired: true,
    });
    if (message) {
      setError(message);
      return;
    }

    setError('');
    try {
      const guarded = await workflowSubmit(form.entry_id, async () => {
        const client = form.client_id === WALK_IN
          ? null
          : arr(props.clients).find((row) => String(row.id) === String(form.client_id));
        const clientLabel = client?.nom || client?.name || t('dailyEntries.sale.walkInCustomer');
        const { records } = prepareCommercialSaleCommit({
          form,
          clientLabel,
          selectedMeta: selected,
          farmScope: props.farmScope,
          accessibleFarms: props.accessibleFarms,
          activeFarm: props.activeFarm,
          userId: connectedUserId(props.user),
        });
        const result = await commitCommercialSale(records, {
          onCreateOrder: props.onCreate,
          onCreateItem: props.onCreateItem,
          onCreateDelivery: props.onCreateDelivery,
          onCreateInvoice: props.onCreateInvoice,
          onCreateDocument: props.onCreateDocument,
          onCreatePayment: props.onCreatePayment,
          onCreateBusinessEvent: props.onCreateBusinessEvent,
          onRefreshWorkflow: props.onRefreshWorkflow,
          onUpdateOpportunity: props.onUpdateOpportunity,
        }, {
          form,
          clientLabel,
          selected,
          stocks: props.stocks,
          lots: props.lots,
          cultures: props.cultures,
          animaux: props.animaux,
          clients: props.clients,
          salesOrders: props.rows,
          businessEvents: props.businessEvents,
          payments: props.paymentsList || props.payments,
          transactions: props.transactions,
          tasks: props.tasks || props.existingTasks,
          alertes: props.alertes,
          sideEffectHandlers: props,
        });
        toast.success(dailyEntryConfirmation(DAILY_ENTRY_TYPES.SALE, result));
        onDone?.(result.orderId, result);
        return result;
      });
      if (guarded?.skipped && guarded.reason === 'in_flight') return;
    } catch (cause) {
      setError(cause.message || t('dailyEntries.common.registrationError'));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3" data-testid="daily-sale-modal">
      <div className="max-h-[94vh] w-full max-w-xl overflow-y-auto rounded-lg border border-[#d6c3a0] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#eadcc2] p-4">
          <h2 className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><CreditCard size={18} /> {t('dailyEntries.sale.title')}</h2>
          <button type="button" onClick={onClose} aria-label={t('dailyEntries.common.close')}><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="space-y-3 p-4" data-testid="daily-sale-form">
          {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" data-testid="daily-sale-error">{error}</div> : null}
          <Label title={t('dailyEntries.sale.productSold')}>
            <select className={inputClass} value={selected?.key || ''} onChange={(event) => chooseSource(event.target.value)} required data-testid="daily-sale-source">
              <option value="">{t('dailyEntries.common.choose')}</option>
              {options.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
            </select>
          </Label>
          <div className="grid grid-cols-2 gap-3">
            <Label title={t('dailyEntries.sale.quantity')}><input className={inputClass} type="number" min="0.01" step="0.01" value={form.quantity} onChange={(event) => set('quantity', event.target.value)} required disabled={form.source_type === 'animal'} data-testid="daily-sale-quantity" /></Label>
            <Label title={t('dailyEntries.sale.pricePerUnit', { unit: form.unit })}><input className={inputClass} type="number" min="1" value={form.unit_price} onChange={(event) => set('unit_price', event.target.value)} required data-testid="daily-sale-price" /></Label>
          </div>
          <Label title={t('dailyEntries.sale.client')}>
            <select className={inputClass} value={form.client_id} onChange={(event) => set('client_id', event.target.value)} required data-testid="daily-sale-client">
              <option value={WALK_IN}>{t('dailyEntries.sale.walkInCustomer')}</option>
              {arr(props.clients).map((client) => <option key={client.id} value={client.id}>{client.nom || client.name || client.id}</option>)}
            </select>
          </Label>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{t('dailyEntries.sale.total')} <b className="float-right">{fmtCurrency(total)}</b></div>
          <details className="rounded-lg border border-[#eadcc2] bg-[#fffdf8] p-3">
            <summary className="cursor-pointer text-sm font-black text-[#2f2415]">{t('dailyEntries.common.details')}</summary>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Label title={t('dailyEntries.common.date')}><input className={inputClass} type="date" value={form.date} onChange={(event) => set('date', event.target.value)} /></Label>
              <Label title={t('dailyEntries.sale.payment')}><select className={inputClass} value={form.payment_status} onChange={(event) => set('payment_status', event.target.value)}><option value="paye">{t('dailyEntries.sale.paid')}</option><option value="partiel">{t('dailyEntries.sale.partial')}</option><option value="non_paye">{t('dailyEntries.sale.toCollect')}</option></select></Label>
              {form.payment_status === 'partiel' ? <Label title={t('dailyEntries.sale.amountPaid')}><input className={inputClass} type="number" value={form.paid_amount} onChange={(event) => set('paid_amount', event.target.value)} /></Label> : null}
              <Label title={t('dailyEntries.sale.mode')}><select className={inputClass} value={form.fulfillment_mode} onChange={(event) => set('fulfillment_mode', event.target.value)}><option value="recupere">{t('dailyEntries.sale.pickup')}</option><option value="livraison">{t('dailyEntries.sale.delivered')}</option><option value="a_livrer">{t('dailyEntries.sale.toDeliver')}</option></select></Label>
              <Label title={t('dailyEntries.sale.invoice')}><select className={inputClass} value={form.invoice_issued ? 'oui' : 'non'} onChange={(event) => set('invoice_issued', event.target.value === 'oui')}><option value="oui">{t('dailyEntries.sale.yes')}</option><option value="non">{t('dailyEntries.sale.no')}</option></select></Label>
              <Label title={t('dailyEntries.common.notes')}><input className={inputClass} value={form.notes} onChange={(event) => set('notes', event.target.value)} /></Label>
            </div>
          </details>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="min-h-[44px] rounded-lg border border-[#d6c3a0] px-4 text-sm font-bold">{t('dailyEntries.common.cancel')}</button>
            <button type="submit" disabled={busy} className="min-h-[44px] rounded-lg bg-[#2f2415] px-5 text-sm font-black text-white disabled:opacity-50" data-testid="daily-sale-submit">{busy ? t('dailyEntries.common.saving') : t('dailyEntries.common.save')}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
