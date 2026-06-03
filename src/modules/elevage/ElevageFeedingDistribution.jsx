import { useMemo, useState } from 'react';
import { Calculator, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { fmtCurrency, fmtNumber, toNumber } from '../../utils/format';
import { DEFAULT_FEEDING_RULES, calculateFeedingPlan, applyFeedingDistribution } from '../../services/feedingCostEngine';
import useWorkflowSubmit from '../../hooks/useWorkflowSubmit';

const arr = (value) => (Array.isArray(value) ? value : []);
const lower = (value) => String(value || '').toLowerCase();
const today = () => new Date().toISOString().slice(0, 10);
const isFood = (row = {}) => /aliment|feed|provende|son|mais|maïs|foin|fourrage/.test(lower(`${row.produit || ''} ${row.categorie || ''}`));
const activeLotCount = (lot = {}) => toNumber(lot.current_count ?? lot.effectif_actuel ?? lot.initial_count);
const lotLabel = (lot = {}) => lot.name || lot.nom || lot.id;
const animalLabel = (animal = {}) => animal.name || animal.nom || animal.tag || animal.id;

function Field({ label, children }) {
  return <label className="text-xs font-bold text-[#8a7456] space-y-1 block"><span>{label}</span>{children}</label>;
}
function Input(props) {
  return <input {...props} className="w-full rounded-xl border border-[#d6c3a0] bg-white px-3 py-2 text-sm" />;
}
function Select(props) {
  return <select {...props} className="w-full rounded-xl border border-[#d6c3a0] bg-white px-3 py-2 text-sm" />;
}

function inferCategory(lot = {}) {
  const text = lower(`${lot.type || ''} ${lot.name || ''}`);
  if (text.includes('pondeuse') || text.includes('ponte') || text.includes('oeuf')) return 'pondeuse';
  if (text.includes('chair') || text.includes('broiler')) return 'chair';
  return 'chair';
}

export default function ElevageFeedingDistribution({
  stocks = [],
  lots = [],
  animaux = [],
  handlers = {},
}) {
  const foodStocks = useMemo(() => arr(stocks).filter(isFood), [stocks]);
  const activeLots = useMemo(() => arr(lots).filter((lot) => activeLotCount(lot) > 0), [lots]);
  const activeAnimals = useMemo(() => arr(animaux).filter((a) => !['vendu', 'mort', 'abattu'].includes(lower(a.status || a.statut))), [animaux]);

  const { submit: workflowSubmit, busy: workflowBusy } = useWorkflowSubmit();
  const [form, setForm] = useState({
    stock_id: foodStocks[0]?.id || '',
    target_type: 'lot',
    target_id: activeLots[0]?.id || '',
    kg: '',
    date: today(),
    notes: '',
  });

  const selectedStock = foodStocks.find((s) => s.id === form.stock_id) || foodStocks[0];
  const targetRows = form.target_type === 'animal' ? activeAnimals : activeLots;
  const selectedTarget = targetRows.find((r) => r.id === form.target_id) || targetRows[0];
  const category = selectedTarget && form.target_type === 'lot' ? inferCategory(selectedTarget) : 'bovin';
  const rule = DEFAULT_FEEDING_RULES[category] || DEFAULT_FEEDING_RULES.chair;
  const subjects = form.target_type === 'lot' ? activeLotCount(selectedTarget) : 1;
  const manualKg = toNumber(form.kg);
  const plan = calculateFeedingPlan({
    stock: selectedStock,
    subjects,
    days: 1,
    dailyKg: manualKg > 0 ? manualKg / Math.max(1, subjects) : rule.dailyKg,
  });
  const totalKg = manualKg > 0 ? manualKg : plan.totalKg;

  const submit = async (e) => {
    e.preventDefault();
    if (!selectedStock || !selectedTarget) return toast.error('Stock aliment et cible obligatoires');
    if (totalKg <= 0) return toast.error('Quantité en kg obligatoire');
    const feedKey = `feeding-elevage:${selectedStock.id}:${selectedTarget.id}:${form.date || today()}:${totalKg}`;
    await workflowSubmit(feedKey, async () => {
      const costPlan = calculateFeedingPlan({ stock: selectedStock, subjects: 1, days: 1, dailyKg: totalKg });
      await applyFeedingDistribution({
        stock: selectedStock,
        target: selectedTarget,
        targetType: form.target_type,
        totalKg,
        totalCost: costPlan.totalCost,
        costPerSubject: costPlan.totalCost / Math.max(1, subjects),
        costPerSubjectDay: costPlan.totalCost / Math.max(1, subjects),
        subjects,
        days: 1,
        dailyKg: totalKg / Math.max(1, subjects),
        date: form.date,
        source_module: 'elevage',
        notes: form.notes || `Distribution depuis Élevage · ${totalKg} kg`,
      }, handlers);
      toast.success(`Distribution enregistrée · ${fmtNumber(totalKg)} kg · ${fmtCurrency(costPlan.totalCost)}`);
      setForm((prev) => ({ ...prev, kg: '', notes: '' }));
    });
  };

  if (!foodStocks.length) {
    return <p className="text-sm text-amber-800 rounded-xl border border-amber-200 bg-amber-50 p-4">Aucun stock aliment disponible. Réapprovisionner via Achats & Stock.</p>;
  }

  return (
    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
      <div>
        <p className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><Calculator size={20} /> Distribution aliment</p>
        <p className="text-sm text-[#8a7456] mt-1">Saisie métier dans l’Élevage — retrait physique et coût gérés par le stock.</p>
      </div>
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-6 gap-2 rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-3">
        <Field label="Aliment (stock)">
          <Select value={form.stock_id} onChange={(e) => setForm((p) => ({ ...p, stock_id: e.target.value }))}>
            {foodStocks.map((s) => <option key={s.id} value={s.id}>{s.produit} · {fmtNumber(s.quantite)} {s.unite}</option>)}
          </Select>
        </Field>
        <Field label="Cible">
          <Select value={form.target_type} onChange={(e) => setForm((p) => ({ ...p, target_type: e.target.value, target_id: '' }))}>
            <option value="lot">Lot avicole</option>
            <option value="animal">Animal</option>
          </Select>
        </Field>
        <Field label="Lot / animal">
          <Select value={form.target_id} onChange={(e) => setForm((p) => ({ ...p, target_id: e.target.value }))}>
            <option value="">Choisir</option>
            {targetRows.map((r) => <option key={r.id} value={r.id}>{form.target_type === 'lot' ? lotLabel(r) : animalLabel(r)}</option>)}
          </Select>
        </Field>
        <Field label="Kg distribués">
          <Input type="number" step="0.1" min="0" value={form.kg} onChange={(e) => setForm((p) => ({ ...p, kg: e.target.value }))} placeholder={fmtNumber(plan.totalKg)} />
        </Field>
        <Field label="Date"><Input type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} /></Field>
        <div className="flex items-end">
          <button type="submit" disabled={workflowBusy} className="w-full rounded-xl bg-[#2f2415] text-white px-3 py-2 text-sm font-black disabled:opacity-60">
            <CheckCircle2 size={14} className="inline" /> {workflowBusy ? '…' : 'Distribuer'}
          </button>
        </div>
      </form>
      <p className="text-xs text-[#8a7456]">Besoin théorique indicatif : {fmtNumber(plan.totalKg)} kg/jour pour {subjects} sujet(s) ({rule.label}). Coût estimé : {fmtCurrency(plan.totalCost)}.</p>
    </section>
  );
}
