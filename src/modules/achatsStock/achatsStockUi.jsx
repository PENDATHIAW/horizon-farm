/** Grilles responsive — module Achats & Stock */

export const ACHATS_STOCK_STAT_GRID = 'grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4';
export const ACHATS_STOCK_ACTION_GRID = 'grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
export const ACHATS_STOCK_SECTION = 'rounded-3xl border border-line bg-white p-6 shadow-card sm:p-6 min-w-0';

const toneValue = {
  good: 'text-positive',
  warn: 'text-horizon-dark',
  bad: 'text-urgent',
  neutral: 'text-earth',
};

export function AchatsStockKpi({ label, value, tone = 'neutral', onClick }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`rounded-2xl border border-line bg-card p-4 text-left min-w-0 ${onClick ? 'hover:border-horizon hover:bg-white transition' : ''}`}
    >
      <p className="text-meta font-semibold uppercase tracking-normal text-slate break-words">{label}</p>
      <p className={`mt-1 text-lg sm:text-xl font-semibold leading-tight break-words ${toneValue[tone] || toneValue.neutral}`}>{value}</p>
    </Tag>
  );
}

export function AchatsStockSection({ title, subtitle, children, className = '' }) {
  return (
    <section className={`${ACHATS_STOCK_SECTION} space-y-4 ${className}`}>
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

export function AchatsStockActionCard({ title, text, onClick, icon: Icon }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl border border-line bg-card p-4 sm:p-6 min-w-0 text-left w-full transition hover:bg-positive-bg hover:border-horizon-dark/40"
    >
      {Icon ? (
        <span className="mb-2 flex items-center gap-2 font-semibold text-earth">
          <Icon size={16} className="shrink-0" aria-hidden="true" />
          <span className="break-words">{title}</span>
        </span>
      ) : (
        <b className="block break-words text-earth">{title}</b>
      )}
      {text ? <p className="mt-2 text-sm leading-relaxed text-slate break-words">{text}</p> : null}
    </button>
  );
}

export function AchatsStockTodoRow({ title, detail, actionLabel, onAction, onOpen, busy }) {
  return (
    <div className="flex flex-col gap-2 border-b border-line/60 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <button type="button" onClick={onOpen} className="text-left min-w-0">
        <p className="font-semibold text-earth break-words">{title}</p>
        {detail ? <p className="text-xs text-slate break-words">{detail}</p> : null}
      </button>
      {actionLabel ? (
        <button
          type="button"
          disabled={busy}
          onClick={onAction}
          className="shrink-0 rounded-lg bg-earth px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
        >
          {busy ? '…' : actionLabel}
        </button>
      ) : null}
    </div>
  );
}
