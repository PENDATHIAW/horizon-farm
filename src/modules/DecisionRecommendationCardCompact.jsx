import { useState } from 'react';
import toast from 'react-hot-toast';
import { CalendarDays, CheckSquare, ChevronDown, Target, Zap } from 'lucide-react';
import Btn from '../components/Btn';
import { actionTargetModule, actionTypeLabel, buildDecisionActions, buildDraftFromDecisionAction } from '../services/decisionActionEngine';
import { buildCommercialTargets } from '../services/smartCommercialTargetingEngine';
import { fmtCurrency, fmtNumber } from '../utils/format';
import { buildDecisionRecommendationTask } from '../utils/decisionCenterWorkflows';

const n = (value = 0) => Number(value || 0);

const VARIANTS = {
  dark: {
    card: 'rounded-2xl bg-white/10 border border-white/10 p-4 flex flex-col gap-3 min-w-0 text-white',
    label: 'text-xs uppercase tracking-wider text-[#f8e8b6] font-black',
    title: 'text-sm font-black mt-1 leading-snug text-white',
    panel: 'rounded-xl bg-black/15 border border-white/10 p-3 text-xs text-white/85 space-y-2',
    panelTitle: 'font-black text-[#f8e8b6]',
    mini: 'rounded-lg bg-black/15 px-2 py-1',
    miniLabel: 'text-xs text-white/85',
    miniValue: 'font-black text-white truncate',
    toggle: 'flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-black text-[#f8e8b6] hover:bg-white/10',
    nested: 'rounded-xl bg-white/10 border border-white/10 p-3 text-xs text-white/85',
    nestedTitle: 'font-black text-[#f8e8b6]',
    nestedRow: 'rounded-lg bg-black/15 px-2 py-1',
    actionBtn: 'w-full min-h-[44px] rounded-lg bg-black/15 px-2 py-2 text-left hover:bg-white/10 text-white/85',
    body: 'text-white/85',
  },
  light: {
    card: 'rounded-2xl border border-[#eadcc2] bg-white p-4 flex flex-col gap-3 min-w-0 shadow-sm',
    label: 'text-xs uppercase tracking-wider text-[#9a6b12] font-black',
    title: 'text-sm font-black mt-1 leading-snug text-[#2f2415]',
    panel: 'rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3 text-xs text-[#7d6a4a] space-y-2',
    panelTitle: 'font-black text-[#2f2415]',
    mini: 'rounded-lg border border-[#eadcc2] bg-white px-2 py-1',
    miniLabel: 'text-xs text-[#8a7456]',
    miniValue: 'font-black text-[#2f2415] truncate',
    toggle: 'flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[#d6c3a0] bg-[#fffdf8] px-3 py-2.5 text-xs font-black text-[#2f2415] hover:bg-white',
    nested: 'rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3 text-xs text-[#7d6a4a]',
    nestedTitle: 'font-black text-[#2f2415]',
    nestedRow: 'rounded-lg border border-[#eadcc2] bg-white px-2 py-1',
    actionBtn: 'w-full min-h-[44px] rounded-lg border border-[#eadcc2] bg-white px-2 py-2 text-left hover:bg-[#fffdf8] text-[#2f2415]',
    body: 'text-[#7d6a4a]',
  },
};

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

