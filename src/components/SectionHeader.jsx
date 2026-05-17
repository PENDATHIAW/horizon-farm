export default function SectionHeader({ title, sub, actions }) {
  return (
    <div className="mb-6 rounded-3xl border border-[#eadcc2] bg-white/80 p-5 shadow-sm backdrop-blur-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="mb-2 text-[11px] font-black uppercase tracking-[0.25em] text-[#9a6b12]">Horizon Farm</p>
          <h2 className="text-2xl font-black tracking-tight text-[#2f2415]">{title}</h2>
          {sub ? <p className="mt-2 max-w-4xl text-sm leading-relaxed text-[#8a7456]">{sub}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2 lg:justify-end">{actions}</div> : null}
      </div>
    </div>
  );
}
