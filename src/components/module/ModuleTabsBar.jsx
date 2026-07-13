import { sortModuleTabsForFarm } from '../../config/farmAdaptation.js';
import { ERP_ROLES } from '../../config/moduleTabs/shared.js';
import { resolveModuleTab, visibleModuleTabs } from '../../config/moduleTabs/index.js';
import { resolveModuleFlags } from '../../config/moduleFlags.js';
import ModuleOverviewStrip from './ModuleOverviewStrip.jsx';

/** Barre d'onglets issue de la configuration canonique de chaque module. */
export default function ModuleTabsBar({ moduleId, active, onChange, tabBadges = {}, wrap = false, activeFarm = null, role = null, rolesMasquesPour = null }) {
  const requestedRole = role || rolesMasquesPour;
  const canonicalRole = ERP_ROLES.includes(requestedRole) ? requestedRole : null;
  const rawTabs = visibleModuleTabs(moduleId, {
    role: canonicalRole,
    flags: activeFarm ? resolveModuleFlags(activeFarm) : {},
  });
  const sortedLabels = sortModuleTabsForFarm(moduleId, rawTabs.map((tab) => tab.label), activeFarm);
  const tabs = sortedLabels.map((label) => rawTabs.find((tab) => tab.label === label)).filter(Boolean);
  const selected = resolveModuleTab(moduleId, active);
  if (!tabs.length) return null;
  return (
    <div className="space-y-4">
      {moduleId !== 'dashboard' ? <ModuleOverviewStrip moduleId={moduleId} /> : null}
      <div className={wrap ? '' : 'overflow-x-auto'}>
        <div
          role="tablist"
          aria-label={`Navigation ${moduleId}`}
          className={`flex gap-2 rounded-card border border-line bg-card p-2 shadow-card ${wrap ? 'flex-wrap' : 'min-w-max'}`}
        >
          {tabs.map((tab) => {
            const isActive = selected?.id === tab.id;
            const badge = tabBadges[tab.id] ?? tabBadges[tab.label] ?? tabBadges[tab.component];
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-label={tab.label}
                aria-selected={isActive}
                onClick={() => onChange(tab.component || tab.id, tab)}
                className={`inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-control px-4 py-2 text-sm font-semibold transition ${isActive ? 'bg-earth text-pure' : 'text-slate hover:bg-mist hover:text-earth'}`}
              >
                {tab.label}
                {badge > 0 ? (
                  <span className={`rounded-full px-2 py-1 text-meta font-semibold leading-none ${isActive ? 'bg-positive-bg text-earth' : 'bg-vigilance-bg text-horizon-dark'}`}>
                    {badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
