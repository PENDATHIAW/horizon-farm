export default function AvicoleActivityTabs({ activeType, onChange, pondeusesCount = 0, chairCount = 0 }) {
  const tabs = [
    { key: 'Pondeuse', label: 'Pondeuses', count: pondeusesCount, sub: 'Oeufs, ponte, reforme' },
    { key: 'Chair', label: 'Chair', count: chairCount, sub: 'Croissance, vente, marge' },
  ];

  return (
    <div className="grid grid-cols-2 gap-2">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={`rounded-2xl border px-4 py-3 text-left transition-all ${activeType === tab.key ? 'bg-[#2f2415] text-white border-[#2f2415]' : 'bg-white text-[#8a7456] border-[#d6c3a0]'}`}
        >
          <p className="text-xs uppercase tracking-wide">Activite avicole</p>
          <p className="font-black">{tab.label}</p>
          <p className="text-xs opacity-75">{tab.count} lots - {tab.sub}</p>
        </button>
      ))}
    </div>
  );
}
