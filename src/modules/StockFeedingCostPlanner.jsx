import { useMemo, useState } from 'react';
import { Calculator, CheckCircle2, History, Package, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { fmtCurrency, fmtNumber, toNumber } from '../utils/format';
import { DEFAULT_FEEDING_RULES, calculateFeedingPlan } from '../services/feedingCostEngine';

const arr = (value) => Array.isArray(value) ? value : [];
const lower = (value) => String(value || '').toLowerCase();
const categoryOf = (row = {}) => lower(row.categorie || row.category || '');
const isFood = (row = {}) => categoryOf(row).includes('aliment');
const unitPrice = (row = {}) => toNumber(row.prixUnit ?? row.prixunit ?? row.prix_unitaire ?? row.unit_price);

const nowDate = () => new Date().toISOString().slice(0, 10);
const targetName = (row = {}) => row.name || row.nom || row.tag || row.id || 'Cible';
const logTargetId = (row = {}) => String(row.cible_id || row.lot_id || row.animal_id || row.related_id || row.entity_id || '');
const logCost = (row = {}) => toNumber(row.montant_total ?? row.cout_total ?? row.amount ?? row.montant);
const logQty = (row = {}) => toNumber(row.quantite ?? row.quantity ?? row.qty);


function Field({ label, children }) {
  return <label className="space-y-1 text-xs font-semibold text-slate"><span>{label}</span>{children}</label>;
}
function Input(props) {
  return <input {...props} className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-earth outline-none focus:border-horizon-dark" />;
}
function Select(props) {
  return <select {...props} className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-earth outline-none focus:border-horizon-dark" />;
}
function Mini({ label, value, hint, danger = false }) {
  return <div className={`rounded-2xl border p-3 ${danger ? 'border-urgent bg-urgent-bg' : 'border-line bg-card'}`}><p className="text-xs text-slate">{label}</p><p className={`mt-1 text-xl font-semibold ${danger ? 'text-urgent' : 'text-earth'}`}>{value}</p>{hint ? <p className="mt-1 text-meta text-slate">{hint}</p> : null}</div>;
}

export default function StockFeedingCostPlanner({ rows = [], animaux = [], lots = [], alimentationLogs = [], onOpenUseFood, simulateOnly = false }) {
  const foodStocks = useMemo(() => arr(rows).filter(isFood), [rows]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    stock_id: foodStocks[0]?.id || '',
    target_type: 'lot',
    target_id: lots[0]?.id || '',
    categorie: 'chair',
    subjects: 100,
    days: DEFAULT_FEEDING_RULES.chair.days,
    dailyKg: DEFAULT_FEEDING_RULES.chair.dailyKg,
    sacKg: 50,
  });
  const rule = DEFAULT_FEEDING_RULES[form.categorie] || DEFAULT_FEEDING_RULES.chair;
  const selectedStock = foodStocks.find((item) => item.id === form.stock_id) || foodStocks[0];
  const targetRows = form.target_type === 'animal' ? arr(animaux) : arr(lots);
  const selectedTarget = targetRows.find((item) => item.id === form.target_id) || targetRows[0];
  const subjects = Math.max(0, toNumber(form.subjects));
  const days = Math.max(1, toNumber(form.days));
  const dailyKg = Math.max(0, toNumber(form.dailyKg));
  const sacKg = Math.max(1, toNumber(form.sacKg));
  const plan = calculateFeedingPlan({ stock: selectedStock, subjects, days, dailyKg, sacKg });
  const { totalKg, totalCost, costPerSubject, costPerSubjectDay, availableKg, coverageDays, missingKg, sacsNeeded, pricePerKg } = plan;
  const missingSacs = missingKg / sacKg;
  const targetId = selectedTarget?.id;
  const targetHistory = targetId
    ? [...arr(alimentationLogs)]
      .filter((log) => logTargetId(log) === String(selectedTarget.id))
      .sort((a, b) => String(b.date || b.created_at || '').localeCompare(String(a.date || a.created_at || '')))
    : [];
  const historyTotalCost = targetHistory.reduce((sum, log) => sum + logCost(log), 0);
  const historyTotalQty = targetHistory.reduce((sum, log) => sum + logQty(log), 0);
  const historyCostPerSubject = subjects ? historyTotalCost / subjects : 0;

  const updateCategory = (categorie) => {
    const next = DEFAULT_FEEDING_RULES[categorie] || DEFAULT_FEEDING_RULES.chair;
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

  return <section className="rounded-3xl border border-line bg-white p-6 shadow-card space-y-4">
    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
      <div>
        <p className="flex items-center gap-2 text-lg font-semibold text-earth"><Calculator size={20} /> Plan alimentation & coût par sujet</p>
        <p className="mt-1 text-sm text-slate">Estime puis applique une consommation d’aliment à un lot ou un animal à partir du stock réel.</p>
      </div>
      <div className="rounded-2xl bg-earth px-4 py-3 text-white"><p className="text-xs opacity-80">Coût aliment / sujet</p><p className="text-xl font-semibold">{fmtCurrency(costPerSubject)}</p></div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-4 xl:grid-cols-8 gap-2 rounded-2xl border border-line bg-card p-3"><Field label="Stock aliment"><Select value={form.stock_id || selectedStock?.id || ''} onChange={(e) => setForm((prev) => ({ ...prev, stock_id: e.target.value }))}><option value="">Choisir</option>{foodStocks.map((stock) => <option key={stock.id} value={stock.id}>{stock.produit} · {fmtNumber(stock.quantite)} {stock.unite || ''} · {fmtCurrency(unitPrice(stock))}</option>)}</Select></Field><Field label="Cible"><Select value={form.target_type} onChange={(e) => updateTargetType(e.target.value)}><option value="lot">Lot avicole</option><option value="animal">Animal</option></Select></Field><Field label="Lot / animal"><Select value={form.target_id || selectedTarget?.id || ''} onChange={(e) => setForm((prev) => ({ ...prev, target_id: e.target.value }))}><option value="">Choisir</option>{targetRows.map((row) => <option key={row.id} value={row.id}>{targetName(row)}</option>)}</Select></Field><Field label="Catégorie"><Select value={form.categorie} onChange={(e) => updateCategory(e.target.value)}>{Object.entries(DEFAULT_FEEDING_RULES).map(([key, item]) => <option key={key} value={key}>{item.label}</option>)}</Select></Field><Field label="Nombre sujets"><Input type="number" min="0" value={form.subjects} onChange={(e) => setForm((prev) => ({ ...prev, subjects: e.target.value }))} /></Field><Field label="Durée"><Input type="number" min="1" value={form.days} onChange={(e) => setForm((prev) => ({ ...prev, days: e.target.value }))} /></Field><Field label="Kg / sujet / jour"><Input type="number" step="0.001" min="0" value={form.dailyKg} onChange={(e) => setForm((prev) => ({ ...prev, dailyKg: e.target.value }))} /></Field><Field label="Poids sac"><Input type="number" min="1" value={form.sacKg} onChange={(e) => setForm((prev) => ({ ...prev, sacKg: e.target.value }))} /></Field></div>

    <div className="grid grid-cols-2 lg:grid-cols-6 gap-3"><Mini label="Besoin total" value={`${fmtNumber(totalKg)} kg`} hint={`${sacsNeeded.toFixed(1)} sacs de ${sacKg} kg`} /><Mini label="Stock disponible" value={`${fmtNumber(availableKg)} kg`} hint={selectedStock?.produit || 'Aucun stock'} danger={availableKg < totalKg} /><Mini label="Couverture" value={`${coverageDays.toFixed(1)} j`} hint="avec ce stock" danger={coverageDays < days} /><Mini label="Manquant" value={`${fmtNumber(missingKg)} kg`} hint={`${missingSacs.toFixed(1)} sacs`} danger={missingKg > 0} /><Mini label="Coût aliment" value={fmtCurrency(totalCost)} hint={`Prix kg estimé ${fmtCurrency(pricePerKg)}`} /><Mini label="Coût/jour/sujet" value={fmtCurrency(costPerSubjectDay)} hint="aliment seulement" /></div>

    <div className="rounded-2xl border border-line bg-card p-4 text-sm text-slate flex items-start gap-3"><TrendingUp size={18} className="text-horizon-dark mt-1" /><div><b className="text-earth">Lecture :</b> {rule.note}. Ce coût concerne uniquement l’alimentation, pas l’achat des sujets.</div></div>
    <div className={`${missingKg > 0 ? 'bg-vigilance-bg border-vigilance text-horizon-dark' : 'bg-positive-bg border-positive text-positive'} border rounded-2xl p-4 text-sm flex flex-col md:flex-row md:items-start md:justify-between gap-3`}><div className="flex items-start gap-2"><Package size={18} className="mt-1" /><div><b>Action :</b> {missingKg > 0 ? `prévoir environ ${missingSacs.toFixed(1)} sac(s) supplémentaires.` : 'le stock couvre la période prévue.'}</div></div>{simulateOnly ? <span className="text-xs font-semibold text-slate">Simulation : validez ensuite avec le formulaire de distribution.</span> : <button type="button" disabled={saving || !onOpenUseFood} onClick={applyPlan} className="shrink-0 rounded-xl bg-earth text-white px-4 py-2 text-xs font-semibold disabled:opacity-60"><CheckCircle2 size={14} className="inline" /> {saving ? 'Application...' : 'Appliquer au stock'}</button>}</div>

    <div className="rounded-2xl border border-line bg-white p-4 space-y-3"><div className="flex flex-col md:flex-row md:items-center justify-between gap-2"><div><p className="flex items-center gap-2 font-semibold text-earth"><History size={16} /> Historique alimentation cible</p><p className="text-xs text-slate">Chaque application s’ajoute à l’historique, sans écraser les lignes précédentes.</p></div><div className="text-sm text-slate"><b>{fmtCurrency(historyTotalCost)}</b> · {fmtNumber(historyTotalQty)} kg · {fmtCurrency(historyCostPerSubject)}/sujet</div></div>{targetHistory.length ? <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="border-b border-line text-left text-xs uppercase text-slate"><th className="py-2 pr-4">Date</th><th className="py-2 pr-4">Stock</th><th className="py-2 pr-4">Quantité</th><th className="py-2 pr-4">Coût</th><th className="py-2 pr-4">Notes</th></tr></thead><tbody>{targetHistory.slice(0, 8).map((log) => <tr key={log.id || `${log.date}-${log.stock_id}`} className="border-b border-line"><td className="py-3 pr-4">{log.date || '—'}</td><td className="py-3 pr-4">{log.produit || log.stock_id || '—'}</td><td className="py-3 pr-4">{fmtNumber(logQty(log))} {log.unite || 'kg'}</td><td className="py-3 pr-4 font-semibold">{fmtCurrency(logCost(log))}</td><td className="py-3 pr-4 text-slate">{log.notes || '—'}</td></tr>)}</tbody></table></div> : <div className="rounded-xl border border-line bg-card p-3 text-sm text-slate">Aucune alimentation encore appliquée à cette cible.</div>}</div>
  </section>;
}
