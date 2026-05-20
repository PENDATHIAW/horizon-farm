const toneClasses = {
  light: 'border-[#eadcc2] bg-[#fffdf8] text-[#2f2415]',
  white: 'border-[#eadcc2] bg-white text-[#2f2415]',
  dark: 'border-white/10 bg-white/10 text-white',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  danger: 'border-red-200 bg-red-50 text-red-800',
  info: 'border-sky-200 bg-sky-50 text-sky-800',
};

const labelClasses = {
  light: 'text-[#8a7456]',
  white: 'text-[#8a7456]',
  dark: 'text-white/70',
  success: 'text-emerald-700',
  warning: 'text-amber-700',
  danger: 'text-red-700',
  info: 'text-sky-700',
};

export default function MiniMetricCard({ label, value, sub, icon: Icon, tone = 'light', className = '' }) {
  const toneClass = toneClasses[tone] || toneClasses.light;
  const labelClass = labelClasses[tone] || labelClasses.light;

  return (
    <div className={`rounded-xl border p-3 ${toneClass} ${className}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={`text-[11px] font-bold uppercase tracking-wide ${labelClass}`}>{label}</p>
          <p className="mt-1 text-base font-black break-words">{value}</p>
          {sub ? <p className={`mt-1 text-xs leading-relaxed ${labelClass}`}>{sub}</p> : null}
        </div>
        {Icon ? <Icon size={16} className="shrink-0 opacity-80" aria-hidden="true" /> : null}
      </div>
    </div>
  );
}
