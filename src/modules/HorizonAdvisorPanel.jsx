import { AlertTriangle, Bell, ClipboardList, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { buildDailyAdvisorRecommendations, ADVISOR_URGENCY } from '../services/horizonAdvisor/advisorService.js';
import {
  createAdvisorActionDraft,
  executeAdvisorDraft,
  validateAdvisorDraft,
} from '../services/horizonAdvisor/advisorDraftService.js';
import { redirectToSource, shouldBlockInlineAlertCreation } from '../utils/antiDuplicationGuard.js';

const URGENCY_LABELS = {
  [ADVISOR_URGENCY.ELEVEE]: 'Élevée',
  [ADVISOR_URGENCY.MOYENNE]: 'Moyenne',
  [ADVISOR_URGENCY.FAIBLE]: 'Faible',
};

function urgencyClass(urgency) {
  if (urgency === ADVISOR_URGENCY.ELEVEE) return 'border-red-200 bg-red-50 text-red-800';
  if (urgency === ADVISOR_URGENCY.MOYENNE) return 'border-amber-200 bg-amber-50 text-amber-800';
  return 'border-emerald-200 bg-emerald-50 text-emerald-800';
}

function UrgencyBadge({ urgency }) {
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${urgencyClass(urgency)}`}>
      {URGENCY_LABELS[urgency] || 'Moyenne'}
    </span>
  );
}

export default function HorizonAdvisorPanel({
  dataMap = {},
  moduleId = 'dashboard',
  title = 'Priorités du jour',
  subtitle = 'Recommandations Horizon Advisor — lecture seule jusqu’à validation d’une action.',
  limit = 8,
  compact = false,
  onNavigate,
  onCreateTask,
  onCreateAlert,
  onUpdateAlert,
  onCreateBusinessEvent,
  onRefreshTasks,
  onRefreshAlertes,
  existingTasks = [],
  existingAlerts = [],
}) {
  const [busyId, setBusyId] = useState(null);
  const [pendingDraft, setPendingDraft] = useState(null);

  const report = useMemo(
    () => buildDailyAdvisorRecommendations(dataMap, { limit }),
    [dataMap, limit],
  );

  const handlers = {
    onNavigate,
    onCreateTask,
    onCreateAlert,
    onUpdateAlert,
    onCreateBusinessEvent,
    onRefreshTasks,
    onRefreshAlertes,
    existingTasks,
    existingAlerts,
  };

  const prepareAction = (recommendation, actionType) => {
    const draft = createAdvisorActionDraft(recommendation, { actionType });
    setPendingDraft({ draft, recommendation, actionType });
  };

  const confirmAction = async () => {
    if (!pendingDraft) return;
    setBusyId(pendingDraft.recommendation.id);
    try {
      const validated = validateAdvisorDraft(pendingDraft.draft);
      const result = await executeAdvisorDraft(validated, handlers, { moduleId });
      if (!result.ok) {
        toast.error(result.error || 'Action impossible');
        return;
      }
      if (result.createdTasks || result.createdAlerts) {
        toast.success(`${result.createdTasks || 0} tâche(s), ${result.createdAlerts || 0} alerte(s) créée(s)`);
      } else if (result.redirected) {
        toast.success('Alerte créée — suivi dans Activité & Suivi');
      } else {
        toast.success('Action enregistrée');
      }
      setPendingDraft(null);
    } catch (error) {
      toast.error(error.message || 'Action impossible');
    } finally {
      setBusyId(null);
    }
  };

  const openModule = (recommendation) => {
    const mod = recommendation.module_target || recommendation.module || 'centre_decisionnel';
    onNavigate?.(mod);
  };

  if (!report.recommendations.length) {
    return (
      <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
        <p className="font-black">{title}</p>
        <p className="mt-1">Aucune priorité advisor détectée — exploitation à jour.</p>
      </section>
    );
  }

  return (
    <section className={`rounded-2xl border border-[#d6c3a0] bg-white shadow-sm ${compact ? 'p-4' : 'p-5'} space-y-4`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-[#9a6b12]">
            <Sparkles size={14} />
            Horizon Advisor
          </p>
          <h2 className="mt-1 text-lg font-black text-[#2f2415]">{title}</h2>
          <p className="mt-1 text-sm text-[#8a7456]">{subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-black">
          <span className="rounded-full border border-red-200 bg-red-50 px-2 py-1 text-red-800">{report.counts.elevee} élevée(s)</span>
          <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-amber-800">{report.counts.moyenne} moyenne(s)</span>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-emerald-800">Score ERP {report.health_score}/100</span>
        </div>
      </div>

      <div className="space-y-2">
        {report.recommendations.map((item) => (
          <article
            key={item.id}
            className={`rounded-xl border p-3 ${item.already_tracked ? 'border-[#eadcc2] bg-[#fffdf8] opacity-80' : 'border-[#eadcc2] bg-[#fffdf8]'}`}
          >
            <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <UrgencyBadge urgency={item.urgency} />
                  {item.already_tracked ? (
                    <span className="rounded-full border border-[#d6c3a0] px-2 py-0.5 text-[10px] font-black text-[#8a7456]">Suivi en cours</span>
                  ) : null}
                  {item.days_left != null ? (
                    <span className="text-[10px] font-black text-[#8a7456]">J-{item.days_left}</span>
                  ) : null}
                </div>
                <p className="mt-2 font-black text-[#2f2415]">{item.title}</p>
                <p className="mt-1 text-sm text-[#8a7456]">{item.summary || item.recommended_action}</p>
                <p className="mt-1 text-xs text-emerald-800">{item.recommended_action}</p>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => openModule(item)}
                  className="rounded-lg border border-[#d6c3a0] bg-white px-3 py-1.5 text-xs font-black text-[#2f2415]"
                >
                  Voir
                </button>
                <button
                  type="button"
                  disabled={busyId === item.id}
                  onClick={() => prepareAction(item, 'task')}
                  className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-900 disabled:opacity-50"
                >
                  <ClipboardList size={12} className="inline mr-1" />
                  Créer tâche
                </button>
                <button
                  type="button"
                  disabled={busyId === item.id}
                  onClick={() => {
                    if (shouldBlockInlineAlertCreation(moduleId)) {
                      redirectToSource(onNavigate, 'alertes_centre_activite');
                      toast('Alertes gérées dans Activité & Suivi', { icon: 'ℹ️' });
                    }
                    prepareAction(item, 'alert');
                  }}
                  className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-900 disabled:opacity-50"
                >
                  <Bell size={12} className="inline mr-1" />
                  Créer alerte
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {pendingDraft ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
          <p className="flex items-center gap-2 text-sm font-black text-amber-900">
            <AlertTriangle size={16} />
            Confirmer la création — brouillon validé requis
          </p>
          <p className="text-sm text-amber-900">
            {pendingDraft.actionType === 'alert' ? 'Créer une alerte' : 'Créer une tâche'} :
            {' '}
            <strong>{pendingDraft.recommendation.title}</strong>
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busyId != null}
              onClick={confirmAction}
              className="rounded-lg bg-[#2f2415] px-4 py-2 text-xs font-black text-white disabled:opacity-50"
            >
              Valider et créer
            </button>
            <button
              type="button"
              onClick={() => setPendingDraft(null)}
              className="rounded-lg border border-[#d6c3a0] bg-white px-4 py-2 text-xs font-black text-[#2f2415]"
            >
              Annuler
            </button>
          </div>
        </div>
      ) : null}

      {!compact ? (
        <p className="text-xs text-[#8a7456]">
          Sources : stocks, finances, ventes, lots, tâches, alertes, météo, Smart Farm, documents — sans écriture automatique.
        </p>
      ) : null}
    </section>
  );
}
