import { Tractor } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import ModuleAnnexeTab from '../components/module/ModuleAnnexeTab.jsx';
import ModuleGraphiquesTab from '../components/module/ModuleGraphiquesTab.jsx';
import ModuleTabsBar from '../components/module/ModuleTabsBar.jsx';
import { MODULE_TARGET_TABS } from '../config/horizonVision.config.js';
import { fmtNumber } from '../utils/format';
import SmartFarmPanel from './SmartFarmPanel.jsx';

const tabs = MODULE_TARGET_TABS.smartfarm || ['Résumé', 'Capteurs', 'Caméras', 'Annexe', 'Graphiques'];

function resolveSmartFarmTab(value = '') {
  const raw = String(value || '').trim();
  if (tabs.includes(raw)) return raw;
  const lower = raw.toLowerCase();
  if (lower.includes('capteur') || lower.includes('sensor')) return 'Capteurs';
  if (lower.includes('cam')) return 'Caméras';
  if (lower.includes('annexe')) return 'Annexe';
  if (lower.includes('graph')) return 'Graphiques';
  return 'Résumé';
}

export default function SmartFarmRecoveredModule(props) {
  const [tab, setTab] = useState(() => resolveSmartFarmTab(props.initialTab));

  useEffect(() => {
    if (props.initialTab) setTab(resolveSmartFarmTab(props.initialTab));
  }, [props.initialTab]);

  const sensors = props.sensors || [];
  const cameras = props.cameras || [];
  const offlineCount = useMemo(
    () => [...sensors, ...cameras].filter((row) => ['offline', 'hors_ligne', 'hors service', 'panne'].includes(String(row.status || row.statut || '').toLowerCase())).length,
    [sensors, cameras],
  );

  const panelProps = { ...props, embedded: true };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-[#9a6b12] font-black">Terrain connecté</p>
            <h1 className="mt-1 flex items-center gap-2 text-2xl font-black text-[#2f2415]">
              <Tractor size={22} /> Smart Farm
            </h1>
            <p className="mt-1 text-sm text-[#8a7456]">Capteurs, caméras, météo et signaux terrain — pilotage à distance.</p>
          </div>
          <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] px-4 py-3 text-sm">
            <span className="text-[#8a7456]">Capteurs </span>
            <b className="text-[#2f2415]">{fmtNumber(sensors.length)}</b>
            <span className="mx-2 text-[#d6c3a0]">·</span>
            <span className="text-[#8a7456]">Caméras </span>
            <b className="text-[#2f2415]">{fmtNumber(cameras.length)}</b>
            {offlineCount ? (
              <>
                <span className="mx-2 text-[#d6c3a0]">·</span>
                <b className="text-amber-700">{offlineCount} hors ligne</b>
              </>
            ) : null}
          </div>
        </div>
        <div className="mt-4">
          <ModuleTabsBar moduleId="smartfarm" active={tab} onChange={setTab} tabBadges={{ Capteurs: sensors.length, Caméras: cameras.length }} />
        </div>
      </section>

      {tab === 'Résumé' ? <SmartFarmPanel {...panelProps} section="resume" /> : null}
      {tab === 'Capteurs' ? <SmartFarmPanel {...panelProps} section="capteurs" /> : null}
      {tab === 'Caméras' ? <SmartFarmPanel {...panelProps} section="cameras" /> : null}
      {tab === 'Annexe' ? (
        <ModuleAnnexeTab
          moduleId="smartfarm"
          dataMap={{
            ...props.dataMap,
            sensor_devices: sensors,
            camera_devices: cameras,
            smartfarm_events: props.dataMap?.smartfarm_events || [],
          }}
          onNavigate={props.onNavigate}
        />
      ) : null}
      {tab === 'Graphiques' ? (
        <ModuleGraphiquesTab moduleId="smartfarm" sensors={sensors} cameras={cameras} meteo={props.meteo} />
      ) : null}
    </div>
  );
}
