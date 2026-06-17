import { fmtCurrency } from '../../utils/format.js';

function ProjectionCard({ item, onNavigate }) {
  const clickable = Boolean(item.navigate && onNavigate);
  const Tag = clickable ? 'button' : 'div';
  const toneCls = item.tone === 'warn'
    ? 'border-amber-200 bg-amber-50/90'
    : item.tone === 'good'
      ? 'border-emerald-200 bg-emerald-50/90'
      : 'border-[#eadcc2] bg-[#fffdf8]';

  const valueText = item.format === 'currency'
    ? fmtCurrency(item.value)
    : item.format === 'count'
      ? String(item.value)
      : `${Number(item.value).toLocaleString('fr-FR')}`;

  return (
    <Tag
      type={clickable ? 'button' : undefined}
      onClick={clickable ? () => onNavigate(item.navigate.module, { tab: item.navigate.tab }) : undefined}
      className={`rounded-xl border p-3 text-left ${toneCls} ${clickable ? 'cursor-pointer transition hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9a6b12]' : ''}`}
    >
      <p className="text-[10px] font-black uppercase tracking-wide text-[#8a7456]">{item.label}</p>
      <p className="mt-0.5 text-base font-black text-[#2f2415]">{valueText}</p>
      {item.hint ? <p className="mt-0.5 text-[11px] font-medium text-[#8a7456]">{item.hint}</p> : null}
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
    <section className={`rounded-2xl border border-[#d6c3a0] bg-white p-4 shadow-sm ${className}`}>
      <div className="mb-3">
        <p className="text-xs font-black uppercase tracking-widest text-[#8a7456]">{title}</p>
        {subtitle ? <p className="mt-0.5 text-xs text-[#8a7456]">{subtitle}</p> : null}
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4">
        {projections.items.map((item) => (
          <ProjectionCard key={item.id} item={item} onNavigate={onNavigate} />
        ))}
      </div>
    </section>
  );
}
