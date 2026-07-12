import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import ModuleTabsBar from '../components/module/ModuleTabsBar.jsx';
import PeriodScopeBadge from '../components/PeriodScopeBadge.jsx';
import { applyOneClickRecommendation, createMaintenanceTask } from '../services/heyHorizonRecommendationActions.js';
import { resolveRhNavigation, resolveRhTab } from '../utils/commercialNavigation.js';
import { useOperationsRessources } from './rh/hooks/useOperationsRessources.js';
import CockpitRhMaintTab from './rh/tabs/CockpitRhMaintTab.jsx';
import PersonnelPaieTab from './rh/tabs/PersonnelPaieTab.jsx';
import ParcMaterielMaintTab from './rh/tabs/ParcMaterielMaintTab.jsx';
import RegistresAnalysesTab from './rh/tabs/RegistresAnalysesTab.jsx';

function Tabs({ active, onChange, tabBadges = {} }) {
  return (
    <div className="space-y-2">
      <ModuleTabsBar moduleId="rh" active={active} onChange={onChange} tabBadges={tabBadges} />
    </div>
  );
}

export default function OperationsRessourcesRecoveredModule(props) {
  const controlled = Boolean(props.onTabChange);
  const bootstrapNav = resolveRhNavigation(props.initialTab || 'Cockpit RH & Maintenance');
  const [internalTab, setInternalTab] = useState(() => bootstrapNav.tab || resolveRhTab(props.initialTab || 'Cockpit RH & Maintenance'));
  const tab = controlled
    ? resolveRhTab(props.initialTab || 'Cockpit RH & Maintenance')
    : internalTab;
  const [busyId, setBusyId] = useState(null);

  const applyRhNavigation = useCallback((nav) => {
    const resolvedTab = nav.tab || resolveRhTab(props.initialTab || 'Cockpit RH & Maintenance');
    if (controlled) props.onTabChange?.(resolvedTab);
    else setInternalTab(resolvedTab);
  }, [controlled, props.onTabChange, props.initialTab]);

  const navigateRh = useCallback((target = '') => {
    applyRhNavigation(resolveRhNavigation(target));
  }, [applyRhNavigation]);

  const setTab = useCallback((value) => {
    const raw = String(value || '').trim();
    const nav = resolveRhNavigation(value);
    if (controlled) {
      props.onTabChange?.(raw || nav.tab);
      return;
    }
    setInternalTab(nav.tab);
  }, [controlled, props.onTabChange]);

  useEffect(() => {
    if (!props.initialTab) return;
    const nav = resolveRhNavigation(props.initialTab);
    if (!controlled) setInternalTab(nav.tab);
  }, [controlled, props.initialTab]);

  const {
    data,
    rhProps,
    eqProps,
    actionHandlers,
    loading,
  } = useOperationsRessources(props);

  const applyFinding = async (finding) => {
    setBusyId(finding.id);
    try {
      const result = await applyOneClickRecommendation(finding, actionHandlers);
      if (result.createdTasks || result.createdAlerts) toast.success('Action suggérée créée');
      else {
        toast.success('Onglet ouvert');
        navigateRh('Parc Matériel & Maintenance');
      }
    } catch (e) {
      toast.error(e.message || 'Erreur');
    } finally {
      setBusyId(null);
    }
  };

  const scheduleMaintenance = async (row) => {
    setBusyId(row.id);
    try {
      await createMaintenanceTask({
        equipmentName: row.name,
        equipmentId: row.id,
        statusLabel: row.status,
        handlers: actionHandlers,
      });
      toast.success(`Tâche maintenance créée pour ${row.name}`);
    } catch (e) {
      toast.error(e.message || 'Erreur');
    } finally {
      setBusyId(null);
    }
  };

  const navigateToSmartFarm = () => {
    if (props.onNavigate) {
      props.onNavigate('smartfarm');
      return;
    }
    if (props.navigateToModule) {
      props.navigateToModule('smartfarm');
    }
  };

  const periodFiltered = Boolean(props.periodFiltered);

  const content = tab === 'Cockpit RH & Maintenance' ? (
    <CockpitRhMaintTab
      data={data}
      navigateRh={navigateRh}
      onApply={applyFinding}
      onSchedule={scheduleMaintenance}
      busyId={busyId}
    />
  ) : tab === 'Personnel & Paie' ? (
    <PersonnelPaieTab rhProps={rhProps} data={data} />
  ) : tab === 'Parc Matériel & Maintenance' ? (
    <ParcMaterielMaintTab
      data={data}
      eqProps={eqProps}
      navigateRh={navigateRh}
      onSchedule={scheduleMaintenance}
      busyId={busyId}
      onNavigateToSmartFarm={navigateToSmartFarm}
    />
  ) : tab === 'Registres & Analyses' ? (
    <RegistresAnalysesTab
      data={data}
      onNavigate={props.onNavigate}
      periodFiltered={periodFiltered}
      equipment={data.equipment}
      transactions={rhProps.transactions}
    />
  ) : (
    <CockpitRhMaintTab
      data={data}
      navigateRh={navigateRh}
      onApply={applyFinding}
      onSchedule={scheduleMaintenance}
      busyId={busyId}
    />
  );

  if (loading && !data.team.length && !data.equipment.length) {
    return <div className="p-8 text-center text-[#8a7456]">Chargement des registres opérationnels…</div>;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-[#9a6b12]">Ressources</p>
            <h1 className="mt-1 text-2xl font-black text-[#2f2415]">Opérations & Ressources</h1>
            <p className="mt-1 text-sm text-[#8a7456]">Cockpit RH, parc matériel, paie et registres interconnectés.</p>
            {props.periodLabel ? (
              <div className="mt-2">
                <PeriodScopeBadge label={props.periodLabel} />
              </div>
            ) : null}
          </div>
          <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] px-4 py-3 text-sm">
            <span className="text-[#8a7456]">Santé </span>
            <b className={data.healthScore >= 75 ? 'text-emerald-700' : 'text-amber-700'}>{data.healthScore}/100</b>
          </div>
        </div>
      </section>
      <Tabs
        active={tab}
        onChange={setTab}
        tabBadges={{
          'Parc Matériel & Maintenance': data.pendingMaintenanceCount,
          'Personnel & Paie': data.personnelBadgeCount,
          'Registres & Analyses': data.registresBadgeCount,
        }}
      />
      {content}
    </div>
  );
}
