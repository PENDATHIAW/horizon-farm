import { AlertTriangle, Bird, HeartPulse, Package, Receipt, Scale } from 'lucide-react';
import AvicoleBase from './AvicoleBase.jsx';
import AvicoleHealthBridge from './AvicoleHealthBridge.jsx';
import AvicoleSaleReadinessBridge from './AvicoleSaleReadinessBridge.jsx';
import { fmtNumber, toNumber } from '../utils/format';
import { filterLotsByActivity } from '../utils/avicoleActivity';

const safeArray = (value) => Array.isArray(value) ? value : [];
const eggs = (log = {}) => toNumber(log.oeufs_produits ?? log.eggs ?? log.quantity);
const broken = (log = {}) => toNumber(log.oeufs_casses ?? log.broken ?? log.casses);
const losses = (lot = {}) => toNumber(lot.mortality ?? lot.morts ?? lot.pertes ?? 0);
const sick = (lot = {}) => toNumber(lot.malades ?? lot.sick_count ?? lot.malade_count ?? 0);
const activeCount = (lot = {}) => Math.max(0, toNumber(lot.current_count ?? lot.effectif_actuel ?? lot.effectif_vendable ?? lot.initial_count) - losses(lot) - toNumber(lot.vendus) - toNumber(lot.reformes) - toNumber(lot.sorties));

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
  const rate = effectif + totalLosses > 0 ? (totalLosses / (effectif + totalLosses)) * 100 : 0;
  return (
    <div className="bg-white border border-[#d6c3a0] rounded-2xl p-4">
      <p className="text-xs uppercase tracking-wide text-[#8a7456]">{title}</p>
      <p className="text-xl font-black text-[#2f2415] mt-1">{fmtNumber(effectif)} actifs</p>
      <p className="text-sm text-[#7d6a4a] mt-1">{fmtNumber(totalLosses)} morts · {fmtNumber(totalSick)} malades · mortalite {rate.toFixed(1)}%</p>
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
        <LinkCard icon={Receipt} title="Ventes" desc="Opportunites et ventes avicoles" moduleKey="Ventes" />
        <LinkCard icon={Package} title="Stock alimentation" desc="Aliment, reserve et seuils" moduleKey="Stock" />
        <LinkCard icon={HeartPulse} title="Sante" desc="Vaccins, soins et mortalite" moduleKey="Sante" />
        <LinkCard icon={Scale} title="Finances" desc="Couts et rentabilite" moduleKey="Finances" />
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

function LastEggEntries({ logs = [], lots = [] }) {
  const lotById = new Map(lots.map((lot) => [lot.id, lot]));
  const rows = safeArray(logs).slice().sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(b.id || '').localeCompare(String(a.id || ''))).slice(0, 6);
  if (!rows.length) return null;
  return (
    <div className="bg-white border border-[#d6c3a0] rounded-2xl p-4">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-[#fff3d8] text-[#9a6b12] flex items-center justify-center"><Bird size={18} /></div>
        <div>
          <p className="font-black text-[#2f2415]">Derniers relevés œufs</p>
          <p className="text-xs text-[#8a7456]">Dernières saisies pour vérifier les remontées de ponte.</p>
        </div>
      </div>
      <div className="overflow-x-auto border border-[#d6c3a0] rounded-xl">
        <table className="w-full min-w-[560px] text-sm">
          <thead><tr className="bg-[#fffdf8] border-b border-[#d6c3a0]"><th className="text-left px-3 py-2 text-xs text-[#8a7456]">Date</th><th className="text-left px-3 py-2 text-xs text-[#8a7456]">Lot</th><th className="text-left px-3 py-2 text-xs text-[#8a7456]">Œufs</th><th className="text-left px-3 py-2 text-xs text-[#8a7456]">Casses</th><th className="text-left px-3 py-2 text-xs text-[#8a7456]">Vendables</th></tr></thead>
          <tbody>{rows.map((log) => { const lot = lotById.get(log.lot_id); return <tr key={log.id || `${log.date}-${log.lot_id}-${eggs(log)}`} className="border-b border-[#d6c3a0]/50"><td className="px-3 py-2 text-[#2f2415]">{log.date}</td><td className="px-3 py-2 text-[#2f2415] font-semibold">{log.lot_name || lot?.name || log.lot_id}</td><td className="px-3 py-2 text-[#2f2415]">{fmtNumber(eggs(log))}</td><td className="px-3 py-2 text-[#2f2415]">{fmtNumber(broken(log))}</td><td className="px-3 py-2 text-emerald-600 font-semibold">{fmtNumber(Math.max(0, eggs(log) - broken(log)))}</td></tr>; })}</tbody>
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
      <LastEggEntries logs={props.productionLogs || []} lots={props.rows || []} />
      <AvicoleBase {...props} />
    </div>
  );
}
