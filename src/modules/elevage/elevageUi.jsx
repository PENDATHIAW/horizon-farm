/** Grilles et cartes responsive pour le module Élevage — évite les colonnes trop étroites. */

export const ELEVAGE_STAT_GRID = 'grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4';
export const ELEVAGE_ACTION_GRID = 'grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3';
export const ELEVAGE_FORM_GRID = 'grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
export const ELEVAGE_KPI_GRID = 'grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6';
export const ELEVAGE_SECTION = 'rounded-3xl border border-line bg-white p-6 shadow-card sm:p-6 min-w-0';
export const ELEVAGE_CARD = 'rounded-2xl border border-line bg-card p-4 sm:p-6 min-w-0 text-left';

const toneValue = {
  good: 'text-positive',
  warn: 'text-horizon-dark',
  bad: 'text-urgent',
  neutral: 'text-earth',
};

export function ElevageStatCard({ label, value, tone = 'neutral' }) {
  return (
    <div className={`${ELEVAGE_CARD} space-y-1`}>
      <p className="text-xs leading-snug text-slate break-words">{label}</p>
      <p className={`text-lg sm:text-xl font-semibold leading-tight break-words ${toneValue[tone] || toneValue.neutral}`}>{value}</p>
    </div>
  );
}

export function ElevageActionCard({ title, text, onClick, icon: Icon }) {
  return (
    <button type="button" onClick={onClick} className={`${ELEVAGE_CARD} w-full transition hover:bg-positive-bg hover:border-horizon-dark/40`}>
      {Icon ? (
        <span className="mb-2 flex items-center gap-2 font-semibold text-earth">
          <Icon size={16} className="shrink-0" aria-hidden="true" />
          <span className="break-words text-left">{title}</span>
        </span>
      ) : (
        <b className="block break-words text-earth">{title}</b>
      )}
      {text ? <p className="mt-2 text-sm leading-relaxed text-slate break-words">{text}</p> : null}
    </button>
  );
}

export function ElevageSection({ title, subtitle, children, className = '' }) {
  return (
    <section className={`${ELEVAGE_SECTION} space-y-4 ${className}`}>
      {title ? (
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-earth break-words">{title}</h2>
          {subtitle ? <p className="mt-2 text-sm leading-relaxed text-slate break-words">{subtitle}</p> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function ElevageLogRow({ title, detail, value }) {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-2 border-b border-line/70 py-3 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
      <div className="min-w-0">
        <b className="block text-sm text-earth break-words">{title}</b>
        {detail ? <p className="mt-1 text-xs leading-relaxed text-slate break-words">{detail}</p> : null}
      </div>
      {value != null ? <span className="text-sm font-semibold text-slate sm:text-right break-words">{value}</span> : null}
    </div>
  );
}
