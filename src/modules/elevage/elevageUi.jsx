/** Grilles et cartes responsive pour le module Élevage — évite les colonnes trop étroites. */

export const ELEVAGE_STAT_GRID = 'grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4';
export const ELEVAGE_ACTION_GRID = 'grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3';
export const ELEVAGE_FORM_GRID = 'grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
export const ELEVAGE_KPI_GRID = 'grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6';
export const ELEVAGE_SECTION = 'rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm sm:p-6 min-w-0';
export const ELEVAGE_CARD = 'rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 sm:p-5 min-w-0 text-left';

const toneValue = {
  good: 'text-emerald-600',
  warn: 'text-amber-600',
  bad: 'text-red-600',
  neutral: 'text-[#2f2415]',
};

export function ElevageStatCard({ label, value, tone = 'neutral' }) {
  return (
    <div className={`${ELEVAGE_CARD} space-y-1`}>
      <p className="text-xs leading-snug text-[#8a7456] break-words">{label}</p>
      <p className={`text-lg sm:text-xl font-black leading-tight break-words ${toneValue[tone] || toneValue.neutral}`}>{value}</p>
    </div>
  );
}

export function ElevageActionCard({ title, text, onClick, icon: Icon }) {
  return (
    <button type="button" onClick={onClick} className={`${ELEVAGE_CARD} w-full transition hover:bg-[#dcfce7] hover:border-[#9a6b12]/40`}>
      {Icon ? (
        <span className="mb-2 flex items-center gap-2 font-black text-[#2f2415]">
          <Icon size={16} className="shrink-0" aria-hidden="true" />
          <span className="break-words text-left">{title}</span>
        </span>
      ) : (
        <b className="block break-words text-[#2f2415]">{title}</b>
      )}
      {text ? <p className="mt-1.5 text-sm leading-relaxed text-[#8a7456] break-words">{text}</p> : null}
    </button>
  );
}

export function ElevageSection({ title, subtitle, children, className = '' }) {
  return (
    <section className={`${ELEVAGE_SECTION} space-y-4 ${className}`}>
      {title ? (
        <div className="min-w-0">
          <h2 className="text-lg font-black text-[#2f2415] break-words">{title}</h2>
          {subtitle ? <p className="mt-1.5 text-sm leading-relaxed text-[#8a7456] break-words">{subtitle}</p> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function ElevageLogRow({ title, detail, value }) {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-2 border-b border-[#eadcc2]/70 py-3 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
      <div className="min-w-0">
        <b className="block text-sm text-[#2f2415] break-words">{title}</b>
        {detail ? <p className="mt-0.5 text-xs leading-relaxed text-[#8a7456] break-words">{detail}</p> : null}
      </div>
      {value != null ? <span className="text-sm font-black text-[#8a7456] sm:text-right break-words">{value}</span> : null}
    </div>
  );
}
