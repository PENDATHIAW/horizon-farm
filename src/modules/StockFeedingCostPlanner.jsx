import { useMemo, useState } from 'react';
import { Calculator, CheckCircle2, Package, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { fmtCurrency, fmtNumber, toNumber } from '../utils/format';

const arr = (value) => Array.isArray(value) ? value : [];
const lower = (value) => String(value || '').toLowerCase();
const categoryOf = (row = {}) => lower(row.categorie || row.category || '');
const isFood = (row = {}) => categoryOf(row).includes('aliment');
const stockQty = (row = {}) => toNumber(row.quantite);
const unitPrice = (row = {}) => toNumber(row.prixUnit ?? row.prixunit ?? row.prix_unitaire ?? row.unit_price);
const stockKg = (row = {}) => lower(row.unite).includes('sac') ? stockQty(row) * toNumber(row.poids_sac_kg || row.sac_kg || 50) : stockQty(row);
const nowDate = () => new Date().toISOString().slice(0, 10);
const targetName = (row = {}) => row.name || row.nom || row.tag || row.id || 'Cible';

const DEFAULT_RULES = {
  chair: { label: 'Poulets de chair', dailyKg: 0.1, days: 35, note: 'Base pratique : env. 7 sacs / 100 sujets / 35 jours' },
  pondeuse: { label: 'Pondeuses', dailyKg: 0.135, days: 30, note: '120 à 150 g/jour, valeur par défaut 135 g' },
  bovin: { label: 'Bovins', dailyKg: 4.5, days: 90, note: '3 à 6 kg/jour concentré, valeur moyenne 4,5 kg' },
  ovin: { label: 'Ovins', dailyKg: 0.75, days: 90, note: '0,5 à 1 kg/jour, valeur moyenne 0,75 kg' },
  caprin: { label: 'Caprins', dailyKg: 0.6, days: 90, note: '0,4 à 0,8 kg/jour, valeur moyenne 0,6 kg' },
};

function Field({ label, children }) {
  return <label className="space-y-1 text-xs font-bold text-[#8a7456]"><span>{label}</span>{children}</label>;
}
function Input(props) {
  return <input {...props} className="w-full rounded-xl border border-[#d6c3a0] bg-white px-3 py-2 text-sm text-[#2f2415] outline-none focus:border-[#9a6b12]" />;
}
function Select(props) {
  return <select {...props} className="w-full rounded-xl border border-[#d6c3a0] bg-white px-3 py-2 text-sm text-[#2f2415] outline-none focus:border-[#9a6b12]" />;
}
function Mini({ label, value, hint, danger = false }) {
  return <div className={`rounded-2xl border p-3 ${danger ? 'border-red-200 bg-red-50' : 'border-[#d6c3a0] bg-[#fffdf8]'}`}><p className="text-xs text-[#8a7456]">{label}</p><p className={`mt-1 text-xl font-black ${danger ? 'text-red-600' : 'text-[#2f2415]'}`}>{value}</p>{hint ? <p className="mt-1 text-[11px] text-[#8a7456]">{hint}</p> : null}</div>;
}

export default function StockFeedingCostPlanner({ rows = [], animaux = [], lots = [], onOpenUseFood }) {
  const foodStocks = useMemo(() => arr(rows).filter(isFood), [rows]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    stock_id: foodStocks[0]?.id || '',
    target_type: 'lot',
    target_id: lots[0]?.id || '',
    categorie: 'chair',
    subjects: 100,
    days: DEFAULT_RULES.chair.days,
    dailyKg: DEFAULT_RULES.chair.dailyKg,
    sacKg: 50,
  });
  const rule = DEFAULT_RULES[form.categorie] || DEFAULT_RULES.chair;
  const selectedStock = foodStocks.find((item) => item.id === form.stock_id) || foodStocks[0];
  const targetRows = form.target_type === 'animal' ? arr(animaux) : arr(lots);
  const selectedTarget = targetRows.find((item) => item.id === form.target_id) || targetRows[0];
  const subjects = Math.max(0, toNumber(form.subjects));
  const days = Math.max(1, toNumber(form.days));
  const dailyKg = Math.max(0, toNumber(form.dailyKg));
  const sacKg = Math.max(1, toNumber(form.sacKg));
  const totalKg = subjects * days * dailyKg;
  const sacsNeeded = totalKg / sacKg;
  const pricePerKg = lower(selectedStock?.unite).includes('sac') ? unitPrice(selectedStock) / toNumber(selectedStock?.poids_sac_kg || selectedStock?.sac_kg || sacKg || 50) : unitPrice(selectedStock);
  const totalCost = totalKg * pricePerKg;
  const costPerSubject = subjects ? totalCost / subjects : 0;
  const costPerSubjectDay = subjects && days ? totalCost / subjects / days : 0;
  const availableKg = selectedStock ? stockKg(selectedStock) : 0;
  const coverageDays = subjects && dailyKg ? availableKg / (subjects * dailyKg) : 0;
  const missingKg = Math.max(0, totalKg - availableKg);
  const missingSacs = missingKg / sacKg;

  const updateCategory = (categorie) => {
    const next = DEFAULT_RULES[categorie] || DEFAULT_RULES.chair;
    setForm((prev) => ({ ...prev, categorie, days: next.days, dailyKg: next.dailyKg }));
  };
  const updateTargetType = (target_type) => {
    const nextRows = target_type === 'animal' ? arr(animaux) : arr(lots);
    setForm((prev) => ({ ...prev, target_type, target_id: nextRows[0]?.id || '' }));
  };
  const applyPlan = async () => {
    if (!onOpenUseFood) return toast.error('Action non connectée');
    if (!selectedStock) return toast.error('Choisir un stock aliment');
    if (!selectedTarget) return toast.error('Choisir une cible');
    if (totalKg <= 0) return toast.error('Quantité à consommer invalide');
    try {
      setSaving(true);
      await onOpenUseFood({ stock: selectedStock, target: selectedTarget, targetType: form.target_type, totalKg, totalCost, costPerSubject, costPerSubjectDay, subjects, days, dailyKg, sacKg, sacsNeeded, categorie: form.categorie, date: nowDate() });
      toast.success('Plan alimentation appliqué');
    } catch (error) {
      toast.error(error.message || 'Application du plan impossible');
    } finally {
      setSaving(false);
    }
  };

  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
      <div>
        <p className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><Calculator size={20} /> Plan alimentation & coût par sujet</p>
        <p className="mt-1 text-sm text-[#8a7456]">Estime puis applique une consommation d’aliment à un lot ou un animal à partir du stock réel.</p>
      </div>
      <div className="rounded-2xl bg-[#2f2415] px-4 py-3 text-white">
        <p className="text-xs opacity-80">Coût aliment / sujet</p>
        <p className="text-xl font-black">{fmtCurrency(costPerSubject)}</p>
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-4 xl:grid-cols-8 gap-2 rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-3">
      <Field label="Stock aliment"><Select value={form.stock_id || selectedStock?.id || ''} onChange={(e) => setForm((prev) => ({ ...prev, stock_id: e.target.value }))}><option value="">Choisir</option>{foodStocks.map((stock) => <option key={stock.id} value={stock.id}>{stock.produit} · {fmtNumber(stock.quantite)} {stock.unite || ''} · {fmtCurrency(unitPrice(stock))}</option>)}</Select></Field>
      <Field label="Cible"><Select value={form.target_type} onChange={(e) => updateTargetType(e.target.value)}><option value="lot">Lot avicole</option><option value="animal">Animal</option></Select></Field>
      <Field label="Lot / animal"><Select value={form.target_id || selectedTarget?.id || ''} onChange={(e) => setForm((prev) => ({ ...prev, target_id: e.target.value }))}><option value="">Choisir</option>{targetRows.map((row) => <option key={row.id} value={row.id}>{targetName(row)}</option>)}</Select></Field>
      <Field label="Catégorie"><Select value={form.categorie} onChange={(e) => updateCategory(e.target.value)}>{Object.entries(DEFAULT_RULES).map(([key, item]) => <option key={key} value={key}>{item.label}</option>)}</Select></Field>
      <Field label="Nombre sujets"><Input type="number" min="0" value={form.subjects} onChange={(e) => setForm((prev) => ({ ...prev, subjects: e.target.value }))} /></Field>
      <Field label="Durée"><Input type="number" min="1" value={form.days} onChange={(e) => setForm((prev) => ({ ...prev, days: e.target.value }))} /></Field>
      <Field label="Kg / sujet / jour"><Input type="number" step="0.001" min="0" value={form.dailyKg} onChange={(e) => setForm((prev) => ({ ...prev, dailyKg: e.target.value }))} /></Field>
      <Field label="Poids sac"><Input type="number" min="1" value={form.sacKg} onChange={(e) => setForm((prev) => ({ ...prev, sacKg: e.target.value }))} /></Field>
    </div>

    <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
      <Mini label="Besoin total" value={`${fmtNumber(totalKg)} kg`} hint={`${sacsNeeded.toFixed(1)} sacs de ${sacKg} kg`} />
      <Mini label="Stock disponible" value={`${fmtNumber(availableKg)} kg`} hint={selectedStock?.produit || 'Aucun stock'} danger={availableKg < totalKg} />
      <Mini label="Couverture" value={`${coverageDays.toFixed(1)} j`} hint="avec ce stock" danger={coverageDays < days} />
      <Mini label="Manquant" value={`${fmtNumber(missingKg)} kg`} hint={`${missingSacs.toFixed(1)} sacs`} danger={missingKg > 0} />
      <Mini label="Coût aliment" value={fmtCurrency(totalCost)} hint={`Prix kg estimé ${fmtCurrency(pricePerKg)}`} />
      <Mini label="Coût/jour/sujet" value={fmtCurrency(costPerSubjectDay)} hint="aliment seulement" />
    </div>

    <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-sm text-[#7d6a4a] flex items-start gap-3"><TrendingUp size={18} className="text-[#9a6b12] mt-0.5" /><div><b className="text-[#2f2415]">Lecture :</b> {rule.note}. Ce coût concerne uniquement l’alimentation, pas l’achat des sujets.</div></div>
    <div className={`${missingKg > 0 ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'} border rounded-2xl p-4 text-sm flex flex-col md:flex-row md:items-start md:justify-between gap-3`}><div className="flex items-start gap-2"><Package size={18} className="mt-0.5" /><div><b>Action :</b> {missingKg > 0 ? `prévoir environ ${missingSacs.toFixed(1)} sac(s) supplémentaires.` : 'le stock couvre la période prévue.'}</div></div><button type="button" disabled={saving || !onOpenUseFood} onClick={applyPlan} className="shrink-0 rounded-xl bg-[#2f2415] text-white px-4 py-2 text-xs font-bold disabled:opacity-60"><CheckCircle2 size={14} className="inline" /> {saving ? 'Application...' : 'Appliquer au stock'}</button></div>
  </section>;
}
