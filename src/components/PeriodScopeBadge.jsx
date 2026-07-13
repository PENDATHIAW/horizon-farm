export default function PeriodScopeBadge({ label, className = '' }) {
  if (!label) return null;
  return (
    <span className={`inline-flex items-center rounded-full border border-line bg-mist px-3 py-1 text-meta font-semibold uppercase tracking-normal text-slate ${className}`}>
      Période · {label}
    </span>
  );
}