function reliabilityLabel(score) {
  if (score >= 80) return 'Priorité élevée';
  if (score >= 60) return 'À vérifier';
  return 'Faible priorité';
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

export default function DecisionRecommendationCardCompact({
  item,
  dataMap = {},
  onNavigate,
  onCreateTask,
  onRefreshTasks,
  onCreateBusinessEvent,
  onRefreshBusinessEvents,
  variant = 'light',
}) {
  const [open, setOpen] = useState(false);
  const [creatingTask, setCreatingTask] = useState(false);
  const theme = VARIANTS[variant] || VARIANTS.light;
  const score = scoreOf(item);
  const targeting = item.technical_rule
    ? { targets: [], recommendation: 'Créer une tâche, ouvrir l\'alerte ou corriger dans le module concerné.' }
    : buildCommercialTargets(dataMap, item.activity);
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

  const createTask = async () => {
    const workflow = buildDecisionRecommendationTask(item);
    if (!workflow) return toast.error('Recommandation incomplète');
    try {
      setCreatingTask(true);
      await onCreateTask?.(workflow.task);
      await onCreateBusinessEvent?.(workflow.event);
      await Promise.allSettled([onRefreshTasks?.(), onRefreshBusinessEvents?.()]);
      toast.success('Tâche créée depuis le Centre décisionnel');
    } catch (error) {
      toast.error(error.message || 'Création de tâche impossible');
    } finally {
      setCreatingTask(false);
    }
  };

  return (
    <div className={theme.card}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className={theme.label}>{item.technical_rule ? 'conduite terrain' : item.priority}</span>
          <p className={theme.title}>{item.title}</p>
        </div>
        <div className="rounded-xl bg-[#f6c453] text-[#2f2415] px-2 py-1 text-center min-w-16" title="Plus le score est élevé, plus l'action est prioritaire.">
          <p className="text-xs font-black">{reliabilityLabel(score)}</p>
          <p className="text-sm font-black">{score}/100</p>
        </div>
      </div>

      <div className={theme.panel}>
        <p className={`${theme.panelTitle} flex items-center gap-1`}>
          <CalendarDays size={13} aria-hidden="true" /> Que faire
        </p>
        <p className="line-clamp-3 leading-relaxed" title={shortSummary(item)}>{shortSummary(item)}</p>
        <div className="grid grid-cols-2 gap-2">
          <Mini theme={theme} label={item.technical_rule ? 'Priorité' : 'Couverture'} value={item.technical_rule ? item.priority : `${item.coverage_rate || 0}%`} />
          <Mini theme={theme} label={item.technical_rule ? 'Module' : 'Écart'} value={item.technical_rule ? (item.source_module || item.activity || 'terrain') : fmtCurrency(item.gap_revenue || 0)} />
        </div>
      </div>

      <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} className={theme.toggle}>
        <ChevronDown size={14} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
        {open ? 'Replier les détails' : 'Voir détails et actions'}
      </button>

      {open ? (
        <div className="space-y-3">
          <Info theme={theme} title={item.technical_rule ? 'Action terrain' : 'Fenêtre / demande'} text={item.timing || item.recommendation} />
          <Info theme={theme} title={item.technical_rule ? 'Où agir ?' : 'Ciblage commercial'} text={targeting.recommendation} />
          {!item.technical_rule && targeting.targets?.length ? (
            <div className={theme.nested}>
              <p className={`${theme.nestedTitle} flex items-center gap-1`}><Target size={13} aria-hidden="true" /> Cibles</p>
              <div className="mt-2 space-y-1">
                {targeting.targets.slice(0, 3).map((target) => (
                  <div key={target.id || target.name} className={theme.nestedRow}>
                    <div className="flex justify-between gap-2"><b className="truncate">{target.name}</b><span>{target.score}/100</span></div>
                    <p className={`text-xs truncate ${theme.body}`}>{target.type} · {target.action}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          <div className={theme.nested}>
            <p className={`${theme.nestedTitle} flex items-center gap-1`}><CheckSquare size={13} aria-hidden="true" /> Actions proposées</p>
            <div className="mt-2 space-y-1">
              {actions.map((action) => (
                <button key={action.id} type="button" onClick={() => openDraft(action)} className={theme.actionBtn}>
                  <div className="flex items-center justify-between gap-2">
                    <b className="truncate">{action.label}</b>
                    <span className="rounded-full bg-[#fff8e8] border border-[#d6c3a0] px-2 py-0.5 text-[10px] text-[#9a6b12]">{actionTypeLabel(action.type)}</span>
                  </div>
                  <p className={`text-xs ${theme.body}`}>Priorité {action.priority} · ouvrir brouillon</p>
                </button>
              ))}
            </div>
          </div>
          <p className={`text-xs ${theme.body}`}>{item.recommendation}</p>
        </div>
      ) : null}

      <div className="mt-auto grid grid-cols-1 gap-2">
        <Btn onClick={createTask} disabled={creatingTask} variant="outline" className="w-full" icon={CheckSquare}>
          {creatingTask ? 'Création...' : 'Créer tâche'}
        </Btn>
        <Btn onClick={main} className="w-full bg-[#f6c453] border-[#f6c453] text-[#2f2415] hover:bg-[#ffe08a]" icon={Zap}>
          {item.technical_rule ? 'Ouvrir action' : 'Business plan'}
        </Btn>
      </div>
    </div>
  );
}

function Info({ theme, title, text }) {
  return (
    <div className={theme.nested}>
      <p className={theme.nestedTitle}>{title}</p>
      <p className={`mt-1 ${theme.body}`}>{text || '—'}</p>
    </div>
  );
}

function Mini({ theme, label, value }) {
  return (
    <div className={theme.mini}>
      <p className={theme.miniLabel}>{label}</p>
      <p className={theme.miniValue}>{value}</p>
    </div>
  );
}
