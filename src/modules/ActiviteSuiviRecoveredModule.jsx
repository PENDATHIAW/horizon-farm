import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';
import ModuleTabsBar from '../components/module/ModuleTabsBar.jsx';
import { applyOneClickRecommendation, createAlertResolutionTask } from '../services/heyHorizonRecommendationActions.js';
import PeriodScopeBadge from '../components/PeriodScopeBadge.jsx';
import { resolveActiviteSuiviTab } from '../utils/commercialNavigation.js';
import { useActiviteSuivi } from './activiteSuivi/hooks/useActiviteSuivi.js';
import CockpitDecisionsTab from './activiteSuivi/tabs/CockpitDecisionsTab.jsx';
import ATraiterMaintenantTab from './activiteSuivi/tabs/ATraiterMaintenantTab.jsx';
import RegistreTracabiliteTab from './activiteSuivi/tabs/RegistreTracabiliteTab.jsx';
import PerformanceAnalytiqueTab from './activiteSuivi/tabs/PerformanceAnalytiqueTab.jsx';
import CalendrierActiviteTab from './activiteSuivi/tabs/CalendrierActiviteTab.jsx';
import AlertesLieesTab from './activiteSuivi/tabs/AlertesLieesTab.jsx';

function Tabs({ active, onChange, tabBadges = {} }) {
  return (
    <div className="space-y-2">
      <ModuleTabsBar moduleId="activite_suivi" active={active} onChange={onChange} tabBadges={tabBadges} />
    </div>
  );
}

export default function ActiviteSuiviRecoveredModule(props) {
  const controlled = Boolean(props.onTabChange);
  const onTabChange = props.onTabChange;
  const defaultTab = 'ActiviteTodoView';
  const [internalTab, setInternalTab] = useState(() => resolveActiviteSuiviTab(props.initialTab || defaultTab));
  const resolvedFromParent = resolveActiviteSuiviTab(props.initialTab || defaultTab);
  const tab = controlled
    ? resolvedFromParent
    : internalTab;
  const [busyId, setBusyId] = useState(null);

  const setTab = useCallback((value) => {
    const resolved = resolveActiviteSuiviTab(value);
    const raw = String(value || '').trim();
    if (controlled) {
      onTabChange?.(raw || resolved);
      return;
    }
    setInternalTab(resolved);
  }, [controlled, onTabChange]);

  const navigateActivite = setTab;

  const {
    data,
    alertes,
    tasks,
    actionHandlers,
    bridgeProps,
    shared,
    workflowBridgeProps,
    refresh,
  } = useActiviteSuivi(props);

  const applyFinding = async (finding) => {
    setBusyId(finding.id);
    try {
      const result = await applyOneClickRecommendation(finding, actionHandlers);
      if (result.createdTasks || result.createdAlerts) toast.success('Action créée');
      else {
        toast.success('Onglet ouvert');
        navigateActivite('À faire');
      }
    } catch (e) {
      toast.error(e.message || 'Erreur');
    } finally {
      setBusyId(null);
    }
  };

  const resolveAlert = async (item) => {
    setBusyId(item.id);
    try {
      await createAlertResolutionTask({
        alertTitle: item.title,
        alertId: item.sourceId,
        actionLabel: item.detail,
        handlers: actionHandlers,
      });
      toast.success(`Tâche créée pour : ${item.title}`);
    } catch (e) {
      toast.error(e.message || 'Erreur');
    } finally {
      setBusyId(null);
    }
  };

  const content = tab === 'ActiviteTodoView' ? (
    <ATraiterMaintenantTab
      shared={shared}
      workflowBridgeProps={workflowBridgeProps}
      onRefresh={refresh}
    />
  ) : tab === 'ActiviteCalendarView' ? (
    <CalendrierActiviteTab tasks={tasks} />
  ) : tab === 'ActiviteAlertsView' ? (
    <div className="space-y-5">
      <CockpitDecisionsTab
        data={data}
        navigateActivite={navigateActivite}
        onApply={applyFinding}
        onResolveAlert={resolveAlert}
        busyId={busyId}
        onNavigate={props.onNavigate}
      />
      <AlertesLieesTab shared={shared} bridgeProps={bridgeProps} />
    </div>
  ) : tab === 'ActiviteJournalView' ? (
    <RegistreTracabiliteTab shared={shared} props={props} />
  ) : tab === 'ActiviteHistoryView' ? (
    <PerformanceAnalytiqueTab data={data} tasks={tasks} alertes={alertes} onNavigate={props.onNavigate} />
  ) : (
    <ATraiterMaintenantTab
      shared={shared}
      workflowBridgeProps={workflowBridgeProps}
      onRefresh={refresh}
    />
  );

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-[#9a6b12] font-black">Suivi</p>
            <h1 className="mt-1 text-2xl font-black text-[#2f2415]">Activité & Suivi</h1>
            <p className="mt-1 text-sm text-[#8a7456]">Tâches, échéances, alertes et journal de l’exploitation.</p>
            {props.periodLabel ? <div className="mt-2"><PeriodScopeBadge label={props.periodLabel} /></div> : null}
          </div>
          <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] px-4 py-3 text-sm">
            <span className="text-[#8a7456]">Santé </span>
            <b className={data.healthScore >= 75 ? 'text-emerald-700' : 'text-amber-700'}>{data.healthScore}/100</b>
            {data.counts.openTotal > 0 ? (
              <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-black text-amber-800">{data.counts.openTotal} à traiter</span>
            ) : null}
          </div>
        </div>
      </section>
      <Tabs
        active={tab}
        onChange={setTab}
        tabBadges={{
          'a-faire': data.counts.taches,
          'alertes-liees': data.counts.alertes,
        }}
      />
      {content}
    </div>
  );
}
