export function Stat({ label, value, tone = 'neutral' }) {
  const cls = tone === 'good' ? 'text-positive' : tone === 'warn' ? 'text-horizon-dark' : tone === 'bad' ? 'text-urgent' : 'text-earth';
  return (
    <div className="rounded-2xl border border-line bg-card p-4">
      <p className="text-xs text-slate">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${cls}`}>{value}</p>
    </div>
  );
}

export default function ModuleListHub({ title, intro, stats = [], rows = [], emptyLabel = 'Aucun élément.', onNavigate, actionModule }) {
  return (
    <div className="space-y-6">
      {stats.length ? <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{stats.map((s) => <Stat key={s.label} {...s} />)}</div> : null}
      <section className="rounded-3xl border border-line bg-white p-6 shadow-card">
        <h2 className="text-lg font-semibold text-earth">{title}</h2>
        {intro ? <p className="mt-2 text-sm text-slate">{intro}</p> : null}
        <div className="mt-4 divide-y divide-line/70">
          {rows.length ? rows.slice(0, 14).map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={() => (row.onClick ? row.onClick() : onNavigate?.(row.module || actionModule))}
              className="grid w-full grid-cols-1 gap-1 py-3 text-left hover:bg-card md:grid-cols-[1fr_auto] md:items-center"
            >
              <span className="font-semibold text-earth">{row.title}</span>
              <span className="text-sm text-slate">{row.detail}{row.value ? ` · ${row.value}` : ''}</span>
            </button>
          )) : <p className="text-sm text-slate">{emptyLabel}</p>}
        </div>
      </section>
    </div>
  );
}
