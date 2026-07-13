const toneClasses = {
  light: 'border-line bg-card text-earth',
  white: 'border-line bg-white text-earth',
  dark: 'border-white/10 bg-white/10 text-white',
  success: 'border-positive bg-positive-bg text-positive',
  warning: 'border-vigilance bg-vigilance-bg text-horizon-dark',
  danger: 'border-urgent bg-urgent-bg text-urgent',
  info: 'border-line bg-neutral-bg text-neutral',
};

const labelClasses = {
  light: 'text-slate',
  white: 'text-slate',
  dark: 'text-white/70',
  success: 'text-positive',
  warning: 'text-horizon-dark',
  danger: 'text-urgent',
  info: 'text-neutral',
};

export default function MiniMetricCard({ label, value, sub, icon: Icon, tone = 'light', className = '' }) {
  const toneClass = toneClasses[tone] || toneClasses.light;
  const labelClass = labelClasses[tone] || labelClasses.light;

  return (
    <div className={`rounded-xl border p-3 ${toneClass} ${className}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={`text-meta font-semibold uppercase tracking-normal ${labelClass}`}>{label}</p>
          <p className="mt-1 text-base font-semibold break-words">{value}</p>
          {sub ? <p className={`mt-1 text-xs leading-relaxed ${labelClass}`}>{sub}</p> : null}
        </div>
        {Icon ? <Icon size={16} className="shrink-0 opacity-80" aria-hidden="true" /> : null}
      </div>
    </div>
  );
}
