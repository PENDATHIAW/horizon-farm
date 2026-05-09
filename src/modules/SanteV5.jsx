import { AlertTriangle, CheckCircle2, Package, Syringe } from 'lucide-react';
import toast from 'react-hot-toast';
import { fmtCurrency, fmtNumber, toNumber } from '../utils/format';
import { makeId } from '../utils/ids';
import SanteV4 from './SanteV4.jsx';

const arr = (value) => Array.isArray(value) ? value : [];
const today = () => new Date().toISOString().slice(0, 10);
const isHealthStock = (s = {}) => `${s.categorie || ''} ${s.produit || ''}`.toLowerCase().match(/vaccin|médicament|medicament|soin|vermifuge|antibiotique/);
const dueSoon = (v = {}) => {
  if (!v.prevue) return false;
  const days = (new Date(v.prevue) - new Date()) / 86400000;
  return days >= 0 && days <= 7;
};
const late = (v = {}) => String(v.statut || '').toLowerCase() === 'retard' || (v.prevue && !v.effectuee && new Date(v.prevue) < new Date());

async function markDone(v, props) {
  const cost = toNumber(v.cout);
  try {
    await props.onUpdate?.(v.id, { statut: 'fait', effectuee: v.effectuee || today(), closed_at: new Date().toISOString() });
    if (cost > 0) {
      await props.onCreateFinanceTransaction?.({ id: makeId('TRX'), type: 'sortie', libelle: `Soin/Vaccin ${v.nom || v.id}`, montant: cost, date: today(), categorie: 'Sante', module_lie: 'sante', related_id: v.id, statut: 'paye', source_module: 'sante', source_record_id: v.id });
      await props.onRefreshFinances?.();
    }
    toast.success('Soin validé et relié aux finances');
  } catch (error) {
    toast.error(error.message || 'Validation santé impossible');
  }
}

function HealthBridge(props) {
  const vaccins = arr(props.rows);
  const stocks = arr(props.stocks);
  const healthStocks = stocks.filter(isHealthStock);
  const alerts = vaccins.filter((v) => late(v) || dueSoon(v)).slice(0, 6);
  const rupture = healthStocks.filter((s) => toNumber(s.quantite) <= toNumber(s.seuil)).length;
  const costs = vaccins.reduce((sum, v) => sum + toNumber(v.cout), 0);
  return (
    <div className="rounded-2xl border border-[#d6c3a0] bg-white p-5 space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#8a7456]">Priorité 5 · Santé connectée</p>
          <h3 className="font-black text-[#2f2415]">Soins, vaccins, stock santé, alertes et finances</h3>
          <p className="text-sm text-[#8a7456] mt-1">Un soin validé peut créer une dépense Finance. Les stocks santé critiques restent visibles ici.</p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-sm"><Mini icon={Syringe} label="À suivre" value={alerts.length} /><Mini icon={Package} label="Stock santé" value={healthStocks.length} /><Mini icon={AlertTriangle} label="Ruptures" value={rupture} /></div>
      </div>
      {alerts.length ? <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">{alerts.map((v) => <div key={v.id} className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3"><p className="font-bold text-[#2f2415]">{v.nom || v.id}</p><p className="text-xs text-[#8a7456] mt-1">Prévu: {v.prevue || '—'} · coût: {fmtCurrency(v.cout)}</p><button type="button" className="mt-3 text-sm font-bold text-emerald-700" onClick={() => markDone(v, props)}><CheckCircle2 size={14} className="inline" /> Valider fait</button></div>)}</div> : <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3 text-sm text-[#8a7456]"><CheckCircle2 size={14} className="inline" /> Aucun soin urgent.</div>}
      {healthStocks.length ? <p className="text-xs text-[#8a7456]">Stocks santé suivis: {healthStocks.slice(0, 5).map((s) => `${s.produit} (${fmtNumber(s.quantite)} ${s.unite || ''})`).join(' · ')}</p> : null}
      <p className="text-xs text-[#8a7456]">Coût santé total renseigné: {fmtCurrency(costs)}</p>
    </div>
  );
}
function Mini({ icon: Icon, label, value }) { return <div className="rounded-xl bg-[#fffdf8] border border-[#eadcc2] px-3 py-2 min-w-[100px]"><Icon size={14} className="text-[#9a6b12]" /><b className="block text-[#2f2415]">{value}</b><span className="text-xs text-[#8a7456]">{label}</span></div>; }

export default function SanteV5(props) { return <div className="space-y-6"><HealthBridge {...props} /><SanteV4 {...props} /></div>; }
