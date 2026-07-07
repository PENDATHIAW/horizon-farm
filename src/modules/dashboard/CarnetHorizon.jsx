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
        <p className="text-[10px] font-black tracking-wide text-emerald-800/80">{card.title}</p>
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

function ProjectionCard({ item, onNavigate }) {
  const clickable = Boolean(item.navigate && onNavigate);
  const Tag = clickable ? 'button' : 'div';
  const toneCls = item.tone === 'warn'
    ? 'border-amber-200 bg-amber-50/80'
    : item.tone === 'good'
      ? 'border-emerald-200 bg-emerald-50/80'
      : 'border-[#efe6d6] bg-white/70';
  const valueText = item.format === 'currency'
    ? fmtCurrency(item.value)
    : item.format === 'count'
      ? String(item.value)
      : `${Number(item.value).toLocaleString('fr-FR')}`;

  return (
    <Tag
      type={clickable ? 'button' : undefined}
      onClick={clickable ? () => onNavigate(item.navigate.module, { tab: item.navigate.tab }) : undefined}
      className={`rounded-lg border p-2.5 text-left ${toneCls} ${clickable ? 'cursor-pointer transition hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9a6b12]' : ''}`}
    >
      <p className="text-[9px] font-black uppercase tracking-wide text-[#8a7456]">{item.label}</p>
      <p className="mt-0.5 text-sm font-black text-[#2f2415]">{valueText}</p>
      {item.hint ? <p className="mt-0.5 text-[10px] font-medium text-[#8a7456]">{item.hint}</p> : null}
    </Tag>
  );
}

function PriorityRow({ item, onNavigate }) {
  const clickable = Boolean(item.moduleKey && onNavigate);
  const toneCls = item.tone === 'red'
    ? 'border-red-200 bg-red-50 hover:bg-red-100/70'
    : 'border-amber-200 bg-amber-50 hover:bg-amber-100/70';
  const Tag = clickable ? 'button' : 'div';
  const handleClick = () => {
    if (!clickable) return;
    onNavigate(item.moduleKey, item.tab ? { tab: item.tab } : undefined);
  };

  return (
    <Tag
      type={clickable ? 'button' : undefined}
      onClick={clickable ? handleClick : undefined}
      className={`flex w-full items-start justify-between gap-2 rounded-lg border p-2.5 text-left ${toneCls} ${clickable ? 'cursor-pointer transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9a6b12]' : ''}`}
    >
      <span className="min-w-0">
        <b className="text-xs text-[#2f2415]">{item.title}</b>
        {item.detail ? <span className="mt-0.5 block text-[10px] text-[#5c4d38]">{item.detail}</span> : null}
      </span>
      {clickable ? <span className="shrink-0 text-[10px] font-black text-[#9a6b12]">→</span> : null}
    </Tag>
  );
}

