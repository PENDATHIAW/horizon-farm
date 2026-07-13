import { fmtCurrency } from '../../utils/format.js';

function ProjectionCard({ item, onNavigate }) {
  const clickable = Boolean(item.navigate && onNavigate);
  const Tag = clickable ? 'button' : 'div';
  const toneCls = item.tone === 'warn'
    ? 'border-vigilance bg-vigilance-bg'
    : item.tone === 'good'
      ? 'border-positive bg-positive-bg'
      : 'border-line bg-card';

  const valueText = item.format === 'currency'
    ? fmtCurrency(item.value)
    : item.format === 'count'
      ? String(item.value)
      : `${Number(item.value).toLocaleString('fr-FR')}`;

  return (
    <Tag
      type={clickable ? 'button' : undefined}
      onClick={clickable ? () => onNavigate(item.navigate.module, { tab: item.navigate.tab }) : undefined}
      className={`rounded-xl border p-3 text-left ${toneCls} ${clickable ? 'cursor-pointer transition hover:shadow-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-horizon-dark' : ''}`}
    >
      <p className="text-meta font-semibold uppercase tracking-normal text-slate">{item.label}</p>
      <p className="mt-1 text-base font-semibold text-earth">{valueText}</p>
      {item.hint ? <p className="mt-1 text-meta font-medium text-slate">{item.hint}</p> : null}
    </Tag>
  );
}

export default function ModuleProjectionsStrip({
  title = 'Projections & pilotage',
  subtitle = 'Anticipation basée sur vos données ERP — même logique que l\'Accueil dirigeant.',
  projections = {},
  onNavigate,
  className = '',
}) {
  if (!projections?.hasData || !projections.items?.length) return null;

  return (
    <section className={`rounded-2xl border border-line bg-white p-4 shadow-card ${className}`}>
      <div className="mb-3">
        <p className="text-xs font-semibold uppercase tracking-normal text-slate">{title}</p>
        {subtitle ? <p className="mt-1 text-xs text-slate">{subtitle}</p> : null}
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4">
        {projections.items.map((item) => (
          <ProjectionCard key={item.id} item={item} onNavigate={onNavigate} />
        ))}
      </div>
    </section>
  );
}
