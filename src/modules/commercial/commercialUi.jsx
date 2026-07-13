/** Grilles responsive — module Commercial */

export const COMMERCIAL_STAT_GRID = 'grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4';
export const COMMERCIAL_ACTION_GRID = 'grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3';
export const COMMERCIAL_SECTION = 'rounded-3xl border border-line bg-white p-6 shadow-card sm:p-6 min-w-0';

export function CommercialSection({ title, subtitle, children, className = '' }) {
  return (
    <section className={`${COMMERCIAL_SECTION} space-y-4 ${className}`}>
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
