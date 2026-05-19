import { BarChart2, CheckCircle2, Clock3, FileText, TrendingDown, TrendingUp } from 'lucide-react';
import Btn from '../components/Btn';
import { buildDecisionHistory, decisionStatuses, explainDecisionNonProfitability } from '../services/decisionHistoryEngine';
import { fmtCurrency } from '../utils/format';

const statusTone = {
  recommended: 'bg-sky-50 border-sky-200 text-sky-700',
  draft_created: 'bg-purple-50 border-purple-200 text-purple-700',
  action_draft_opened: 'bg-indigo-50 border-indigo-200 text-indigo-700',
  accepted: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  modified: 'bg-amber-50 border-amber-200 text-amber-700',
  rejected: 'bg-red-50 border-red-200 text-red-700',
  executed: 'bg-[#fffdf8] border-[#eadcc2] text-[#7d6a4a]',
  monitoring: 'bg-amber-50 border-amber-200 text-amber-700',
  profitable: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  not_profitable: 'bg-red-50 border-red-200 text-red-700',
};

const moduleLabel = {
  avicole: 'Avicole',
  animaux: 'Animaux',
  cultures: 'Cultures',
  stock: 'Stock',
  ventes: 'Ventes',
  finance: 'Finance',
  finances: 'Finance',
  sante: 'Santé',
  santé: 'Santé',
  investissements: 'Investissements',
  objectifs_croissance: 'Objectifs & Croissance',
  centre_ia: 'Centre décisionnel',
};
const activityLabel = {
  oeufs: 'Œufs / pondeuses',
  poulets_chair: 'Poulets de chair',
  animaux: 'Animaux',
  cultures: 'Cultures',
  stock: 'Stock',
  global: 'Global',
};
const prettyModule = (value) => moduleLabel[String(value || '').toLowerCase()] || value || '—';
const prettyActivity = (value) => activityLabel[String(value || '').toLowerCase()] || value || 'Global';

function ProfitBadge({ status }) {
  if (status === 'profitable') return <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-black text-emerald-700">Rentable</span>;
  if (status === 'not_profitable') return <span className="rounded-full border border-red-200 bg-red-50 px-2 py-1 text-xs font-black text-red-700">Non rentable</span>;
  if (status === 'monitoring') return <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-black text-amber-700">En suivi</span>;
  return <span className="rounded-full border border-[#eadcc2] bg-[#fffdf8] px-2 py-1 text-xs font-black text-[#8a7456]">Pas encore évaluable</span>;
}

