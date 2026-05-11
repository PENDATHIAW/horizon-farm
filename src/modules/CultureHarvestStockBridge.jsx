import { useMemo, useState } from 'react';
import { PackageCheck, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import useCrudModule from '../hooks/useCrudModule';
import { calculateCultureMetrics } from '../utils/businessCalculations';
import { fmtCurrency, fmtNumber, toNumber } from '../utils/format';
import { makeId } from '../utils/ids';

const arr = (value) => Array.isArray(value) ? value : [];
const today = () => new Date().toISOString().slice(0, 10);
const label = (row = {}) => row.nom || row.type || row.id || 'Culture';
const fees = (row = {}) => toNumber(row.frais_recolte) + toNumber(row.frais_transport) + toNumber(row.frais_conditionnement) + toNumber(row.frais_main_oeuvre) + toNumber(row.autres_frais);
const lower = (value) => String(value || '').toLowerCase();
const eventTargetId = (row = {}) => String(row.target_id || row.related_id || row.entity_id || row.source_record_id || row.culture_id || row.cible_id || '');
const eventAmount = (row = {}) => toNumber(row.montant ?? row.amount ?? row.cout ?? row.cost ?? row.cout_total ?? row.total_cost ?? row.total ?? row.montant_total);
const isCultureCharge = (row = {}) => {
  const text = lower(`${row.type_intervention || ''} ${row.type_evenement || ''} ${row.event_type || ''} ${row.type || ''} ${row.categorie || ''} ${row.category || ''} ${row.title || ''} ${row.libelle || ''}`);
  const source = lower(`${row.target_type || ''} ${row.type_cible || ''} ${row.module_lie || ''} ${row.source_module || ''}`);
  return source.includes('culture') || text.includes('culture') || text.includes('engrais') || text.includes('semence') || text.includes('irrigation') || text.includes('phyto') || text.includes('traitement') || text.includes('recolte') || text.includes('récolte') || text.includes('charge_directe');
};
const linkedCultureCharges = (events = [], cultureId) => arr(events).filter((event) => isCultureCharge(event) && eventTargetId(event) === String(cultureId)).reduce((sum, event) => sum + eventAmount(event), 0);

function Field({ label: fieldLabel, children }) { return <label className="text-xs font-bold text-[#8a7456] space-y-1"><span>{fieldLabel}</span>{children}</label>; }
function Input(props) { return <input {...props} className="w-full rounded-xl border border-[#d6c3a0] bg-white px-3 py-2 text-sm text-[#2f2415] outline-none focus:border-[#9a6b12]" />; }
function Select(props) { return <select {...props} className="w-full rounded-xl border border-[#d6c3a0] bg-white px-3 py-2 text-sm text-[#2f2415] outline-none focus:border-[#9a6b12]" />; }

export default function CultureHarvestStockBridge({ rows = [], businessEvents = [], onUpdate, onRefresh, onCreateBusinessEvent, onRefreshBusinessEvents }) {
  const stockCrud = useCrudModule('stock');
  const cultures = useMemo(() => arr(rows), [rows]);
  const initial = { culture_id: cultures[0]?.id || '', date: today(), quantite_recoltee: '', unite: 'kg', destination: 'stock', frais_recolte: 0, frais_transport: 0, frais_conditionnement: 0, frais_main_oeuvre: 0, autres_frais: 0, notes: '' };
  const [form, setForm] = useState(initial);
  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const culture = cultures.find((item) => item.id === form.culture_id);
  const qty = toNumber(form.quantite_recoltee);
  const extra = fees(form);
  const metrics = culture ? calculateCultureMetrics(culture) : null;
  const existingCharges = culture ? linkedCultureCharges(businessEvents, culture.id) : 0;
  const baseCost = culture ? (toNumber(culture.cout_total_reel) || metrics.costTotal) : 0;
  const unitCost = qty > 0 ? (baseCost + existingCharges + extra) / qty : 0;

  const submit = async (e) => {
    e.preventDefault();
    if (!culture) return toast.error('Choisir une culture');
    if (qty <= 0) return toast.error('Saisir une quantité récoltée');
    const id = makeId('RECOLTE');
    const event = { ...form, id, culture_id: culture.id, related_id: culture.id, target_id: culture.id, target_type: 'cultures', type_evenement: 'recolte_culture charge_directe', event_type: 'recolte_culture', source_module: 'cultures_recolte', module_lie: 'cultures', title: `Récolte: ${label(culture)}`, message: `${fmtNumber(qty)} ${form.unite || 'kg'} · frais ${fmtCurrency(extra)}`, montant: extra, cout: extra, cout_total: extra, cout_revient_unitaire_recolte: Number(unitCost.toFixed(2)), event_date: form.date || today(), date: form.date || today() };
    await onCreateBusinessEvent?.(event);
    if (form.destination !== 'perte') {
      await stockCrud.create?.({
        id: makeId('STKREC'),
        produit: `Récolte ${label(culture)}`,
        categorie: 'produit_recolte',
        activite_liee: 'cultures',
        quantite: Number(qty.toFixed(2)),
        unite: form.unite || 'kg',
        prixUnit: Number(unitCost.toFixed(2)),
        prixunit: Number(unitCost.toFixed(2)),
        prix_unitaire: Number(unitCost.toFixed(2)),
        cout_revient_unitaire: Number(unitCost.toFixed(2)),
        cout_unitaire_calcule: Number(unitCost.toFixed(2)),
        statut: form.destination === 'vente_directe' ? 'reserve' : 'ok',
        stock_status: form.destination === 'vente_directe' ? 'reserve' : 'ok',
        source_module: 'cultures',
        source_record_id: culture.id,
        linked_event_id: id,
        origine_label: label(culture),
        last_movement_type: 'entree_recolte_culture',
        last_movement_qty: Number(qty.toFixed(2)),
        last_movement_at: new Date().toISOString(),
        notes: `Stock issu de récolte · coût ${Number(unitCost.toFixed(2))}/${form.unite || 'kg'}`,
      });
    }
    await onUpdate?.(culture.id, { quantite_recoltee: form.destination === 'perte' ? toNumber(culture.quantite_recoltee) : toNumber(culture.quantite_recoltee) + qty, production_reelle: form.destination === 'perte' ? toNumber(culture.production_reelle) : toNumber(culture.production_reelle) + qty, pertes_recolte: form.destination === 'perte' ? toNumber(culture.pertes_recolte) + qty : toNumber(culture.pertes_recolte), date_derniere_recolte: form.date || today(), cout_recolte: toNumber(culture.cout_recolte) + extra, cout_revient_unitaire_recolte: Number(unitCost.toFixed(2)), statut: form.destination === 'perte' ? culture.statut : form.destination === 'vente_directe' ? culture.statut : 'recolte' });
    await Promise.allSettled([stockCrud.refresh?.(), onRefresh?.(), onRefreshBusinessEvents?.()]);
    toast.success(form.destination === 'perte' ? 'Récolte perdue enregistrée sans stock' : 'Récolte enregistrée, stock créé avec coût de revient');
    setForm(initial);
  };

  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
    <div><p className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><PackageCheck size={20} /> Récolte vers stock</p><p className="mt-1 text-sm text-[#8a7456]">Crée un stock récolte avec coût de revient réel, frais de récolte et conditionnement.</p></div>
    <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-6 xl:grid-cols-11 gap-2 rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-3">
      <Field label="Culture"><Select value={form.culture_id || ''} onChange={(e) => update('culture_id', e.target.value)}><option value="">Choisir</option>{cultures.map((item) => <option key={item.id} value={item.id}>{label(item)}</option>)}</Select></Field>
      <Field label="Date"><Input type="date" value={form.date || ''} onChange={(e) => update('date', e.target.value)} /></Field>
      <Field label="Quantité récoltée"><Input type="number" step="0.01" min="0" value={form.quantite_recoltee || ''} onChange={(e) => update('quantite_recoltee', e.target.value)} /></Field>
      <Field label="Unité"><Select value={form.unite || 'kg'} onChange={(e) => update('unite', e.target.value)}><option value="kg">kg</option><option value="sac">sac</option><option value="caisse">caisse</option><option value="botte">botte</option><option value="unite">unité</option></Select></Field>
      <Field label="Destination"><Select value={form.destination || 'stock'} onChange={(e) => update('destination', e.target.value)}><option value="stock">Stock récolte</option><option value="vente_directe">Vente directe / réservé</option><option value="perte">Perte</option></Select></Field>
      <Field label="Récolte"><Input type="number" min="0" value={form.frais_recolte || ''} onChange={(e) => update('frais_recolte', e.target.value)} /></Field>
      <Field label="Transport"><Input type="number" min="0" value={form.frais_transport || ''} onChange={(e) => update('frais_transport', e.target.value)} /></Field>
      <Field label="Conditionnement"><Input type="number" min="0" value={form.frais_conditionnement || ''} onChange={(e) => update('frais_conditionnement', e.target.value)} /></Field>
      <Field label="Main-d’œuvre"><Input type="number" min="0" value={form.frais_main_oeuvre || ''} onChange={(e) => update('frais_main_oeuvre', e.target.value)} /></Field>
      <Field label="Autres"><Input type="number" min="0" value={form.autres_frais || ''} onChange={(e) => update('autres_frais', e.target.value)} /></Field>
      <div className="flex items-end"><button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-[#2f2415] px-3 py-2 text-xs font-bold text-white"><Plus size={14} /> Ajouter</button></div>
    </form>
    <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-3 text-sm text-[#7d6a4a]">Prévision coût de revient : <b className="text-[#2f2415]">{unitCost ? fmtCurrency(unitCost) : '—'}/{form.unite || 'kg'}</b> · frais récolte : <b>{fmtCurrency(extra)}</b> · charges existantes : <b>{fmtCurrency(existingCharges)}</b></div>
  </section>;
}
