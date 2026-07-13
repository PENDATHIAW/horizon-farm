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
  réforme: 'Réforme',
  abattage_transformation: 'Abattage / transformation',
  ajustement: 'Ajustement',
  ajustement_à_valider: 'Mouvement à qualifier',
  récolte: 'Récolte',
  événement: 'Événement',
}[type] || type);
const hasReconciliation = (history = {}) => history.needsReconciliation || arr(history.events).some((event) => event.type === 'ajustement_à_valider' || event.status === 'à valider');

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
  return <div className={`rounded-2xl border p-4 ${danger ? 'border-urgent bg-urgent-bg' : 'border-line bg-card'}`}>
    <p className="flex items-center gap-2 text-xs uppercase tracking-normal text-slate"><Icon size={14} /> {label}</p>
    <p className={`mt-2 text-xl font-semibold ${danger ? 'text-urgent' : 'text-earth'}`}>{value}</p>
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
  const totalDeaths = histories.reduce((sum, item) => sum + toNumber(item.history.morts), 0);
  const totalSick = histories.reduce((sum, item) => sum + toNumber(item.history.malades), 0);
  const totalSold = histories.reduce((sum, item) => sum + toNumber(item.history.vendus), 0);
  const toClose = histories.filter((item) => item.history.needsClosure).length;
  const toQualify = histories.filter((item) => hasReconciliation(item.history)).length;
  const title = mode === 'cultures' ? 'Historique cycle cultures' : mode === 'animaux' ? 'Historique cheptel' : 'Historique effectif lots';
  const hasIssues = toClose || toQualify;

  return <section className="rounded-3xl border border-line bg-white p-6 shadow-card space-y-4">
    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
      <div>
        <p className="flex items-center gap-2 text-lg font-semibold text-earth"><History size={20} /> {title}</p>
        <p className="mt-1 text-sm text-slate">Retrace les entrées, ventes, sorties, pertes, transformations et clôtures pour vérifier que l’effectif restant est réellement justifié.</p>
      </div>
      <div className={`${hasIssues ? 'bg-vigilance-bg text-horizon-dark border-vigilance' : 'bg-positive-bg text-positive border-positive'} rounded-2xl border px-4 py-3 text-sm font-semibold`}>
        {hasIssues ? `${toClose + toQualify} point(s) à traiter` : 'Cycles cohérents'}
      </div>
    </div>

    <div className="grid grid-cols-2 lg:grid-cols-7 gap-3">
      <Mini icon={PackageCheck} label="Initial" value={fmtNumber(totalInitial)} />
      <Mini icon={PackageCheck} label="Sorties cumulées" value={fmtNumber(totalExited)} />
      <Mini icon={PackageCheck} label="Actif actuel" value={fmtNumber(totalActive)} />
      <Mini icon={AlertTriangle} label="Morts" value={fmtNumber(totalDeaths)} danger={totalDeaths > 0} />
      <Mini icon={AlertTriangle} label="Malades" value={fmtNumber(totalSick)} danger={totalSick > 0} />
      <Mini icon={PackageCheck} label="Vendus" value={fmtNumber(totalSold)} />
      <Mini icon={AlertTriangle} label="À qualifier" value={toQualify} danger={toQualify > 0} />
    </div>

    {!histories.length ? <div className="rounded-2xl border border-line bg-card p-4 text-sm text-slate">Aucune fiche active dans ce module. Les anciens mouvements sans fiche liée ne sont pas repris dans les calculs.</div> : null}

    <div className="space-y-3">
      {histories.slice(0, 8).map(({ target, history }, index) => {
        const needsQualify = hasReconciliation(history);
        return <div key={`${target.id || 'cycle'}-${index}`} className={`rounded-2xl border overflow-hidden ${needsQualify ? 'border-vigilance bg-vigilance-bg' : 'border-line bg-card'}`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 p-4 border-b border-line">
            <div>
              <p className="font-semibold text-earth">{labelOf(target)}</p>
              <p className="text-xs text-slate">Initial {fmtNumber(history.initial)} · sorties {fmtNumber(history.exited)} · morts {fmtNumber(history.morts)} · malades {fmtNumber(history.malades)} · vendus {fmtNumber(history.vendus)} · actif {fmtNumber(history.active)}</p>
              {needsQualify || history.needsClosure ? <p className="mt-2 rounded-xl border border-vigilance bg-vigilance-bg px-3 py-2 text-xs font-semibold text-horizon-dark">{history.recommendation}</p> : null}
            </div>
            <div className="flex flex-wrap gap-2">
              {history.needsClosure ? <span className="rounded-full bg-neutral-bg px-3 py-1 text-xs font-semibold text-neutral">À clôturer</span> : null}
              {needsQualify ? <span className="rounded-full bg-vigilance-bg px-3 py-1 text-xs font-semibold text-horizon-dark">Mouvement à qualifier</span> : null}
              {!history.needsClosure && !needsQualify ? <span className="rounded-full bg-positive-bg px-3 py-1 text-xs font-semibold text-positive"><CheckCircle2 size={13} className="inline" /> OK</span> : null}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead><tr className="border-b border-line bg-white text-left text-xs uppercase text-slate"><th className="py-2 px-3">Date</th><th className="py-2 px-3">Mouvement</th><th className="py-2 px-3">Variation</th><th className="py-2 px-3">Reste</th><th className="py-2 px-3">Montant</th><th className="py-2 px-3">Source</th><th className="py-2 px-3">Statut</th></tr></thead>
              <tbody>{history.events.length ? history.events.slice(-8).map((event) => <tr key={`${target.id}-${event.id}-${event.type}`} className={`border-b border-line ${event.type === 'ajustement_à_valider' ? 'bg-vigilance-bg' : ''}`}><td className="py-2 px-3">{event.date || '—'}</td><td className="py-2 px-3 font-semibold text-earth">{typeLabel(event.type)}<p className="text-xs text-slate">{event.label}</p></td><td className={`py-2 px-3 font-semibold ${toNumber(event.delta) < 0 ? 'text-urgent' : 'text-positive'}`}>{toNumber(event.delta) > 0 ? '+' : ''}{fmtNumber(event.delta)}</td><td className="py-2 px-3">{fmtNumber(event.remaining)}</td><td className="py-2 px-3">{event.amount ? fmtCurrency(event.amount) : '—'}</td><td className="py-2 px-3 text-slate">{event.source}</td><td className="py-2 px-3"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${event.status === 'à valider' ? 'bg-vigilance-bg text-horizon-dark' : 'bg-positive-bg text-positive'}`}>{event.status || 'validé'}</span></td></tr>) : <tr><td colSpan="7" className="py-4 px-3 text-center text-slate">Aucun mouvement historique détecté.</td></tr>}</tbody>
            </table>
          </div>
        </div>;
      })}
    </div>
  </section>;
}
