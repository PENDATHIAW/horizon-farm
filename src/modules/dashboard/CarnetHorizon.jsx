import PeriodScopeBadge from '../../components/PeriodScopeBadge.jsx';
import { fmtCurrency } from '../../utils/format.js';
import { MapPin } from 'lucide-react';

function ProgressBar({ value = 0 }) {
  const pct = Math.min(100, Math.max(0, Number(value) || 0));
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#efe6d6]">
      <div className="h-full rounded-full bg-[#b8954a] transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}

function ScopeKpiBadge({ label }) {
  if (!label) return null;
  const toneCls = label === 'Période'
    ? 'border-sky-200 bg-sky-50 text-sky-800'
    : 'border-violet-200 bg-violet-50 text-violet-800';
  return (
    <span className={`inline-flex rounded-full border px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide ${toneCls}`}>
      {label}
    </span>
  );
}

function DomainCard({ card, onNavigate }) {
  const clickable = Boolean(card.navigate && onNavigate);
  const Tag = clickable ? 'button' : 'article';
  const handleClick = () => {
    if (!clickable) return;
    onNavigate(card.navigate.module, { tab: card.navigate.tab });
  };

  return (
    <Tag
      type={clickable ? 'button' : undefined}
      onClick={clickable ? handleClick : undefined}
      className={`carnet-domain-card flex min-h-[168px] flex-col rounded-xl border border-emerald-200/50 bg-emerald-400/10 p-3 text-left shadow-[0_1px_0_rgba(34,197,94,0.06)] ${clickable ? 'cursor-pointer transition hover:border-emerald-300 hover:bg-emerald-400/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600' : ''}`}
    >
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-base leading-none" aria-hidden="true">{card.icon}</span>
          <p className="text-[10px] font-black tracking-wide text-emerald-800/80">{card.title}</p>
        </div>
        <ScopeKpiBadge label={card.scopeLabel} />
      </div>
      <p className="mt-2 text-sm font-black leading-tight text-[#2f2415]">{card.headline}</p>
      <ul className="mt-2 flex-1 space-y-0.5">
        {card.lines.map((line, index) => (
          <li key={`${card.id}-line-${index}`} className="text-[11px] leading-snug text-[#5c4d38]">
            • {line.text}
          </li>
        ))}
      </ul>
      {card.alerts?.length ? (
        <ul className="mt-2 space-y-0.5 border-t border-emerald-200/40 pt-2">
          {card.alerts.map((alert, index) => (
            <li key={`${card.id}-alert-${index}`} className="text-[10px] font-semibold leading-snug text-amber-800">
              ⚠ {alert.text}
            </li>
          ))}
        </ul>
      ) : null}
      {clickable ? (
        <p className="mt-2 text-[10px] font-black text-emerald-800/70">Ouvrir le module →</p>
      ) : null}
    </Tag>
  );
}

function ObjectifBlock({ block, onNavigate }) {
  const clickable = Boolean(block.navigate && onNavigate);
  const Tag = clickable ? 'button' : 'div';
  const handleClick = () => {
    if (!clickable) return;
    onNavigate(block.navigate.module, { tab: block.navigate.tab });
  };

  return (
    <Tag
      type={clickable ? 'button' : undefined}
      onClick={clickable ? handleClick : undefined}
      className={`min-w-0 flex-1 rounded-lg border border-[#efe6d6] bg-white/60 p-3 text-left ${clickable ? 'cursor-pointer transition hover:border-[#d9c9a8] hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9a6b12]' : ''}`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-black uppercase tracking-wide text-[#8a7456]">{block.label}</p>
        <ScopeKpiBadge label={block.scopeLabel} />
      </div>
      <p className="mt-1 text-xs font-black text-[#2f2415]">
        {fmtCurrency(block.realized)}
        <span className="font-medium text-[#8a7456]"> / {fmtCurrency(block.target)}</span>
      </p>
      <div className="mt-2">
        <ProgressBar value={block.attainment} />
      </div>
      <p className="mt-1 text-[10px] font-semibold text-[#9a6b12]">{block.attainment} % atteint</p>
    </Tag>
  );
}

export function CarnetHorizonHeader({
  displayName = 'Exploitant',
  location = 'Ferme principale',
  periodLabel = '',
}) {
  return (
    <section className="carnet-v2-hero rounded-xl border border-[#e5dcc8] bg-[#fffdf8] px-4 py-3 shadow-[0_1px_0_rgba(47,36,21,0.04)]">
      <h1 className="text-lg font-black text-[#2f2415] sm:text-xl">Bonjour {displayName}</h1>
      <p className="text-xs text-[#5c4d38]">Voici l&apos;état de votre exploitation</p>
      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-[#8a7456]">
        {periodLabel ? <PeriodScopeBadge label={periodLabel} /> : null}
        <span className="inline-flex items-center gap-1">
          <MapPin size={12} aria-hidden="true" />
          {location}
        </span>
      </div>
    </section>
  );
}

export default function CarnetHorizon({ carnet, onNavigate }) {
  if (!carnet) return null;

  const journalItems = carnet.journal?.items || [];

  return (
    <div className="carnet-dirigeant-root space-y-2.5">
      <style>{`
        .carnet-dirigeant-root {
          max-height: calc(100vh - 9rem);
          overflow: hidden;
        }
        @media (max-width: 1023px) {
          .carnet-dirigeant-root {
            max-height: none;
            overflow: visible;
          }
        }
      `}</style>

      <div className="grid grid-cols-2 gap-2 xl:grid-cols-4 xl:gap-2.5">
        {(carnet.domains || []).map((card) => (
          <DomainCard key={card.id} card={card} onNavigate={onNavigate} />
        ))}
      </div>

      {carnet.objectifs ? (
        <section className="rounded-xl border border-[#e5dcc8] bg-[#fffdf8] px-3 py-2.5">
          <h2 className="mb-2 text-[10px] font-black uppercase tracking-wide text-[#8a7456]">Objectifs de l&apos;exploitation</h2>
          <div className="flex flex-col gap-2 sm:flex-row">
            <ObjectifBlock block={carnet.objectifs.month} onNavigate={onNavigate} />
            <ObjectifBlock block={carnet.objectifs.year} onNavigate={onNavigate} />
          </div>
        </section>
      ) : null}

      <section className="rounded-xl border border-[#e5dcc8] bg-[#faf6ee] px-3 py-2.5">
        <p className="text-[10px] font-black uppercase tracking-wide text-[#9a6b12]">💡 {carnet.conseil?.title || 'Conseil Horizon'}</p>
        <div className="mt-1.5 space-y-0.5 text-[11px] leading-snug text-[#2f2415]">
          <p><span className="font-black text-[#8a7456]">Situation —</span> {carnet.conseil?.situation || carnet.conseil?.text}</p>
          {carnet.conseil?.cause ? <p><span className="font-black text-[#8a7456]">Cause —</span> {carnet.conseil.cause}</p> : null}
          {carnet.conseil?.action ? <p><span className="font-black text-[#8a7456]">Action —</span> {carnet.conseil.action}</p> : null}
        </div>
      </section>

      <section className="rounded-xl border border-[#e5dcc8] bg-[#fffdf8] px-3 py-2.5">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <h2 className="text-[10px] font-black uppercase tracking-wide text-[#8a7456]">Journal d&apos;exploitation</h2>
          {onNavigate ? (
            <button
              type="button"
              onClick={() => onNavigate('sync_activity')}
              className="text-[10px] font-black text-[#9a6b12] hover:underline"
            >
              Voir tout →
            </button>
          ) : null}
        </div>
        <ul className="grid grid-cols-1 gap-0.5 sm:grid-cols-2">
          {journalItems.map((item, index) => (
            <li key={`journal-${index}`} className="flex items-start gap-1.5 text-[11px] leading-snug text-[#2f2415]">
              <span className="shrink-0 font-black text-emerald-700" aria-hidden="true">{item.icon}</span>
              <span>{item.text}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
