import { useCallback, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  CreditCard,
  Eye,
  FileText,
  Package,
  Plus,
  Receipt,
  RefreshCw,
  ShoppingCart,
  Trash2,
  TrendingUp,
  Truck,
  X,
} from 'lucide-react';
import { makeId } from '../utils/ids';
import { fmtCurrency, toDateInput } from '../utils/format';

// ── generic modal (factures, livraisons, paiements) ───────────────────────────
function Modal({ title, fields, initialValues = {}, onSubmit, onClose }) {
  const [form, setForm] = useState(() => {
    const base = {};
    fields.forEach((f) => { base[f.name] = initialValues[f.name] ?? f.default ?? ''; });
    return base;
  });
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg bg-[#fdf8f0] rounded-2xl shadow-2xl border border-[#e8d5b0] overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e8d5b0]">
          <h2 className="font-bold text-[#2f2415]">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#f5ece0] text-[#8a7456]"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="p-5 space-y-3">
          {fields.map((f) => (
            <div key={f.name}>
              <label className="block text-xs font-semibold text-[#8a7456] mb-1">{f.label}{f.required && ' *'}</label>
              {f.type === 'select' ? (
                <select value={form[f.name] || ''} onChange={(e) => set(f.name, e.target.value)} className="w-full px-3 py-2 rounded-lg bg-white border border-[#e8d5b0] text-sm text-[#2f2415]">
                  <option value="">— choisir —</option>
                  {(f.options || []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : f.type === 'textarea' ? (
                <textarea value={form[f.name] || ''} onChange={(e) => set(f.name, e.target.value)} rows={2} className="w-full px-3 py-2 rounded-lg bg-white border border-[#e8d5b0] text-sm text-[#2f2415]" />
              ) : (
                <input type={f.type || 'text'} value={form[f.name] || ''} onChange={(e) => set(f.name, e.target.value)} required={f.required} className="w-full px-3 py-2 rounded-lg bg-white border border-[#e8d5b0] text-sm text-[#2f2415]" />
              )}
            </div>
          ))}
          <div className="flex gap-2 pt-2">
            <button type="submit" className="flex-1 py-2 rounded-xl bg-[#c9a96a] text-white font-semibold text-sm hover:bg-[#b8924f]">Enregistrer</button>
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-[#e8d5b0] text-[#8a7456] text-sm hover:bg-[#f5ece0]">Annuler</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── fiche popup ───────────────────────────────────────────────────────────────
function FichePopup({ type, item, onClose }) {
  if (!item) return null;
  const rows = [];

  if (type === 'lot_avicole') {
    rows.push(
      ['ID', item.id],
      ['Nom / Lot', item.name || item.batch_name || '—'],
      ['Type', item.type || item.type_lot || '—'],
      ['Phase', item.phase || '—'],
      ['Date début', item.date_debut || '—'],
      ['Effectif initial', item.initial_count ?? '—'],
      ['Effectif actuel', item.current_count ?? '—'],
      ['Morts', item.mortality ?? 0],
      ['Volés', item.vols ?? 0],
      ['Vendus', item.vendus ?? 0],
      ['Statut', item.status || '—'],
      ['Prix vente prévu (unit.)', item.prix_vente_prevu ? fmtCurrency(item.prix_vente_prevu) : '—'],
    );
  } else if (type === 'animal') {
    rows.push(
      ['ID', item.id],
      ['Nom', item.name || '—'],
      ['Type', item.type || '—'],
      ['Race', item.race || '—'],
      ['Sexe', item.sexe || '—'],
      ['Poids', item.poids ? `${item.poids} kg` : '—'],
      ['Statut', item.status || '—'],
      ['Santé', item.health_status || '—'],
      ['Prix achat', item.purchase_cost ? fmtCurrency(item.purchase_cost) : '—'],
      ['Prix vente estimé', item.prix_vente_estime ? fmtCurrency(item.prix_vente_estime) : '—'],
    );
  } else if (type === 'stock') {
    rows.push(
      ['Produit', item.produit || item.nom || '—'],
      ['Catégorie', item.category || item.categorie || '—'],
      ['Quantité', `${item.quantite ?? '—'} ${item.unite || ''}`],
      ['Prix unitaire', item.prixunit ? fmtCurrency(item.prixunit) : '—'],
      ['Seuil alerte', item.seuil ?? '—'],
    );
  } else if (type === 'culture') {
    rows.push(
      ['Culture', item.culture || item.nom || '—'],
      ['Statut', item.statut || '—'],
      ['Disponible', `${item.quantite_disponible ?? item.quantite_recoltee ?? '—'} ${item.unite || 'kg'}`],
      ['Prix vente/kg', item.prix_vente_kg ? fmtCurrency(item.prix_vente_kg) : '—'],
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm bg-[#fdf8f0] rounded-2xl shadow-2xl border border-[#e8d5b0]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#e8d5b0]">
          <span className="font-bold text-sm text-[#2f2415]">Fiche {type === 'lot_avicole' ? 'Lot' : type === 'animal' ? 'Animal' : type === 'stock' ? 'Stock' : 'Culture'}</span>
          <button onClick={onClose} className="p-1 rounded hover:bg-[#f5ece0] text-[#8a7456]"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 space-y-1.5 max-h-80 overflow-y-auto">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-2 text-xs">
              <span className="text-[#8a7456] font-medium shrink-0">{label}</span>
              <span className="text-[#2f2415] text-right">{value}</span>
            </div>
          ))}
        </div>
        <div className="px-4 pb-4">
          <button onClick={onClose} className="w-full py-2 rounded-xl bg-[#c9a96a] text-white text-sm font-semibold hover:bg-[#b8924f]">Fermer</button>
        </div>
      </div>
    </div>
  );
}

// ── smart order modal ─────────────────────────────────────────────────────────
const TYPE_LABELS = {
  lot_avicole: 'Lot avicole',
  animal: 'Animal',
  stock: 'Stock',
  culture: 'Culture',
  autre: 'Autre',
};
const UNITS_BY_TYPE = {
  lot_avicole: 'tete',
  animal: 'tete',
  stock: 'unite',
  culture: 'kg',
  autre: 'unite',
};
const PAYMENT_OPTIONS = [
  { value: 'especes', label: 'Espèces' },
  { value: 'wave', label: 'Wave' },
  { value: 'orange_money', label: 'Orange Money' },
  { value: 'virement', label: 'Virement' },
  { value: 'cheque', label: 'Chèque' },
];

function OrderModal({ lots, animaux, stocks, cultures, clients, initialValues = {}, onSubmit, onClose }) {
  const TODAY_STR = new Date().toISOString().slice(0, 10);

  const [form, setForm] = useState({
    date: TODAY_STR,
    client_id: '',
    type_vente: initialValues.source_type || 'lot_avicole',
    source_id: initialValues.source_id || '',
    product_name: initialValues.product_name || '',
    quantity: initialValues.quantity || 1,
    unit: initialValues.unit || 'tete',
    unit_price: initialValues.unit_price || 0,
    discount: 0,
    statut_commande: 'brouillon',
    statut_paiement: 'non_paye',
    montant_paye: 0,
    moyen_paiement: '',
    notes: initialValues.notes || '',
  });

  const [ficheItem, setFicheItem] = useState(null);
  const [errors, setErrors] = useState([]);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  // Source options per type
  const sourceOptions = useMemo(() => {
    if (form.type_vente === 'lot_avicole') {
      return lots
        .filter((l) => !['vendu', 'termine', 'perdu'].includes(l.status || ''))
        .map((l) => ({
          value: l.id,
          label: `${l.id} — ${l.name || l.type || 'Lot'} — Effectif: ${l.current_count ?? l.initial_count ?? 0}`,
          item: l,
        }));
    }
    if (form.type_vente === 'animal') {
      return animaux
        .filter((a) => !['vendu', 'mort', 'vole'].includes(a.status || ''))
        .map((a) => ({
          value: a.id,
          label: `${a.id} — ${a.name || '—'} — ${a.poids ? a.poids + ' kg' : a.type || ''}`,
          item: a,
        }));
    }
    if (form.type_vente === 'stock') {
      return stocks
        .filter((s) => Number(s.quantite || 0) > 0)
        .map((s) => ({
          value: s.id,
          label: `${s.produit || s.nom || s.id} — Qté: ${s.quantite} ${s.unite || ''}`,
          item: s,
        }));
    }
    if (form.type_vente === 'culture') {
      return cultures
        .filter((c) => Number(c.quantite_disponible ?? c.quantite_recoltee ?? 0) > 0)
        .map((c) => ({
          value: c.id,
          label: `${c.culture || c.nom || c.id} — Dispo: ${c.quantite_disponible ?? c.quantite_recoltee ?? 0} ${c.unite || 'kg'}`,
          item: c,
        }));
    }
    return [];
  }, [form.type_vente, lots, animaux, stocks, cultures]);

  const selectedSource = sourceOptions.find((o) => o.value === form.source_id);

  const availableQty = useMemo(() => {
    if (!form.source_id || form.type_vente === 'autre') return Infinity;
    const opt = sourceOptions.find((o) => o.value === form.source_id);
    if (!opt) return 0;
    const item = opt.item;
    if (form.type_vente === 'lot_avicole') return Number(item.current_count ?? item.initial_count ?? 0);
    if (form.type_vente === 'animal') return 1;
    if (form.type_vente === 'stock') return Number(item.quantite || 0);
    if (form.type_vente === 'culture') return Number(item.quantite_disponible ?? item.quantite_recoltee ?? 0);
    return 0;
  }, [form.source_id, form.type_vente, sourceOptions]);

  const lineTotal = Math.max(0, Number(form.quantity || 0) * Number(form.unit_price || 0) - Number(form.discount || 0));

  const onTypeChange = (newType) => {
    setForm((p) => ({
      ...p,
      type_vente: newType,
      source_id: '',
      product_name: '',
      unit_price: 0,
      quantity: 1,
      unit: UNITS_BY_TYPE[newType] || 'unite',
    }));
  };

  const onSourceChange = (sourceId) => {
    const opt = sourceOptions.find((o) => o.value === sourceId);
    if (!opt) { set('source_id', sourceId); return; }
    const item = opt.item;
    let unitPrice = 0;
    let productName = '';
    let unit = UNITS_BY_TYPE[form.type_vente] || 'unite';
    let quantity = form.quantity;

    if (form.type_vente === 'lot_avicole') {
      unitPrice = Number(item.prix_vente_prevu || 0);
      productName = `${item.name || item.batch_name || item.id} (${item.type || 'Lot'})`;
    } else if (form.type_vente === 'animal') {
      unitPrice = Number(item.prix_vente_estime || item.sale_price || item.purchase_cost || 0);
      productName = `${item.name || item.id} — ${item.type || ''} ${item.poids ? item.poids + 'kg' : ''}`.trim();
      quantity = 1;
    } else if (form.type_vente === 'stock') {
      unitPrice = Number(item.prixunit || item.prixUnit || item.prix_unitaire || 0);
      unit = item.unite || 'unite';
      productName = item.produit || item.nom || item.id;
    } else if (form.type_vente === 'culture') {
      unitPrice = Number(item.prix_vente_kg || 0);
      unit = item.unite || 'kg';
      productName = item.culture || item.nom || item.id;
    }

    setForm((p) => ({ ...p, source_id: sourceId, product_name: productName, unit_price: unitPrice, unit, quantity }));
  };

  const validate = () => {
    const errs = [];
    if (!form.date) errs.push('Date obligatoire');
    if (!form.source_id && form.type_vente !== 'autre') errs.push('Sélectionnez un produit à vendre');
    if (Number(form.quantity || 0) <= 0) errs.push('Quantité doit être > 0');
    if (form.type_vente !== 'autre' && form.source_id && Number(form.quantity) > availableQty) {
      errs.push(`Quantité max disponible : ${availableQty}`);
    }
    if (form.type_vente === 'animal' && Number(form.quantity) !== 1) errs.push('Quantité = 1 pour un animal');
    if (form.statut_paiement === 'partiel' && Number(form.montant_paye || 0) <= 0) {
      errs.push('Montant payé requis pour paiement partiel');
    }
    if (form.statut_paiement === 'partiel' && Number(form.montant_paye || 0) >= lineTotal) {
      errs.push('Montant payé doit être inférieur au total pour paiement partiel');
    }
    return errs;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (errs.length > 0) { setErrors(errs); return; }
    setErrors([]);
    onSubmit({
      ...form,
      source_type: form.type_vente,
      montant_total: lineTotal,
      product_name: form.product_name || (selectedSource ? selectedSource.label.split(' — ')[0] : 'Produit vendu'),
    });
  };

  const clientOptions = clients.map((c) => ({ value: c.id, label: c.nom || c.name || c.id }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-2">
      <div className="w-full max-w-lg bg-[#fdf8f0] rounded-2xl shadow-2xl border border-[#e8d5b0] overflow-y-auto max-h-[95vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e8d5b0]">
          <h2 className="font-bold text-[#2f2415]">Nouvelle commande</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#f5ece0] text-[#8a7456]"><X className="w-4 h-4" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 space-y-1">
              {errors.map((e) => (
                <div key={e} className="flex items-center gap-2 text-xs text-red-600">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />{e}
                </div>
              ))}
            </div>
          )}

          {/* Type vente */}
          <div>
            <label className="block text-xs font-semibold text-[#8a7456] mb-2">Type de vente</label>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(TYPE_LABELS).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => onTypeChange(k)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    form.type_vente === k ? 'bg-[#c9a96a] text-white' : 'bg-white border border-[#e8d5b0] text-[#8a7456] hover:bg-[#f5ece0]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Source dynamique */}
          {form.type_vente !== 'autre' && (
            <div>
              <label className="block text-xs font-semibold text-[#8a7456] mb-1">
                {TYPE_LABELS[form.type_vente]} *
              </label>
              <div className="flex gap-2">
                <select
                  value={form.source_id}
                  onChange={(e) => onSourceChange(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg bg-white border border-[#e8d5b0] text-sm text-[#2f2415]"
                >
                  <option value="">— sélectionner —</option>
                  {sourceOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                {form.source_id && selectedSource && (
                  <button
                    type="button"
                    onClick={() => setFicheItem(selectedSource.item)}
                    className="px-2 py-1.5 rounded-lg bg-[#f5ece0] border border-[#e8d5b0] text-[#8a7456] hover:bg-[#e8d5b0] shrink-0"
                    title="Voir fiche"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                )}
              </div>
              {form.source_id && availableQty !== Infinity && (
                <p className="mt-1 text-xs text-[#8a7456]">
                  Disponible : <span className={`font-semibold ${availableQty === 0 ? 'text-red-500' : 'text-emerald-600'}`}>{availableQty}</span> {form.type_vente === 'lot_avicole' || form.type_vente === 'animal' ? 'têtes' : form.unit}
                </p>
              )}
            </div>
          )}

          {/* Libellé produit */}
          <div>
            <label className="block text-xs font-semibold text-[#8a7456] mb-1">Libellé produit vendu</label>
            <input
              type="text"
              value={form.product_name}
              onChange={(e) => set('product_name', e.target.value)}
              placeholder="Description du produit"
              className="w-full px-3 py-2 rounded-lg bg-white border border-[#e8d5b0] text-sm text-[#2f2415]"
            />
          </div>

          {/* Quantité + Prix + Remise */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#8a7456] mb-1">Quantité *</label>
              <input
                type="number"
                min={1}
                max={availableQty !== Infinity ? availableQty : undefined}
                value={form.quantity}
                onChange={(e) => set('quantity', e.target.value)}
                disabled={form.type_vente === 'animal'}
                className="w-full px-3 py-2 rounded-lg bg-white border border-[#e8d5b0] text-sm text-[#2f2415] disabled:bg-gray-50 disabled:text-gray-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#8a7456] mb-1">Prix unitaire (FCFA)</label>
              <input
                type="number"
                min={0}
                value={form.unit_price}
                onChange={(e) => set('unit_price', e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white border border-[#e8d5b0] text-sm text-[#2f2415]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#8a7456] mb-1">Remise (FCFA)</label>
              <input
                type="number"
                min={0}
                value={form.discount}
                onChange={(e) => set('discount', e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white border border-[#e8d5b0] text-sm text-[#2f2415]"
              />
            </div>
          </div>

          {/* Total calculé — lecture seule */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700">Montant total calculé</span>
            <span className="text-xl font-bold text-emerald-600">{fmtCurrency(lineTotal)}</span>
          </div>

          {/* Client */}
          <div>
            <label className="block text-xs font-semibold text-[#8a7456] mb-1">Client</label>
            <select
              value={form.client_id}
              onChange={(e) => set('client_id', e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white border border-[#e8d5b0] text-sm text-[#2f2415]"
            >
              <option value="">— sélectionner client —</option>
              {clientOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-semibold text-[#8a7456] mb-1">Date *</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => set('date', e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg bg-white border border-[#e8d5b0] text-sm text-[#2f2415]"
            />
          </div>

          {/* Statuts */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#8a7456] mb-1">Statut commande</label>
              <select value={form.statut_commande} onChange={(e) => set('statut_commande', e.target.value)} className="w-full px-3 py-2 rounded-lg bg-white border border-[#e8d5b0] text-sm text-[#2f2415]">
                <option value="brouillon">Brouillon</option>
                <option value="confirme">Confirmé</option>
                <option value="en_preparation">En préparation</option>
                <option value="expedie">Expédié</option>
                <option value="livre">Livré</option>
                <option value="annule">Annulé</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#8a7456] mb-1">Statut paiement</label>
              <select value={form.statut_paiement} onChange={(e) => set('statut_paiement', e.target.value)} className="w-full px-3 py-2 rounded-lg bg-white border border-[#e8d5b0] text-sm text-[#2f2415]">
                <option value="non_paye">Non payé</option>
                <option value="partiel">Partiel</option>
                <option value="paye">Payé</option>
              </select>
            </div>
          </div>

          {/* Montant payé si partiel */}
          {form.statut_paiement === 'partiel' && (
            <div>
              <label className="block text-xs font-semibold text-[#8a7456] mb-1">Montant payé (FCFA) *</label>
              <input
                type="number"
                min={0}
                value={form.montant_paye}
                onChange={(e) => set('montant_paye', e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white border border-[#e8d5b0] text-sm text-[#2f2415]"
              />
              {Number(form.montant_paye) > 0 && (
                <p className="text-xs text-amber-600 mt-1">Reste à payer : {fmtCurrency(Math.max(0, lineTotal - Number(form.montant_paye)))}</p>
              )}
            </div>
          )}

          {/* Moyen paiement si pas non_paye */}
          {form.statut_paiement !== 'non_paye' && (
            <div>
              <label className="block text-xs font-semibold text-[#8a7456] mb-1">Moyen de paiement</label>
              <select value={form.moyen_paiement} onChange={(e) => set('moyen_paiement', e.target.value)} className="w-full px-3 py-2 rounded-lg bg-white border border-[#e8d5b0] text-sm text-[#2f2415]">
                <option value="">— choisir —</option>
                {PAYMENT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-[#8a7456] mb-1">Notes</label>
            <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} className="w-full px-3 py-2 rounded-lg bg-white border border-[#e8d5b0] text-sm text-[#2f2415]" />
          </div>

          <div className="flex gap-2 pt-1">
            <button type="submit" className="flex-1 py-2.5 rounded-xl bg-[#c9a96a] text-white font-semibold text-sm hover:bg-[#b8924f]">
              Enregistrer la commande
            </button>
            <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl border border-[#e8d5b0] text-[#8a7456] text-sm hover:bg-[#f5ece0]">Annuler</button>
          </div>
        </form>
      </div>

      {ficheItem && (
        <FichePopup
          type={form.type_vente}
          item={ficheItem}
          onClose={() => setFicheItem(null)}
        />
      )}
    </div>
  );
}

// ── status color maps ─────────────────────────────────────────────────────────
const CMD_COLORS = {
  brouillon: 'bg-gray-500/20 text-gray-400',
  confirme: 'bg-blue-500/20 text-blue-400',
  en_preparation: 'bg-amber-500/20 text-amber-400',
  expedie: 'bg-sky-500/20 text-sky-400',
  livre: 'bg-emerald-500/20 text-emerald-400',
  annule: 'bg-red-500/20 text-red-400',
};
const PAY_COLORS = {
  non_paye: 'bg-red-500/20 text-red-400',
  partiel: 'bg-amber-500/20 text-amber-400',
  paye: 'bg-emerald-500/20 text-emerald-400',
};
const LIV_COLORS = {
  a_livrer: 'bg-amber-500/20 text-amber-400',
  prevue: 'bg-amber-500/20 text-amber-400',
  en_cours: 'bg-sky-500/20 text-sky-400',
  livre: 'bg-emerald-500/20 text-emerald-400',
  echec: 'bg-red-500/20 text-red-400',
};
const OPP_COLORS = {
  animal_pret: 'bg-emerald-500/20 text-emerald-400',
  lot_chair: 'bg-sky-500/20 text-sky-400',
  pondeuse_reforma: 'bg-amber-500/20 text-amber-400',
  culture_recolte: 'bg-green-500/20 text-green-400',
  stock_oeufs: 'bg-purple-500/20 text-purple-400',
};

const TABS = [
  { id: 'opportunites', label: 'Opportunités', icon: TrendingUp },
  { id: 'commandes', label: 'Commandes', icon: ShoppingCart },
  { id: 'factures', label: 'Factures', icon: Receipt },
  { id: 'livraisons', label: 'Livraisons', icon: Truck },
  { id: 'paiements', label: 'Paiements', icon: CreditCard },
  { id: 'historique', label: 'Historique', icon: FileText },
];

const TODAY = new Date().toISOString().slice(0, 10);
const TODAY_MS = new Date(TODAY).getTime();

export default function Ventes({
  rows = [],
  orderItems = [],
  deliveriesList = [],
  invoicesList = [],
  paymentsList = [],
  opportunities = [],
  animaux = [],
  lots = [],
  cultures = [],
  stocks = [],
  clients = [],
  loading = false,
  onCreate,
  onUpdate,
  onDelete,
  onRefresh,
  onCreateItem,
  onCreateDelivery,
  onUpdateDelivery,
  onDeleteDelivery,
  onCreateInvoice,
  onUpdateInvoice,
  onDeleteInvoice,
  onCreatePayment,
  onUpdatePayment,
  onDeletePayment,
  onUpdateOpportunity,
  onDeleteOpportunity,
  onUpdateAnimal,
  onUpdateLot,
  onUpdateCulture,
  onUpdateStock,
  onCreateFinanceTransaction,
  onCreateTrace,
  onCreateBusinessEvent,
  onUpdateClient,
}) {
  const [activeTab, setActiveTab] = useState('opportunites');
  const [showCreate, setShowCreate] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [editType, setEditType] = useState(null);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState('');
  const [prefillOrder, setPrefillOrder] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const getClientName = useCallback((cid) => {
    const c = clients.find((x) => x.id === cid);
    return c ? (c.nom || c.name || cid) : (cid || '—');
  }, [clients]);

  const toSourceType = (value) => (value === 'lot' ? 'lot_avicole' : value || 'autre');

  const getSourceLabel = (sourceType, sourceId) => {
    const type = toSourceType(sourceType);
    if (!sourceId) return '';
    if (type === 'stock') return stocks.find((s) => s.id === sourceId)?.produit || stocks.find((s) => s.id === sourceId)?.nom || sourceId;
    if (type === 'lot_avicole') return lots.find((l) => l.id === sourceId)?.name || lots.find((l) => l.id === sourceId)?.batch_name || sourceId;
    if (type === 'animal') return animaux.find((a) => a.id === sourceId)?.name || sourceId;
    if (type === 'culture') return cultures.find((c) => c.id === sourceId)?.nom || cultures.find((c) => c.id === sourceId)?.culture || sourceId;
    return sourceId;
  };

  const getAvailableQuantity = (sourceType, sourceId) => {
    const type = toSourceType(sourceType);
    if (!sourceId || type === 'autre') return Infinity;
    if (type === 'stock') return Number(stocks.find((s) => s.id === sourceId)?.quantite || 0);
    if (type === 'lot_avicole') return Number(lots.find((l) => l.id === sourceId)?.current_count || lots.find((l) => l.id === sourceId)?.initial_count || 0);
    if (type === 'animal') {
      const animal = animaux.find((a) => a.id === sourceId);
      return animal && !['vendu', 'mort', 'vole'].includes(animal.status) ? 1 : 0;
    }
    if (type === 'culture') {
      const culture = cultures.find((c) => c.id === sourceId);
      return Number(culture?.quantite_disponible ?? culture?.quantite_recoltee ?? culture?.quantite_produite ?? 0);
    }
    return 0;
  };

  // ── Apply sale impact on stock/lot/animal/culture + emit events ───────────
  const applySaleImpact = async ({ source_type, source_id, quantity, total, client_id, orderId }) => {
    const type = toSourceType(source_type);
    const qty = Number(quantity || 0);
    if (!source_id || qty <= 0 || type === 'autre') return;

    if (type === 'stock') {
      const stock = stocks.find((s) => s.id === source_id);
      if (stock) {
        await onUpdateStock?.(source_id, { quantite: Math.max(0, Number(stock.quantite || 0) - qty) });
        await onCreateBusinessEvent?.({
          id: makeId('EVT'),
          event_type: 'vente_stock',
          module_source: 'ventes',
          entity_type: 'stock',
          entity_id: source_id,
          title: `Vente stock: ${stock.produit || stock.nom || source_id} — ${qty} ${stock.unite || 'unités'}`,
          amount: Number(total || 0),
          event_date: new Date().toISOString(),
          linked_sale_id: orderId || null,
          severity: 'info',
        });
      }
    }

    if (type === 'lot_avicole') {
      const lot = lots.find((l) => l.id === source_id);
      if (lot) {
        const currentCount = Number(lot.current_count ?? lot.initial_count ?? 0);
        const nextCurrent = Math.max(0, currentCount - qty);
        const newVendus = Number(lot.vendus || 0) + qty;
        await onUpdateLot?.(source_id, {
          vendus: newVendus,
          current_count: nextCurrent,
          status: nextCurrent === 0 ? 'vendu' : 'vendu_partiellement',
        });
        await onCreateBusinessEvent?.({
          id: makeId('EVT'),
          event_type: 'vente_lot_avicole',
          module_source: 'ventes',
          entity_type: 'lot',
          entity_id: source_id,
          title: `Vente lot ${lot.name || source_id}: ${qty} têtes — ${fmtCurrency(Number(total || 0))}`,
          amount: Number(total || 0),
          event_date: new Date().toISOString(),
          linked_sale_id: orderId || null,
          severity: 'info',
        });
        await onCreateTrace?.({
          id: makeId('TRC'),
          type: 'vente_lot_avicole',
          module_source: 'ventes',
          entity_id: source_id,
          entity_type: 'lot',
          title: `Vente de ${qty} sujets du lot ${lot.name || source_id}`,
          description: `Montant: ${fmtCurrency(Number(total || 0))} — Client: ${getClientName(client_id)} — Commande: ${orderId || '—'}`,
          date: TODAY,
        });
      }
    }

    if (type === 'animal') {
      const animal = animaux.find((a) => a.id === source_id);
      await onUpdateAnimal?.(source_id, {
        status: 'vendu',
        sale_price: Number(total || 0),
        prix_vente_reel: Number(total || 0),
        date_vente: TODAY,
        client_id,
      });
      if (client_id && animal) {
        await onUpdateClient?.(client_id, {
          derniere_commande: TODAY,
        }).catch(() => {});
      }
      await onCreateBusinessEvent?.({
        id: makeId('EVT'),
        event_type: 'vente_animal',
        module_source: 'ventes',
        entity_type: 'animal',
        entity_id: source_id,
        title: `Vente animal ${animal?.name || source_id} — ${fmtCurrency(Number(total || 0))}`,
        amount: Number(total || 0),
        event_date: new Date().toISOString(),
        linked_sale_id: orderId || null,
        severity: 'info',
      });
      await onCreateTrace?.({
        id: makeId('TRC'),
        type: 'vente_animal',
        module_source: 'ventes',
        entity_id: source_id,
        entity_type: 'animal',
        title: `Vente de l'animal ${animal?.name || source_id}`,
        description: `Prix: ${fmtCurrency(Number(total || 0))} — Client: ${getClientName(client_id)}`,
        date: TODAY,
      });
    }

    if (type === 'culture') {
      const culture = cultures.find((c) => c.id === source_id);
      if (culture) {
        const available = Number(culture.quantite_disponible ?? culture.quantite_recoltee ?? culture.quantite_produite ?? 0);
        await onUpdateCulture?.(source_id, {
          quantite_disponible: Math.max(0, available - qty),
          revenu_reel: Number(culture.revenu_reel || 0) + Number(total || 0),
        });
        await onCreateBusinessEvent?.({
          id: makeId('EVT'),
          event_type: 'vente_culture',
          module_source: 'ventes',
          entity_type: 'culture',
          entity_id: source_id,
          title: `Vente récolte ${culture.culture || culture.nom || source_id}: ${qty} ${culture.unite || 'kg'}`,
          amount: Number(total || 0),
          event_date: new Date().toISOString(),
          linked_sale_id: orderId || null,
          severity: 'info',
        });
      }
    }
  };

  // ── Finance impact helpers ────────────────────────────────────────────────
  const createFinanceImpact = async ({ orderId, amount, amountPaid, statut_paiement, moyen_paiement, client_id, date }) => {
    if (!onCreateFinanceTransaction) return;

    const clientName = getClientName(client_id);

    if (statut_paiement === 'paye') {
      await onCreateFinanceTransaction({
        id: makeId('TRX'),
        date: date || TODAY,
        type: 'entree',
        categorie: 'Vente',
        libelle: `Vente ${orderId} — ${clientName}`,
        montant: amount,
        statut: 'paye',
        paiement: moyen_paiement,
        client_id,
        related_id: orderId,
        module_lie: 'ventes',
      });
    } else if (statut_paiement === 'partiel') {
      const paid = Number(amountPaid || 0);
      const remaining = Math.max(0, amount - paid);
      if (paid > 0) {
        await onCreateFinanceTransaction({
          id: makeId('TRX'),
          date: date || TODAY,
          type: 'entree',
          categorie: 'Vente',
          libelle: `Acompte ${orderId} — ${clientName}`,
          montant: paid,
          statut: 'partiel',
          paiement: moyen_paiement,
          client_id,
          related_id: orderId,
          module_lie: 'ventes',
        });
      }
      if (remaining > 0) {
        await onCreateFinanceTransaction({
          id: makeId('TRX'),
          date: date || TODAY,
          type: 'entree',
          categorie: 'Vente',
          libelle: `Créance client ${orderId} — ${clientName} (reste)`,
          montant: remaining,
          statut: 'impaye',
          client_id,
          related_id: orderId,
          module_lie: 'ventes',
        });
      }
    } else {
      // non_paye — enregistrer CA facturé non encaissé
      await onCreateFinanceTransaction({
        id: makeId('TRX'),
        date: date || TODAY,
        type: 'entree',
        categorie: 'Vente',
        libelle: `Créance client ${orderId} — ${clientName} (non payé)`,
        montant: amount,
        statut: 'impaye',
        client_id,
        related_id: orderId,
        module_lie: 'ventes',
      });
    }
  };

  // ── auto-detected opportunities ───────────────────────────────────────────
  const autoOpportunities = useMemo(() => {
    const opps = [];

    animaux
      .filter((a) => a.health_status === 'sain' && (a.pret_vente_recommande || a.pret_vente_confirme || ['pret_a_la_vente', 'reserve'].includes(a.status) || ['recommande_pret', 'pret_confirme'].includes(a.sale_readiness_status)))
      .forEach((a) => {
        opps.push({
          id: `auto-animal-${a.id}`,
          isAuto: true,
          opportunity_type: 'animal_pret',
          source_type: 'animal',
          source_id: a.id,
          title: `${a.name || a.numero || 'Animal'} prêt à la vente`,
          description: `Race: ${a.race || '—'}  •  Poids: ${a.poids ? a.poids + ' kg' : '—'}`,
          quantity: 1,
          unit: 'tête',
          estimated_value: Number(a.prix_vente_estime || a.prix_vente_reel || a.sale_price || 0),
          estimated_margin: Number(a.prix_vente_estime || a.prix_vente_reel || a.sale_price || 0) - Number(a.cout_estime || a.purchase_cost || 0),
          score: a.sale_readiness_score || 80,
        });
      });

    lots
      .filter((l) => ['chair', 'poulet_chair'].includes(String(l.type || l.type_lot || l.production_type || '').toLowerCase()) || String(l.type || '').toLowerCase().includes('chair'))
      .forEach((lot) => {
        const age = (lot.date_debut || lot.date_mise_en_place)
          ? Math.floor((TODAY_MS - new Date((lot.date_debut || lot.date_mise_en_place))) / 86400000)
          : 0;
        const effectif = Number(lot.current_count || lot.initial_count || 0);
        if (age >= 35 && effectif > 0) {
          opps.push({
            id: `auto-lot-${lot.id}`,
            isAuto: true,
            opportunity_type: 'lot_chair',
            source_type: 'lot',
            source_id: lot.id,
            title: `Lot ${lot.name || lot.batch_name || lot.id} — prêt abattage`,
            description: `Age: ${age}j  •  Effectif: ${effectif}`,
            quantity: effectif,
            unit: 'tête',
            estimated_value: effectif * Number(lot.poids_objectif || 2.2) * 1500,
            score: lot.sale_readiness_score || 85,
          });
        }
      });

    lots
      .filter((l) => (['pondeuse', 'ponte'].includes(String(l.type || l.type_lot || l.production_type || '').toLowerCase()) || String(l.type || '').toLowerCase().includes('pondeuse')) && (l.pret_vente_recommande || ['a_reformer', 'pret_a_vendre_reforme'].includes(l.status)))
      .forEach((lot) => {
        const effectif = Number(lot.current_count || lot.initial_count || 0);
        opps.push({
          id: `auto-ponte-${lot.id}`,
          isAuto: true,
          opportunity_type: 'pondeuse_reforma',
          source_type: 'lot',
          source_id: lot.id,
          title: `Lot ${lot.name || lot.batch_name || lot.id} — pondeuses à réformer`,
          description: `Effectif: ${effectif}`,
          quantity: effectif,
          unit: 'tête',
          estimated_value: effectif * 800,
          score: lot.sale_readiness_score || 70,
        });
      });

    cultures
      .filter((c) => c.statut === 'recolte' && Number(c.quantite_disponible ?? c.quantite_recoltee ?? c.quantite_produite ?? 0) > 0)
      .forEach((c) => {
        opps.push({
          id: `auto-culture-${c.id}`,
          isAuto: true,
          opportunity_type: 'culture_recolte',
          source_type: 'culture',
          source_id: c.id,
          title: `${c.culture || c.nom || 'Culture'} — récolte disponible`,
          description: `Quantité: ${(c.quantite_disponible ?? c.quantite_recoltee ?? c.quantite_produite)} ${c.unite || 'kg'}`,
          quantity: Number((c.quantite_disponible ?? c.quantite_recoltee ?? c.quantite_produite) || 0),
          unit: c.unite || 'kg',
          estimated_value: Number((c.quantite_disponible ?? c.quantite_recoltee ?? c.quantite_produite) || 0) * Number(c.prix_vente_kg || 0),
          score: 75,
        });
      });

    stocks
      .filter((s) => {
        const nom = (s.produit || s.nom || s.category || '').toLowerCase();
        return ['oeufs', 'plateaux', 'poulets'].some((k) => nom.includes(k)) && Number(s.quantite || 0) > 10;
      })
      .forEach((s) => {
        opps.push({
          id: `auto-stock-${s.id}`,
          isAuto: true,
          opportunity_type: 'stock_oeufs',
          source_type: 'stock',
          source_id: s.id,
          title: `Stock ${s.produit || s.nom || s.category} disponible`,
          description: `Quantité: ${s.quantite} ${s.unite || ''}`,
          quantity: Number(s.quantite || 0),
          unit: s.unite || 'unité',
          estimated_value: Number(s.quantite || 0) * Number(s.prixunit || s.prixUnit || s.prix_unitaire || 0),
          score: 70,
        });
      });

    return opps.sort((a, b) => (b.score || 0) - (a.score || 0));
  }, [animaux, lots, cultures, stocks]);

  const allOpportunities = useMemo(() => {
    const dbOpps = opportunities.filter((o) => o.status !== 'converti');
    return [...autoOpportunities, ...dbOpps];
  }, [autoOpportunities, opportunities]);

  // ── order splits ──────────────────────────────────────────────────────────
  const activeOrders = useMemo(
    () => rows.filter((o) => !['livre', 'annule'].includes(o.statut_commande || '')),
    [rows],
  );
  const historique = useMemo(
    () => rows.filter((o) => ['livre', 'annule'].includes(o.statut_commande || '')),
    [rows],
  );

  // ── field definitions for facture/livraison/paiement ─────────────────────
  const orderOptions = useMemo(
    () => rows.map((o) => ({ value: o.id, label: `CMD-${o.id.slice(-6)} • ${getClientName(o.client_id)}` })),
    [rows, getClientName],
  );

  const INVOICE_FIELDS = useMemo(() => [
    { name: 'order_id', label: 'Commande', type: 'select', options: orderOptions, required: true },
    { name: 'numero_facture', label: 'N° Facture', type: 'text' },
    { name: 'date_facture', label: 'Date facture', type: 'date', default: TODAY },
    { name: 'montant_total', label: 'Montant (FCFA)', type: 'number' },
    { name: 'statut', label: 'Statut', type: 'select', default: 'emise', options: [
      { value: 'emise', label: 'Emise' },
      { value: 'envoyee', label: 'Envoyée' },
      { value: 'payee', label: 'Payée' },
      { value: 'annulee', label: 'Annulée' },
    ]},
  ], [orderOptions]);

  const DELIVERY_FIELDS = useMemo(() => [
    { name: 'order_id', label: 'Commande', type: 'select', options: orderOptions, required: true },
    { name: 'date_livraison', label: 'Date livraison', type: 'date', default: TODAY },
    { name: 'statut', label: 'Statut', type: 'select', default: 'prevue', options: [
      { value: 'prevue', label: 'Prévue' },
      { value: 'en_cours', label: 'En cours' },
      { value: 'livre', label: 'Livré' },
      { value: 'echec', label: 'Echec' },
    ]},
    { name: 'destinataire', label: 'Destinataire', type: 'text' },
    { name: 'adresse', label: 'Adresse', type: 'text' },
    { name: 'notes', label: 'Notes', type: 'textarea' },
  ], [orderOptions]);

  const PAYMENT_FIELDS = useMemo(() => [
    { name: 'order_id', label: 'Commande', type: 'select', options: orderOptions, required: true },
    { name: 'date_paiement', label: 'Date paiement', type: 'date', required: true, default: TODAY },
    { name: 'montant', label: 'Montant (FCFA)', type: 'number', required: true },
    { name: 'moyen_paiement', label: 'Moyen', type: 'select', options: PAYMENT_OPTIONS },
    { name: 'reference', label: 'Référence', type: 'text' },
    { name: 'notes', label: 'Notes', type: 'textarea' },
  ], [orderOptions]);

  const fieldsByType = { facture: INVOICE_FIELDS, livraison: DELIVERY_FIELDS, paiement: PAYMENT_FIELDS };
  const titleByType = { facture: 'Nouvelle facture', livraison: 'Nouvelle livraison', paiement: 'Nouveau paiement' };
  const editTitleByType = { commande: 'Modifier commande', facture: 'Modifier facture', livraison: 'Modifier livraison', paiement: 'Modifier paiement' };
  const editFieldsByType = {
    commande: [
      { name: 'statut_commande', label: 'Statut commande', type: 'select', options: [
        { value: 'brouillon', label: 'Brouillon' },
        { value: 'confirme', label: 'Confirmé' },
        { value: 'en_preparation', label: 'En préparation' },
        { value: 'expedie', label: 'Expédié' },
        { value: 'livre', label: 'Livré' },
        { value: 'annule', label: 'Annulé' },
      ]},
      { name: 'statut_paiement', label: 'Statut paiement', type: 'select', options: [
        { value: 'non_paye', label: 'Non payé' },
        { value: 'partiel', label: 'Partiel' },
        { value: 'paye', label: 'Payé' },
      ]},
      { name: 'notes', label: 'Notes', type: 'textarea' },
    ],
    facture: INVOICE_FIELDS,
    livraison: DELIVERY_FIELDS,
    paiement: PAYMENT_FIELDS,
  };

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => ({
    totalCA: rows.reduce((s, o) => s + Number(o.montant_total || 0), 0),
    totalPaye: paymentsList.reduce((s, p) => s + Number(p.montant || 0), 0),
    cmdActive: activeOrders.length,
    totalOpps: allOpportunities.length,
  }), [rows, paymentsList, activeOrders, allOpportunities]);

  // ── quick actions ─────────────────────────────────────────────────────────
  const quickConfirm = async (order) => {
    await onUpdate?.(order.id, { statut_commande: 'confirme' });

    // Apply sale impact for each order item
    const items = orderItems.filter((i) => i.order_id === order.id);
    for (const item of items) {
      await applySaleImpact({
        source_type: item.source_type,
        source_id: item.source_id,
        quantity: item.quantity,
        total: item.total || item.line_total || 0,
        client_id: order.client_id,
        orderId: order.id,
      });
    }
    // Fallback: if no items but order has source info, use that
    if (items.length === 0 && order.source_id) {
      await applySaleImpact({
        source_type: order.source_type,
        source_id: order.source_id,
        quantity: 1,
        total: Number(order.montant_total || 0),
        client_id: order.client_id,
        orderId: order.id,
      });
    }

    await onCreateBusinessEvent?.({
      id: makeId('EVT'),
      event_type: 'commande_confirmee',
      module_source: 'ventes',
      entity_type: 'commande',
      entity_id: order.id,
      title: `Commande CMD-${order.id.slice(-6)} confirmée — ${getClientName(order.client_id)}`,
      amount: Number(order.montant_total || 0),
      event_date: new Date().toISOString(),
      linked_sale_id: order.id,
      severity: 'info',
    });

    showToast('Commande confirmée et impacts appliqués');
    onRefresh?.();
  };

  const quickPay = async (order) => {
    await onUpdate?.(order.id, { statut_paiement: 'paye', montant_paye: order.montant_total, reste_a_payer: 0 });
    if (Number(order.montant_total) > 0) {
      await onCreateFinanceTransaction?.({
        id: makeId('TRX'),
        date: TODAY,
        type: 'entree',
        categorie: 'Vente',
        libelle: `Paiement CMD-${order.id.slice(-6)} — ${getClientName(order.client_id)}`,
        montant: Number(order.montant_total),
        statut: 'paye',
        client_id: order.client_id,
        related_id: order.id,
        module_lie: 'ventes',
      });
    }
    await onCreateBusinessEvent?.({
      id: makeId('EVT'),
      event_type: 'paiement_recu',
      module_source: 'ventes',
      entity_type: 'commande',
      entity_id: order.id,
      title: `Paiement reçu CMD-${order.id.slice(-6)} — ${fmtCurrency(Number(order.montant_total || 0))}`,
      amount: Number(order.montant_total || 0),
      event_date: new Date().toISOString(),
      linked_sale_id: order.id,
      severity: 'info',
    });
    showToast('Paiement enregistré');
    onRefresh?.();
  };

  const quickDeliver = async (order) => {
    await onUpdate?.(order.id, { statut_livraison: 'livre', statut_commande: 'livre' });
    await onCreateDelivery?.({
      id: makeId('LIV'),
      order_id: order.id,
      date_livraison: TODAY,
      statut: 'livre',
      destinataire: getClientName(order.client_id),
    });
    showToast('Livraison confirmée');
    onRefresh?.();
  };

  // ── create / edit / delete ─────────────────────────────────────────────────
  const prefixMap = { facture: 'FAC', livraison: 'LIV', paiement: 'PAI' };
  const createFnMap = { facture: onCreateInvoice, livraison: onCreateDelivery, paiement: onCreatePayment };
  const updateFnMap = { commande: onUpdate, facture: onUpdateInvoice, livraison: onUpdateDelivery, paiement: onUpdatePayment };
  const deleteFnMap = { commande: onDelete, facture: onDeleteInvoice, livraison: onDeleteDelivery, paiement: onDeletePayment };

  const handleCreate = async (data) => {
    if (showCreate === 'commande') {
      const sourceType = toSourceType(data.source_type);
      const sourceId = data.source_id || '';
      const quantity = Number(data.quantity || 0);
      const unitPrice = Number(data.unit_price || 0);
      const discount = Number(data.discount || 0);
      const amount = Math.max(0, quantity * unitPrice - discount);

      // Validate availability
      if (sourceType !== 'autre' && sourceId) {
        const available = getAvailableQuantity(sourceType, sourceId);
        if (quantity > available) {
          showToast(`Stock insuffisant — disponible: ${available}`, 'warning');
          return;
        }
      }

      const statut_paiement = data.statut_paiement || 'non_paye';
      const montant_paye = statut_paiement === 'paye' ? amount : statut_paiement === 'partiel' ? Number(data.montant_paye || 0) : 0;
      const reste_a_payer = Math.max(0, amount - montant_paye);

      const orderId = makeId('CMD');
      const orderPayload = {
        id: orderId,
        date: data.date || TODAY,
        client_id: data.client_id,
        type_document: 'commande',
        statut_commande: data.statut_commande || 'brouillon',
        statut_paiement,
        statut_livraison: 'a_livrer',
        montant_ht: amount,
        remise: discount,
        montant_total: amount,
        montant_paye,
        reste_a_payer,
        moyen_paiement: data.moyen_paiement,
        source_type: sourceType,
        source_id: sourceId,
        source_label: data.product_name || getSourceLabel(sourceType, sourceId) || '',
        notes: data.notes,
      };

      await onCreate?.(orderPayload);

      // Create order item
      if (sourceId || data.product_name) {
        await onCreateItem?.({
          id: makeId('CMDI'),
          order_id: orderId,
          source_type: sourceType,
          source_id: sourceId,
          product_name: data.product_name || getSourceLabel(sourceType, sourceId) || 'Produit vendu',
          quantity,
          unit: data.unit || 'unite',
          unit_price: unitPrice,
          discount,
          total: amount,
        });
      }

      // Apply sale impact if confirmed/delivered
      if (['confirme', 'livre'].includes(orderPayload.statut_commande)) {
        await applySaleImpact({ source_type: sourceType, source_id: sourceId, quantity, total: amount, client_id: data.client_id, orderId });
        await onCreateBusinessEvent?.({
          id: makeId('EVT'),
          event_type: 'commande_confirmee',
          module_source: 'ventes',
          entity_type: 'commande',
          entity_id: orderId,
          title: `Commande CMD-${orderId.slice(-6)} confirmée — ${getClientName(data.client_id)}`,
          amount,
          event_date: new Date().toISOString(),
          linked_sale_id: orderId,
          severity: 'info',
        });
      }

      // Finance impacts
      await createFinanceImpact({
        orderId,
        amount,
        amountPaid: montant_paye,
        statut_paiement,
        moyen_paiement: data.moyen_paiement,
        client_id: data.client_id,
        date: data.date || TODAY,
      });

      // Payment record if paye/partiel
      if (['paye', 'partiel'].includes(statut_paiement) && montant_paye > 0) {
        await onCreatePayment?.({
          id: makeId('PAI'),
          order_id: orderId,
          date_paiement: data.date || TODAY,
          montant: montant_paye,
          moyen_paiement: data.moyen_paiement,
          notes: `Paiement créé lors de la vente`,
        });
      }

      // Convert opportunity
      if (prefillOrder?.opportunity_id && !String(prefillOrder.opportunity_id).startsWith('auto-')) {
        await onUpdateOpportunity?.(prefillOrder.opportunity_id, { status: 'converti', converted_sale_id: orderId });
      }

    } else {
      await createFnMap[showCreate]?.({ id: makeId(prefixMap[showCreate] || 'NEW'), ...data });
    }

    setShowCreate(null);
    setPrefillOrder(null);
    showToast('Créé avec succès');
    onRefresh?.();
  };

  const handleEdit = async (data) => {
    await updateFnMap[editType]?.(editItem.id, data);
    setEditItem(null);
    setEditType(null);
    showToast('Modifié');
    onRefresh?.();
  };

  const handleDelete = async (id, type) => {
    await deleteFnMap[type]?.(id);
    showToast('Supprimé', 'warning');
    onRefresh?.();
  };

  // ── filtered lists ────────────────────────────────────────────────────────
  const filteredOrders = useMemo(() => {
    const src = activeTab === 'historique' ? historique : activeOrders;
    const q = search.toLowerCase();
    if (!q) return src;
    return src.filter(
      (o) =>
        (o.id || '').toLowerCase().includes(q) ||
        getClientName(o.client_id).toLowerCase().includes(q) ||
        (o.notes || '').toLowerCase().includes(q),
    );
  }, [activeTab, activeOrders, historique, search, getClientName]);

  const fmtDate = (d) => {
    if (!d) return '—';
    const s = toDateInput(d);
    if (!s) return d;
    const [y, m, day] = s.split('-');
    return `${day}/${m}/${y}`;
  };

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 space-y-4 font-sans">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl text-sm font-semibold shadow-xl transition-all ${toast.type === 'warning' ? 'bg-amber-500 text-white' : 'bg-emerald-500 text-white'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#2f2415]">Ventes & Commandes</h1>
          <p className="text-xs text-[#8a7456]">Commandes · Factures · Livraisons · Paiements</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={onRefresh} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#e8d5b0] text-[#8a7456] text-xs hover:bg-[#f5ece0]">
            <RefreshCw className="w-3.5 h-3.5" /> Actualiser
          </button>
          {activeTab === 'commandes' && (
            <button onClick={() => { setPrefillOrder(null); setShowCreate('commande'); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs hover:bg-emerald-700">
              <Plus className="w-3.5 h-3.5" /> Nouvelle commande
            </button>
          )}
          {activeTab === 'factures' && (
            <button onClick={() => setShowCreate('facture')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 text-white text-xs hover:bg-sky-700">
              <Plus className="w-3.5 h-3.5" /> Nouvelle facture
            </button>
          )}
          {activeTab === 'livraisons' && (
            <button onClick={() => setShowCreate('livraison')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs hover:bg-amber-700">
              <Plus className="w-3.5 h-3.5" /> Nouvelle livraison
            </button>
          )}
          {activeTab === 'paiements' && (
            <button onClick={() => setShowCreate('paiement')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 text-white text-xs hover:bg-purple-700">
              <Plus className="w-3.5 h-3.5" /> Nouveau paiement
            </button>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-3 border border-[#e8d5b0]">
          <p className="text-xs text-[#8a7456]">CA total</p>
          <p className="text-lg font-bold text-emerald-600">{fmtCurrency(kpis.totalCA)}</p>
        </div>
        <div className="bg-white rounded-xl p-3 border border-[#e8d5b0]">
          <p className="text-xs text-[#8a7456]">Encaissé</p>
          <p className="text-lg font-bold text-sky-600">{fmtCurrency(kpis.totalPaye)}</p>
        </div>
        <div className="bg-white rounded-xl p-3 border border-[#e8d5b0]">
          <p className="text-xs text-[#8a7456]">Commandes actives</p>
          <p className="text-lg font-bold text-amber-600">{kpis.cmdActive}</p>
        </div>
        <div className="bg-white rounded-xl p-3 border border-[#e8d5b0]">
          <p className="text-xs text-[#8a7456]">Opportunités</p>
          <p className="text-lg font-bold text-purple-600">{kpis.totalOpps}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-xl p-1 border border-[#e8d5b0] overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => { setActiveTab(t.id); setSearch(''); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${activeTab === t.id ? 'bg-[#c9a96a] text-white' : 'text-[#8a7456] hover:bg-[#f5ece0]'}`}
          >
            <t.icon className="w-3 h-3" />
            {t.label}
            {t.id === 'opportunites' && allOpportunities.length > 0 && (
              <span className="ml-0.5 bg-emerald-500 text-white text-[9px] rounded-full px-1.5 py-0.5 font-bold">{allOpportunities.length}</span>
            )}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12 text-[#8a7456]">
          <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Chargement…
        </div>
      )}

      {/* ── OPPORTUNITES ── */}
      {activeTab === 'opportunites' && !loading && (
        <div className="space-y-2">
          {allOpportunities.length === 0 && (
            <div className="text-center py-12 text-[#8a7456]">
              <TrendingUp className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Aucune opportunité détectée</p>
              <p className="text-xs mt-1">Les animaux prêts, lots et récoltes apparaissent ici automatiquement</p>
            </div>
          )}
          {allOpportunities.map((opp) => (
            <div key={opp.id} className="bg-white rounded-xl p-4 border border-[#e8d5b0] flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-semibold text-sm text-[#2f2415] truncate">{opp.title}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${OPP_COLORS[opp.opportunity_type] || 'bg-gray-500/20 text-gray-400'}`}>
                    {(opp.opportunity_type || '').replace(/_/g, ' ')}
                  </span>
                  {opp.isAuto && <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">Auto</span>}
                  {opp.score > 0 && <span className="text-[10px] text-[#8a7456]">Score {Math.round(opp.score)}%</span>}
                </div>
                <p className="text-xs text-[#8a7456]">{opp.description}</p>
                <div className="mt-1 flex gap-4 text-xs text-[#8a7456]">
                  <span>Qté: {opp.quantity} {opp.unit}</span>
                  {Number(opp.estimated_value) > 0 && <span>Valeur est.: {fmtCurrency(opp.estimated_value)}</span>}
                  {Number(opp.estimated_margin) > 0 && <span>Marge est.: {fmtCurrency(opp.estimated_margin)}</span>}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => {
                    setPrefillOrder({
                      opportunity_id: opp.id,
                      source_type: toSourceType(opp.source_type),
                      source_id: opp.source_id,
                      product_name: getSourceLabel(opp.source_type, opp.source_id) || opp.title,
                      quantity: opp.quantity || 1,
                      unit: opp.unit || 'unite',
                      unit_price: opp.quantity ? Math.round(Number(opp.estimated_value || 0) / Math.max(1, Number(opp.quantity))) : Number(opp.estimated_value || 0),
                      notes: opp.reason || opp.description || '',
                    });
                    setShowCreate('commande');
                  }}
                  className="px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                >
                  + Commande
                </button>
                {!opp.isAuto && (
                  <button onClick={() => onDeleteOpportunity?.(opp.id)} className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── COMMANDES ── */}
      {activeTab === 'commandes' && !loading && (
        <div className="space-y-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher commandes…"
            className="w-full px-3 py-2 rounded-lg bg-white border border-[#e8d5b0] text-sm text-[#2f2415] placeholder:text-[#c9a96a]"
          />
          {filteredOrders.length === 0 && (
            <div className="text-center py-12 text-[#8a7456]">
              <ShoppingCart className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Aucune commande active</p>
            </div>
          )}
          {filteredOrders.map((order) => (
            <div key={order.id} className="bg-white rounded-xl p-4 border border-[#e8d5b0]">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-sm text-[#2f2415]">CMD-{order.id.slice(-6)}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${CMD_COLORS[order.statut_commande] || 'bg-gray-500/20 text-gray-400'}`}>
                      {order.statut_commande || 'brouillon'}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${PAY_COLORS[order.statut_paiement] || 'bg-gray-500/20 text-gray-400'}`}>
                      {order.statut_paiement || 'non_paye'}
                    </span>
                    {order.statut_livraison && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${LIV_COLORS[order.statut_livraison] || 'bg-gray-500/20 text-gray-400'}`}>
                        {order.statut_livraison}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#8a7456]">
                    {fmtDate(order.date)} · {getClientName(order.client_id)} · {fmtCurrency(order.montant_total)}
                  </p>
                  {order.source_label && <p className="text-xs text-[#8a7456] mt-0.5 truncate">Produit: {order.source_label}</p>}
                  {order.reste_a_payer > 0 && (
                    <p className="text-xs text-red-500 mt-0.5">Reste: {fmtCurrency(order.reste_a_payer)}</p>
                  )}
                  {order.notes && <p className="text-xs text-[#8a7456] mt-0.5 truncate">{order.notes}</p>}
                </div>
                <div className="flex gap-1 shrink-0 flex-wrap justify-end">
                  {order.statut_commande === 'brouillon' && (
                    <button onClick={() => quickConfirm(order)} className="px-2 py-1 text-[10px] bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 font-medium">
                      Confirmer
                    </button>
                  )}
                  {order.statut_paiement !== 'paye' && (
                    <button onClick={() => quickPay(order)} className="px-2 py-1 text-[10px] bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 font-medium">
                      Payé
                    </button>
                  )}
                  {['a_livrer', 'prevue'].includes(order.statut_livraison) && (
                    <button onClick={() => quickDeliver(order)} className="px-2 py-1 text-[10px] bg-amber-500/20 text-amber-400 rounded-lg hover:bg-amber-500/30 font-medium">
                      Livré
                    </button>
                  )}
                  <button
                    onClick={() => { setEditItem(order); setEditType('commande'); }}
                    className="px-2 py-1 text-[10px] bg-[#f5ece0] text-[#8a7456] rounded-lg hover:bg-[#e8d5b0]"
                  >
                    Éditer
                  </button>
                  <button onClick={() => handleDelete(order.id, 'commande')} className="p-1 text-red-400 hover:bg-red-500/10 rounded-lg">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── FACTURES ── */}
      {activeTab === 'factures' && !loading && (
        <div className="space-y-2">
          {invoicesList.length === 0 && (
            <div className="text-center py-12 text-[#8a7456]">
              <Receipt className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Aucune facture</p>
            </div>
          )}
          {invoicesList.map((inv) => (
            <div key={inv.id} className="bg-white rounded-xl p-4 border border-[#e8d5b0] flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-semibold text-sm text-[#2f2415]">{inv.numero_facture || `FAC-${inv.id.slice(-6)}`}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${inv.statut === 'payee' ? 'bg-emerald-500/20 text-emerald-400' : inv.statut === 'annulee' ? 'bg-red-500/20 text-red-400' : 'bg-sky-500/20 text-sky-400'}`}>
                    {inv.statut}
                  </span>
                </div>
                <p className="text-xs text-[#8a7456]">{fmtDate(inv.date_facture)} · CMD-{(inv.order_id || '').slice(-6)} · {fmtCurrency(inv.montant_total)}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => { setEditItem(inv); setEditType('facture'); }} className="px-2 py-1 text-[10px] bg-[#f5ece0] text-[#8a7456] rounded-lg hover:bg-[#e8d5b0]">Éditer</button>
                <button onClick={() => handleDelete(inv.id, 'facture')} className="p-1 text-red-400 hover:bg-red-500/10 rounded-lg"><Trash2 className="w-3 h-3" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── LIVRAISONS ── */}
      {activeTab === 'livraisons' && !loading && (
        <div className="space-y-2">
          {deliveriesList.length === 0 && (
            <div className="text-center py-12 text-[#8a7456]">
              <Truck className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Aucune livraison</p>
            </div>
          )}
          {deliveriesList.map((del) => (
            <div key={del.id} className="bg-white rounded-xl p-4 border border-[#e8d5b0] flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-semibold text-sm text-[#2f2415]">LIV-{del.id.slice(-6)}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${LIV_COLORS[del.statut] || 'bg-gray-500/20 text-gray-400'}`}>{del.statut}</span>
                </div>
                <p className="text-xs text-[#8a7456]">{fmtDate(del.date_livraison)} · CMD-{(del.order_id || '').slice(-6)} · {del.destinataire || '—'}</p>
                {del.adresse && <p className="text-xs text-[#8a7456] truncate">{del.adresse}</p>}
              </div>
              <div className="flex gap-1 shrink-0">
                {del.statut !== 'livre' && (
                  <button
                    onClick={async () => { await onUpdateDelivery?.(del.id, { statut: 'livre' }); showToast('Livraison confirmée'); onRefresh?.(); }}
                    className="flex items-center gap-1 px-2 py-1 text-[10px] bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30"
                  >
                    <CheckCircle className="w-3 h-3" /> Livré
                  </button>
                )}
                <button onClick={() => { setEditItem(del); setEditType('livraison'); }} className="px-2 py-1 text-[10px] bg-[#f5ece0] text-[#8a7456] rounded-lg hover:bg-[#e8d5b0]">Éditer</button>
                <button onClick={() => handleDelete(del.id, 'livraison')} className="p-1 text-red-400 hover:bg-red-500/10 rounded-lg"><Trash2 className="w-3 h-3" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── PAIEMENTS ── */}
      {activeTab === 'paiements' && !loading && (
        <div className="space-y-2">
          {paymentsList.length === 0 && (
            <div className="text-center py-12 text-[#8a7456]">
              <CreditCard className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Aucun paiement enregistré</p>
            </div>
          )}
          {paymentsList.map((pay) => (
            <div key={pay.id} className="bg-white rounded-xl p-4 border border-[#e8d5b0] flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-semibold text-sm text-emerald-600">{fmtCurrency(pay.montant)}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400">{pay.moyen_paiement || 'especes'}</span>
                </div>
                <p className="text-xs text-[#8a7456]">{fmtDate(pay.date_paiement)} · CMD-{(pay.order_id || '').slice(-6)}{pay.reference ? ` · Réf: ${pay.reference}` : ''}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => { setEditItem(pay); setEditType('paiement'); }} className="px-2 py-1 text-[10px] bg-[#f5ece0] text-[#8a7456] rounded-lg hover:bg-[#e8d5b0]">Éditer</button>
                <button onClick={() => handleDelete(pay.id, 'paiement')} className="p-1 text-red-400 hover:bg-red-500/10 rounded-lg"><Trash2 className="w-3 h-3" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── HISTORIQUE ── */}
      {activeTab === 'historique' && !loading && (
        <div className="space-y-2">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher historique…" className="w-full px-3 py-2 rounded-lg bg-white border border-[#e8d5b0] text-sm text-[#2f2415] placeholder:text-[#c9a96a]" />
          {filteredOrders.length === 0 && (
            <div className="text-center py-12 text-[#8a7456]">
              <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Aucune commande clôturée</p>
            </div>
          )}
          {filteredOrders.map((order) => (
            <div key={order.id} className="bg-white rounded-xl p-4 border border-[#e8d5b0] opacity-80">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="font-semibold text-sm text-[#2f2415]">CMD-{order.id.slice(-6)}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${CMD_COLORS[order.statut_commande] || 'bg-gray-500/20 text-gray-400'}`}>{order.statut_commande}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${PAY_COLORS[order.statut_paiement] || 'bg-gray-500/20 text-gray-400'}`}>{order.statut_paiement}</span>
              </div>
              <p className="text-xs text-[#8a7456]">{fmtDate(order.date)} · {getClientName(order.client_id)} · {fmtCurrency(order.montant_total)}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Modals ── */}
      {showCreate === 'commande' && (
        <OrderModal
          lots={lots}
          animaux={animaux}
          stocks={stocks}
          cultures={cultures}
          clients={clients}
          initialValues={prefillOrder || {}}
          onSubmit={handleCreate}
          onClose={() => { setShowCreate(null); setPrefillOrder(null); }}
        />
      )}
      {showCreate && showCreate !== 'commande' && (
        <Modal
          title={titleByType[showCreate]}
          fields={fieldsByType[showCreate]}
          initialValues={{}}
          onSubmit={handleCreate}
          onClose={() => { setShowCreate(null); setPrefillOrder(null); }}
        />
      )}
      {editItem && editType && (
        <Modal
          title={editTitleByType[editType]}
          fields={editFieldsByType[editType] || []}
          initialValues={editItem}
          onSubmit={handleEdit}
          onClose={() => { setEditItem(null); setEditType(null); }}
        />
      )}
    </div>
  );
}
