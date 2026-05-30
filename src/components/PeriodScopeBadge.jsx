export default function PeriodScopeBadge({ label, className = '' }) {
  if (!label) return null;
  return (
    <span className={`inline-flex items-center rounded-full border border-[#d1e5d1] bg-[#f8fcf8] px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-[#6b8a6b] ${className}`}>
      Période · {label}
    </span>
  );
}
