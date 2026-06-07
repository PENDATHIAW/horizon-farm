import { useMemo, useState } from 'react';
import { Drumstick, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import useCrudModule from '../hooks/useCrudModule';
import { calculateUnifiedLotCost } from '../services/unifiedCostService.js';
import { avicoleActiveCount } from '../utils/avicoleMetrics';
import { fmtCurrency, fmtNumber, toNumber } from '../utils/format';
import { makeId } from '../utils/ids';
import { buildMeatStockPayload } from '../services/livestockStockBridge';

const arr = (value) => Array.isArray(value) ? value : [];
const today = () => new Date().toISOString().slice(0, 10);
const lower = (value) => String(value || '').toLowerCase();
const fees = (row = {}) => toNumber(row.frais_abattage) + toNumber(row.frais_decoupe) + toNumber(row.frais_emballage) + toNumber(row.frais_transport) + toNumber(row.autres_frais);
const isChair = (row = {}) => lower(`${row.type || ''} ${row.activity || ''} ${row.activite || ''}`).includes('chair');
const lotLabel = (row = {}) => row.name || row.nom || row.id;

function Field({ label, children }) { return <label className="text-xs font-bold text-[#8a7456] space-y-1"><span>{label}</span>{children}</label>; }
function Input(props) { return <input {...props} className="w-full rounded-xl border border-[#d6c3a0] bg-white px-3 py-2 text-sm text-[#2f2415] outline-none focus:border-[#9a6b12]" />; }
function Select(props) { return <select {...props} className="w-full rounded-xl border border-[#d6c3a0] bg-white px-3 py-2 text-sm text-[#2f2415] outline-none focus:border-[#9a6b12]" />; }

export default function AvicoleTransformationBridge({ rows = [], alimentationLogs = [], productionLogs = [], businessEvents = [], onUpdate, onRefresh, onCreateBusinessEvent, onRefreshBusinessEvents }) {
  const stockCrud = useCrudModule('stock');
  const lots = useMemo(() => arr(rows).filter((lot) => isChair(lot) && avicoleActiveCount(lot) > 0), [rows]);
  const initial = { lot_id: lots[0]?.id || '', date: today(), sujets_abattus: '', poids_total_viande: '', destination: 'stock', frais_abattage: 0, frais_decoupe: 0, frais_emballage: 0, frais_transport: 0, autres_frais: 0, notes: '' };
  const [form, setForm] = useState(initial);
  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const selectedLot = lots.find((lot) => lot.id === form.lot_id);
  const weight = toNumber(form.poids_total_viande);
  const subjects = toNumber(form.sujets_abattus);
  const extra = fees(form);
  const baseCost = selectedLot ? calculateUnifiedLotCost({ lot: selectedLot, alimentationLogs, productionLogs, directCharges: businessEvents, healthEvents: businessEvents, slaughterEvents: businessEvents }).raw : null;
  const activeCount = selectedLot ? Math.max(1, avicoleActiveCount(selectedLot)) : 1;
  const unitKg = weight > 0 && baseCost ? ((baseCost.totalCost / activeCount) * subjects + extra) / weight : 0;

  const submit = async (e) => {
    e.preventDefault();
    if (!selectedLot) return toast.error('Choisir un lot de chair');
    if (subjects <= 0) return toast.error('Saisir le nombre de sujets abattus');
    if (weight <= 0) return toast.error('Saisir le poids total viande');
    if (subjects > avicoleActiveCount(selectedLot)) return toast.error('Sujets abattus supérieurs à l’effectif actif');
    const id = makeId('ABATAV');
    const event = { ...form, id, lot_id: selectedLot.id, related_id: selectedLot.id, target_id: selectedLot.id, target_type: 'avicole', type_evenement: 'abattage_avicole charge_directe', event_type: 'abattage_avicole', source_module: 'avicole_abattage', module_lie: 'avicole', title: `Abattage avicole: ${lotLabel(selectedLot)}`, message: `${subjects} sujet(s), ${weight.toFixed(2)} kg`, montant: extra, cout: extra, cout_total: extra, cout_revient_viande_kg: Number(unitKg.toFixed(2)), event_date: form.date || today(), date: form.date || today() };
    await onCreateBusinessEvent?.(event);
    if (form.destination !== 'perte') {
      const produit = `Viande poulet ${lotLabel(selectedLot)}`;
      const meatPayload = buildMeatStockPayload({
        produit,
        categorie: 'produit_fini_viande_avicole',
        quantite: weight,
        unitCost: unitKg,
        sourceModule: 'avicole',
        sourceRecordId: selectedLot.id,
        eventId: id,
        origineLabel: lotLabel(selectedLot),
        emplacement: 'Chambre froide 1',
      });
      if (form.destination === 'vente_directe') {
        meatPayload.statut = 'reserve';
        meatPayload.stock_status = 'reserve';
      }
      await stockCrud.create?.(meatPayload);
    }
    await onUpdate?.(selectedLot.id, { vendus: toNumber(selectedLot.vendus) + subjects, sujets_abattus: toNumber(selectedLot.sujets_abattus) + subjects, last_slaughter_date: form.date || today(), cout_revient_viande_kg: Number(unitKg.toFixed(2)) });
    await Promise.allSettled([stockCrud.refresh?.(), onRefresh?.(), onRefreshBusinessEvents?.()]);
    toast.success(form.destination === 'perte' ? 'Abattage/perte enregistré sans stock viande' : 'Abattage avicole enregistré, stock viande créé');
    setForm(initial);
  };

  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
    <div><p className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><Drumstick size={20} /> Abattage / transformation avicole</p><p className="mt-1 text-sm text-[#8a7456]">Transforme un lot de chair en stock viande avec coût/kg réel.</p></div>
    <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-6 xl:grid-cols-11 gap-2 rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-3">
      <Field label="Lot chair"><Select value={form.lot_id || ''} onChange={(e) => update('lot_id', e.target.value)}><option value="">Choisir</option>{lots.map((lot, index) => <option key={`${lot.id || 'lot'}-${index}`} value={lot.id}>{lotLabel(lot)} · {fmtNumber(avicoleActiveCount(lot))} actifs</option>)}</Select></Field>
      <Field label="Date"><Input type="date" value={form.date || ''} onChange={(e) => update('date', e.target.value)} /></Field>
      <Field label="Sujets abattus"><Input type="number" min="0" value={form.sujets_abattus || ''} onChange={(e) => update('sujets_abattus', e.target.value)} /></Field>
      <Field label="Poids viande kg"><Input type="number" step="0.01" min="0" value={form.poids_total_viande || ''} onChange={(e) => update('poids_total_viande', e.target.value)} /></Field>
      <Field label="Destination"><Select value={form.destination || 'stock'} onChange={(e) => update('destination', e.target.value)}><option value="stock">Stock viande</option><option value="vente_directe">Vente directe / réservé</option><option value="perte">Perte</option></Select></Field>
      <Field label="Abattage"><Input type="number" min="0" value={form.frais_abattage || ''} onChange={(e) => update('frais_abattage', e.target.value)} /></Field>
      <Field label="Découpe"><Input type="number" min="0" value={form.frais_decoupe || ''} onChange={(e) => update('frais_decoupe', e.target.value)} /></Field>
      <Field label="Emballage"><Input type="number" min="0" value={form.frais_emballage || ''} onChange={(e) => update('frais_emballage', e.target.value)} /></Field>
      <Field label="Transport"><Input type="number" min="0" value={form.frais_transport || ''} onChange={(e) => update('frais_transport', e.target.value)} /></Field>
      <Field label="Autres"><Input type="number" min="0" value={form.autres_frais || ''} onChange={(e) => update('autres_frais', e.target.value)} /></Field>
      <div className="flex items-end"><button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-[#2f2415] px-3 py-2 text-xs font-bold text-white"><Plus size={14} /> Ajouter</button></div>
    </form>
    <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-3 text-sm text-[#7d6a4a]">Prévision coût/kg : <b className="text-[#2f2415]">{unitKg ? fmtCurrency(unitKg) : '—'}</b> · frais transformation : <b>{fmtCurrency(extra)}</b></div>
  </section>;
}
