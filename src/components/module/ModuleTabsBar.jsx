import { MODULE_TARGET_TABS } from '../../config/horizonVision.config.js';
import { sortModuleTabsForFarm } from '../../config/farmAdaptation.js';

export default function ModuleTabsBar({ moduleId, active, onChange, tabBadges = {}, wrap = false, activeFarm = null }) {
  const rawTabs = MODULE_TARGET_TABS[moduleId] || [];
  const tabs = sortModuleTabsForFarm(moduleId, rawTabs, activeFarm);
  if (!tabs.length) return null;
  return (
    <div className={wrap ? '' : 'overflow-x-auto'}>
      <div className={`flex gap-2 rounded-2xl border border-[#d6c3a0] bg-white p-2 ${wrap ? 'flex-wrap' : 'min-w-max'}`}>
        {tabs.map((tab) => {
          const badge = tabBadges[tab];
          return (
            <button
              key={tab}
              type="button"
              onClick={() => onChange(tab)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-black transition whitespace-nowrap ${active === tab ? 'bg-[#22c55e] text-[#052e16]' : 'text-[#8a7456] hover:bg-[#fffdf8] hover:text-[#2f2415]'}`}
            >
              {tab}
              {badge > 0 ? (
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-black leading-none ${active === tab ? 'bg-[#052e16]/15 text-[#052e16]' : 'bg-amber-100 text-amber-800'}`}>
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
