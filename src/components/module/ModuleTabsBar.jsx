import { sortModuleTabsForFarm } from '../../config/farmAdaptation.js';
import { ERP_ROLES } from '../../config/moduleTabs/shared.js';
import { resolveModuleTab, visibleModuleTabs } from '../../config/moduleTabs/index.js';
import { resolveModuleFlags } from '../../config/moduleFlags.js';

export default function ModuleTabsBar({ moduleId, active, onChange, tabBadges = {}, wrap = false, activeFarm = null, role = null }) {
  const canonicalRole = ERP_ROLES.includes(role) ? role : null;
  const rawTabs = visibleModuleTabs(moduleId, {
    role: canonicalRole,
    flags: activeFarm ? resolveModuleFlags(activeFarm) : {},
  });
  const sortedLabels = sortModuleTabsForFarm(moduleId, rawTabs.map((tab) => tab.label), activeFarm);
  const tabs = sortedLabels.map((label) => rawTabs.find((tab) => tab.label === label)).filter(Boolean);
  const selected = resolveModuleTab(moduleId, active);
  if (!tabs.length) return null;
  return (
    <div className={wrap ? '' : 'overflow-x-auto'}>
      <div className={`flex gap-2 rounded-2xl border border-[#d6c3a0] bg-white p-2 ${wrap ? 'flex-wrap' : 'min-w-max'}`}>
        {tabs.map((tab) => {
          const isActive = selected?.id === tab.id;
          const badge = tabBadges[tab.id] ?? tabBadges[tab.label] ?? tabBadges[tab.component];
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.component || tab.id, tab)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-black transition whitespace-nowrap ${isActive ? 'bg-[#22c55e] text-[#052e16]' : 'text-[#8a7456] hover:bg-[#fffdf8] hover:text-[#2f2415]'}`}
            >
              {tab.label}
              {badge > 0 ? (
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-black leading-none ${isActive ? 'bg-[#052e16]/15 text-[#052e16]' : 'bg-amber-100 text-amber-800'}`}>
                  {badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
