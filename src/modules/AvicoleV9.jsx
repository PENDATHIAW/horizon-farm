import { AlertTriangle, BarChart3, Bird, Edit, HeartPulse, Package, Receipt, Scale, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Bar, BarChart, CartesianGrid, LabelList, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import AvicoleBase from './AvicoleBase.jsx';
import AvicoleHealthBridge from './AvicoleHealthBridge.jsx';
import AvicoleSaleReadinessBridge from './AvicoleSaleReadinessBridge.jsx';
import { fmtNumber, toNumber } from '../utils/format';
import { filterLotsByActivity } from '../utils/avicoleActivity';
import { avicoleActiveCount, avicoleDeadCount, avicoleSickCount } from '../utils/avicoleMetrics';

const safeArray = (value) => Array.isArray(value) ? value : [];
const eggs = (log = {}) => toNumber(log.oeufs_produits ?? log.eggs ?? log.quantity);
const broken = (log = {}) => toNumber(log.oeufs_casses ?? log.broken ?? log.casses);
const losses = avicoleDeadCount;
const sick = avicoleSickCount;
const activeCount = avicoleActiveCount;
const avgWeight = (lot = {}) => toNumber(lot.current_weight ?? lot.poids_moyen_actuel ?? lot.poids_moyen ?? lot.weight ?? lot.poids ?? lot.last_weight);
const readyForSale = (lot = {}) => ['pret_a_la_vente', 'pret_a_vendre_reforme', 'pret_vente', 'ready'].includes(String(lot.status || lot.statut || '').toLowerCase()) || Boolean(lot.pret_vente_recommande);

function openModule(moduleKey) {
  if (!moduleKey || typeof document === 'undefined') return;
  const navButtons = Array.from(document.querySelectorAll('nav button'));
  navButtons.find((button) => button.textContent?.toLowerCase().includes(moduleKey.toLowerCase()))?.click();
}

function LinkCard({ icon: Icon, title, desc, moduleKey }) {
  return (
    <button type="button" onClick={() => openModule(moduleKey)} className="bg-white border border-[#d6c3a0] rounded-2xl p-4 text-left hover:border-[#b6975f] transition-all">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 shrink-0 rounded-xl bg-[#fff3d8] text-[#9a6b12] flex items-center justify-center"><Icon size={18} /></div>
        <div><p className="font-black text-[#2f2415]">{title}</p><p className="text-xs text-[#8a7456] mt-1">{desc}</p></div>
      </div>
    </button>
  );
}

function ActivityHealthCard({ title, rows }) {
  const effectif = rows.reduce((sum, lot) => sum + activeCount(lot), 0);
  const totalLosses = rows.reduce((sum, lot) => sum + losses(lot), 0);
  const totalSick = rows.reduce((sum, lot) => sum + sick(lot), 0);
  const initialEquivalent = effectif + totalLosses;
  const rate = initialEquivalent > 0 ? (totalLosses / initialEquivalent) * 100 : 0;
  return (
    <div className="bg-white border border-[#d6c3a0] rounded-2xl p-4">
      <p className="text-xs uppercase tracking-wide text-[#8a7456]">{title}</p>
      <p className="text-xl font-black text-[#2f2415] mt-1">{fmtNumber(effectif)} actifs</p>
      <p className="text-sm text-[#7d6a4a] mt-1">{fmtNumber(totalLosses)} morts · {fmtNumber(totalSick)} malades · mortalité {rate.toFixed(1)}%</p>
    </div>
  );
}

function HealthAndLinks({ rows = [] }) {
  const chair = filterLotsByActivity(rows, 'Chair');
  const pondeuses = filterLotsByActivity(rows, 'Pondeuse');
  const alerts = [...chair, ...pondeuses].filter((lot) => losses(lot) > 0 || sick(lot) > 0).slice(0, 6);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <LinkCard icon={Receipt} title="Ventes" desc="Opportunités et ventes avicoles" moduleKey="Ventes" />
        <LinkCard icon={Package} title="Stock alimentation" desc="Aliment, réserve et seuils" moduleKey="Stock" />
        <LinkCard icon={HeartPulse} title="Santé" desc="Vaccins, soins et mortalité" moduleKey="Sante" />
        <LinkCard icon={Scale} title="Finances" desc="Coûts et rentabilité" moduleKey="Finances" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <ActivityHealthCard title="Poulets de chair" rows={chair} />
        <ActivityHealthCard title="Pondeuses" rows={pondeuses} />
      </div>
      {alerts.length ? (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4">
          <p className="text-amber-700 font-semibold mb-3 flex items-center gap-2"><AlertTriangle size={16} />Alertes sanitaires avicoles</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {alerts.map((lot) => <div key={lot.id} className="bg-white border border-[#d6c3a0] rounded-xl px-3 py-2 text-sm text-[#7d6a4a]"><span className="font-semibold text-[#2f2415]">{lot.name || lot.id}</span> — {fmtNumber(losses(lot))} mort(s), {fmtNumber(sick(lot))} malade(s).</div>)}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function EggLogEditModal({ log, lotName, onClose, onSave, saving }) {
  const [form, setForm] = useState(() => ({
    oeufs_produits: eggs(log),
    oeufs_casses: broken(log),
    notes: log?.notes || '',
  }));
  if (!log) return null;
  const produced = toNumber(form.oeufs_produits);
  const brokenCount = Math.max(0, toNumber(form.oeufs_casses));
  const sellable = Math.max(0, produced - brokenCount);
  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const submit = () => {
    if (produced <= 0) return toast.error('Saisir un nombre d’œufs supérieur à 0');
    if (brokenCount > produced) return toast.error('Les casses ne peuvent pas dépasser les œufs ramassés');
    onSave({ ...log, oeufs_produits: produced, oeufs_casses: brokenCount, oeufs_vendables: sellable, notes: form.notes });
  };
  return (
    <div className="fixed inset-0 z-[80] bg-black/40 p-4 flex items-center justify-center">
      <div className="w-full max-w-lg rounded-2xl bg-[#fffdf8] border border-[#d6c3a0] shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-[#eadcc2] flex items-start justify-between gap-3">
          <div><p className="text-xs uppercase tracking-widest text-[#8a7456]">Ramassage œufs</p><h3 className="text-xl font-black text-[#2f2415]">Modifier le relevé</h3><p className="text-sm text-[#8a7456] mt-1">{log.date} · {lotName}</p></div>
          <button type="button" onClick={onClose} className="text-[#8a7456]"><X size={18} /></button>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="space-y-1"><span className="text-xs text-[#8a7456]">Œufs ramassés</span><input type="number" className="w-full rounded-lg border border-[#d6c3a0] bg-white px-3 py-2 text-sm" value={form.oeufs_produits} onChange={(e) => set('oeufs_produits', e.target.value)} /></label>
          <label className="space-y-1"><span className="text-xs text-[#8a7456]">Œufs cassés / abîmés</span><input type="number" className="w-full rounded-lg border border-[#d6c3a0] bg-white px-3 py-2 text-sm" value={form.oeufs_casses} onChange={(e) => set('oeufs_casses', e.target.value)} /></label>
          <div className="md:col-span-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">Œufs vendables calculés : <b>{fmtNumber(sellable)}</b></div>
          <label className="space-y-1 md:col-span-2"><span className="text-xs text-[#8a7456]">Notes</span><textarea rows={3} className="w-full rounded-lg border border-[#d6c3a0] bg-white px-3 py-2 text-sm" value={form.notes} onChange={(e) => set('notes', e.target.value)} /></label>
        </div>
        <div className="p-4 border-t border-[#eadcc2] flex justify-end gap-2"><button type="button" className="px-4 py-2 rounded-xl border border-[#d6c3a0]" onClick={onClose}>Annuler</button><button type="button" disabled={saving} className="px-4 py-2 rounded-xl bg-[#c9a96a] text-white font-bold disabled:opacity-60" onClick={submit}>{saving ? 'Enregistrement...' : 'Enregistrer'}</button></div>
      </div>
    </div>
  );
}

function LastEggEntries({ logs = [], lots = [], onUpdateProduction, onDeleteProduction, onRefreshProduction }) {
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const lotById = new Map(lots.map((lot) => [lot.id, lot]));
  const rows = safeArray(logs)
    .filter((log) => eggs(log) > 0 || broken(log) > 0)
    .slice()
    .sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(b.id || '').localeCompare(String(a.id || '')))
    .slice(0, 6);
  const lotNameFor = (log = {}) => log.lot_name || lotById.get(log.lot_id)?.name || log.lot_id || 'Lot';
  const saveEdit = async (nextLog) => {
    if (!nextLog?.id || !onUpdateProduction) return toast.error('Modification relevé indisponible');
    try {
      setSaving(true);
      await onUpdateProduction(nextLog.id, nextLog);
      await onRefreshProduction?.();
      toast.success('Relevé œufs modifié');
      setEditing(null);
    } catch (error) {
      toast.error(error.message || 'Modification relevé impossible');
    } finally {
      setSaving(false);
    }
  };
  const deleteLog = async (log) => {
    if (!log?.id || !onDeleteProduction) return toast.error('Suppression relevé indisponible');
    if (!window.confirm('Supprimer ce relevé œufs ?')) return;
    try {
      await onDeleteProduction(log.id);
      await onRefreshProduction?.();
      toast.success('Relevé œufs supprimé');
    } catch (error) {
      toast.error(error.message || 'Suppression relevé impossible');
    }
  };
  if (!rows.length) {
    return <div className="bg-white border border-[#d6c3a0] rounded-2xl p-4 text-sm text-[#8a7456]"><b className="text-[#2f2415]">Derniers relevés œufs</b><br />Aucun relevé œufs utile. Les anciennes lignes à 0 sont ignorées.</div>;
  }
  return (
    <div className="bg-white border border-[#d6c3a0] rounded-2xl p-4">
      <EggLogEditModal log={editing} lotName={lotNameFor(editing)} onClose={() => setEditing(null)} onSave={saveEdit} saving={saving} />
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-[#fff3d8] text-[#9a6b12] flex items-center justify-center"><Bird size={18} /></div>
        <div>
          <p className="font-black text-[#2f2415]">Derniers relevés œufs</p>
          <p className="text-xs text-[#8a7456]">Dernières saisies pour vérifier les remontées de ponte.</p>
        </div>
      </div>
      <div className="overflow-x-auto border border-[#d6c3a0] rounded-xl">
        <table className="w-full min-w-[680px] text-sm">
          <thead><tr className="bg-[#fffdf8] border-b border-[#d6c3a0]"><th className="text-left px-3 py-2 text-xs text-[#8a7456]">Date</th><th className="text-left px-3 py-2 text-xs text-[#8a7456]">Lot</th><th className="text-left px-3 py-2 text-xs text-[#8a7456]">Œufs</th><th className="text-left px-3 py-2 text-xs text-[#8a7456]">Casses</th><th className="text-left px-3 py-2 text-xs text-[#8a7456]">Vendables</th><th className="text-right px-3 py-2 text-xs text-[#8a7456]">Actions</th></tr></thead>
          <tbody>{rows.map((log) => <tr key={log.id || `${log.date}-${log.lot_id}-${eggs(log)}`} className="border-b border-[#d6c3a0]/50"><td className="px-3 py-2 text-[#2f2415]">{log.date}</td><td className="px-3 py-2 text-[#2f2415] font-semibold">{lotNameFor(log)}</td><td className="px-3 py-2 text-[#2f2415]">{fmtNumber(eggs(log))}</td><td className="px-3 py-2 text-[#2f2415]">{fmtNumber(broken(log))}</td><td className="px-3 py-2 text-emerald-600 font-semibold">{fmtNumber(Math.max(0, eggs(log) - broken(log)))}</td><td className="px-3 py-2 text-right"><button type="button" className="inline-flex mr-2 text-[#8a7456] hover:text-[#2f2415]" title="Modifier" onClick={() => setEditing(log)}><Edit size={16} /></button><button type="button" className="inline-flex text-red-600 hover:text-red-800" title="Supprimer" onClick={() => deleteLog(log)}><Trash2 size={16} /></button></td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}

function toDate(value) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function monthKey(value) {
  const date = toDate(value);
  if (!date) return 'Sans date';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key) {
  if (key === 'Sans date') return key;
  const [year, month] = key.split('-');
  return `${month}/${String(year).slice(-2)}`;
}

function ChartCard({ title, subtitle, children }) {
  return <div className="bg-white border border-[#d6c3a0] rounded-2xl p-4"><div className="mb-3"><p className="font-black text-[#2f2415] flex items-center gap-2"><BarChart3 size={16} />{title}</p><p className="text-xs text-[#8a7456] mt-1">{subtitle}</p></div><div className="h-72">{children}</div></div>;
}

function SmallMetric({ label, value, hint }) {
  return <div className="bg-[#fffdf8] border border-[#d6c3a0] rounded-xl p-3"><p className="text-xs text-[#8a7456]">{label}</p><p className="text-xl font-black text-[#2f2415] mt-1">{value}</p>{hint ? <p className="text-[11px] text-[#8a7456] mt-1">{hint}</p> : null}</div>;
}

function NumberLabel({ x, y, value }) {
  if (!value) return null;
  return <text x={x} y={y - 6} textAnchor="middle" fontSize={11} fill="#2f2415">{fmtNumber(value)}</text>;
}

function WeightLabel({ x, y, value }) {
  if (!value) return null;
  return <text x={x} y={y - 6} textAnchor="middle" fontSize={11} fill="#2f2415">{Number(value).toFixed(2)}</text>;
}

function AvicoleEvolution({ rows = [], productionLogs = [] }) {
  const data = useMemo(() => {
    const pondeuses = filterLotsByActivity(rows, 'Pondeuse');
    const chair = filterLotsByActivity(rows, 'Chair');
    const pondeuseIds = new Set(pondeuses.map((lot) => String(lot.id)));
    const activePondeuses = pondeuses.reduce((sum, lot) => sum + activeCount(lot), 0);
    const ponteMap = new Map();
    safeArray(productionLogs).forEach((log) => {
      if (log.lot_id && pondeuseIds.size && !pondeuseIds.has(String(log.lot_id))) return;
      const produced = eggs(log);
      const casse = broken(log);
      if (produced <= 0 && casse <= 0) return;
      const key = monthKey(log.date || log.created_at || log.updated_at);
      if (!ponteMap.has(key)) ponteMap.set(key, { key, mois: monthLabel(key), oeufs: 0, casses: 0, vendables: 0, dates: new Set() });
      const bucket = ponteMap.get(key);
      bucket.oeufs += produced;
      bucket.casses += casse;
      bucket.vendables += Math.max(0, produced - casse);
      if (log.date) bucket.dates.add(String(log.date));
    });
    const ponte = [...ponteMap.values()]
      .sort((a, b) => a.key.localeCompare(b.key))
      .map((item) => {
        const days = Math.max(1, item.dates.size || 1);
        const pondRate = activePondeuses > 0 ? (item.oeufs / (activePondeuses * days)) * 100 : 0;
        return { ...item, jours: days, taux_ponte: Number(pondRate.toFixed(1)) };
      });
    const chairLots = chair.map((lot) => ({
      id: lot.id,
      lot: lot.name || lot.nom || lot.id,
      actifs: activeCount(lot),
      morts: losses(lot),
      malades: sick(lot),
      poids: avgWeight(lot),
      pret: readyForSale(lot) ? 1 : 0,
    })).filter((lot) => lot.actifs > 0 || lot.morts > 0 || lot.poids > 0).slice(0, 8);
    const totalEggs = ponte.reduce((sum, row) => sum + row.oeufs, 0);
    const totalBroken = ponte.reduce((sum, row) => sum + row.casses, 0);
    const totalSellable = ponte.reduce((sum, row) => sum + row.vendables, 0);
    const totalChairActive = chair.reduce((sum, lot) => sum + activeCount(lot), 0);
    const totalChairDead = chair.reduce((sum, lot) => sum + losses(lot), 0);
    const avgChairWeight = chair.length ? chair.reduce((sum, lot) => sum + avgWeight(lot), 0) / Math.max(1, chair.filter((lot) => avgWeight(lot) > 0).length || chair.length) : 0;
    return { pondeuses, chair, ponte, chairLots, totalEggs, totalBroken, totalSellable, totalChairActive, totalChairDead, avgChairWeight, activePondeuses, readyChairLots: chair.filter(readyForSale).length };
  }, [rows, productionLogs]);

  const hasPonte = data.ponte.length > 0;
  const hasChair = data.chairLots.length > 0;
  return (
    <div className="space-y-4">
      <div className="bg-white border border-[#d6c3a0] rounded-2xl p-4">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[#fff3d8] text-[#9a6b12] flex items-center justify-center"><BarChart3 size={18} /></div>
          <div>
            <p className="font-black text-[#2f2415]">Évolution avicole</p>
            <p className="text-xs text-[#8a7456] mt-1">Lecture séparée ponte et chair : production, pertes, effectif, mortalité, poids et lots prêts.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          <SmallMetric label="Pondeuses actives" value={fmtNumber(data.activePondeuses)} hint="lots pondeuses" />
          <SmallMetric label="Œufs ramassés" value={fmtNumber(data.totalEggs)} hint="données réelles" />
          <SmallMetric label="Œufs vendables" value={fmtNumber(data.totalSellable)} hint="œufs - casses" />
          <SmallMetric label="Chair active" value={fmtNumber(data.totalChairActive)} hint="effectif vivant" />
          <SmallMetric label="Mortalité chair" value={fmtNumber(data.totalChairDead)} hint="morts déclarés" />
          <SmallMetric label="Lots prêts" value={fmtNumber(data.readyChairLots)} hint="vente/reforme" />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ChartCard title="Ponte — œufs, casses et vendables" subtitle="Évolution mensuelle avec étiquettes visibles. Les lignes à zéro sont ignorées.">
          {hasPonte ? <ResponsiveContainer width="100%" height="100%"><BarChart data={data.ponte} margin={{ top: 24, right: 16, left: 8, bottom: 8 }}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="mois" /><YAxis /><Tooltip /><Legend /><Bar dataKey="oeufs" name="Œufs ramassés"><LabelList content={<NumberLabel />} /></Bar><Bar dataKey="vendables" name="Œufs vendables"><LabelList content={<NumberLabel />} /></Bar><Bar dataKey="casses" name="Casses / pertes"><LabelList content={<NumberLabel />} /></Bar></BarChart></ResponsiveContainer> : <p className="text-sm text-[#8a7456]">Aucune donnée de ponte datée disponible.</p>}
        </ChartCard>

        <ChartCard title="Ponte — taux estimé" subtitle="Œufs ramassés / pondeuses actives / jours de relevé. Sert à voir la tendance, pas à remplacer l’analyse terrain.">
          {hasPonte ? <ResponsiveContainer width="100%" height="100%"><LineChart data={data.ponte} margin={{ top: 24, right: 16, left: 8, bottom: 8 }}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="mois" /><YAxis tickFormatter={(v) => `${v}%`} /><Tooltip formatter={(value) => `${value}%`} /><Legend /><Line type="monotone" dataKey="taux_ponte" name="Taux de ponte estimé" strokeWidth={3}><LabelList dataKey="taux_ponte" position="top" formatter={(value) => `${value}%`} /></Line></LineChart></ResponsiveContainer> : <p className="text-sm text-[#8a7456]">Aucun taux de ponte calculable.</p>}
        </ChartCard>

        <ChartCard title="Chair — effectif et mortalité par lot" subtitle="Permet de voir quels lots de chair concentrent les pertes.">
          {hasChair ? <ResponsiveContainer width="100%" height="100%"><BarChart data={data.chairLots} margin={{ top: 24, right: 16, left: 8, bottom: 8 }}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="lot" /><YAxis /><Tooltip /><Legend /><Bar dataKey="actifs" name="Actifs"><LabelList content={<NumberLabel />} /></Bar><Bar dataKey="morts" name="Morts"><LabelList content={<NumberLabel />} /></Bar><Bar dataKey="malades" name="Malades"><LabelList content={<NumberLabel />} /></Bar></BarChart></ResponsiveContainer> : <p className="text-sm text-[#8a7456]">Aucun lot de chair actif ou exploitable.</p>}
        </ChartCard>

        <ChartCard title="Chair — poids moyen par lot" subtitle="À utiliser avec l’objectif 1,5 kg pour confirmer les lots prêts à vendre.">
          {hasChair ? <ResponsiveContainer width="100%" height="100%"><BarChart data={data.chairLots} margin={{ top: 24, right: 16, left: 8, bottom: 8 }}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="lot" /><YAxis /><Tooltip formatter={(value) => `${Number(value || 0).toFixed(2)} kg`} /><Legend /><Bar dataKey="poids" name="Poids moyen kg"><LabelList content={<WeightLabel />} /></Bar></BarChart></ResponsiveContainer> : <p className="text-sm text-[#8a7456]">Aucun poids moyen exploitable pour les lots de chair.</p>}
        </ChartCard>
      </div>
    </div>
  );
}

export default function AvicoleV9(props) {
  return (
    <div className="space-y-6 avicole-mobile-final">
      <style>{`@media (max-width: 640px){.avicole-mobile-final .rounded-2xl{border-radius:18px}.avicole-mobile-final table{font-size:12px}.avicole-mobile-final th,.avicole-mobile-final td{padding-left:10px!important;padding-right:10px!important}.avicole-mobile-final .text-2xl{font-size:1.35rem}.avicole-mobile-final .grid{gap:.75rem}.avicole-mobile-final .overflow-x-auto{max-width:100vw}}`}</style>
      <AvicoleHealthBridge rows={props.rows || []} productionLogs={props.productionLogs || []} alimentationLogs={props.alimentationLogs || []} onUpdate={props.onUpdate} onRefresh={props.onRefresh} />
      <AvicoleSaleReadinessBridge rows={props.rows || []} opportunities={props.opportunities || []} onUpdate={props.onUpdate} onRefresh={props.onRefresh} onCreateOpportunity={props.onCreateOpportunity} onUpdateOpportunity={props.onUpdateOpportunity} onRefreshOpportunities={props.onRefreshOpportunities} onCreateBusinessEvent={props.onCreateBusinessEvent} onRefreshBusinessEvents={props.onRefreshBusinessEvents} />
      <HealthAndLinks rows={props.rows || []} />
      <LastEggEntries logs={props.productionLogs || []} lots={props.rows || []} onUpdateProduction={props.onUpdateProduction} onDeleteProduction={props.onDeleteProduction} onRefreshProduction={props.onRefreshProduction} />
      <AvicoleBase {...props} />
      <AvicoleEvolution rows={props.rows || []} productionLogs={props.productionLogs || []} />
    </div>
  );
}