function InvestorReadinessStrip({ investor, onNavigate }) {
  if (!investor || investor.score == null) return null;
  const score = investor.score ?? 0;
  const toneCls = score >= 80
    ? 'border-emerald-200 bg-emerald-50/80'
    : score >= 55
      ? 'border-amber-200 bg-amber-50/80'
      : 'border-[#eadcc2] bg-[#fffdf8]';

  return (
    <section className={`rounded-xl border px-3 py-2.5 ${toneCls}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-wide text-[#9a6b12]">Préparation investisseur</p>
          <p className="mt-0.5 text-sm font-black text-[#2f2415]">
            {investor.label || 'Dossier'} — {score}/100
          </p>
          {investor.gaps?.length ? (
            <p className="mt-0.5 text-[10px] text-[#8a7456]">À renforcer : {investor.gaps.join(' · ')}</p>
          ) : null}
        </div>
        {onNavigate ? (
          <button
            type="button"
            onClick={() => onNavigate('investisseurs_forums', { tab: 'Résumé' })}
            className="shrink-0 rounded-lg bg-[#2f2415] px-3 py-1.5 text-[10px] font-black text-white"
          >
            Préparer le dossier
          </button>
        ) : null}
      </div>
      {investor.checks?.length ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {investor.checks.map((check) => (
            <span
              key={check.id}
              className={`rounded-full border px-2 py-0.5 text-[9px] font-black ${check.ok ? 'border-emerald-200 bg-white text-emerald-800' : 'border-amber-200 bg-white text-amber-800'}`}
            >
              {check.ok ? '✓' : '○'} {check.label}
            </span>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function ConseilHorizonBlock({ conseil, onNavigate }) {
  const clickable = Boolean(conseil?.navigate && onNavigate);
  const Tag = clickable ? 'button' : 'section';
  const handleClick = () => {
    if (!clickable) return;
    onNavigate(conseil.navigate.module, conseil.navigate.tab ? { tab: conseil.navigate.tab } : undefined);
  };

  return (
    <Tag
      type={clickable ? 'button' : undefined}
      onClick={clickable ? handleClick : undefined}
      className={`rounded-xl border border-[#e5dcc8] bg-[#faf6ee] px-3 py-3 text-left ${clickable ? 'cursor-pointer transition hover:border-[#d9c9a8] hover:bg-[#fffdf8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9a6b12]' : ''}`}
    >
      <p className="text-[10px] font-black uppercase tracking-wide text-[#9a6b12]">Conseil Horizon</p>
      <div className="mt-2 space-y-1.5 text-xs leading-relaxed text-[#2f2415]">
        <p><span className="font-black text-[#8a7456]">Situation —</span> {conseil?.situation || conseil?.text}</p>
        {conseil?.cause ? <p><span className="font-black text-[#8a7456]">Pourquoi —</span> {conseil.cause}</p> : null}
        {conseil?.action ? <p><span className="font-black text-emerald-800">À faire —</span> {conseil.action}</p> : null}
      </div>
      {clickable ? <p className="mt-2 text-[10px] font-black text-[#9a6b12]">Ouvrir le module →</p> : null}
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

export default function CarnetHorizon({ carnet, onNavigate, simulatedMode = false }) {
  if (!carnet) return null;

  const journalItems = carnet.journal?.items || [];
  const showProjectionsEmpty = !carnet.projections?.hasData && (carnet.startupMode || !simulatedMode);

  return (
    <div className="carnet-dirigeant-root space-y-3">
      <style>{`
        .carnet-dirigeant-root {
          max-height: none;
          overflow: visible;
        }
      `}</style>

      <div className="grid grid-cols-2 gap-2 xl:grid-cols-4 xl:gap-2.5">
        {(carnet.domains || []).map((card) => (
          <DomainCard key={card.id} card={card} onNavigate={onNavigate} />
        ))}
      </div>

      {carnet.capteurs ? (
        <DomainCard key={carnet.capteurs.id} card={carnet.capteurs} onNavigate={onNavigate} />
      ) : null}

      {carnet.priorities?.length ? (
        <section className="rounded-xl border border-[#e5dcc8] bg-white px-3 py-2.5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-[10px] font-black uppercase tracking-wide text-[#9a6b12]">Mes priorités</h2>
              <p className="mt-0.5 text-[10px] text-[#8a7456]">Actions dirigeant à traiter aujourd&apos;hui</p>
            </div>
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-black text-amber-800">
              {carnet.priorities.length}
            </span>
          </div>
          <div className="space-y-1.5">
            {carnet.priorities.map((item) => (
              <PriorityRow key={item.id} item={item} onNavigate={onNavigate} />
            ))}
          </div>
        </section>
      ) : null}

      <InvestorReadinessStrip investor={carnet.investorReadiness} onNavigate={onNavigate} />

      {carnet.objectifs ? (
        <section className="rounded-xl border border-[#e5dcc8] bg-[#fffdf8] px-3 py-2.5">
          <h2 className="mb-0.5 text-[10px] font-black uppercase tracking-wide text-[#8a7456]">Objectifs de l&apos;exploitation</h2>
          <p className="mb-2 text-[10px] text-[#8a7456]">Réalisé = ventes de la période · Objectif = Business Plan Horizon Farm</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <ObjectifBlock block={carnet.objectifs.month} onNavigate={onNavigate} />
            <ObjectifBlock block={carnet.objectifs.year} onNavigate={onNavigate} />
          </div>
        </section>
      ) : null}

      {carnet.projections?.hasData ? (
        <section className="rounded-xl border border-[#e5dcc8] bg-[#faf6ee] px-3 py-2.5">
          <h2 className="text-[10px] font-black uppercase tracking-wide text-[#8a7456]">Projections & pilotage</h2>
          <p className="mb-2 mt-0.5 text-[10px] leading-snug text-[#8a7456]">
            Anticipation à 30 jours — CA, trésorerie, créances et stock. Cliquez une carte pour ouvrir le module.
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
            {(carnet.projections.items || []).map((item) => (
              <ProjectionCard key={item.id} item={item} onNavigate={onNavigate} />
            ))}
          </div>
        </section>
      ) : null}

      {showProjectionsEmpty ? (
        <section className="rounded-xl border border-dashed border-[#d6c3a0] bg-[#fffdf8] px-3 py-3">
          <h2 className="text-[10px] font-black uppercase tracking-wide text-[#8a7456]">Projections & pilotage</h2>
          <p className="mt-1 text-xs leading-relaxed text-[#5c4d38]">
            {simulatedMode
              ? 'Pas encore assez de ventes ou de production pour calculer des projections. Enregistrez une vente ou une production d\'œufs.'
              : 'Activez Données simulées (Paramètres ⚙️) pour voir les projections du scénario Horizon Farm, ou saisissez vos premières données réelles.'}
          </p>
        </section>
      ) : null}

      <ConseilHorizonBlock conseil={carnet.conseil} onNavigate={onNavigate} />

      <section className="rounded-xl border border-[#e5dcc8] bg-[#fffdf8] px-3 py-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div>
            <h2 className="text-[10px] font-black uppercase tracking-wide text-[#8a7456]">Journal d&apos;exploitation</h2>
            <p className="mt-0.5 text-[10px] text-[#8a7456]">
              {carnet.journal?.scope === 'recent'
                ? 'Aucun événement aujourd\'hui — derniers événements terrain'
                : 'Événements terrain du jour'}
            </p>
          </div>
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
