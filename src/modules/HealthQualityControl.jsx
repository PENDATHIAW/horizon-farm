import { AlertTriangle, CheckCircle2, HeartPulse, PackageSearch, ReceiptText, Stethoscope } from 'lucide-react';
import { analyzeHealthIntegrity, buildTargetHealthPatch } from '../services/healthIntegrityService';
import { fmtCurrency, fmtNumber } from '../utils/format';

const arr = (value) => Array.isArray(value) ? value : [];
const targetId = (row = {}) => String(row.related_id || row.target_id || row.entity_id || row.animal_id || row.lot_id || '').trim();
const targetModule = (row = {}) => String(row.module_lie || row.target_type || row.entity_type || '').toLowerCase();
const label = (row = {}) => row.nom || row.type_intervention || row.title || row.id || 'Intervention';
const activeIds = (rows = []) => new Set(arr(rows).filter((row) => row?.id).map((row) => String(row.id)));
const isCollectiveTarget = (id = '') => ['ALL_ANIMAUX', 'ANIMAUX_MALADES', 'ALL_AVICOLE_LOTS', 'AVICOLE_MALADES'].includes(String(id));
const isHealthRowStillLinked = (row = {}, animalIds = new Set(), lotIds = new Set()) => {
  const id = targetId(row);
  const module = targetModule(row);
  if (!id || isCollectiveTarget(id)) return true;
  if (module.includes('animal')) return animalIds.has(id);
  if (module.includes('avicole') || module.includes('lot')) return lotIds.has(id);
  return true;
};

function Card({ icon: Icon, label, value, hint, danger = false }) {
  return <div className={`rounded-2xl border p-4 ${danger ? 'border-red-200 bg-red-50' : 'border-[#eadcc2] bg-[#fffdf8]'}`}>
    <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-[#8a7456]"><Icon size={14} /> {label}</p>
    <p className={`mt-2 text-xl font-black ${danger ? 'text-red-600' : 'text-[#2f2415]'}`}>{value}</p>
    {hint ? <p className="mt-1 text-xs text-[#8a7456]">{hint}</p> : null}
  </div>;
}

export default function HealthQualityControl({ rows = [], stocks = [], transactions = [], animaux = [], lots = [], onUpdate, onUpdateAnimal, onUpdateLot, onRefresh, onRefreshAnimals, onRefreshLots }) {
  const animalIds = activeIds(animaux);
  const lotIds = activeIds(lots);
  const linkedRows = arr(rows).filter((row) => isHealthRowStillLinked(row, animalIds, lotIds));
  const audit = analyzeHealthIntegrity({ rows: linkedRows, stocks, transactions, animaux, lots });
  const risky = audit.details.filter((item) => item.issues.length && isHealthRowStillLinked(item.row, animalIds, lotIds)).slice(0, 10);
  const financeMissing = audit.details.filter((item) => item.issues.includes('Finance manquante')).length;
  const targetMissing = audit.details.filter((item) => item.issues.includes('Module cible manquant') || item.issues.includes('Cible collective / non détaillée')).length;
  const late = audit.details.filter((item) => item.issues.includes('Intervention en retard')).length;
  const duplicates = audit.details.filter((item) => item.issues.includes('Doublon potentiel')).length;

  const fixTargetStatus = async (item) => {
    const row = item.row;
    const patch = buildTargetHealthPatch(row);
    if (!patch) return;
    const module = targetModule(row);
    const id = targetId(row);
    if (module.includes('animal') && animalIds.has(id)) await onUpdateAnimal?.(id, patch);
    else if ((module.includes('avicole') || module.includes('lot')) && lotIds.has(id)) await onUpdateLot?.(id, patch);
    await Promise.allSettled([onRefresh?.(), onRefreshAnimals?.(), onRefreshLots?.()]);
  };

  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
      <div>
        <p className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><Stethoscope size={20} /> Contrôle santé, stock & coûts</p>
        <p className="mt-1 text-sm text-[#8a7456]">Vérifie les soins liés aux cibles encore existantes. Les lots/sujets supprimés sont ignorés.</p>
      </div>
      <div className={`${audit.issueCount ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'} rounded-2xl border px-4 py-3 text-sm font-bold`}>{audit.issueCount ? `${audit.issueCount} intervention(s) à vérifier` : 'Santé cohérente'}</div>
    </div>

    <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
      <Card icon={HeartPulse} label="Coût santé" value={fmtCurrency(audit.totalCost)} />
      <Card icon={ReceiptText} label="Finance manquante" value={financeMissing} danger={financeMissing > 0} />
      <Card icon={PackageSearch} label="Stocks critiques" value={audit.stockRisks.length} danger={audit.stockRisks.length > 0} />
      <Card icon={AlertTriangle} label="Retards" value={late} danger={late > 0} />
      <Card icon={AlertTriangle} label="Doublons" value={duplicates} danger={duplicates > 0} />
      <Card icon={Stethoscope} label="Cibles à préciser" value={targetMissing} danger={targetMissing > 0} />
    </div>

    {audit.stockRisks.length ? <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"><b>Stocks santé critiques :</b> {audit.stockRisks.map((s) => `${s.produit || s.nom || s.id} (${fmtNumber(s.quantite)} ${s.unite || ''})`).join(' · ')}</div> : null}

    {risky.length ? <div className="overflow-x-auto rounded-2xl border border-[#eadcc2]">
      <table className="min-w-full text-sm">
        <thead><tr className="border-b border-[#eadcc2] bg-[#fffdf8] text-left text-xs uppercase text-[#8a7456]"><th className="py-2 px-3">Intervention</th><th className="py-2 px-3">Cible</th><th className="py-2 px-3">Date</th><th className="py-2 px-3">Coût</th><th className="py-2 px-3">À vérifier</th><th className="py-2 px-3">Action</th></tr></thead>
        <tbody>{risky.map((item) => <tr key={item.row.id} className="border-b border-[#f0e5d0]"><td className="py-3 px-3 font-bold text-[#2f2415]">{label(item.row)}<p className="text-xs text-[#8a7456]">{item.row.id}</p></td><td className="py-3 px-3">{item.row.module_lie || '—'}<p className="text-xs text-[#8a7456]">{targetId(item.row) || 'non liée'}</p></td><td className="py-3 px-3">{item.row.effectuee || item.row.prevue || item.row.date || '—'}</td><td className="py-3 px-3 font-bold">{fmtCurrency(item.cost)}</td><td className="py-3 px-3"><div className="flex flex-wrap gap-1">{item.issues.map((issue) => <span key={issue} className="rounded-full bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700">{issue}</span>)}</div></td><td className="py-3 px-3">{item.issues.includes('Cible encore malade') ? <button type="button" onClick={() => fixTargetStatus(item)} className="rounded-xl bg-[#2f2415] px-3 py-2 text-xs font-bold text-white"><CheckCircle2 size={14} className="inline" /> Mettre sous surveillance</button> : '—'}</td></tr>)}</tbody>
      </table>
    </div> : <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 size={16} className="inline" /> Aucune incohérence critique détectée sur les cibles santé existantes.</div>}
  </section>;
}
