import { Factory } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import useWorkflowSubmit from '../../hooks/useWorkflowSubmit';
import { fmtCurrency, fmtNumber, toNumber } from '../../utils/format';
import { commitCultureTransformation } from '../../utils/culturesWorkflow.js';

const today = () => new Date().toISOString().slice(0, 10);
const lower = (value = '') => String(value || '').toLowerCase();
const stockQty = (row = {}) => toNumber(row.quantite ?? row.quantity);
const stockLabel = (row = {}) => row.produit || row.name || row.nom || row.id || 'Stock';
const isHarvestStock = (row = {}) => {
  const text = lower(`${row.produit || ''} ${row.categorie || ''} ${row.category || ''}`);
  return text.includes('récolte') || text.includes('recolte') || row.culture_id || row.harvest_record_id || row.stock_key?.startsWith?.('culture-stock');
};

function Field({ label, children }) {
  return <label className="block text-sm"><span className="mb-1 block text-xs font-semibold text-slate">{label}</span>{children}</label>;
}
const inputCls = 'w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-earth';

export default function CulturesTransformationPanel({ stocks = [], context, handlers, onSuccess }) {
  const sourceStocks = useMemo(() => stocks.filter((row) => stockQty(row) > 0 && isHarvestStock(row)), [stocks]);
  const initial = {
    source_stock_id: sourceStocks[0]?.id || '',
    quantite: '',
    produit_fini: '',
    quantite_produit_fini: '',
    unite_produit_fini: 'kg',
    cout_transformation: 0,
    prix_vente_unitaire: '',
    date: today(),
    notes: '',
  };
  const [form, setForm] = useState(initial);
  const { submit: workflowSubmit, busy } = useWorkflowSubmit();
  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const source = sourceStocks.find((row) => row.id === form.source_stock_id);
  const qty = toNumber(form.quantite);
  const transformCost = toNumber(form.cout_transformation);
  const outQty = toNumber(form.quantite_produit_fini);
  const sourceUnitCost = toNumber(source?.cout_revient_unitaire || source?.prix_unitaire);
  const unitCost = outQty > 0 ? ((sourceUnitCost * qty) + transformCost) / outQty : 0;

  const submit = async (e) => {
    e.preventDefault();
    const key = `transform:${form.source_stock_id}:${form.date}:${form.quantite}:${form.produit_fini}`;
    try {
      await workflowSubmit(key, async () => {
        await commitCultureTransformation({
          form: { ...form, culture_id: source?.culture_id },
          context,
          handlers,
        });
        toast.success('Transformation enregistrée - stock produit fini créé');
        setForm({ ...initial, source_stock_id: sourceStocks[0]?.id || '' });
        await onSuccess?.();
      });
    } catch (err) {
      toast.error(err.message || 'Transformation impossible');
    }
  };

  return (
    <section className="rounded-3xl border border-line bg-white p-6 shadow-card space-y-4">
      <div>
        <p className="flex items-center gap-2 text-lg font-semibold text-earth"><Factory size={20} /> Transformation</p>
        <p className="mt-1 text-sm text-slate">Sortie matière première récoltée, entrée produit transformé, coût transformation → Finance.</p>
      </div>
      {!sourceStocks.length ? (
        <p className="rounded-2xl border border-vigilance bg-vigilance-bg p-4 text-sm text-horizon-dark">
          Aucun stock récolte disponible. Enregistrez d&apos;abord une récolte dans le panneau ci-dessus.
        </p>
      ) : (
        <form onSubmit={submit} className="grid grid-cols-1 gap-3 md:grid-cols-6 xl:grid-cols-12 rounded-2xl border border-line bg-card p-4">
          <div className="md:col-span-2">
            <Field label="Matière première (stock)">
              <select className={inputCls} value={form.source_stock_id} onChange={(e) => update('source_stock_id', e.target.value)} required>
                <option value="">Choisir</option>
                {sourceStocks.map((row) => (
                  <option key={row.id} value={row.id}>{stockLabel(row)} · {fmtNumber(stockQty(row))} {row.unite || ''}</option>
                ))}
              </select>
            </Field>
          </div>
          <div className="md:col-span-1"><Field label="Qté sortie"><input type="number" min="0" step="0.01" className={inputCls} value={form.quantite} onChange={(e) => update('quantite', e.target.value)} required /></Field></div>
          <div className="md:col-span-2"><Field label="Produit fini"><input className={inputCls} value={form.produit_fini} onChange={(e) => update('produit_fini', e.target.value)} placeholder="Farine, concentré…" required /></Field></div>
          <div className="md:col-span-1"><Field label="Qté produit fini"><input type="number" min="0" step="0.01" className={inputCls} value={form.quantite_produit_fini} onChange={(e) => update('quantite_produit_fini', e.target.value)} required /></Field></div>
          <div className="md:col-span-1"><Field label="Unité"><select className={inputCls} value={form.unite_produit_fini} onChange={(e) => update('unite_produit_fini', e.target.value)}><option value="kg">kg</option><option value="sac">sac</option><option value="caisse">caisse</option><option value="botte">botte</option><option value="litre">litre</option></select></Field></div>
          <div className="md:col-span-1"><Field label="Coût transformation"><input type="number" className={inputCls} value={form.cout_transformation} onChange={(e) => update('cout_transformation', e.target.value)} /></Field></div>
          <div className="md:col-span-1"><Field label="Prix vente / u."><input type="number" className={inputCls} value={form.prix_vente_unitaire} onChange={(e) => update('prix_vente_unitaire', e.target.value)} /></Field></div>
          <div className="md:col-span-1"><Field label="Date"><input type="date" className={inputCls} value={form.date} onChange={(e) => update('date', e.target.value)} /></Field></div>
          <div className="md:col-span-2 flex items-end"><button type="submit" disabled={busy} className="w-full rounded-xl bg-earth px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? '…' : 'Transformer'}</button></div>
        </form>
      )}
      {sourceStocks.length ? (
        <p className="text-sm text-slate">Coût de revient estimé produit fini : <b>{unitCost ? fmtCurrency(unitCost) : '-'}</b> / {form.unite_produit_fini || 'kg'}</p>
      ) : null}
    </section>
  );
}
