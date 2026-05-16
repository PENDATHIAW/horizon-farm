import { useState } from 'react';
import { CalendarDays, CheckSquare, ChevronDown, Target, Zap } from 'lucide-react';
import { actionTargetModule, actionTypeLabel, buildDecisionActions, buildDraftFromDecisionAction } from '../services/decisionActionEngine';
import { buildCommercialTargets } from '../services/smartCommercialTargetingEngine';
import { fmtCurrency, fmtNumber } from '../utils/format';

const n = (value = 0) => Number(value || 0);

function scoreOf(item = {}) {
  if (item.technical_rule) return item.priority === 'haute' ? 92 : item.priority === 'moyenne' ? 74 : 55;
  let score = 35;
  if (item.demand_level === 'forte') score += 20;
  if (item.coverage_status === 'insuffisant') score += 20;
  if (item.coverage_status === 'partiel') score += 10;
  if (item.coverage_status === 'couvert') score -= 15;
  if (item.timing_status === 'prepare_now') score += 12;
  if (item.timing_status === 'urgent_deadline') score += 8;
  if (item.timing_status === 'too_late') score -= 20;
  if (n(item.gap_revenue) > 0) score += 8;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function shortSummary(item = {}) {
  if (item.technical_rule) return item.recommendation || item.event_note || 'Action terrain à traiter.';
  if (item.coverage_status === 'couvert') return 'Capacité couverte : vendre et éviter le surinvestissement.';
  if (item.timing_status === 'too_late') return 'Fenêtre trop proche : viser la prochaine opportunité viable.';
  if (n(item.gap_revenue) > 0) return `Écart estimé : ${fmtNumber(item.gap_units || 0)} unité(s), ${fmtCurrency(item.gap_revenue || 0)}.`;
  return item.recommendation || 'Recommandation à vérifier.';
}

function targetModule(item = {}) {
  if (['oeufs', 'poulets_chair'].includes(item.activity)) return 'avicole';
  if (['bovins', 'ovins', 'caprins', 'animaux'].includes(item.activity)) return item.source_module === 'sante' ? 'sante' : 'animaux';
  if (item.activity === 'stock') return 'stock';
  if (item.activity === 'cultures') return 'cultures';
  return item.source_module || 'alertes';
}

export default function DecisionRecommendationCardCompact({ item, dataMap = {}, onNavigate }) {
  const [open, setOpen] = useState(false);
  const score = scoreOf(item);
  const targeting = item.technical_rule ? { targets: [], recommendation: 'Créer une tâche, ouvrir l’alerte ou corriger dans le module concerné.' } : buildCommercialTargets(dataMap, item.activity);
  const actions = buildDecisionActions(item, targeting.targets?.[0]);

  const openDraft = (action) => {
    const draft = buildDraftFromDecisionAction(action, item);
    window.dispatchEvent(new CustomEvent('horizon-open-draft', { detail: { draft, sourceLabel: 'Centre décisionnel' } }));
    onNavigate?.(draft.target_module || actionTargetModule(action.type, action.payload));
  };
  const main = () => {
    if (item.technical_rule) {
      const preferred = actions.find((action) => action.type === 'technical_task') || actions[0];
      if (preferred) return openDraft(preferred);
      return onNavigate?.(targetModule(item));
    }
    return onNavigate?.('investissements');
  };

  return <div className="rounded-2xl bg-white/10 border border-white/10 p-4 flex flex-col gap-3 min-w-0">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0"><span className="text-[10px] uppercase tracking-wider text-[#f8e8b6] font-black">{item.technical_rule ? 'conduite terrain' : item.priority}</span><p className="text-sm font-black mt-1 leading-snug">{item.title}</p></div>
      <div className="rounded-xl bg-[#f6c453] text-[#2f2415] px-2 py-1 text-center min-w-[62px]"><p className="text-[9px] font-black">Score</p><p className="text-sm font-black">{score}/100</p></div>
    </div>

    <div className="rounded-xl bg-black/15 border border-white/10 p-3 text-[11px] text-white/80 space-y-2">
      <p className="font-black text-[#f8e8b6] flex items-center gap-1"><CalendarDays size={13} /> Résumé</p>
      <p className="line-clamp-3">{shortSummary(item)}</p>
      <div className="grid grid-cols-2 gap-2"><Mini label={item.technical_rule ? 'Priorité' : 'Couverture'} value={item.technical_rule ? item.priority : `${item.coverage_rate || 0}%`} /><Mini label={item.technical_rule ? 'Module' : 'Écart'} value={item.technical_rule ? (item.source_module || item.activity || 'terrain') : fmtCurrency(item.gap_revenue || 0)} /></div>
    </div>

    <button type="button" onClick={() => setOpen((value) => !value)} className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-black text-[#f8e8b6] hover:bg-white/10"><ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />{open ? 'Replier les détails' : 'Voir détails et actions'}</button>

    {open ? <div className="space-y-3">
      <Info title={item.technical_rule ? 'Action terrain' : 'Fenêtre / demande'} text={item.timing || item.recommendation} />
      <Info title={item.technical_rule ? 'Où agir ?' : 'Ciblage commercial'} text={targeting.recommendation} />
      {!item.technical_rule && targeting.targets?.length ? <div className="rounded-xl bg-white/10 border border-white/10 p-3 text-[11px] text-white/80"><p className="font-black text-[#f8e8b6] flex items-center gap-1"><Target size={13} /> Cibles</p><div className="mt-2 space-y-1">{targeting.targets.slice(0, 3).map((target) => <div key={target.id || target.name} className="rounded-lg bg-black/15 px-2 py-1"><div className="flex justify-between gap-2"><b className="truncate">{target.name}</b><span>{target.score}/100</span></div><p className="text-[10px] text-white/55 truncate">{target.type} · {target.action}</p></div>)}</div></div> : null}
      <div className="rounded-xl bg-white/10 border border-white/10 p-3 text-[11px] text-white/80"><p className="font-black text-[#f8e8b6] flex items-center gap-1"><CheckSquare size={13} /> Actions proposées</p><div className="mt-2 space-y-1">{actions.map((action) => <button key={action.id} type="button" onClick={() => openDraft(action)} className="w-full rounded-lg bg-black/15 px-2 py-1 text-left hover:bg-white/10 transition"><div className="flex items-center justify-between gap-2"><b className="truncate">{action.label}</b><span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px]">{actionTypeLabel(action.type)}</span></div><p className="text-[10px] text-white/55">Priorité {action.priority} · ouvrir brouillon</p></button>)}</div></div>
      <p className="text-xs text-white/80">{item.recommendation}</p>
    </div> : null}

    <button type="button" onClick={main} className="mt-auto w-full rounded-xl bg-[#f6c453] px-2 py-2 text-[11px] font-black text-[#2f2415] hover:bg-[#ffe08a] flex items-center justify-center gap-1"><Zap size={13} /> {item.technical_rule ? 'Créer une action terrain' : 'Accéder au business plan brouillon'}</button>
  </div>;
}

function Info({ title, text }) { return <div className="rounded-xl bg-white/10 border border-white/10 p-3 text-[11px] text-white/80"><p className="font-black text-[#f8e8b6]">{title}</p><p className="mt-1 text-white/65">{text || '—'}</p></div>; }
function Mini({ label, value }) { return <div className="rounded-lg bg-black/15 px-2 py-1"><p className="text-[9px] text-white/50">{label}</p><p className="font-black text-white truncate">{value}</p></div>; }
