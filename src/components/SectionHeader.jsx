export default function SectionHeader({ title, sub, actions }) {
  return (
    <div className="mb-6 rounded-3xl border border-line bg-white/80 p-6 shadow-card backdrop-blur-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="mb-2 text-meta font-semibold uppercase tracking-normal text-horizon-dark">Horizon Farm</p>
          <h2 className="text-2xl font-semibold tracking-normal text-earth">{title}</h2>
          {sub ? <p className="mt-2 max-w-4xl text-sm leading-relaxed text-slate">{sub}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2 lg:justify-end">{actions}</div> : null}
      </div>
    </div>
  );
}
