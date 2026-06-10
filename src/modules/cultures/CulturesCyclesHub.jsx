import { CalendarClock } from 'lucide-react';
import { fmtNumber, toNumber } from '../../utils/format';
import LifecycleHistoryPanel from '../LifecycleHistoryPanel.jsx';
import { getRealCultureRows } from '../CulturesTabActionsBridge.jsx';

const today = () => new Date().toISOString().slice(0, 10);

function daysUntil(date) {
  if (!date) return null;
  const diff = (new Date(date) - new Date()) / 86400000;
  return Number.isFinite(diff) ? Math.ceil(diff) : null;
}

export default function CulturesCyclesHub({ rows = [], salesOrders = [], deliveries = [], businessEvents = [], onNavigate }) {
  const realRows = getRealCultureRows(rows);
  const timeline = realRows
    .flatMap((row) => {
      const events = [];
      if (row.date_semis) events.push({ date: row.date_semis, kind: 'Semis', label: row.nom || row.type, detail: row.parcelle || '—' });
      if (row.date_recolte_prevue) events.push({ date: row.date_recolte_prevue, kind: 'Récolte prévue', label: row.nom || row.type, detail: `${fmtNumber(toNumber(row.quantite_prevue))} ${row.unite_recolte || 'kg'}` });
      if (row.date_fin_campagne || row.statut === 'termine') events.push({ date: row.date_fin_campagne || today(), kind: 'Fin de cycle', label: row.nom || row.type, detail: row.campagne || '—' });
      return events;
    })
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .slice(0, 12);

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm">
        <p className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><CalendarClock size={20} /> Calendrier cultures</p>
        <p className="mt-1 text-sm text-[#8a7456]">
          Semis, traitements, récoltes et fin de cycle — pilotage temporel uniquement (pas de création parcelle ici).
        </p>
        <div className="mt-4 space-y-2">
          {timeline.length ? timeline.map((item, i) => {
            const inDays = daysUntil(item.date);
            return (
              <div key={`${item.date}-${item.kind}-${i}`} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#eadcc2] bg-[#fffdf8] px-3 py-2 text-sm">
                <div>
                  <b className="text-[#2f2415]">{item.kind}</b> · {item.label}
                  <p className="text-xs text-[#8a7456]">{item.detail}</p>
                </div>
                <span className="text-xs font-black text-[#8a7456]">
                  {String(item.date).slice(0, 10)}{inDays != null ? ` · J${inDays >= 0 ? '+' : ''}${inDays}` : ''}
                </span>
              </div>
            );
          }) : <p className="text-sm text-[#8a7456]">Planifiez des dates de semis et récolte sur les fiches cultures (onglet Parcelles & Cultures).</p>}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => onNavigate?.('commercial', { tab: 'Opportunités' })} className="rounded-xl border border-[#eadcc2] px-3 py-2 text-xs font-black text-emerald-800">Prévisions récoltes → Commercial</button>
          <button type="button" onClick={() => onNavigate?.('finance_pilotage', { tab: 'Rentabilité' })} className="rounded-xl border border-[#eadcc2] px-3 py-2 text-xs font-black text-emerald-800">Prévisions revenus → Finance</button>
        </div>
      </section>
      <LifecycleHistoryPanel mode="cultures" rows={rows} salesOrders={salesOrders} deliveries={deliveries} businessEvents={businessEvents} />
    </div>
  );
}
