import { PackageCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { calculateCultureMetrics } from '../../utils/businessCalculations';
import { fmtCurrency, fmtNumber, toNumber } from '../../utils/format';
import { commitCultureHarvest } from '../../utils/culturesWorkflow.js';
import { getRealCultureRows } from '../CulturesTabActionsBridge.jsx';

const today = () => new Date().toISOString().slice(0, 10);
const label = (row = {}) => row.nom || row.type || row.id || 'Culture';
const fees = (row = {}) => toNumber(row.frais_recolte) + toNumber(row.frais_transport) + toNumber(row.frais_conditionnement) + toNumber(row.frais_main_oeuvre) + toNumber(row.autres_frais);

function Field({ label: fieldLabel, children }) {
  return <label className="block text-sm"><span className="mb-1 block text-xs font-bold text-[#8a7456]">{fieldLabel}</span>{children}</label>;
}
const inputCls = 'w-full rounded-xl border border-[#eadcc2] bg-white px-3 py-2 text-sm text-[#2f2415]';

export default function CulturesHarvestPanel({
  rows = [],
  context,
  handlers,
  onSuccess,
}) {
  const cultures = useMemo(() => getRealCultureRows(rows), [rows]);
  const initial = {
    culture_id: cultures[0]?.id || '',
    date: today(),
    quantite_recoltee: '',
    unite: 'kg',
    destination: 'stock',
    prix_vente_unitaire: '',
    frais_recolte: 0,
    frais_transport: 0,
    frais_conditionnement: 0,
    frais_main_oeuvre: 0,
    autres_frais: 0,
    notes: '',
  };
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const culture = cultures.find((c) => c.id === form.culture_id);
  const qty = toNumber(form.quantite_recoltee);
  const extra = fees(form);
  const unitCost = culture && qty > 0
    ? ((toNumber(culture.cout_total_reel) || calculateCultureMetrics(culture).costTotal) + extra) / qty
    : 0;

  const submit = async (e) => {
    e.preventDefault();
    try {
      setBusy(true);
      await commitCultureHarvest({ form, context, handlers });
      toast.success('Récolte enregistrée — stock vendable et traçabilité à jour');
      setForm(initial);
      await onSuccess?.();
    } catch (err) {
      toast.error(err.message || 'Récolte impossible');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
      <div>
        <p className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><PackageCheck size={20} /> Récolte</p>
        <p className="mt-1 text-sm text-[#8a7456]">Une saisie : journal récolte, entrée stock, mouvement, opportunité commerciale et rentabilité culture.</p>
      </div>
      <form onSubmit={submit} className="grid grid-cols-1 gap-3 md:grid-cols-6 xl:grid-cols-12 rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
        <div className="md:col-span-2"><Field label="Culture"><select className={inputCls} value={form.culture_id} onChange={(e) => update('culture_id', e.target.value)} required><option value="">Choisir</option>{cultures.map((c) => <option key={c.id} value={c.id}>{label(c)}</option>)}</select></Field></div>
        <div className="md:col-span-1"><Field label="Date"><input type="date" className={inputCls} value={form.date} onChange={(e) => update('date', e.target.value)} /></Field></div>
        <div className="md:col-span-1"><Field label="Quantité"><input type="number" min="0" step="0.01" className={inputCls} value={form.quantite_recoltee} onChange={(e) => update('quantite_recoltee', e.target.value)} required /></Field></div>
        <div className="md:col-span-1"><Field label="Unité"><select className={inputCls} value={form.unite} onChange={(e) => update('unite', e.target.value)}><option value="kg">kg</option><option value="sac">sac</option><option value="caisse">caisse</option><option value="botte">botte</option></select></Field></div>
        <div className="md:col-span-1"><Field label="Prix vente / u."><input type="number" className={inputCls} value={form.prix_vente_unitaire} onChange={(e) => update('prix_vente_unitaire', e.target.value)} /></Field></div>
        <div className="md:col-span-1"><Field label="Destination"><select className={inputCls} value={form.destination} onChange={(e) => update('destination', e.target.value)}><option value="stock">Stock vendable</option><option value="perte">Perte</option></select></Field></div>
        <div className="md:col-span-1"><Field label="Frais récolte"><input type="number" className={inputCls} value={form.frais_recolte} onChange={(e) => update('frais_recolte', e.target.value)} /></Field></div>
        <div className="md:col-span-1"><Field label="Transport"><input type="number" className={inputCls} value={form.frais_transport} onChange={(e) => update('frais_transport', e.target.value)} /></Field></div>
        <div className="md:col-span-1"><Field label="Conditionnement"><input type="number" className={inputCls} value={form.frais_conditionnement} onChange={(e) => update('frais_conditionnement', e.target.value)} /></Field></div>
        <div className="md:col-span-2 flex items-end"><button type="submit" disabled={busy} className="w-full rounded-xl bg-[#2f2415] px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{busy ? '…' : 'Enregistrer la récolte'}</button></div>
      </form>
      <p className="text-sm text-[#7d6a4a]">Coût de revient estimé : <b>{unitCost ? fmtCurrency(unitCost) : '—'}</b> / {form.unite} · frais saisis : <b>{fmtNumber(extra)} F</b></p>
    </section>
  );
}
