import { useMemo, useState } from 'react';
import {
  buildAgriFeedsCommercialDecisionCards,
  buildRepurchaseSuggestions,
  commitCustomerFeedback,
  commitFeedSaleOrder,
  computeAgriFeedsCommercialKpis,
  listCommercializableFeedBatches,
  prepareCustomerFeedback,
  prepareFeedSaleOrder,
} from '../../../services/agriFeeds/feedCommercialWorkflow.js';
import { fmtCurrency, fmtNumber, fmtPercent, toNumber } from '../../../utils/format.js';

const arr = (v) => (Array.isArray(v) ? v : []);
const today = () => new Date().toISOString().slice(0, 10);

function clientLabel(client = {}) {
  return client.name || client.nom || client.raison_sociale || client.phone || client.telephone || client.id;
}

function batchLabel(row = {}) {
  const { batch, formula, version } = row;
  return `${formula?.name || 'Aliment AGRI FEEDS'} · ${version?.version_code || batch?.formula_version_id || ''} · ${batch?.batch_code || batch?.id}`;
}

export default function CommercialTab({
  dataMap = {},
  onCreateSaleOrder,
  onCreateSaleOrderItem,
  onUpdateFeedFinishedBatch,
  onUpdateStock,
  onCreateStockMovement,
  onCreateFinanceTransaction,
  onUpdateClient,
  onCreateBusinessEvent,
  onCreateAlert,
}) {
  const clients = arr(dataMap.clients);
  const sellableBatches = useMemo(() => listCommercializableFeedBatches(dataMap), [dataMap]);
  const kpis = useMemo(() => computeAgriFeedsCommercialKpis(dataMap), [dataMap]);
  const relances = useMemo(() => buildRepurchaseSuggestions(dataMap).slice(0, 5), [dataMap]);
  const decisionCards = useMemo(() => buildAgriFeedsCommercialDecisionCards(dataMap), [dataMap]);

  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [saleForm, setSaleForm] = useState({
    client_id: '',
    feed_finished_batch_id: '',
    quantity_kg: '25',
    unit_price: '',
    paid_amount: '',
    order_date: today(),
    delivery_date: today(),
    notes: '',
  });
  const [feedbackForm, setFeedbackForm] = useState({
    client_id: '',
    feed_finished_batch_id: '',
    satisfaction_score: '4',
    complaint_type: '',
    repurchase_intention: 'oui',
    notes: '',
  });

  const selectedBatch = sellableBatches.find((row) => String(row.batch.id) === String(saleForm.feed_finished_batch_id));
  const salePreview = selectedBatch && saleForm.client_id && toNumber(saleForm.quantity_kg) > 0
    ? prepareFeedSaleOrder({
      ...saleForm,
      quantity_kg: toNumber(saleForm.quantity_kg),
      unit_price: toNumber(saleForm.unit_price),
      paid_amount: toNumber(saleForm.paid_amount),
    }, dataMap)
    : null;

  const selectBatch = (batchId) => {
    const row = sellableBatches.find((r) => String(r.batch.id) === String(batchId));
    const unitCost = toNumber(row?.batch?.unit_cost);
    const suggestedPrice = unitCost > 0 ? Math.round(unitCost * 1.2) : '';
    setSaleForm((prev) => ({
      ...prev,
      feed_finished_batch_id: batchId,
      unit_price: prev.unit_price || String(suggestedPrice || ''),
    }));
    setFeedbackForm((prev) => ({ ...prev, feed_finished_batch_id: batchId }));
  };

  const submitSale = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const preview = prepareFeedSaleOrder({
        ...saleForm,
        quantity_kg: toNumber(saleForm.quantity_kg),
        unit_price: toNumber(saleForm.unit_price),
        paid_amount: toNumber(saleForm.paid_amount),
      }, dataMap);
      if (!preview.ok) {
        setMessage(preview.error);
        return;
      }
      await commitFeedSaleOrder(preview, {
        onCreateSaleOrder,
        onCreateSaleOrderItem,
        onUpdateFinishedBatch: onUpdateFeedFinishedBatch,
        onUpdateStock,
        onCreateStockMovement,
        onCreateFinanceTransaction,
        onUpdateClient,
        onCreateBusinessEvent,
        onCreateAlert,
      });
      setMessage(
        `Vente enregistrée — ${fmtNumber(preview.metrics.quantity)} kg · `
        + `${fmtCurrency(preview.metrics.total)} · marge estimée ${fmtCurrency(preview.metrics.margin)}.`,
      );
      setSaleForm((prev) => ({
        ...prev,
        quantity_kg: '25',
        paid_amount: '',
        notes: '',
      }));
    } catch (err) {
      setMessage(err?.message || 'Vente AGRI FEEDS impossible.');
    } finally {
      setBusy(false);
    }
  };

  const submitFeedback = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const preview = prepareCustomerFeedback(feedbackForm, dataMap);
      if (!preview.ok) {
        setMessage(preview.error);
        return;
      }
      await commitCustomerFeedback(preview, { onCreateBusinessEvent, onCreateAlert });
      setMessage(preview.alert ? 'Réclamation enregistrée avec alerte qualité.' : 'Retour client enregistré.');
      setFeedbackForm((prev) => ({ ...prev, complaint_type: '', notes: '' }));
    } catch (err) {
      setMessage(err?.message || 'Retour client impossible.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-line bg-white p-6 space-y-2">
        <p className="text-lg font-semibold text-earth">Commercial AGRI FEEDS</p>
        <p className="text-sm text-slate leading-relaxed max-w-3xl">
          Vente progressive uniquement sur lots issus de formules commercialisables, avec QC minimum,
          traçabilité, sortie stock, mouvement financier, suivi client et signaux de réachat.
        </p>
        {message ? (
          <p className="text-sm rounded-xl border border-line bg-card px-3 py-2">{message}</p>
        ) : null}
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="rounded-2xl border border-line bg-card p-4">
          <p className="text-xs font-semibold text-slate">CA du mois</p>
          <p className="text-lg font-semibold text-earth">{fmtCurrency(kpis.revenue_month)}</p>
        </div>
        <div className="rounded-2xl border border-line bg-card p-4">
          <p className="text-xs font-semibold text-slate">Marge estimée</p>
          <p className="text-lg font-semibold text-earth">{fmtCurrency(kpis.margin_month)}</p>
        </div>
        <div className="rounded-2xl border border-line bg-card p-4">
          <p className="text-xs font-semibold text-slate">Clients AGRI FEEDS</p>
          <p className="text-lg font-semibold text-earth">{fmtNumber(kpis.agri_clients_count)}</p>
        </div>
        <div className="rounded-2xl border border-line bg-card p-4">
          <p className="text-xs font-semibold text-slate">Taux réachat</p>
          <p className="text-lg font-semibold text-earth">{fmtPercent(kpis.repeat_rate, 0)}</p>
        </div>
        <div className="rounded-2xl border border-line bg-card p-4">
          <p className="text-xs font-semibold text-slate">Créances</p>
          <p className="text-lg font-semibold text-earth">{fmtCurrency(kpis.receivables)}</p>
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <form onSubmit={submitSale} className="rounded-3xl border border-line bg-white p-6 space-y-3">
          <p className="font-semibold text-earth">Enregistrer une vente validée</p>
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-slate">Client éleveur</span>
            <select
              value={saleForm.client_id}
              onChange={(e) => {
                setSaleForm((p) => ({ ...p, client_id: e.target.value }));
                setFeedbackForm((p) => ({ ...p, client_id: e.target.value }));
              }}
              className="w-full min-h-[44px] rounded-xl border border-line px-3 text-sm"
              required
            >
              <option value="">Choisir…</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>{clientLabel(client)}</option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-slate">Lot commercialisable</span>
            <select
              value={saleForm.feed_finished_batch_id}
              onChange={(e) => selectBatch(e.target.value)}
              className="w-full min-h-[44px] rounded-xl border border-line px-3 text-sm"
              required
            >
              <option value="">Choisir…</option>
              {sellableBatches.map((row) => (
                <option key={row.batch.id} value={row.batch.id}>
                  {batchLabel(row)} · {fmtNumber(row.batch.quantity_available)} kg dispo
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate">Quantité (kg)</span>
              <input
                type="number"
                min="1"
                step="0.1"
                value={saleForm.quantity_kg}
                onChange={(e) => setSaleForm((p) => ({ ...p, quantity_kg: e.target.value }))}
                className="w-full min-h-[44px] rounded-xl border border-line px-3 text-sm"
                required
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate">Prix / kg</span>
              <input
                type="number"
                min="1"
                value={saleForm.unit_price}
                onChange={(e) => setSaleForm((p) => ({ ...p, unit_price: e.target.value }))}
                className="w-full min-h-[44px] rounded-xl border border-line px-3 text-sm"
                required
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate">Montant encaissé</span>
              <input
                type="number"
                min="0"
                value={saleForm.paid_amount}
                onChange={(e) => setSaleForm((p) => ({ ...p, paid_amount: e.target.value }))}
                className="w-full min-h-[44px] rounded-xl border border-line px-3 text-sm"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate">Date vente</span>
              <input
                type="date"
                value={saleForm.order_date}
                onChange={(e) => setSaleForm((p) => ({ ...p, order_date: e.target.value }))}
                className="w-full min-h-[44px] rounded-xl border border-line px-3 text-sm"
              />
            </label>
          </div>
          {salePreview?.ok ? (
            <div className="rounded-2xl bg-card border border-line p-3 text-sm text-earth">
              Total : <b>{fmtCurrency(salePreview.metrics.total)}</b> · Marge estimée : <b>{fmtCurrency(salePreview.metrics.margin)}</b> · Reste : <b>{fmtCurrency(salePreview.metrics.remaining)}</b>
            </div>
          ) : salePreview?.error ? (
            <div className="rounded-2xl bg-urgent-bg border border-urgent p-3 text-sm text-urgent">{salePreview.error}</div>
          ) : null}
          <button
            type="submit"
            disabled={busy || !sellableBatches.length}
            className="rounded-xl bg-earth text-white px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            Enregistrer la vente
          </button>
        </form>

        <form onSubmit={submitFeedback} className="rounded-3xl border border-line bg-white p-6 space-y-3">
          <p className="font-semibold text-earth">Retour client / réclamation</p>
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate">Satisfaction / 5</span>
              <input
                type="number"
                min="1"
                max="5"
                value={feedbackForm.satisfaction_score}
                onChange={(e) => setFeedbackForm((p) => ({ ...p, satisfaction_score: e.target.value }))}
                className="w-full min-h-[44px] rounded-xl border border-line px-3 text-sm"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate">Type réclamation</span>
              <input
                value={feedbackForm.complaint_type}
                onChange={(e) => setFeedbackForm((p) => ({ ...p, complaint_type: e.target.value }))}
                placeholder="optionnel"
                className="w-full min-h-[44px] rounded-xl border border-line px-3 text-sm"
              />
            </label>
          </div>
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-slate">Observation</span>
            <textarea
              value={feedbackForm.notes}
              onChange={(e) => setFeedbackForm((p) => ({ ...p, notes: e.target.value }))}
              className="w-full min-h-[86px] rounded-xl border border-line px-3 py-2 text-sm"
              placeholder="Performance perçue, livraison, qualité, prochaine commande…"
            />
          </label>
          <button
            type="submit"
            disabled={busy || !feedbackForm.client_id || !feedbackForm.feed_finished_batch_id}
            className="rounded-xl border border-earth text-earth px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            Enregistrer le retour
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <section className="rounded-3xl border border-line bg-white p-6 space-y-3">
          <p className="font-semibold text-earth">Réachats à suivre</p>
          {relances.length ? relances.map((row) => (
            <div key={row.client.id} className="rounded-2xl border border-line bg-card p-3 text-sm">
              <p className="font-semibold text-earth">{clientLabel(row.client)}</p>
              <p className="text-slate">{row.reason}</p>
            </div>
          )) : <p className="text-sm text-slate">Aucun réachat en retard selon les données disponibles.</p>}
        </section>

        <section className="rounded-3xl border border-line bg-white p-6 space-y-3">
          <p className="font-semibold text-earth">Centre & assistant</p>
          {decisionCards.length ? decisionCards.map((card) => (
            <div key={card.title} className="rounded-2xl border border-line bg-card p-3 text-sm">
              <p className="font-semibold text-earth">{card.title}</p>
              <p className="text-slate">{card.message}</p>
              <p className="text-xs font-semibold text-earth mt-1">Action : {card.action}</p>
            </div>
          )) : <p className="text-sm text-slate">Aucun point d’attention commercial majeur.</p>}
        </section>
      </div>
    </div>
  );
}
