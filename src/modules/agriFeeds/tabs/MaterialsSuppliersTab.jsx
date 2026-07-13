import { useState } from 'react';
import {
  RAW_MATERIAL_CATEGORIES,
  QUALITY_STATUSES,
  AGRI_FEEDS_ALERT_THRESHOLDS,
} from '../../../config/agriFeeds.config.js';
import {
  prepareRawMaterialReception,
  commitRawMaterialReception,
  supplierHints,
  qualityThresholdsForMaterial,
} from '../../../services/agriFeeds/rawMaterialWorkflow.js';
import { resolveLatestUnitCost } from '../../../services/agriFeeds/feedCostEngine.js';
import { fmtCurrency, fmtNumber, toNumber } from '../../../utils/format.js';

const arr = (v) => (Array.isArray(v) ? v : []);

const emptyMaterial = {
  name: '',
  category: 'cereal',
  unit: 'kg',
  standard_moisture_threshold: AGRI_FEEDS_ALERT_THRESHOLDS.moisture_reject_above,
  storage_requirements: 'Au sec, séparé des animaux et fumiers',
  is_experimental: false,
  nutritional_notes: '',
  active: true,
};

const emptyReception = {
  supplier_id: '',
  raw_material_id: '',
  quantity_received: '',
  unit_cost: '',
  moisture_value: '',
  visual_check: 'conforme',
  smell_check: 'conforme',
  insect_check: 'absent',
  impurity_check: 'faible',
  storage_location: 'Stockage matières premières',
  payment_status: 'paye',
  quality_status: 'accepted',
  notes: '',
};

