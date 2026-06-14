import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import ModuleTabsBar from '../components/module/ModuleTabsBar.jsx';
import { applyOneClickRecommendation, createAlertResolutionTask } from '../services/heyHorizonRecommendationActions.js';
import PeriodScopeBadge from '../components/PeriodScopeBadge.jsx';
import { resolveActiviteSuiviTab, resolveActiviteSuiviNavigation } from '../utils/commercialNavigation.js';
import { useActiviteSuivi } from './activiteSuivi/hooks/useActiviteSuivi.js';
import CockpitDecisionsTab from './activiteSuivi/tabs/CockpitDecisionsTab.jsx';
import ATraiterMaintenantTab from './activiteSuivi/tabs/ATraiterMaintenantTab.jsx';
import RegistreTracabiliteTab from './activiteSuivi/tabs/RegistreTracabiliteTab.jsx';
import PerformanceAnalytiqueTab from './activiteSuivi/tabs/PerformanceAnalytiqueTab.jsx';

function Tabs({ active, onChange, badgeCount = 0 }) {
  return (
    <div className="space-y-2">
      <ModuleTabsBar moduleId="activite_suivi" active={active} onChange={onChange} />
      {badgeCount > 0 && active !== 'À traiter maintenant' ? (
        <p className="text-xs font-bold text-amber-700">{badgeCount} élément(s) à traiter — onglet « À traiter maintenant ».</p>
      ) : null}
    </div>
  );
}

export default function ActiviteSuiviRecoveredModule(props) {
  const initialNav = resolveActiviteSuiviNavigation(props.initialTab);
  const [tab, setTab] = useState(() => initialNav.tab || resolveActiviteSuiviTab(props.initialTab));
  const [busyId, setBusyId] = useState(null);

  const {
    data,
    alertes,
    tasks,
    traceRows,
    actionHandlers,
    bridgeProps,
    shared,
    workflowBridgeProps,
    refresh,
    crud,
  } = useActiviteSuivi(props);

  const navigateActivite = (target = '') => {
    const nav = resolveActiviteSuiviNavigation(target);
    setTab(nav.tab);
  };

  useEffect(() => {
    if (props.initialTab) {
      const nav = resolveActiviteSuiviNavigation(props.initialTab);
      setTab(nav.tab);
    }
  }, [props.initialTab]);

  const applyFinding = async (finding) => {
    setBusyId(finding.id);
    try {
      const result = await applyOneClickRecommendation(finding, actionHandlers);
      if (result.createdTasks || result.createdAlerts) toast.success('Tâche IA créée');
      else {
        toast.success('Onglet ouvert');
        navigateActivite('À traiter maintenant');
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

  const content = tab === 'Cockpit & décisions' ? (
    <CockpitDecisionsTab
      data={data}
      navigateActivite={navigateActivite}
      onApply={applyFinding}
      onResolveAlert={resolveAlert}
      busyId={busyId}
      onNavigate={props.onNavigate}
    />
  ) : tab === 'À traiter maintenant' ? (
    <ATraiterMaintenantTab
      shared={shared}
      bridgeProps={bridgeProps}
      workflowBridgeProps={workflowBridgeProps}
      onRefresh={refresh}
    />
  ) : tab === 'Registre & traçabilité' ? (
    <RegistreTracabiliteTab shared={shared} traceRows={traceRows} traceCrud={crud.traceCrud} props={props} />
  ) : tab === 'Performance & analytique' ? (
    <PerformanceAnalytiqueTab data={data} tasks={tasks} alertes={alertes} onNavigate={props.onNavigate} />
  ) : (
    <CockpitDecisionsTab
      data={data}
      navigateActivite={navigateActivite}
      onApply={applyFinding}
      onResolveAlert={resolveAlert}
      busyId={busyId}
      onNavigate={props.onNavigate}
    />
  );

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-[#9a6b12] font-black">Suivi</p>
            <h1 className="mt-1 text-2xl font-black text-[#2f2415]">Activité & Suivi</h1>
            <p className="mt-1 text-sm text-[#8a7456]">Cockpit, traitement immédiat, traçabilité et performance.</p>
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
      <Tabs active={tab} onChange={setTab} badgeCount={data.counts.openTotal} />
      {content}
    </div>
  );
}
