import { useEffect, useState } from 'react';

export function DetailSheetTabBtn({ active, label, icon: Icon, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border ${active ? 'bg-[#2f2415] border-[#2f2415] text-white' : 'bg-white border-[#d6c3a0] text-[#7d6a4a] hover:border-[#b6975f]'}`}
    >
      {Icon ? <Icon size={12} /> : null}
      {label}
    </button>
  );
}

export default function DetailSheetTabs({ tabs = [], defaultTab, onChange, children }) {
  const firstId = tabs[0]?.id || '';
  const [activeTab, setActiveTab] = useState(defaultTab || firstId);

  useEffect(() => {
    if (defaultTab) setActiveTab(defaultTab);
  }, [defaultTab]);

  const setTab = (id) => {
    setActiveTab(id);
    onChange?.(id);
  };

  const active = tabs.find((tab) => tab.id === activeTab) || tabs[0];

  return (
    <div className="space-y-4">
      {tabs.length > 1 ? (
        <div className="flex flex-wrap gap-2 rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-2">
          {tabs.map((tab) => (
            <DetailSheetTabBtn
              key={tab.id}
              active={active?.id === tab.id}
              label={tab.label}
              icon={tab.icon}
              onClick={() => setTab(tab.id)}
            />
          ))}
        </div>
      ) : null}
      <div>{active ? children(active) : null}</div>
    </div>
  );
}