function Mini({ icon: Icon, label, value, tone = 'neutral' }) {
  const cls = tone === 'good' ? 'text-emerald-600' : tone === 'bad' ? 'text-red-600' : tone === 'warn' ? 'text-amber-600' : 'text-[#2f2415]';
  return <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 min-w-0"><Icon size={16} className={cls} /><p className={`mt-2 text-xl font-black ${cls} break-words`}>{value}</p><p className="text-xs text-[#8a7456]">{label}</p></div>;
}

function TraceSummary({ decision }) {
  const parts = [];
  if (decision.target_module) parts.push(prettyModule(decision.target_module));
  if (decision.target_date) parts.push(`Cible ${String(decision.target_date).slice(0, 10)}`);
  if (decision.deadline) parts.push(`Échéance ${String(decision.deadline).slice(0, 10)}`);
  if (decision.expected_impact) parts.push(decision.expected_impact);
  return <div className="text-xs text-[#8a7456] mt-1 space-y-1">{parts.length ? <p className="max-w-[280px] line-clamp-2" title={parts.join(' · ')}>{parts.join(' · ')}</p> : null}</div>;
}

function justificationOf(decision) {
  return decision.profitability_status === 'not_profitable' ? explainDecisionNonProfitability(decision) : decision.profitability_explanation || decision.decision_reason || '—';
}

function MobileDecisionCard({ decision }) {
  return <article className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 space-y-3">
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2 items-center">
        <span className={`rounded-full border px-2 py-1 text-xs font-black ${statusTone[decision.status] || statusTone.recommended}`}>{decisionStatuses[decision.status] || decision.status || 'Recommandée'}</span>
        <ProfitBadge status={decision.profitability_status} />
      </div>
      <h4 className="font-black text-[#2f2415] leading-snug">{decision.title}</h4>
      <p className="text-xs text-[#8a7456]">{prettyActivity(decision.activity)} · {String(decision.recommendation_date || decision.created_at || '').slice(0, 10) || 'Date non renseignée'}</p>
    </div>
    <div className="grid grid-cols-2 gap-2 text-xs">
      <div className="rounded-xl bg-white border border-[#eadcc2] p-3"><span className="text-[#8a7456]">Investi réel</span><b className="block text-[#2f2415]">{fmtCurrency(decision.actual_investment)}</b></div>
      <div className="rounded-xl bg-white border border-[#eadcc2] p-3"><span className="text-[#8a7456]">CA réel</span><b className="block text-[#2f2415]">{fmtCurrency(decision.actual_revenue)}</b></div>
      <div className="rounded-xl bg-white border border-[#eadcc2] p-3"><span className="text-[#8a7456]">ROI</span><b className="block text-[#2f2415]">{decision.roi_percent === null || decision.roi_percent === undefined ? '—' : `${decision.roi_percent}%`}</b></div>
      <div className="rounded-xl bg-white border border-[#eadcc2] p-3"><span className="text-[#8a7456]">Module</span><b className="block text-[#2f2415]">{prettyModule(decision.target_module)}</b></div>
    </div>
    <p className="text-sm text-[#7d6a4a] line-clamp-3" title={justificationOf(decision)}>{justificationOf(decision)}</p>
  </article>;
}

export default function DecisionHistoryPanel({ dataMap = {}, onNavigate }) {
  const history = buildDecisionHistory(dataMap);
  const totals = history.totals;
  const latest = history.decisions.slice(0, 8);

  return (
    <div className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#8a7456] font-black flex items-center gap-2"><Clock3 size={15} /> Historique des décisions</p>
          <h3 className="text-xl font-black text-[#2f2415] mt-1">Recommandations suivies jusqu’à la rentabilité réelle</h3>
          <p className="text-sm text-[#8a7456] mt-1">Une recommandation n’est pas jugée rentable au départ. Horizon suit les actions ouvertes, l’exécution, les dépenses, le CA réel, puis le bilan.</p>
        </div>
        <Btn small onClick={() => onNavigate?.('impact_business')}>Voir Impact & Valeur ERP</Btn>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <Mini icon={FileText} label="Recommandations" value={totals.recommended} />
        <Mini icon={CheckCircle2} label="Exécutées / en suivi" value={totals.executed} tone="warn" />
        <Mini icon={TrendingUp} label="Rentables" value={totals.profitable} tone="good" />
        <Mini icon={TrendingDown} label="Non rentables" value={totals.notProfitable} tone="bad" />
        <Mini icon={BarChart2} label="CA attribué IA" value={`${totals.contributionRate}%`} tone={totals.contributionRate > 0 ? 'good' : 'neutral'} />
      </div>

      <div className="lg:hidden space-y-3">
        {latest.map((decision) => <MobileDecisionCard key={decision.id || decision.recommendation_id} decision={decision} />)}
        {!latest.length ? <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-sm text-[#8a7456]">Aucune recommandation historisée pour le moment.</div> : null}
      </div>

      <div className="hidden lg:block overflow-x-auto rounded-2xl border border-[#eadcc2]">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#fffdf8] text-left text-xs uppercase text-[#8a7456]">
              <th className="px-3 py-2">Recommandation</th>
              <th className="px-3 py-2">Activité</th>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Statut</th>
              <th className="px-3 py-2 hidden xl:table-cell">Cible</th>
              <th className="px-3 py-2">Investi réel</th>
              <th className="px-3 py-2">CA réel</th>
              <th className="px-3 py-2">ROI</th>
              <th className="px-3 py-2">Rentabilité</th>
              <th className="px-3 py-2">Justification</th>
            </tr>
          </thead>
          <tbody>
            {latest.map((decision) => (
              <tr key={decision.id || decision.recommendation_id} className="border-t border-[#eadcc2] align-top">
                <td className="px-3 py-3"><b className="text-[#2f2415] line-clamp-2">{decision.title}</b><TraceSummary decision={decision} /></td>
                <td className="px-3 py-3 text-[#7d6a4a]">{prettyActivity(decision.activity)}</td>
                <td className="px-3 py-3 text-[#7d6a4a]">{String(decision.recommendation_date || decision.created_at || '').slice(0, 10) || '—'}</td>
                <td className="px-3 py-3"><span className={`rounded-full border px-2 py-1 text-xs font-black ${statusTone[decision.status] || statusTone.recommended}`}>{decisionStatuses[decision.status] || decision.status || 'Recommandée'}</span></td>
                <td className="px-3 py-3 hidden xl:table-cell text-xs font-bold text-[#2f2415]">{prettyModule(decision.target_module)}<p className="text-[#8a7456] font-normal">{String(decision.deadline || '').slice(0, 10) || '—'}</p></td>
                <td className="px-3 py-3 font-bold text-[#2f2415]">{fmtCurrency(decision.actual_investment)}</td>
                <td className="px-3 py-3 font-bold text-[#2f2415]">{fmtCurrency(decision.actual_revenue)}</td>
                <td className="px-3 py-3 font-bold text-[#2f2415]">{decision.roi_percent === null || decision.roi_percent === undefined ? '—' : `${decision.roi_percent}%`}</td>
                <td className="px-3 py-3"><ProfitBadge status={decision.profitability_status} /></td>
                <td className="px-3 py-3 text-xs text-[#7d6a4a] max-w-[260px] line-clamp-3" title={justificationOf(decision)}>{justificationOf(decision)}</td>
              </tr>
            ))}
            {!latest.length ? (
              <tr><td className="px-3 py-5 text-sm text-[#8a7456]" colSpan={10}>Aucune recommandation historisée pour le moment. Les prochaines recommandations liées à une action ouverte apparaîtront ici.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
