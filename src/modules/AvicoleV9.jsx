import { AlertTriangle, Bird, Edit, HeartPulse, Package, Receipt, Scale, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
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

export default function AvicoleV9(props) {
  return (
    <div className="space-y-6 avicole-mobile-final">
      <style>{`@media (max-width: 640px){.avicole-mobile-final .rounded-2xl{border-radius:18px}.avicole-mobile-final table{font-size:12px}.avicole-mobile-final th,.avicole-mobile-final td{padding-left:10px!important;padding-right:10px!important}.avicole-mobile-final .text-2xl{font-size:1.35rem}.avicole-mobile-final .grid{gap:.75rem}.avicole-mobile-final .overflow-x-auto{max-width:100vw}}`}</style>
      <AvicoleHealthBridge rows={props.rows || []} productionLogs={props.productionLogs || []} alimentationLogs={props.alimentationLogs || []} onUpdate={props.onUpdate} onRefresh={props.onRefresh} />
      <AvicoleSaleReadinessBridge rows={props.rows || []} opportunities={props.opportunities || []} onUpdate={props.onUpdate} onRefresh={props.onRefresh} onCreateOpportunity={props.onCreateOpportunity} onUpdateOpportunity={props.onUpdateOpportunity} onRefreshOpportunities={props.onRefreshOpportunities} onCreateBusinessEvent={props.onCreateBusinessEvent} onRefreshBusinessEvents={props.onRefreshBusinessEvents} />
      <HealthAndLinks rows={props.rows || []} />
      <LastEggEntries logs={props.productionLogs || []} lots={props.rows || []} onUpdateProduction={props.onUpdateProduction} onDeleteProduction={props.onDeleteProduction} onRefreshProduction={props.onRefreshProduction} />
      <AvicoleBase {...props} />
    </div>
  );
}
