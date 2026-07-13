import { useMemo, useState } from 'react';
import { PACKAGE_SIZES } from '../../../config/agriFeeds.config.js';
import {
  prepareProductionOrder,
  commitProductionOrder,
  prepareCloseProductionOrder,
  commitCloseProductionOrder,
} from '../../../services/agriFeeds/feedProductionWorkflow.js';
import { fmtCurrency, fmtNumber, toNumber } from '../../../utils/format.js';

const arr = (v) => (Array.isArray(v) ? v : []);

const DESTINATIONS = [
  { value: 'internal_test', label: 'Test interne' },
  { value: 'internal_consumption', label: 'Consommation interne' },
  { value: 'client_testing', label: 'Test client' },
  { value: 'commercial_sale', label: 'Vente commerciale' },
];

const STATUS_LABEL = {
  planned: 'Planifié',
  in_progress: 'En cours',
  completed: 'Clôturé',
  cancelled: 'Annulé',
};

export default function ProductionTab({
  dataMap = {},
  onCreateFeedProductionOrder,
  onUpdateFeedProductionOrder,
  onUpdateFeedRawBatch,
  onCreateFeedFinishedBatch,
  onCreateFeedQualityCheck,
  onCreateStock,
  onUpdateStock,
  onCreateStockMovement,
  onCreateBusinessEvent,
  onCreateAlert,
}) {
  const formulas = arr(dataMap.feed_formulas);
  const versions = arr(dataMap.feed_formula_versions);
  const orders = arr(dataMap.feed_production_orders);
  const finished = arr(dataMap.feed_finished_batches);

  const [orderForm, setOrderForm] = useState({
    formula_version_id: '',
    planned_quantity: '100',
    production_date: new Date().toISOString().slice(0, 10),
    machine_used: '',
    responsible_person: '',
    notes: '',
  });
  const [closeForm, setCloseForm] = useState({
    order_id: '',
    actual_quantity: '',
    qc_result: 'accepted',
    package_size: '25kg',
    destination: 'internal_test',
    packaging_cost: '',
    labor_cost: '',
    energy_cost: '',
    storage_location: 'Stock produits finis',
    qc_notes: '',
  });
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [previewFifo, setPreviewFifo] = useState(null);

  const versionOptions = useMemo(() => (
    versions
      .map((v) => {
        const formula = formulas.find((f) => String(f.id) === String(v.formula_id));
        return {
          ...v,
          label: `${formula?.name || 'Formule'} · ${v.version_code || v.id}`,
          formulaStatus: formula?.status || '',
        };
      })
      .filter((v) => !['abandoned', 'suspended'].includes(String(v.formulaStatus || '').toLowerCase()))
      .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
  ), [versions, formulas]);

  const openOrders = orders
    .filter((o) => ['planned', 'in_progress'].includes(String(o.status || '').toLowerCase()))
    .sort((a, b) => String(b.production_date || '').localeCompare(String(a.production_date || '')));

  const closedOrders = orders
    .filter((o) => String(o.status || '').toLowerCase() === 'completed')
    .slice(0, 8);

  const refreshFifoPreview = (versionId, qty) => {
    if (!versionId || toNumber(qty) <= 0) {
      setPreviewFifo(null);
      return;
    }
    const preview = prepareProductionOrder({
      formula_version_id: versionId,
      planned_quantity: toNumber(qty),
    }, dataMap);
    setPreviewFifo(preview);
  };

  const createOrder = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const preview = prepareProductionOrder({
        ...orderForm,
        planned_quantity: toNumber(orderForm.planned_quantity),
      }, dataMap);
      if (!preview.ok) {
        setMessage(preview.error);
        setPreviewFifo(preview);
        return;
      }
      await commitProductionOrder(preview, {
        onCreateOrder: onCreateFeedProductionOrder,
        onUpdateBatch: onUpdateFeedRawBatch,
        onUpdateStock,
        onCreateStockMovement,
        onCreateBusinessEvent,
      });
      setMessage(
        `OF créé — ${preview.order.order_code} · ${fmtNumber(preview.order.planned_quantity)} kg · `
        + `${fmtCurrency(preview.theoretical_cost_per_kg)}/kg théo.`,
      );
      setOrderForm((prev) => ({
        ...prev,
        planned_quantity: '100',
        notes: '',
      }));
      setPreviewFifo(null);
      setCloseForm((prev) => ({ ...prev, order_id: preview.order.id, actual_quantity: String(preview.order.planned_quantity) }));
    } catch (err) {
      setMessage(err?.message || 'Création OF impossible.');
    } finally {
      setBusy(false);
    }
  };

  const closeOrder = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const preview = prepareCloseProductionOrder({
        ...closeForm,
        actual_quantity: toNumber(closeForm.actual_quantity),
        packaging_cost: toNumber(closeForm.packaging_cost),
        labor_cost: toNumber(closeForm.labor_cost),
        energy_cost: toNumber(closeForm.energy_cost),
      }, dataMap);
      if (!preview.ok) {
        setMessage(preview.error);
        return;
      }
      await commitCloseProductionOrder(preview, {
        onUpdateOrder: onUpdateFeedProductionOrder,
        onCreateFinishedBatch: onCreateFeedFinishedBatch,
        onCreateStock,
        onCreateStockMovement,
        onCreateQualityCheck: onCreateFeedQualityCheck,
        onCreateBusinessEvent,
        onCreateAlert,
      });
      const varianceNote = preview.variance?.exceeds ? ` · ${preview.variance.message}` : '';
      setMessage(
        `OF clôturé — lot ${preview.finishedBatch.batch_code} · `
        + `${fmtNumber(preview.finishedBatch.quantity_produced)} kg · `
        + `${fmtCurrency(preview.real.real_cost_per_kg)}/kg réel${varianceNote}`,
      );
      setCloseForm((prev) => ({
        ...prev,
        order_id: '',
        actual_quantity: '',
        packaging_cost: '',
        labor_cost: '',
        energy_cost: '',
        qc_notes: '',
      }));
    } catch (err) {
      setMessage(err?.message || 'Clôture OF impossible.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-line bg-white p-6 space-y-2">
        <p className="text-lg font-semibold text-earth">Production</p>
        <p className="text-sm text-slate leading-relaxed max-w-3xl">
          Ordres de fabrication avec consommation FIFO des matières, lots produits finis,
          stock PF et QR public (sans recette complète). QC obligatoire avant clôture.
        </p>
        {message ? (
          <p className="text-sm rounded-xl border border-line bg-card px-3 py-2">{message}</p>
        ) : null}
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <form onSubmit={createOrder} className="rounded-3xl border border-line bg-white p-6 space-y-3">
          <p className="font-semibold text-earth">Nouvel ordre de fabrication</p>
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-slate">Version de formule</span>
            <select
              value={orderForm.formula_version_id}
              onChange={(e) => {
                const formula_version_id = e.target.value;
                setOrderForm((p) => ({ ...p, formula_version_id }));
                refreshFifoPreview(formula_version_id, orderForm.planned_quantity);
              }}
              className="w-full min-h-[44px] rounded-xl border border-line px-3 text-sm"
              required
            >
              <option value="">Choisir…</option>
              {versionOptions.map((v) => (
                <option key={v.id} value={v.id}>{v.label}</option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate">Quantité planifiée (kg)</span>
              <input
                type="number"
                min="1"
                step="0.1"
                value={orderForm.planned_quantity}
                onChange={(e) => {
                  const planned_quantity = e.target.value;
                  setOrderForm((p) => ({ ...p, planned_quantity }));
                  refreshFifoPreview(orderForm.formula_version_id, planned_quantity);
                }}
                className="w-full min-h-[44px] rounded-xl border border-line px-3 text-sm"
                required
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate">Date</span>
              <input
                type="date"
                value={orderForm.production_date}
                onChange={(e) => setOrderForm((p) => ({ ...p, production_date: e.target.value }))}
                className="w-full min-h-[44px] rounded-xl border border-line px-3 text-sm"
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate">Machine</span>
              <input
                value={orderForm.machine_used}
                onChange={(e) => setOrderForm((p) => ({ ...p, machine_used: e.target.value }))}
                className="w-full min-h-[44px] rounded-xl border border-line px-3 text-sm"
                placeholder="Mélangeur / presse"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate">Responsable</span>
              <input
                value={orderForm.responsible_person}
                onChange={(e) => setOrderForm((p) => ({ ...p, responsible_person: e.target.value }))}
                className="w-full min-h-[44px] rounded-xl border border-line px-3 text-sm"
              />
            </label>
          </div>
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-slate">Notes</span>
            <textarea
              value={orderForm.notes}
              onChange={(e) => setOrderForm((p) => ({ ...p, notes: e.target.value }))}
              className="w-full min-h-[72px] rounded-xl border border-line px-3 py-2 text-sm"
            />
          </label>

          {previewFifo?.requirements?.length ? (
            <div className="rounded-2xl border border-line bg-card p-3 space-y-1">
              <p className="text-meta font-semibold uppercase text-slate">FIFO matières</p>
              {previewFifo.requirements.map((r) => (
                <p key={r.raw_material_id} className="text-xs text-earth">
                  {r.raw_material_name} — {fmtNumber(r.quantity_needed)} kg
                  {r.fifo?.ok
                    ? ` · ${r.fifo.allocations.length} lot(s)`
                    : ` · manque ${fmtNumber(r.fifo?.shortfall)} kg`}
                </p>
              ))}
              {previewFifo.ok ? (
                <p className="text-xs font-semibold text-positive pt-1">
                  Coût théo. {fmtCurrency(previewFifo.theoretical_cost_per_kg)}/kg
                </p>
              ) : (
                <p className="text-xs font-semibold text-urgent pt-1">{previewFifo.error}</p>
              )}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={busy || !versionOptions.length}
            className="min-h-[44px] rounded-xl bg-earth px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            Lancer l’OF (consommer MP)
          </button>
        </form>

        <form onSubmit={closeOrder} className="rounded-3xl border border-line bg-white p-6 space-y-3">
          <p className="font-semibold text-earth">Clôturer un OF</p>
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-slate">OF ouvert</span>
            <select
              value={closeForm.order_id}
              onChange={(e) => {
                const order_id = e.target.value;
                const order = orders.find((o) => String(o.id) === order_id);
                setCloseForm((p) => ({
                  ...p,
                  order_id,
                  actual_quantity: order ? String(order.planned_quantity || '') : p.actual_quantity,
                }));
              }}
              className="w-full min-h-[44px] rounded-xl border border-line px-3 text-sm"
              required
            >
              <option value="">Choisir…</option>
              {openOrders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.order_code} · {fmtNumber(o.planned_quantity)} kg · {STATUS_LABEL[o.status] || o.status}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate">Quantité réelle (kg)</span>
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={closeForm.actual_quantity}
                onChange={(e) => setCloseForm((p) => ({ ...p, actual_quantity: e.target.value }))}
                className="w-full min-h-[44px] rounded-xl border border-line px-3 text-sm"
                required
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate">QC</span>
              <select
                value={closeForm.qc_result}
                onChange={(e) => setCloseForm((p) => ({ ...p, qc_result: e.target.value }))}
                className="w-full min-h-[44px] rounded-xl border border-line px-3 text-sm"
                required
              >
                <option value="accepted">Conforme</option>
                <option value="under_review">En revue</option>
                <option value="rejected">Non conforme</option>
              </select>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate">Conditionnement</span>
              <select
                value={closeForm.package_size}
                onChange={(e) => setCloseForm((p) => ({ ...p, package_size: e.target.value }))}
                className="w-full min-h-[44px] rounded-xl border border-line px-3 text-sm"
              >
                {PACKAGE_SIZES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate">Destination</span>
              <select
                value={closeForm.destination}
                onChange={(e) => setCloseForm((p) => ({ ...p, destination: e.target.value }))}
                className="w-full min-h-[44px] rounded-xl border border-line px-3 text-sm"
              >
                {DESTINATIONS.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate">Emballage</span>
              <input
                type="number"
                min="0"
                value={closeForm.packaging_cost}
                onChange={(e) => setCloseForm((p) => ({ ...p, packaging_cost: e.target.value }))}
                className="w-full min-h-[44px] rounded-xl border border-line px-3 text-sm"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate">Main-d’œuvre</span>
              <input
                type="number"
                min="0"
                value={closeForm.labor_cost}
                onChange={(e) => setCloseForm((p) => ({ ...p, labor_cost: e.target.value }))}
                className="w-full min-h-[44px] rounded-xl border border-line px-3 text-sm"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate">Énergie</span>
              <input
                type="number"
                min="0"
                value={closeForm.energy_cost}
                onChange={(e) => setCloseForm((p) => ({ ...p, energy_cost: e.target.value }))}
                className="w-full min-h-[44px] rounded-xl border border-line px-3 text-sm"
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={busy || !openOrders.length}
            className="min-h-[44px] rounded-xl bg-earth px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            Clôturer → lot + QR + stock PF
          </button>
        </form>
      </div>

      <section className="rounded-3xl border border-line bg-white p-6 space-y-3">
        <p className="font-semibold text-earth">OF ouverts ({openOrders.length})</p>
        {openOrders.length ? (
          <div className="space-y-2">
            {openOrders.map((o) => (
              <div key={o.id} className="rounded-2xl border border-line px-3 py-2 text-sm flex flex-wrap justify-between gap-2">
                <span className="font-semibold text-earth">{o.order_code}</span>
                <span className="text-slate">
                  {STATUS_LABEL[o.status] || o.status} · {fmtNumber(o.planned_quantity)} kg · {fmtCurrency(o.theoretical_cost_per_kg)}/kg théo.
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate">Aucun OF en cours.</p>
        )}
      </section>

      <section className="rounded-3xl border border-line bg-white p-6 space-y-3">
        <p className="font-semibold text-earth">Lots produits finis ({finished.length})</p>
        {finished.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {finished
              .slice()
              .sort((a, b) => String(b.production_date || '').localeCompare(String(a.production_date || '')))
              .map((batch) => (
                <article key={batch.id} className="rounded-2xl border border-line p-3 space-y-2">
                  <div className="flex justify-between gap-2">
                    <p className="font-semibold text-earth">{batch.batch_code}</p>
                    <p className="text-xs text-slate">{batch.destination}</p>
                  </div>
                  <p className="text-sm text-earth">
                    {fmtNumber(batch.quantity_available)} / {fmtNumber(batch.quantity_produced)} kg · {batch.package_size}
                    {' · '}{fmtCurrency(batch.unit_cost)}/kg
                  </p>
                  <p className="text-xs text-slate">
                    QC {batch.quality_status} · {batch.production_date || '—'}
                  </p>
                  {batch.qr_code_url ? (
                    <a
                      href={batch.qr_code_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center text-xs font-semibold text-earth underline"
                    >
                      Voir QR public
                    </a>
                  ) : null}
                </article>
              ))}
          </div>
        ) : (
          <p className="text-sm text-slate">Aucun lot fini pour l’instant.</p>
        )}
        {closedOrders.length ? (
          <p className="text-xs text-slate pt-1">
            Derniers OF clôturés : {closedOrders.map((o) => o.order_code).join(', ')}
          </p>
        ) : null}
      </section>
    </div>
  );
}
