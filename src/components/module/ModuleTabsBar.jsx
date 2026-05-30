import { MODULE_TARGET_TABS } from '../../config/horizonVision.config.js';

export default function ModuleTabsBar({ moduleId, active, onChange }) {
  const tabs = MODULE_TARGET_TABS[moduleId] || [];
  if (!tabs.length) return null;
  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-max gap-2 rounded-2xl border border-[#d6c3a0] bg-white p-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => onChange(tab)}
            className={`rounded-xl px-4 py-2 text-sm font-black transition whitespace-nowrap ${active === tab ? 'bg-[#22c55e] text-[#052e16]' : 'text-[#8a7456] hover:bg-[#fffdf8] hover:text-[#2f2415]'}`}
          >
            {tab}
          </button>
        ))}
      </div>
    </div>
  );
}
