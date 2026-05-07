export default function SectionHeader({ title, sub, actions }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
      <div>
        <h2 className="text-xl font-bold text-[#2f2415]">{title}</h2>
        {sub ? <p className="text-sm text-[#8a7456] mt-1">{sub}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}


