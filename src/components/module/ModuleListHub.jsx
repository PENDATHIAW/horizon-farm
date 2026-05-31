export function Stat({ label, value, tone = 'neutral' }) {
  const cls = tone === 'good' ? 'text-emerald-600' : tone === 'warn' ? 'text-amber-600' : tone === 'bad' ? 'text-red-600' : 'text-[#2f2415]';
  return (
    <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
      <p className="text-xs text-[#8a7456]">{label}</p>
      <p className={`mt-1 text-xl font-black ${cls}`}>{value}</p>
    </div>
  );
}

export default function ModuleListHub({ title, intro, stats = [], rows = [], emptyLabel = 'Aucun élément.', onNavigate, actionModule }) {
  return (
    <div className="space-y-5">
      {stats.length ? <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{stats.map((s) => <Stat key={s.label} {...s} />)}</div> : null}
      <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm">
        <h2 className="text-lg font-black text-[#2f2415]">{title}</h2>
        {intro ? <p className="mt-2 text-sm text-[#8a7456]">{intro}</p> : null}
        <div className="mt-4 divide-y divide-[#eadcc2]/70">
          {rows.length ? rows.slice(0, 14).map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={() => (row.onClick ? row.onClick() : onNavigate?.(row.module || actionModule))}
              className="grid w-full grid-cols-1 gap-1 py-3 text-left hover:bg-[#fffdf8] md:grid-cols-[1fr_auto] md:items-center"
            >
              <span className="font-black text-[#2f2415]">{row.title}</span>
              <span className="text-sm text-[#8a7456]">{row.detail}{row.value ? ` · ${row.value}` : ''}</span>
            </button>
          )) : <p className="text-sm text-[#8a7456]">{emptyLabel}</p>}
        </div>
      </section>
    </div>
  );
}