export default function MaterialsSuppliersTab({
  dataMap = {},
  onCreateFeedRawMaterial,
  onCreateFeedRawBatch,
  onCreateStock,
  onUpdateStock,
  onCreateStockMovement,
  onCreateFinanceTransaction,
  onUpdateSupplier,
  onCreateBusinessEvent,
  onCreateAlert,
  stocks = [],
}) {
  const materials = arr(dataMap.feed_raw_materials);
  const batches = arr(dataMap.feed_raw_batches);
  const suppliers = arr(dataMap.fournisseurs);
  const [materialForm, setMaterialForm] = useState(emptyMaterial);
  const [reception, setReception] = useState(emptyReception);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const selectedSupplier = suppliers.find((s) => String(s.id) === String(reception.supplier_id));
  const hints = supplierHints(selectedSupplier, dataMap);
  const selectedMaterial = materials.find((m) => String(m.id) === String(reception.raw_material_id));
  const thresholds = selectedMaterial ? qualityThresholdsForMaterial(selectedMaterial) : null;

  const onSupplierChange = (supplierId) => {
    const supplier = suppliers.find((s) => String(s.id) === String(supplierId));
    const nextHints = supplierHints(supplier, dataMap);
    const firstMaterialId = nextHints.usualMaterials[0]?.id || reception.raw_material_id;
    const lastPrice = firstMaterialId ? nextHints.lastPriceByMaterial[firstMaterialId] : '';
    setReception((prev) => ({
      ...prev,
      supplier_id: supplierId,
      raw_material_id: firstMaterialId || prev.raw_material_id,
      unit_cost: lastPrice || prev.unit_cost || resolveLatestUnitCost(firstMaterialId, dataMap) || '',
      storage_location: nextHints.usualStorageLocation || prev.storage_location,
    }));
  };

  const onMaterialChange = (materialId) => {
    const lastPrice = hints.lastPriceByMaterial[materialId]
      || resolveLatestUnitCost(materialId, dataMap);
    setReception((prev) => ({
      ...prev,
      raw_material_id: materialId,
      unit_cost: lastPrice || prev.unit_cost,
    }));
  };

  const saveMaterial = async (e) => {
    e.preventDefault();
    if (!materialForm.name.trim()) {
      setMessage('Nom de matière obligatoire.');
      return;
    }
    setBusy(true);
    try {
      const id = `FRM-${Date.now().toString(36).toUpperCase()}`;
      await onCreateFeedRawMaterial?.({
        ...materialForm,
        id,
        standard_moisture_threshold: toNumber(materialForm.standard_moisture_threshold),
      });
      setMaterialForm(emptyMaterial);
      setReception((prev) => ({ ...prev, raw_material_id: id }));
      setMessage('Matière première enregistrée.');
    } catch (err) {
      setMessage(err?.message || 'Enregistrement matière impossible.');
    } finally {
      setBusy(false);
    }
  };

  const saveReception = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const preview = prepareRawMaterialReception({
        ...reception,
        quantity_received: toNumber(reception.quantity_received),
        unit_cost: toNumber(reception.unit_cost),
        moisture_value: reception.moisture_value === '' ? null : toNumber(reception.moisture_value),
      }, { ...dataMap, material: selectedMaterial, feed_raw_materials: materials });

      if (!preview.ok) {
        setMessage(preview.error);
        return;
      }

      await commitRawMaterialReception(preview, {
        onCreateBatch: onCreateFeedRawBatch,
        onCreateStock,
        onUpdateStock,
        findStock: (id) => arr(stocks).find((s) => String(s.id) === String(id)),
        onCreateStockMovement,
        onCreateFinance: onCreateFinanceTransaction,
        onUpdateSupplier,
        findSupplier: (id) => suppliers.find((s) => String(s.id) === String(id)),
        onCreateBusinessEvent,
        onCreateAlert,
      });

      setReception((prev) => ({
        ...emptyReception,
        supplier_id: prev.supplier_id,
        storage_location: prev.storage_location,
      }));
      setMessage(
        preview.quality.quality_status === 'rejected'
          ? 'Réception enregistrée - lot rejeté, inutilisable en production.'
          : `Réception enregistrée - lot ${preview.batch.batch_code}.`,
      );
    } catch (err) {
      setMessage(err?.message || 'Réception impossible.');
    } finally {
      setBusy(false);
    }
  };

  const totalCostPreview = toNumber(reception.quantity_received) * toNumber(reception.unit_cost);

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-line bg-white p-6 space-y-2">
        <p className="text-lg font-semibold text-earth">Matières & fournisseurs</p>
        <p className="text-sm text-slate leading-relaxed max-w-3xl">
          Catalogue matières premières, réception avec contrôle qualité, et repères fournisseur
          (dernier prix, matières habituelles). Les fournisseurs restent ceux du module Achats & Stock.
        </p>
        {message ? (
          <p className="text-sm rounded-xl border border-line bg-card px-3 py-2 text-earth">{message}</p>
        ) : null}
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <form onSubmit={saveMaterial} className="rounded-3xl border border-line bg-white p-6 space-y-3">
          <p className="font-semibold text-earth">Nouvelle matière première</p>
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-slate">Nom</span>
            <input
              value={materialForm.name}
              onChange={(e) => setMaterialForm((p) => ({ ...p, name: e.target.value }))}
              className="w-full min-h-[44px] rounded-xl border border-line px-3 text-sm"
              placeholder="Ex. Maïs grain"
              required
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate">Catégorie</span>
              <select
                value={materialForm.category}
                onChange={(e) => setMaterialForm((p) => ({ ...p, category: e.target.value }))}
                className="w-full min-h-[44px] rounded-xl border border-line px-3 text-sm"
              >
                {RAW_MATERIAL_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate">Unité</span>
              <input
                value={materialForm.unit}
                onChange={(e) => setMaterialForm((p) => ({ ...p, unit: e.target.value }))}
                className="w-full min-h-[44px] rounded-xl border border-line px-3 text-sm"
              />
            </label>
          </div>
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-slate">Seuil humidité %</span>
            <input
              type="number"
              value={materialForm.standard_moisture_threshold}
              onChange={(e) => setMaterialForm((p) => ({ ...p, standard_moisture_threshold: e.target.value }))}
              className="w-full min-h-[44px] rounded-xl border border-line px-3 text-sm"
            />
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={Boolean(materialForm.is_experimental)}
              onChange={(e) => setMaterialForm((p) => ({ ...p, is_experimental: e.target.checked }))}
            />
            Matière expérimentale
          </label>
          <button
            type="submit"
            disabled={busy}
            className="rounded-xl bg-leaf px-4 py-2 text-sm font-semibold text-earth disabled:opacity-60"
          >
            Enregistrer la matière
          </button>
        </form>

        <form onSubmit={saveReception} className="rounded-3xl border border-line bg-white p-6 space-y-3">
          <p className="font-semibold text-earth">Réception + contrôle qualité</p>

          <label className="block space-y-1">
            <span className="text-xs font-semibold text-slate">Fournisseur</span>
            <select
              value={reception.supplier_id}
              onChange={(e) => onSupplierChange(e.target.value)}
              className="w-full min-h-[44px] rounded-xl border border-line px-3 text-sm"
            >
              <option value="">Sélectionner…</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.nom || s.name || s.id}</option>
              ))}
            </select>
          </label>

          {selectedSupplier ? (
            <div className="rounded-xl border border-line bg-card p-3 text-xs text-earth space-y-1">
              <p><b>Score qualité :</b> {hints.averageQualityScore != null ? `${Math.round(hints.averageQualityScore * 100)} %` : '-'}</p>
              <p><b>Délai moyen :</b> {hints.averageDeliveryDelay != null ? `${hints.averageDeliveryDelay} j` : '-'}</p>
              <p><b>Conditions :</b> {hints.paymentTerms || '-'}</p>
              {hints.usualMaterials.length ? (
                <p><b>Matières habituelles :</b> {hints.usualMaterials.map((m) => m.name).join(', ')}</p>
              ) : null}
            </div>
          ) : null}

          <label className="block space-y-1">
            <span className="text-xs font-semibold text-slate">Matière</span>
            <select
              value={reception.raw_material_id}
              onChange={(e) => onMaterialChange(e.target.value)}
              className="w-full min-h-[44px] rounded-xl border border-line px-3 text-sm"
              required
            >
              <option value="">Sélectionner…</option>
              {materials.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </label>

          {thresholds ? (
            <p className="text-xs text-slate">
              Unité {thresholds.unit} · seuil humidité {thresholds.moisture_reject_above} %
              {thresholds.is_experimental ? ' · matière expérimentale' : ''}
            </p>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate">Quantité</span>
              <input
                type="number"
                value={reception.quantity_received}
                onChange={(e) => setReception((p) => ({ ...p, quantity_received: e.target.value }))}
                className="w-full min-h-[44px] rounded-xl border border-line px-3 text-sm"
                required
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate">Prix / unité</span>
              <input
                type="number"
                value={reception.unit_cost}
                onChange={(e) => setReception((p) => ({ ...p, unit_cost: e.target.value }))}
                className="w-full min-h-[44px] rounded-xl border border-line px-3 text-sm"
                required
              />
            </label>
          </div>
          <p className="text-sm font-semibold text-earth">
            Coût total calculé : {fmtCurrency(totalCostPreview)}
          </p>

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate">Humidité %</span>
              <input
                type="number"
                value={reception.moisture_value}
                onChange={(e) => setReception((p) => ({ ...p, moisture_value: e.target.value }))}
                className="w-full min-h-[44px] rounded-xl border border-line px-3 text-sm"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate">Statut qualité</span>
              <select
                value={reception.quality_status}
                onChange={(e) => setReception((p) => ({ ...p, quality_status: e.target.value }))}
                className="w-full min-h-[44px] rounded-xl border border-line px-3 text-sm"
              >
                {QUALITY_STATUSES.map((q) => (
                  <option key={q.value} value={q.value}>{q.label}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {['visual_check', 'smell_check', 'insect_check', 'impurity_check'].map((key) => (
              <label key={key} className="block space-y-1">
                <span className="text-xs font-semibold text-slate">{key.replace('_check', '')}</span>
                <input
                  value={reception[key]}
                  onChange={(e) => setReception((p) => ({ ...p, [key]: e.target.value }))}
                  className="w-full min-h-[40px] rounded-xl border border-line px-3 text-sm"
                />
              </label>
            ))}
          </div>

          <button
            type="submit"
            disabled={busy || !reception.raw_material_id}
            className="rounded-xl bg-leaf px-4 py-2 text-sm font-semibold text-earth disabled:opacity-60"
          >
            Valider la réception
          </button>
        </form>
      </div>

      <section className="rounded-3xl border border-line bg-white overflow-x-auto">
        <div className="p-4 border-b border-line">
          <p className="font-semibold text-earth">Lots matières reçus ({batches.length})</p>
        </div>
        <table className="min-w-full text-sm">
          <thead className="bg-card text-meta uppercase font-semibold text-slate">
            <tr>
              <th className="px-3 py-2 text-left">Lot</th>
              <th className="px-3 py-2 text-left">Matière</th>
              <th className="px-3 py-2 text-right">Qté</th>
              <th className="px-3 py-2 text-right">Coût</th>
              <th className="px-3 py-2 text-left">Qualité</th>
              <th className="px-3 py-2 text-left">Date</th>
            </tr>
          </thead>
          <tbody>
            {batches.length === 0 ? (
              <tr><td colSpan={6} className="px-3 py-4 text-slate">Aucun lot reçu pour l’instant.</td></tr>
            ) : batches.map((b) => {
              const mat = materials.find((m) => String(m.id) === String(b.raw_material_id));
              return (
                <tr key={b.id} className="border-t border-line">
                  <td className="px-3 py-2 font-semibold">{b.batch_code}</td>
                  <td className="px-3 py-2">{mat?.name || b.raw_material_id}</td>
                  <td className="px-3 py-2 text-right">{fmtNumber(b.quantity_available)} / {fmtNumber(b.quantity_received)}</td>
                  <td className="px-3 py-2 text-right">{fmtCurrency(b.total_cost)}</td>
                  <td className="px-3 py-2">{QUALITY_STATUSES.find((q) => q.value === b.quality_status)?.label || b.quality_status}</td>
                  <td className="px-3 py-2">{b.received_date || '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}
