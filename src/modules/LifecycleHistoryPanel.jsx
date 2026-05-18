import { AlertTriangle, CheckCircle2, History, PackageCheck } from 'lucide-react';
import useCrudModule from '../hooks/useCrudModule';
import { buildLifecycleHistory } from '../services/lifecycleHistoryService';
import { fmtCurrency, fmtNumber, toNumber } from '../utils/format';

const arr = (value) => Array.isArray(value) ? value : [];
const effective = (provided, fallback) => arr(provided).length ? provided : fallback;
const labelOf = (row = {}) => row.name || row.nom || row.tag || row.boucle_numero || row.type || row.id || 'Sujet';
const clean = (value) => String(value || '').trim().toLowerCase();
const physicalIdOf = (row = {}) => row.boucle_numero || row.qr_code || row.tag || row.id;
const typeLabel = (type = '') => ({
  entrée_initiale: 'Entrée initiale',
  vente: 'Vente',
  livraison: 'Livraison',
  perte: 'Perte',
  abattage_transformation: 'Abattage / transformation',
  ajustement: 'Ajustement',
  récolte: 'Récolte',
  événement: 'Événement',
}[type] || type);

function linkedValue(row = {}) {
  return String(row.lot_id || row.animal_id || row.culture_id || row.source_id || row.source_record_id || row.entity_id || row.related_id || row.target_id || row.cible_id || '');
}

function hasTargetLink(row = {}, targets = []) {
  if (!targets.length) return false;
  const linked = linkedValue(row);
  if (linked && targets.some((target) => String(target.id) === linked || String(physicalIdOf(target)) === linked)) return true;
  const text = clean(`${row.libelle || ''} ${row.title || ''} ${row.description || ''} ${row.notes || ''} ${row.product_name || ''} ${row.nom || ''}`);
  return targets.some((target) => {
    const id = clean(target.id);
    const code = clean(physicalIdOf(target));
    return Boolean(id && text.includes(id)) || Boolean(code && text.includes(code));
  });
}

function Mini({ icon: Icon, label, value, danger = false }) {
  return <div className={`rounded-2xl border p-4 ${danger ? 'border-red-200 bg-red-50' : 'border-[#eadcc2] bg-[#fffdf8]'}`}>
    <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-[#8a7456]"><Icon size={14} /> {label}</p>
    <p className={`mt-2 text-xl font-black ${danger ? 'text-red-600' : 'text-[#2f2415]'}`}>{value}</p>
  </div>;
}

export default function LifecycleHistoryPanel({ mode = 'avicole', rows = [], salesOrders = [], deliveries = [], businessEvents = [] }) {
  const salesCrud = useCrudModule('sales_orders');
  const deliveriesCrud = useCrudModule('deliveries');
  const targets = arr(rows).filter((row) => row?.id);
  const sales = effective(salesOrders, salesCrud.rows).filter((sale) => hasTargetLink(sale, targets));
  const deliveryRows = effective(deliveries, deliveriesCrud.rows).filter((delivery) => hasTargetLink(delivery, targets));
  const linkedEvents = arr(businessEvents).filter((event) => hasTargetLink(event, targets));
  const histories = targets.map((target) => ({ target, history: buildLifecycleHistory({ mode, target, salesOrders: sales, deliveries: deliveryRows, businessEvents: linkedEvents }) }));
  const totalInitial = histories.reduce((sum, item) => sum + item.history.initial, 0);
  const totalActive = histories.reduce((sum, item) => sum + item.history.active, 0);
  const totalExited = histories.reduce((sum, item) => sum + item.history.exited, 0);
  const toClose = histories.filter((item) => item.history.needsClosure).length;
  const mismatch = histories.filter((item) => item.history.mismatch).length;
  const title = mode === 'cultures' ? 'Historique cycle cultures' : mode === 'animaux' ? 'Historique cheptel' : 'Historique effectif lots';

  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
      <div>
        <p className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><History size={20} /> {title}</p>
        <p className="mt-1 text-sm text-[#8a7456]">Retrace les entrées, ventes, sorties, pertes, transformations et clôtures pour expliquer l’effectif restant.</p>
      </div>
      <div className={`${toClose || mismatch ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'} rounded-2xl border px-4 py-3 text-sm font-bold`}>
        {toClose || mismatch ? `${toClose + mismatch} point(s) à traiter` : 'Cycles cohérents'}
      </div>
    </div>

    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      <Mini icon={PackageCheck} label="Initial" value={fmtNumber(totalInitial)} />
      <Mini icon={PackageCheck} label="Sorties cumulées" value={fmtNumber(totalExited)} />
      <Mini icon={PackageCheck} label="Actif actuel" value={fmtNumber(totalActive)} />
      <Mini icon={AlertTriangle} label="À clôturer" value={toClose} danger={toClose > 0} />
      <Mini icon={AlertTriangle} label="Écarts historique" value={mismatch} danger={mismatch > 0} />
    </div>

    {!histories.length ? <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-sm text-[#8a7456]">Aucune cible active dans ce module. Les anciens logs orphelins ne sont pas repris dans les calculs.</div> : null}

    <div className="space-y-3">
      {histories.slice(0, 8).map(({ target, history }) => <div key={target.id} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 p-4 border-b border-[#eadcc2]">
          <div>
            <p className="font-black text-[#2f2415]">{labelOf(target)}</p>
            <p className="text-xs text-[#8a7456]">Initial {fmtNumber(history.initial)} · sorties {fmtNumber(history.exited)} · actif {fmtNumber(history.active)} · reste théorique {fmtNumber(history.theoreticalRemaining)}</p>
            {history.mismatch || history.needsClosure ? <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">{history.recommendation}</p> : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {history.needsClosure ? <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-bold text-purple-700">À clôturer</span> : null}
            {history.mismatch ? <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">Écart historique</span> : null}
            {!history.needsClosure && !history.mismatch ? <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700"><CheckCircle2 size={13} className="inline" /> OK</span> : null}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead><tr className="border-b border-[#eadcc2] bg-white text-left text-xs uppercase text-[#8a7456]"><th className="py-2 px-3">Date</th><th className="py-2 px-3">Mouvement</th><th className="py-2 px-3">Variation</th><th className="py-2 px-3">Reste</th><th className="py-2 px-3">Montant</th><th className="py-2 px-3">Source</th></tr></thead>
            <tbody>{history.events.length ? history.events.slice(-6).map((event) => <tr key={`${target.id}-${event.id}-${event.type}`} className="border-b border-[#f0e5d0]"><td className="py-2 px-3">{event.date || '—'}</td><td className="py-2 px-3 font-bold text-[#2f2415]">{typeLabel(event.type)}<p className="text-xs text-[#8a7456]">{event.label}</p></td><td className={`py-2 px-3 font-bold ${toNumber(event.delta) < 0 ? 'text-red-600' : 'text-emerald-700'}`}>{toNumber(event.delta) > 0 ? '+' : ''}{fmtNumber(event.delta)}</td><td className="py-2 px-3">{fmtNumber(event.remaining)}</td><td className="py-2 px-3">{event.amount ? fmtCurrency(event.amount) : '—'}</td><td className="py-2 px-3 text-[#8a7456]">{event.source}</td></tr>) : <tr><td colSpan="6" className="py-4 px-3 text-center text-[#8a7456]">Aucun mouvement historique détecté.</td></tr>}</tbody>
          </table>
        </div>
      </div>)}
    </div>
  </section>;
}
