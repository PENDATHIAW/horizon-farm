import { CalendarDays, CheckSquare, HelpCircle, Target, Users, Zap } from 'lucide-react';
import Btn from '../components/Btn';
import { actionTargetModule, actionTypeLabel, buildDecisionActions, buildDraftFromDecisionAction } from '../services/decisionActionEngine';
import { getYearRoundMarkets } from '../services/horizonCommercialCalendar';
import { buildCommercialTargets } from '../services/smartCommercialTargetingEngine';
import { fmtCurrency, fmtNumber } from '../utils/format';

const num = (value = 0) => Number(value || 0);

function scoreOpportunity(item = {}) {
  if (item.technical_rule) {
    if (item.priority === 'haute') return 92;
    if (item.priority === 'moyenne') return 74;
    return 55;
  }
  let score = 35;
  if (item.demand_level === 'forte') score += 20;
  else if (item.demand_level === 'normale') score += 10;
  if (item.coverage_status === 'insuffisant') score += 20;
  else if (item.coverage_status === 'partiel') score += 10;
  else if (item.coverage_status === 'couvert') score -= 15;
  if (item.timing_status === 'prepare_now') score += 12;
  else if (item.timing_status === 'urgent_deadline') score += 8;
  else if (item.timing_status === 'too_late') score -= 20;
  if (num(item.gap_revenue) > 0) score += 8;
  if (!item.should_recommend_investment) score -= 5;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function scoreLabel(score) {
  if (score >= 80) return 'Priorité élevée';
  if (score >= 60) return 'À vérifier';
  return 'Faible priorité';
}

function statusText(item = {}) {
  if (item.technical_rule) return 'Règle terrain détectée automatiquement : traiter l’écart pour protéger santé, production, coûts et marge.';
  if (item.coverage_status === 'couvert') return 'Ne pas surinvestir : capacité couverte, priorité vente et fidélisation.';
  if (item.timing_status === 'too_late') return 'Ne pas investir pour cette fenêtre : viser la prochaine opportunité viable.';
  if (item.coverage_status === 'insuffisant') return 'Investissement ou précommandes à étudier : capacité insuffisante.';
  return 'Sécuriser clients, encaissement, aliments/intrants et exécution terrain.';
}

function defaultTechnicalTarget(item = {}) {
  if (['oeufs', 'poulets_chair'].includes(item.activity)) return 'avicole';
  if (['bovins', 'ovins', 'caprins', 'animaux'].includes(item.activity)) return item.source_module === 'sante' ? 'sante' : 'animaux';
  if (item.activity === 'stock') return 'stock';
  if (item.activity === 'cultures') return 'cultures';
  return item.source_module || 'alertes';
}

export default function DecisionRecommendationCard({ item, dataMap = {}, onNavigate }) {
  const score = scoreOpportunity(item);
  const markets = item.technical_rule ? [] : getYearRoundMarkets(item.activity);
  const targeting = item.technical_rule ? { targets: [], recommendation: 'Action terrain prioritaire : créer une tâche, ouvrir l’alerte ou corriger dans le module concerné.' } : buildCommercialTargets(dataMap, item.activity);
  const targets = targeting.targets || [];
  const concreteActions = buildDecisionActions(item, targets[0]);

  const openActionDraft = (action) => {
    const draft = buildDraftFromDecisionAction(action, item);
    window.dispatchEvent(new CustomEvent('horizon-open-draft', { detail: { draft, sourceLabel: 'Centre décisionnel' } }));
    onNavigate?.(draft.target_module || actionTargetModule(action.type, action.payload));
  };

  const openMainTarget = () => {
    if (item.technical_rule) {
      const preferred = concreteActions.find((action) => action.type === 'technical_task') || concreteActions[0];
      if (preferred) return openActionDraft(preferred);
      return onNavigate?.(defaultTechnicalTarget(item));
    }
    return onNavigate?.('investissements');
  };

  return (
    <div className="rounded-2xl bg-white/10 border border-white/10 p-4 flex flex-col gap-3 min-w-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="text-xs uppercase tracking-wider text-[#f8e8b6] font-black">{item.technical_rule ? 'conduite terrain' : item.priority}</span>
          <p className="text-sm font-black mt-1 leading-snug">{item.title}</p>
        </div>
        <div className="rounded-xl bg-[#f6c453] text-[#2f2415] px-2 py-1 text-center min-w-16" title="Plus le score est élevé, plus l’action est prioritaire.">
          <p className="text-xs font-black">{scoreLabel(score)}</p>
          <p className="text-sm font-black">{score}/100</p>
        </div>
      </div>

      <div className="rounded-xl bg-black/15 border border-white/10 p-3 text-xs text-white/85 space-y-1">
        <p className="font-black text-[#f8e8b6] flex items-center gap-1"><CalendarDays size={13} aria-hidden="true" /> {item.technical_rule ? 'Action terrain' : 'Fenêtre commerciale'}</p>
        <p>{item.timing}</p>
        {item.technical_rule ? (
          <>
            <p>Module : <b>{item.source_module || item.activity || 'terrain'}</b> · Entité : <b>{item.entity_type || '—'}</b></p>
            <p>Priorité : <b>{item.priority || 'moyenne'}</b></p>
          </>
        ) : (
          <>
            <p>Demande : <b>{item.demand_level || 'inconnue'}</b> · Couverture ferme : <b>{item.coverage_rate || 0}%</b></p>
            <p>Écart : <b>{fmtNumber(item.gap_units || 0)} unité(s)</b> · <b>{fmtCurrency(item.gap_revenue || 0)}</b></p>
          </>
        )}
      </div>

      <div className="rounded-xl bg-white/10 border border-white/10 p-3 text-xs text-white/85 space-y-2">
        <p className="font-black text-[#f8e8b6] flex items-center gap-1"><HelpCircle size={13} aria-hidden="true" /> Pourquoi Horizon recommande ça ?</p>
        <p>{statusText(item)}</p>
        <div className="grid grid-cols-2 gap-2">
          <Mini label={item.technical_rule ? 'Échéance' : 'Date cible'} value={item.target_date || '—'} />
          <Mini label="Date limite" value={item.latest_start || '—'} />
          <Mini label={item.technical_rule ? 'Origine' : 'Disponible'} value={item.technical_rule ? (item.source_module || 'terrain') : fmtNumber(item.available_units || 0)} />
          <Mini label={item.technical_rule ? 'Entité' : 'Demandé'} value={item.technical_rule ? (item.entity_id || '—') : fmtNumber(item.demand_units || 0)} />
        </div>
      </div>

      {markets.length ? (
        <div className="rounded-xl bg-white/10 border border-white/10 p-3 text-xs text-white/85">
          <p className="font-black text-[#f8e8b6] flex items-center gap-1"><Users size={13} aria-hidden="true" /> Vente permanente possible</p>
          <p className="mt-1">{markets.slice(0, 5).join(' · ')}</p>
        </div>
      ) : null}

      <div className="rounded-xl bg-white/10 border border-white/10 p-3 text-xs text-white/85">
        <p className="font-black text-[#f8e8b6] flex items-center gap-1"><Target size={13} aria-hidden="true" /> {item.technical_rule ? 'Où agir maintenant ?' : 'Qui cibler maintenant ?'}</p>
        <p className="mt-1 text-white/85">{targeting.recommendation}</p>
        {!item.technical_rule ? (
          <div className="mt-2 space-y-1">
            {targets.slice(0, 3).map((target) => (
              <div key={target.id || target.name} className="rounded-lg bg-black/15 px-2 py-1">
                <div className="flex justify-between gap-2"><b className="truncate">{target.name}</b><span>{target.score}/100</span></div>
                <p className="text-xs text-white/85 truncate">{target.type} · {target.action}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-2 rounded-lg bg-black/15 px-2 py-2 text-xs text-white/85">
            Créer une tâche terrain pour suivre l’action, ou ouvrir le module source pour corriger la donnée.
          </div>
        )}
      </div>

      <div className="rounded-xl bg-white/10 border border-white/10 p-3 text-xs text-white/85">
        <p className="font-black text-[#f8e8b6] flex items-center gap-1"><CheckSquare size={13} aria-hidden="true" /> Actions concrètes proposées</p>
        <div className="mt-2 space-y-1">
          {concreteActions.map((action) => (
            <button key={action.id} type="button" onClick={() => openActionDraft(action)} className="w-full min-h-[44px] rounded-lg bg-black/15 px-2 py-2 text-left hover:bg-white/10 transition-colors duration-200">
              <div className="flex items-center justify-between gap-2">
                <b className="truncate">{action.label}</b>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs">{actionTypeLabel(action.type)}</span>
              </div>
              <p className="text-xs text-white/85">Priorité {action.priority} · ouvrir brouillon</p>
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-white/85 line-clamp-3" title={item.recommendation}>{item.recommendation}</p>
      <Btn onClick={openMainTarget} icon={Zap} className="mt-auto w-full bg-[#f6c453] border-[#f6c453] text-[#2f2415] hover:bg-[#ffe08a]">
        {item.technical_rule ? 'Créer une action terrain' : 'Accéder au business plan brouillon'}
      </Btn>
    </div>
  );
}

function Mini({ label, value }) {
  return <div className="rounded-lg bg-black/15 px-2 py-1"><p className="text-xs text-white/85">{label}</p><p className="font-black text-white truncate">{value}</p></div>;
}
