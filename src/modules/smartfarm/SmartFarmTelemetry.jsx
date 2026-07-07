import { Radio } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import HeyHorizonQuickAsk from '../../components/HeyHorizonQuickAsk.jsx';
import ModuleTabsBar from '../../components/module/ModuleTabsBar.jsx';
import PeriodScopeBadge from '../../components/PeriodScopeBadge.jsx';
import { resolveSmartFarmNavigation, resolveSmartFarmTab } from '../../utils/commercialNavigation.js';
import { useSmartFarmTelemetry } from './hooks/useSmartFarmTelemetry.js';
import DeviceManagerTab from './tabs/DeviceManagerTab.jsx';
import TelemetryStreamTab from './tabs/TelemetryStreamTab.jsx';
import EdgeAutomationTab from './tabs/EdgeAutomationTab.jsx';

function Tabs({ active, onChange, criticalBadge = 0 }) {
  return (
    <div className="space-y-2">
      <ModuleTabsBar moduleId="smartfarm" active={active} onChange={onChange} />
      {criticalBadge > 0 && active === 'Objets connectés' ? (
        <p className="text-xs font-bold text-amber-700">{criticalBadge} signal(aux) critique(s) — consultez Objets connectés ou Activité & Suivi.</p>
      ) : null}
    </div>
  );
}

export default function SmartFarmTelemetry(props) {
  const controlled = Boolean(props.onTabChange);
  const initialNav = resolveSmartFarmNavigation(props.initialTab);
  const [internalTab, setInternalTab] = useState(() => initialNav.tab || resolveSmartFarmTab(props.initialTab));
  const tab = controlled ? resolveSmartFarmTab(props.initialTab) : internalTab;

  const { data, handlers, sensorProps, cameraProps, realtime } = useSmartFarmTelemetry(props);

  const setTab = useCallback((value) => {
    const resolved = resolveSmartFarmTab(value);
    const raw = String(value || '').trim();
    if (controlled) props.onTabChange?.(raw || resolved);
    else setInternalTab(resolved);
  }, [controlled, props.onTabChange]);

  const navigateSmartFarm = useCallback((target = '') => {
    setTab(target);
  }, [setTab]);

  useEffect(() => {
    if (!props.initialTab) return;
    const nav = resolveSmartFarmNavigation(props.initialTab);
    if (!controlled) setInternalTab(nav.tab);
  }, [controlled, props.initialTab]);

  const content = tab === 'Objets connectés' ? (
    <DeviceManagerTab
      data={data}
      handlers={handlers}
      sensorProps={sensorProps}
      cameraProps={cameraProps}
      navigateSmartFarm={navigateSmartFarm}
    />
  ) : tab === 'Flux temps réel' ? (
    <TelemetryStreamTab data={data} handlers={handlers} realtime={realtime} />
  ) : tab === 'Automatisation' ? (
    <EdgeAutomationTab handlers={handlers} />
  ) : (
    <DeviceManagerTab
      data={data}
      handlers={handlers}
      sensorProps={sensorProps}
      cameraProps={cameraProps}
      navigateSmartFarm={navigateSmartFarm}
    />
  );

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.25em] text-[#9a6b12]">
              <Radio size={16} /> Télémétrie IoT
            </p>
            <h1 className="mt-1 text-2xl font-black text-[#2f2415]">Smart Farm</h1>
            <p className="mt-1 text-sm text-[#8a7456]">
              Capteurs, caméras, flux temps réel et alertes automatiques vers Activité & Suivi.
            </p>
            {props.periodLabel ? (
              <div className="mt-2">
                <PeriodScopeBadge label={props.periodLabel} />
              </div>
            ) : null}
            <HeyHorizonQuickAsk
              moduleKey="smartfarm"
              onNavigate={props.onNavigate}
              onOpenAssistant={props.onOpenAssistant}
              className="mt-2"
            />
          </div>
          <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] px-4 py-3 text-sm">
            <span className="text-[#8a7456]">Signaux critiques </span>
            <b className={data.criticalCount ? 'text-amber-700' : 'text-emerald-700'}>{data.criticalCount}</b>
          </div>
        </div>
      </section>
      <Tabs active={tab} onChange={setTab} criticalBadge={data.criticalCount} />
      {content}
    </div>
  );
}
