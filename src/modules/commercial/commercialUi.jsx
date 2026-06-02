/** Grilles responsive — module Commercial */

export const COMMERCIAL_STAT_GRID = 'grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4';
export const COMMERCIAL_ACTION_GRID = 'grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3';
export const COMMERCIAL_SECTION = 'rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm sm:p-6 min-w-0';

export function CommercialSection({ title, subtitle, children, className = '' }) {
  return (
    <section className={`${COMMERCIAL_SECTION} space-y-4 ${className}`}>
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
