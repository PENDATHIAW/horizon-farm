import { BarChart3, CheckCircle2, ChevronDown, Package, Utensils, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { toNumber } from '../utils/format';
import { makeId } from '../utils/ids';
import StockOperationalHealthPanel from './StockOperationalHealthPanel.jsx';
import StocksV3 from './StocksV3.jsx';
import StockEvolution from './StockEvolution.jsx';
import StockFeedingCostPlanner from './StockFeedingCostPlanner.jsx';
import { applyFeedingDistribution } from '../services/feedingCostEngine';
import { transferFreezeStock } from '../services/livestockStockBridge';
import useCrudModule from '../hooks/useCrudModule';

const lower = (value) => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const today = () => new Date().toISOString().slice(0, 10);
const stockKg = (row = {}) => lower(row.unite).includes('sac') ? toNumber(row.quantite) * toNumber(row.poids_sac_kg || row.sac_kg || 50) : toNumber(row.quantite);
const productLabel = (row = {}) => row.produit || row.name || row.nom || row.id || 'Produit stock';
const nextStockQtyAfterKg = (row = {}, kg = 0) => {
  if (lower(row.unite).includes('sac')) {
    const sacKg = toNumber(row.poids_sac_kg || row.sac_kg || 50) || 50;
    return Math.max(0, toNumber(row.quantite) - (toNumber(kg) / sacKg));
  }
  return Math.max(0, toNumber(row.quantite) - toNumber(kg));
};
const targetLabel = (target = {}) => target.name || target.nom || target.tag || target.id;
const activityForFeeding = (targetType = '', target = {}) => {
  if (targetType === 'animal') {
    const text = lower(`${target.type || ''} ${target.espece || ''} ${target.name || ''}`);
    if (text.includes('ovin')) return 'ovins';
    if (text.includes('caprin') || text.includes('chevre') || text.includes('chèvre')) return 'caprins';
    return 'bovins';
  }
  const text = lower(`${target.type || ''} ${target.type_lot || ''} ${target.name || ''}`);
  return text.includes('pondeuse') || text.includes('ponte') || text.includes('oeuf') ? 'avicole_pondeuses' : 'avicole_chair';
};
const inferMovementType = (draft = {}) => {
  const text = lower(`${draft.raw_input || ''} ${draft.intent || ''}`);
  if (text.includes('perte') || text.includes('perdu') || text.includes('casse') || text.includes('abime')) return 'perte';
  if (text.includes('utilise') || text.includes('utilisé') || text.includes('sortie') || text.includes('consomme') || text.includes('donné') || text.includes('donne')) return 'sortie';
  return 'reception';
};
const findStock = (rows = [], product = '', id = '') => {
  const needle = lower(product || id);
  if (!needle) return rows[0] || null;
  return rows.find((row) => String(row.id).toUpperCase() === String(id || '').toUpperCase()) || rows.find((row) => lower(`${row.produit || ''} ${row.name || ''} ${row.nom || ''} ${row.categorie || ''}`).includes(needle) || needle.includes(lower(row.produit || row.name || row.nom || ''))) || rows[0] || null;
};
const movementTitle = (type = '') => type === 'perte' ? 'Perte stock' : type === 'sortie' ? 'Sortie / utilisation stock' : 'Réception stock';

function ModuleSection({ icon: Icon, title, subtitle, children }) {
  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4"><div><p className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><Icon size={20} /> {title}</p>{subtitle ? <p className="mt-1 text-sm text-[#8a7456]">{subtitle}</p> : null}</div>{children}</section>;
}
function CollapsibleSection({ icon: Icon, title, subtitle, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return <section className="rounded-3xl border border-[#d6c3a0] bg-white shadow-sm overflow-hidden"><button type="button" onClick={() => setOpen((value) => !value)} className="flex min-h-[64px] w-full items-center justify-between gap-3 px-5 py-4 text-left hover:bg-[#fffdf8]"><span><span className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><Icon size={20} /> {title}</span>{subtitle ? <span className="mt-1 block text-sm text-[#8a7456]">{subtitle}</span> : null}</span><ChevronDown size={20} className={`shrink-0 text-[#8a7456] transition-transform ${open ? 'rotate-180' : ''}`} /></button>{open ? <div className="border-t border-[#eadcc2] p-5">{children}</div> : null}</section>;
}

function HeyHorizonStockCard({ draft, rows, onUpdate, onCreateFinanceTransaction, onCreateAlimentation, onCreateBusinessEvent, onRefresh, onRefreshAlimentation, onRefreshBusinessEvents, onRefreshFinances, onClose }) {
  const fields = draft?.draft_fields || {};
  const initialType = inferMovementType(draft);
  const initialStock = useMemo(() => findStock(rows, fields.product_name, fields.product_id), [rows, fields.product_name, fields.product_id]);
  const [stockId, setStockId] = useState(initialStock?.id || '');
  const [movementType, setMovementType] = useState(initialType);
  const [quantity, setQuantity] = useState(fields.quantity || '');
  const [unit, setUnit] = useState(fields.unit || initialStock?.unite || 'unité');
  const [unitPrice, setUnitPrice] = useState(fields.payment_amount || '');
  const [date, setDate] = useState(fields.date || today());
  const [note, setNote] = useState(fields.notes || draft?.raw_input || '');
  const [saving, setSaving] = useState(false);
  const stock = rows.find((row) => String(row.id) === String(stockId)) || initialStock || rows[0] || {};
  const qty = toNumber(quantity);
  const amount = qty * toNumber(unitPrice);
  const currentQty = toNumber(stock.quantite);
  const nextQty = movementType === 'reception' ? currentQty + qty : Math.max(0, currentQty - qty);
  const submit = async () => {
    if (!stock?.id) return toast.error('Produit stock obligatoire');
    if (qty <= 0) return toast.error('Quantité obligatoire');
    try {
      setSaving(true);
      const movementId = makeId('MVT');
      const trxId = amount > 0 && movementType === 'reception' ? makeId('TRX') : '';
      await onUpdate?.(stock.id, {
        quantite: Number(nextQty.toFixed(3)),
        unite: unit || stock.unite,
        last_movement_id: movementId,
        last_movement_type: movementType,
        last_movement_label: `${movementTitle(movementType)} · ${productLabel(stock)}`,
        last_movement_qty: qty,
        last_movement_at: new Date().toISOString(),
        last_movement_note: note,
        linked_finance_transaction_id: trxId,
      });
      if (movementType === 'sortie' && lower(productLabel(stock)).includes('aliment')) {
        await onCreateAlimentation?.({ id: makeId('ALIM'), date, stock_id: stock.id, produit: productLabel(stock), quantite: qty, unite: unit || stock.unite || 'unité', montant_total: amount || 0, cout_total: amount || 0, source_module: 'hey_horizon', source_record_id: stock.id, notes: note || 'Sortie aliment depuis Hey Horizon' });
      }
      if (trxId) {
        await onCreateFinanceTransaction?.({ id: trxId, type: 'sortie', libelle: `Réception stock - ${productLabel(stock)}`, montant: amount, amount, date, categorie: 'Achat stock', module_lie: 'stock', related_id: stock.id, stock_id: stock.id, source_module: 'stock', source_record_id: stock.id, statut: 'paye', transaction_origin: 'automatique' });
      }
      await onCreateBusinessEvent?.({ id: makeId('EVT'), event_type: `stock_${movementType}`, module_source: 'stock', entity_type: 'stock', entity_id: stock.id, title: `${movementTitle(movementType)} · ${productLabel(stock)}`, description: `${qty} ${unit || stock.unite || ''}\n${note || ''}`, event_date: date, severity: movementType === 'perte' ? 'warning' : 'info', quantity: qty, amount, linked_stock_id: stock.id, linked_finance_transaction_id: trxId, saisies_evitees: movementType === 'reception' ? 3 : 2 });
      await Promise.allSettled([onRefresh?.(), onRefreshAlimentation?.(), onRefreshBusinessEvents?.(), onRefreshFinances?.()]);
      toast.success(`${movementTitle(movementType)} enregistré depuis Hey Horizon`);
      onClose?.();
    } catch (error) { toast.error(error.message || 'Mouvement stock impossible'); } finally { setSaving(false); }
  };
  return <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm space-y-4">
    <div className="flex items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-widest text-emerald-700 font-black flex items-center gap-2"><CheckCircle2 size={15} /> Fiche préparée par Hey Horizon</p><h3 className="mt-1 text-xl font-black text-[#2f2415]">{movementTitle(movementType)}</h3><p className="mt-1 text-sm text-emerald-800">Complète si besoin, puis valide. Le stock, l’historique et les impacts ERP seront mis à jour.</p></div><button type="button" onClick={onClose} className="rounded-full border border-emerald-200 bg-white p-2 text-emerald-700"><X size={16} /></button></div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3"><label className="space-y-1"><span className="text-xs font-bold text-emerald-800">Produit</span><select value={stockId} onChange={(e) => setStockId(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm">{rows.map((row) => <option key={row.id} value={row.id}>{productLabel(row)} · {row.id} · {row.quantite} {row.unite}</option>)}</select></label><label className="space-y-1"><span className="text-xs font-bold text-emerald-800">Mouvement</span><select value={movementType} onChange={(e) => setMovementType(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm"><option value="reception">Réceptionner</option><option value="sortie">Utiliser / sortir</option><option value="perte">Déclarer perte</option></select></label><label className="space-y-1"><span className="text-xs font-bold text-emerald-800">Quantité</span><input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm" /></label><label className="space-y-1"><span className="text-xs font-bold text-emerald-800">Unité</span><input value={unit} onChange={(e) => setUnit(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm" /></label><label className="space-y-1"><span className="text-xs font-bold text-emerald-800">Prix / coût unitaire</span><input type="number" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm" /></label><label className="space-y-1"><span className="text-xs font-bold text-emerald-800">Date</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm" /></label><label className="space-y-1 md:col-span-3"><span className="text-xs font-bold text-emerald-800">Note</span><input value={note} onChange={(e) => setNote(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm" /></label></div>
    <div className="rounded-xl border border-emerald-200 bg-white p-3 text-sm text-emerald-800">Stock : <b>{currentQty}</b> → <b>{Number(nextQty.toFixed(3))}</b> {unit || stock.unite || ''}{amount > 0 ? <> · Valeur estimée : <b>{amount.toLocaleString('fr-FR')} FCFA</b></> : null}</div>
    <div className="flex justify-end"><button type="button" onClick={submit} disabled={saving} className="rounded-xl bg-[#2f2415] px-5 py-2 text-sm font-black text-white disabled:opacity-60">{saving ? 'Validation...' : 'Valider mouvement stock'}</button></div>
  </section>;
}

export default function StocksV4(props) {
  const [horizonDraft, setHorizonDraft] = useState(null);
  useEffect(() => {
    const handler = (event) => {
      const draft = event.detail?.draft;
      if (event.detail?.module === 'stock' && ['stock_purchase', 'stock_movement'].includes(draft?.form_type)) {
        setHorizonDraft(draft);
        window.setTimeout(() => document.getElementById('hey-horizon-stock-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
      }
    };
    window.addEventListener('horizon-open-form', handler);
    return () => window.removeEventListener('horizon-open-form', handler);
  }, []);

  const updateWithLossHistory = useCallback(async (id, patch = {}) => {
    await props.onUpdate?.(id, patch);
    if (patch.last_movement_type !== 'perte') return;
    const row = (props.rows || []).find((item) => String(item.id) === String(id));
    const qty = toNumber(patch.last_movement_qty);
    if (!row || qty <= 0) return;
    await props.onCreateBusinessEvent?.({ id: makeId('EVT'), event_type: 'perte_stock_quantite', module_source: 'stock', entity_type: 'stock', entity_id: id, title: `Perte stock ${row.produit || row.name || row.id}`, description: `${qty} ${row.unite || ''} retiré(s) du stock. Suivi en quantité uniquement, sans dépense automatique.`, event_date: today(), severity: 'warning', quantity: qty, linked_stock_id: id, saisies_evitees: 1 });
    await props.onRefreshBusinessEvents?.();
  }, [props]);

  const applyFeedingPlan = useCallback(async (plan = {}) => {
    await applyFeedingDistribution(plan, {
      onUpdateStock: props.onUpdate,
      onCreateAlimentation: props.onCreateAlimentation,
      onCreateFinanceTransaction: props.onCreateFinanceTransaction,
      onCreateBusinessEvent: props.onCreateBusinessEvent,
      onRefreshStock: props.onRefresh,
      onRefreshAlimentation: props.onRefreshAlimentation,
      onRefreshBusinessEvents: props.onRefreshBusinessEvents,
      onRefreshFinances: props.onRefreshFinances,
    });
  }, [props]);

  const stockCrud = useCrudModule('stock');
  const handleFreezeProduct = useCallback(async (row) => {
    try {
      await transferFreezeStock({ stockCrud, row });
      await props.onRefresh?.();
      toast.success(`${row.produit || row.id} transféré au congélateur`);
    } catch (error) {
      toast.error(error.message || 'Congélation impossible');
    }
  }, [stockCrud, props]);

  return <div className="space-y-6 stock-mobile-structured"><style>{`@media (max-width: 640px){.stock-mobile-structured .rounded-2xl{border-radius:18px}.stock-mobile-structured table{font-size:12px}.stock-mobile-structured th,.stock-mobile-structured td{padding-left:10px!important;padding-right:10px!important}.stock-mobile-structured .text-2xl{font-size:1.35rem}.stock-mobile-structured .grid{gap:.75rem}.stock-mobile-structured .overflow-x-auto{max-width:100vw}}`}</style>{horizonDraft ? <div id="hey-horizon-stock-card"><HeyHorizonStockCard draft={horizonDraft} rows={props.rows || []} onUpdate={updateWithLossHistory} onCreateFinanceTransaction={props.onCreateFinanceTransaction} onCreateAlimentation={props.onCreateAlimentation} onCreateBusinessEvent={props.onCreateBusinessEvent} onRefresh={props.onRefresh} onRefreshAlimentation={props.onRefreshAlimentation} onRefreshBusinessEvents={props.onRefreshBusinessEvents} onRefreshFinances={props.onRefreshFinances} onClose={() => setHorizonDraft(null)} /></div> : null}<StockOperationalHealthPanel rows={props.rows || []} lots={props.lots || []} animaux={props.animaux || []} alimentationLogs={props.alimentationLogs || []} onNavigate={props.onNavigate} onFreezeProduct={handleFreezeProduct} /><ModuleSection icon={Package} title="Stock courant" subtitle="Produits, quantités, seuils, entrées, sorties et pertes suivies."><StocksV3 {...props} onUpdate={updateWithLossHistory} /></ModuleSection><ModuleSection icon={Utensils} title="Alimentation des animaux et lots" subtitle="Calculer une ration, retirer le stock utilisé et suivre le coût sans double saisie."><StockFeedingCostPlanner rows={props.rows || []} animaux={props.animaux || []} lots={props.lots || []} alimentationLogs={props.alimentationLogs || []} onOpenUseFood={applyFeedingPlan} /></ModuleSection><CollapsibleSection icon={BarChart3} title="Évolution stock" subtitle="Graphes et historique des entrées, sorties, consommations et alertes." defaultOpen={false}><StockEvolution rows={props.rows || []} alimentationLogs={props.alimentationLogs || []} onNavigate={props.onNavigate} /></CollapsibleSection></div>;
}
