import { ClipboardList } from 'lucide-react';
import { emitHorizonForm } from '../../../services/formModalManager';
import { fmtNumber } from '../../../utils/format';
import ActiviteSuiviInsightPanel from '../ActiviteSuiviInsightPanel.jsx';
import ActiviteSuiviModuleBreakdownPanel from '../ActiviteSuiviModuleBreakdownPanel.jsx';
import ActiviteSuiviPriorityPanel from '../ActiviteSuiviPriorityPanel.jsx';
import { ActiviteKpi } from '../activiteSuiviUi.jsx';

export default function CockpitDecisionsTab({
  data,
  navigateActivite,
  onApply,
  onResolveAlert,
  busyId,
  onNavigate,
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <ActiviteKpi label="Santé suivi" value={`${data.healthScore}/100`} tone={data.healthScore >= 75 ? 'good' : 'warn'} />
        <ActiviteKpi label="À traiter" value={fmtNumber(data.counts.openTotal)} tone={data.counts.openTotal ? 'warn' : 'good'} />
        <ActiviteKpi label="Alertes critiques" value={fmtNumber(data.criticalAlerts.length)} tone={data.criticalAlerts.length ? 'bad' : 'good'} />
        <ActiviteKpi label="Tâches en retard" value={fmtNumber(data.lateTasks.length)} tone={data.lateTasks.length ? 'bad' : 'good'} />
      </div>
      <ActiviteSuiviInsightPanel
        findings={data.healthFindings}
        predictions={data.healthPredictions}
        coherenceRows={data.coherenceRows}
        onApplyFinding={onApply}
        onNavigate={onNavigate}
        setTab={navigateActivite}
        busyId={busyId}
      />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ActiviteSuiviPriorityPanel
          items={data.priorityQueue.filter((item) => item.kind === 'alerte').slice(0, 5)}
          kind="alerte"
          onResolveAlert={onResolveAlert}
          busyId={busyId}
          setTab={navigateActivite}
        />
        <ActiviteSuiviPriorityPanel
          items={data.priorityQueue.filter((item) => item.kind === 'tache').slice(0, 5)}
          kind="tache"
          onResolveAlert={onResolveAlert}
          busyId={busyId}
          setTab={navigateActivite}
        />
      </div>
      <ActiviteSuiviModuleBreakdownPanel breakdown={data.moduleBreakdown} onNavigate={onNavigate} />
      <section className="rounded-3xl border border-line bg-white p-6 shadow-card">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-earth">
          <ClipboardList size={20} /> Accès rapides
        </h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <button type="button" onClick={() => { emitHorizonForm('taches', 'task_creation', 'Nouvelle tâche', { due_date: new Date().toISOString().slice(0, 10) }); navigateActivite('À traiter maintenant'); }} className="rounded-2xl border border-positive bg-positive-bg p-4 text-left">
            <b className="text-earth">+ Tâche</b>
            <p className="mt-1 text-sm text-slate">Routine ou action terrain.</p>
          </button>
          <button type="button" onClick={() => navigateActivite('À traiter maintenant')} className="rounded-2xl border border-line bg-card p-4 text-left">
            <b className="text-earth">À traiter maintenant</b>
            <p className="mt-1 text-sm text-slate">{fmtNumber(data.counts.openTotal)} alerte(s) / tâche(s) ouvertes.</p>
          </button>
          <button type="button" onClick={() => navigateActivite('Registre & traçabilité')} className="rounded-2xl border border-line bg-card p-4 text-left">
            <b className="text-earth">Registre & traçabilité</b>
            <p className="mt-1 text-sm text-slate">Historique métier et audit.</p>
          </button>
        </div>
      </section>
    </div>
  );
}
