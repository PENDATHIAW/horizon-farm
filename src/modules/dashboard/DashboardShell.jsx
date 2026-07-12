import { ArrowRight, Bot, BrainCircuit, CheckCircle2, Circle, CloudSun, MapPin, Settings2, Target, TrendingUp } from 'lucide-react';
import { MODULE_REGISTRY } from '../../config/modules.config';
import PeriodScopeBadge from '../../components/PeriodScopeBadge.jsx';
import ModuleTabsBar from '../../components/module/ModuleTabsBar.jsx';
import { openFormModal } from '../../services/formModalManager';
import { launchHeyHorizonAssistant, launchPilotageSuggestion } from '../../utils/dashboardHeyHorizon.js';
import { fmtCurrency } from '../../utils/format';

export function DashboardQuickActions({ onNavigate }) {
  const openNewSale = () => {
    openFormModal({
      module: 'commercial',
      draft: {
        primary_module: 'commercial',
        form_type: 'sale_record',
        date: new Date().toISOString().slice(0, 10),
      },
    });
    onNavigate?.('commercial', { tab: 'Ventes' });
  };

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={openNewSale} className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#2f2415] px-4 py-2 text-sm font-black text-white">
        Nouvelle vente
      </button>
      <button type="button" onClick={() => onNavigate?.('finance_pilotage', { tab: 'Trésorerie' })} className="min-h-[44px] rounded-xl border border-[#eadcc2] bg-white px-4 py-2 text-sm font-black text-[#2f2415]">
        Trésorerie
      </button>
      <button type="button" onClick={() => onNavigate?.('achats_stock', { tab: 'Inventaire' })} className="min-h-[44px] rounded-xl border border-[#eadcc2] bg-white px-4 py-2 text-sm font-black text-[#2f2415]">
        Stock
      </button>
      <button type="button" onClick={() => onNavigate?.('assistant_erp')} className="min-h-[44px] rounded-xl border border-[#eadcc2] bg-white px-4 py-2 text-sm font-black text-[#2f2415]">
        Assistant ERP
      </button>
    </div>
  );
}

export function DashboardKpi({ label, value, tone = 'neutral', onClick, detail, delta, scopeLabel = '' }) {
  const toneCls = tone === 'good' ? 'text-emerald-700' : tone === 'warn' ? 'text-amber-700' : tone === 'bad' ? 'text-red-600' : 'text-[#2f2415]';
  const deltaCls = String(delta || '').startsWith('+')
    ? 'text-emerald-700'
    : String(delta || '').startsWith('-')
      ? 'text-red-600'
      : 'text-[#8a7456]';
  const scopeCls = scopeLabel === 'Période'
    ? 'border-sky-200 bg-sky-50 text-sky-800'
    : scopeLabel === 'Cumul'
      ? 'border-violet-200 bg-violet-50 text-violet-800'
      : 'border-[#eadcc2] bg-[#fffdf8] text-[#8a7456]';
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-left ${onClick ? 'transition hover:border-[#c9a96a] hover:bg-white' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wide text-[#8a7456]">{label}</p>
        {scopeLabel ? (
          <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${scopeCls}`}>
            {scopeLabel}
          </span>
        ) : null}
      </div>
      <p className={`mt-1 text-xl font-black ${toneCls}`}>{value}</p>
      {detail ? <p className="mt-2 text-[10px] font-medium leading-snug text-[#8a7456]">{detail}</p> : null}
      {delta ? <p className={`mt-1 text-[10px] font-semibold ${deltaCls}`}>{delta}</p> : null}
    </Tag>
  );
}

const STARTUP_CHECKLIST = [
  { id: 'stock', label: 'Configurer le stock initial', module: 'achats_stock', tab: 'Inventaire' },
  { id: 'bande', label: 'Créer la première bande', module: 'elevage', tab: 'Cycles & Reproduction' },
  { id: 'animaux', label: 'Ajouter les premiers animaux', module: 'elevage', tab: 'Lots & bandes' },
  { id: 'vente', label: 'Enregistrer la première vente', module: 'commercial', tab: 'Ventes' },
  { id: 'objectifs', label: 'Configurer les objectifs', module: 'objectifs_croissance', tab: 'Suivi du Business Plan' },
];

export function DashboardStartupPanel({ onNavigate, journey = null }) {
  const steps = journey?.steps?.length ? journey.steps : STARTUP_CHECKLIST.map((item, index) => ({
    id: item.id,
    step: index + 1,
    label: item.label,
    hint: '',
    module: item.module,
    tab: item.tab,
    completed: false,
  }));
  const completedCount = journey?.completedCount ?? 0;
  const total = journey?.total ?? steps.length;
  const progressPct = journey?.progressPct ?? 0;
  const nextStep = journey?.nextStep;

  return (
    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm md:p-6">
      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#9a6b12]">Premiers pas</p>
      <h2 className="mt-1 text-xl font-black text-[#2f2415]">Projet en phase de lancement</h2>
      <p className="mt-2 text-sm text-[#8a7456]">
        Parcours progressif — {completedCount}/{total} étape(s) validée(s).
      </p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#eadcc2]/60">
        <div className="h-full rounded-full bg-[#22c55e] transition-all" style={{ width: `${Math.min(100, progressPct)}%` }} />
      </div>
      {nextStep && !nextStep.completed ? (
        <button
          type="button"
          onClick={() => onNavigate?.(nextStep.module, { tab: nextStep.tab })}
          className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-left transition hover:bg-emerald-100/80"
        >
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-black text-white">
            {nextStep.step}
          </span>
          <span className="min-w-0">
            <b className="block text-sm text-[#2f2415]">Prochaine étape : {nextStep.label}</b>
            {nextStep.hint ? <span className="mt-0.5 block text-xs text-emerald-900/80">{nextStep.hint}</span> : null}
          </span>
          <ArrowRight size={16} className="ml-auto shrink-0 text-emerald-800" />
        </button>
      ) : null}
      <ul className="mt-4 space-y-2">
        {steps.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onNavigate?.(item.module, { tab: item.tab })}
              className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition hover:bg-white ${item.completed ? 'border-emerald-200 bg-emerald-50/60' : 'border-[#eadcc2] bg-[#fffdf8] hover:border-[#c9a96a]'}`}
            >
              {item.completed ? (
                <CheckCircle2 size={18} className="shrink-0 text-emerald-600" aria-hidden="true" />
              ) : (
                <Circle size={18} className="shrink-0 text-[#8a7456]" aria-hidden="true" />
              )}
              <span className="min-w-0">
                <span className="block text-xs font-bold uppercase tracking-wide text-[#8a7456]">Étape {item.step}</span>
                <span className="text-sm font-black text-[#2f2415]">{item.label}</span>
              </span>
              <ArrowRight size={14} className="ml-auto shrink-0 text-[#9a6b12]" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function DashboardPrioritiesPanel({ priorities = [], onOpen }) {
  if (!priorities.length) {
    return (
      <section className="rounded-3xl border border-emerald-200 bg-emerald-50/70 p-5 shadow-sm">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-800">Mes priorités</p>
        <h2 className="mt-1 text-lg font-black text-[#2f2415]">Rien d&apos;urgent aujourd&apos;hui</h2>
        <p className="mt-2 text-sm text-emerald-900/80">L&apos;exploitation est à jour sur les points critiques.</p>
      </section>
    );
  }
  return (
    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#9a6b12]">Mes priorités</p>
          <h2 className="mt-1 text-lg font-black text-[#2f2415]">Que dois-je faire aujourd&apos;hui ?</h2>
        </div>
        <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-black text-amber-800">
          {priorities.length} action{priorities.length > 1 ? 's' : ''}
        </span>
      </div>
      <div className="space-y-2">
        {priorities.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onOpen?.(item)}
            className={`flex w-full items-start justify-between gap-3 rounded-2xl border p-3 text-left text-sm transition ${item.tone === 'red' ? 'border-red-200 bg-red-50 hover:bg-red-100/70' : 'border-amber-200 bg-amber-50 hover:bg-amber-100/70'}`}
          >
            <span className="min-w-0">
              <b className="text-[#2f2415]">{item.title}</b>
              {item.detail ? <span className="mt-1 block text-xs opacity-80">{item.detail}</span> : null}
            </span>
            <ArrowRight size={14} className="mt-1 shrink-0 text-[#9a6b12]" />
          </button>
        ))}
      </div>
    </section>
  );
}

export function DashboardNarrativePanel({ narrative = {} }) {
  if (!narrative.lines?.length) return null;
  return (
    <section className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 shadow-sm">
      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#9a6b12]">{narrative.title || 'Synthèse'}</p>
      <ul className="mt-3 space-y-2 text-sm text-[#2f2415]">
        {narrative.lines.map((line) => (
          <li key={line} className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#c9a96a]" aria-hidden="true" />
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function DashboardFarmOverviewPanel({ overview = {}, onNavigate }) {
  const cards = [overview.aviculture, overview.bovins, overview.cultures].filter(Boolean);
  if (!cards.length) return null;
  const navMap = {
    aviculture: ['elevage', { tab: 'Lots & bandes' }],
    bovins: ['elevage', { tab: 'Lots & bandes' }],
    cultures: ['cultures', { tab: 'Parcelles & campagnes' }],
  };
  return (
    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm">
      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#9a6b12]">Exploitation agricole</p>
      <h2 className="mt-1 text-lg font-black text-[#2f2415]">Aviculture · Bovins · Cultures</h2>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {cards.map((card) => {
          const [module, opts] = navMap[card === overview.aviculture ? 'aviculture' : card === overview.bovins ? 'bovins' : 'cultures'] || ['elevage', { tab: 'Lots & bandes' }];
          const value = card === overview.aviculture
            ? `${Number(card.birds || 0).toLocaleString('fr-FR')} sujet(s)`
            : card === overview.bovins
              ? `${Number(card.count || 0).toLocaleString('fr-FR')} animal(aux)`
              : `${Number(card.parcels || 0).toLocaleString('fr-FR')} parcelle(s)`;
          return (
            <button
              key={card.label}
              type="button"
              onClick={() => onNavigate?.(module, opts)}
              className={`rounded-2xl border p-4 text-left transition hover:bg-white ${card.hasData ? 'border-[#eadcc2] bg-[#fffdf8] hover:border-[#c9a96a]' : 'border-amber-200 bg-amber-50/60 hover:bg-amber-50'}`}
            >
              <p className="text-[11px] font-bold uppercase tracking-wide text-[#8a7456]">{card.label}</p>
              <p className="mt-1 text-xl font-black text-[#2f2415]">{value}</p>
              <p className="mt-1 text-xs text-[#8a7456]">{card.detail}</p>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function DashboardExploitationScorePanel({ exploitation = {}, onNavigate }) {
  const tone = exploitation.score >= 80 ? 'good' : exploitation.score >= 60 ? 'warn' : 'bad';
  const toneCls = tone === 'good' ? 'text-emerald-700 border-emerald-200 bg-emerald-50' : tone === 'warn' ? 'text-amber-700 border-amber-200 bg-amber-50' : 'text-red-700 border-red-200 bg-red-50';
  return (
    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#9a6b12]">Score exploitation</p>
          <h2 className="mt-1 text-lg font-black text-[#2f2415]">{exploitation.label || 'Pilotage global'}</h2>
        </div>
        <div className={`rounded-2xl border px-4 py-2 text-center ${toneCls}`}>
          <p className="text-2xl font-black">{exploitation.score ?? '—'}/100</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {(exploitation.dimensions || []).map((row) => (
          <div key={row.id} className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-2 text-center">
            <p className="text-[10px] font-bold uppercase text-[#8a7456]">{row.label}</p>
            <p className="mt-1 text-sm font-black text-[#2f2415]">{row.score}</p>
          </div>
        ))}
      </div>
      {exploitation.weakPoints?.length ? (
        <p className="mt-3 text-xs text-[#8a7456]">
          Points faibles : {exploitation.weakPoints.join(' · ')}
        </p>
      ) : null}
      <button type="button" onClick={() => onNavigate?.('centre_decisionnel', { tab: 'Urgences & risques' })} className="mt-3 text-xs font-black text-[#9a6b12]">
        Détail pilotage IA →
      </button>
    </section>
  );
}

export function DashboardInvestorCompactStrip({ investor = {}, onNavigate, onExpand }) {
  const score = investor.score ?? 0;
  const toneCls = score >= 80 ? 'text-emerald-800' : score >= 55 ? 'text-amber-800' : 'text-[#2f2415]';
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#eadcc2] bg-[#fffdf8] px-4 py-3">
      <p className={`text-sm font-black ${toneCls}`}>
        Préparation investisseur : {score}%
      </p>
      <div className="flex flex-wrap gap-2">
        {onExpand ? (
          <button type="button" onClick={onExpand} className="min-h-[40px] rounded-xl border border-[#d6c3a0] bg-white px-3 py-1.5 text-xs font-black text-[#2f2415]">
            Voir le détail
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => onNavigate?.('objectifs_croissance', { tab: 'Sécurisation des Flux' })}
          className="min-h-[40px] rounded-xl bg-[#2f2415] px-3 py-1.5 text-xs font-black text-white"
        >
          Investisseurs &amp; Forums
        </button>
      </div>
    </div>
  );
}

export function DashboardExploitationScoreCompact({ exploitation = {}, onNavigate }) {
  const score = exploitation.score ?? 0;
  const tone = score >= 80 ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : score >= 60 ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-red-200 bg-red-50 text-red-800';
  return (
    <section className={`rounded-2xl border p-4 shadow-sm ${tone}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] opacity-80">État général</p>
          <h2 className="mt-0.5 text-base font-black">{exploitation.label || 'Pilotage global'}</h2>
          {exploitation.weakPoints?.length ? (
            <p className="mt-1 text-xs opacity-80">À surveiller : {exploitation.weakPoints.slice(0, 2).join(' · ')}</p>
          ) : null}
        </div>
        <p className="text-3xl font-black">{score}/100</p>
      </div>
      <button type="button" onClick={() => onNavigate?.('centre_decisionnel', { tab: 'Urgences & risques' })} className="mt-2 text-xs font-black underline opacity-80">
        Détail pilotage →
      </button>
    </section>
  );
}

export function DashboardInvestorStrip({ investor = {}, onNavigate }) {
  const tone = investor.score >= 80 ? 'border-emerald-200 bg-emerald-50/70' : investor.score >= 55 ? 'border-amber-200 bg-amber-50/70' : 'border-[#eadcc2] bg-[#fffdf8]';
  return (
    <section className={`rounded-2xl border p-4 shadow-sm ${tone}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-[#9a6b12]">
            <TrendingUp size={14} />
            Préparation investisseur
          </p>
          <h2 className="mt-1 text-base font-black text-[#2f2415]">
            {investor.label || 'Dossier'} — {investor.score ?? 0}/100
          </h2>
          <p className="mt-1 text-xs text-[#8a7456]">
            Activité, croissance et niveau de préparation en un coup d&apos;œil.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate?.('objectifs_croissance', { tab: 'Sécurisation des Flux' })}
          className="min-h-[44px] shrink-0 rounded-xl bg-[#2f2415] px-4 py-2 text-sm font-black text-white"
        >
          Préparer le dossier
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {(investor.checks || []).map((check) => (
          <span
            key={check.id}
            className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${check.ok ? 'border-emerald-200 bg-white text-emerald-800' : 'border-amber-200 bg-white text-amber-800'}`}
          >
            {check.ok ? '✓' : '○'} {check.label}
          </span>
        ))}
      </div>
      {investor.gaps?.length ? (
        <p className="mt-2 text-xs text-[#8a7456]">À renforcer : {investor.gaps.join(' · ')}</p>
      ) : null}
    </section>
  );
}

export function DashboardWeatherStrip({ weather = {} }) {
  if (!weather.dashboardStrip && !weather.loading) return null;
  return (
    <section className="rounded-2xl border border-sky-200 bg-sky-50/70 p-4 shadow-sm">
      <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-sky-900">
        <CloudSun size={14} />
        Météo terrain
      </p>
      <p className="mt-2 text-sm font-black text-[#2f2415]">
        {weather.loading ? 'Chargement météo…' : `${weather.temp ?? '—'}°C · ${weather.condition || 'Conditions stables'}`}
      </p>
      {weather.riskLevel && weather.riskLevel !== 'stable' ? (
        <p className="mt-1 text-xs text-amber-800">{weather.impact || 'Surveiller abreuvement et ventilation.'}</p>
      ) : (
        <p className="mt-1 text-xs text-sky-900/80">Données partagées avec l&apos;en-tête ERP (useLiveWeather).</p>
      )}
    </section>
  );
}

export function DashboardModuleHeader({
  tab,
  setTab,
  displayUser = 'Exploitant',
  greeting = '',
  location = 'Ferme principale',
  dateTime = '',
  healthScore = 100,
  badges = {},
  simple = true,
  onToggleExpert,
  onNavigate,
  periodLabel = '',
}) {
  return (
    <div className="space-y-3">
      <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#9a6b12]">Accueil</p>
            <h1 className="mt-1 text-2xl font-black text-[#2f2415]">{greeting || `Bonjour ${displayUser}`}</h1>
            {periodLabel ? <div className="mt-2"><PeriodScopeBadge label={periodLabel} /></div> : null}
            <div className="mt-2 flex flex-col gap-1 text-sm text-[#8a7456] sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
              {dateTime ? <span className="capitalize">{dateTime}</span> : null}
              {dateTime ? <span className="hidden sm:inline">·</span> : null}
              <span className="inline-flex items-center gap-1">
                <MapPin size={14} aria-hidden="true" />
                {location}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-3 py-1 text-xs font-black ${healthScore >= 75 ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : healthScore >= 50 ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-red-200 bg-red-50 text-red-700'}`}>
              Santé exploitation {healthScore}/100
            </span>
            {badges.todo > 0 ? (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-black text-amber-800">
                {badges.todo} à traiter
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => onNavigate?.('centre_decisionnel', { tab: 'Urgences & risques' })}
              className="inline-flex items-center gap-1 rounded-full border border-[#d6c3a0] bg-[#dcfce7] px-3 py-1.5 text-xs font-black text-[#14532d]"
            >
              <Target size={13} />
              Vision
            </button>
            <button
              type="button"
              onClick={onToggleExpert}
              className="inline-flex items-center gap-1 rounded-full border border-[#d6c3a0] bg-[#fffdf8] px-3 py-1.5 text-xs font-black text-[#2f2415]"
            >
              <Settings2 size={13} />
              {simple ? 'Détails' : 'Simple'}
            </button>
          </div>
        </div>
      </section>
      <ModuleTabsBar moduleId="dashboard" active={tab} onChange={setTab} tabBadges={badges.tabs || {}} />
    </div>
  );
}

export function DashboardModuleNav({ modules = [], onNavigate }) {
  return (
    <section className="rounded-2xl border border-[#d6c3a0] bg-white p-4 shadow-sm">
      <div className="mb-3">
        <h2 className="text-sm font-black text-[#2f2415]">Aller au module</h2>
        <p className="text-[11px] text-[#8a7456]">Raccourcis vers les grands pôles de l&apos;ERP.</p>
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        {modules.map((item) => {
          const Icon = MODULE_REGISTRY[item.id]?.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                if (item.tab) onNavigate?.(item.id, { tab: item.tab });
                else onNavigate?.(item.id);
              }}
              className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3 text-left transition hover:border-[#c9a96a] hover:bg-white"
            >
              <div className="mb-2 flex items-center gap-2">
                {Icon ? <Icon size={16} className="text-[#9a6b12]" aria-hidden="true" /> : null}
                <p className="font-black text-[#2f2415]">{item.label}</p>
              </div>
              <p className="text-[10px] text-[#8a7456]">{item.hint}</p>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function DashboardHeyHorizonStrip({ suggestions = [], onNavigate }) {
  if (!suggestions.length) return null;
  return (
    <section className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-sm">
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-emerald-800">
            <Bot size={14} />
            Pilotage & production
          </p>
          <p className="text-xs text-emerald-900/80">Objectifs, bandes, risques — pas les actions terrain Hey Horizon.</p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate?.('elevage', { tab: 'Cycles & Reproduction' })}
          className="text-xs font-black text-emerald-900"
        >
          Élevage → Cycles →
        </button>
      </div>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {suggestions.map((item) => {
          const toneCls = item.tone === 'bad'
            ? 'border-red-200 bg-red-50 hover:bg-red-100/70'
            : item.tone === 'warn'
              ? 'border-amber-200 bg-amber-50 hover:bg-amber-100/70'
              : item.tone === 'good'
                ? 'border-emerald-300 bg-white hover:bg-emerald-50'
                : 'border-[#eadcc2] bg-white hover:bg-[#fffdf8]';
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => launchPilotageSuggestion({
                module: item.module,
                tab: item.tab,
                productionQuestion: item.productionQuestion,
                onNavigate,
              })}
              className={`rounded-xl border p-3 text-left transition ${toneCls}`}
            >
              <p className="font-black text-sm text-[#2f2415]">{item.label}</p>
              {item.detail ? <p className="mt-1 text-xs text-[#8a7456]">{item.detail}</p> : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function DashboardSnapshotCard({ label, value, detail, tone = 'neutral', onClick }) {
  const toneCls = tone === 'good'
    ? 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100/80'
    : tone === 'warn'
      ? 'border-amber-200 bg-amber-50 hover:bg-amber-100/80'
      : 'border-[#eadcc2] bg-[#fffdf8] hover:bg-white';
  return (
    <button type="button" onClick={onClick} className={`w-full rounded-2xl border p-4 text-left transition ${toneCls}`}>
      <p className="text-[11px] font-bold uppercase tracking-wide text-[#8a7456]">{label}</p>
      <p className="mt-1 text-2xl font-black text-[#2f2415]">{value}</p>
      {detail ? <p className="mt-1 text-xs text-[#8a7456]">{detail}</p> : null}
    </button>
  );
}

export function DashboardTodoRow({ title, detail, moduleLabel, onOpen, tone = 'amber' }) {
  const toneCls = tone === 'red'
    ? 'border-red-200 bg-red-50 hover:bg-red-100/80'
    : tone === 'amber'
      ? 'border-amber-200 bg-amber-50 hover:bg-amber-100/80'
      : 'border-[#eadcc2] bg-[#fffdf8] hover:bg-white';
  return (
    <button type="button" onClick={onOpen} className={`flex w-full items-start justify-between gap-3 rounded-2xl border p-3 text-left text-sm transition ${toneCls}`}>
      <span className="min-w-0">
        <b className="text-[#2f2415]">{title}</b>
        {detail ? <span className="mt-1 block text-xs opacity-80">{detail}</span> : null}
      </span>
      <span className="shrink-0 text-xs font-black text-[#9a6b12]">{moduleLabel} →</span>
    </button>
  );
}


export function DashboardUrgenciesStrip({ urgencies = [], onOpenAction }) {
  if (!urgencies.length) return null;
  return (
    <section className="rounded-2xl border border-red-200 bg-red-50/70 p-4 shadow-sm">
      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-red-800">3 urgences du jour</p>
      <div className="mt-3 space-y-2">
        {urgencies.slice(0, 3).map((item, index) => (
          <button
            key={`${item.title}-${index}`}
            type="button"
            onClick={() => onOpenAction?.(item)}
            className="flex w-full items-start justify-between gap-3 rounded-xl border border-red-200 bg-white px-3 py-2 text-left text-sm hover:bg-red-50"
          >
            <span>
              <b className="text-red-900">{item.title}</b>
              {item.detail ? <span className="mt-0.5 block text-xs text-red-800/80">{item.detail}</span> : null}
            </span>
            <span className="shrink-0 text-xs font-black text-red-700">→</span>
          </button>
        ))}
      </div>
    </section>
  );
}

export function DashboardHeyHorizonDetections({ findings = [], onOpenFinding }) {
  if (!findings.length) return null;
  return (
    <section className="rounded-2xl border border-violet-200 bg-violet-50/60 p-4 shadow-sm">
      <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-violet-900">
        <Bot size={14} />
        Hey Horizon a détecté…
      </p>
      <div className="mt-3 space-y-2">
        {findings.slice(0, 3).map((item) => (
          <button
            key={item.id || item.title}
            type="button"
            onClick={() => onOpenFinding?.(item)}
            className="w-full rounded-xl border border-violet-200 bg-white px-3 py-2 text-left text-sm hover:bg-violet-50"
          >
            <b className="text-violet-950">{item.title}</b>
            {item.description || item.detail ? (
              <p className="mt-0.5 text-xs text-violet-900/80">{item.description || item.detail}</p>
            ) : null}
          </button>
        ))}
      </div>
    </section>
  );
}

export function DashboardGoalsHero({ goal = {}, onOpenVision, onOpenAssistant, onNavigate }) {
  const primaryLabel = goal.periodLabel || 'Objectif du mois';
  const primarySubtitle = goal.periodSubtitle || '';
  const primaryTarget = Number(goal.periodTarget ?? goal.monthTarget ?? 0);
  const primaryRealized = Number(goal.periodRealized ?? goal.realized ?? 0);
  const primaryAttainment = Number(goal.periodAttainment ?? goal.attainment ?? 0);
  const primaryRemaining = Number(goal.periodRemaining ?? Math.max(0, primaryTarget - primaryRealized));

  const secondaryLabel = goal.secondaryLabel || goal.activityYear?.year1Label || 'Année 1';
  const secondaryTarget = Number(goal.secondaryTarget ?? goal.annualTarget ?? 0);
  const secondaryRealized = Number(goal.secondaryRealized ?? goal.annualRealized ?? 0);
  const secondaryAttainment = Number(goal.secondaryAttainment ?? goal.annualAttainment ?? 0);
  const secondaryRemaining = Number(goal.secondaryRemaining ?? goal.annualRemaining ?? Math.max(0, secondaryTarget - secondaryRealized));
  const showSecondaryTarget = goal.periodMode !== 'all' && secondaryTarget > 0;

  const toneFor = (pct) => (pct >= 90 ? 'good' : pct >= 50 ? 'warn' : 'bad');
  const heroTitle = goal.periodMode === 'all'
    ? 'Pilotage Année 1 & cumul'
    : goal.periodMode === 'period'
      ? 'Pilotage de la période sélectionnée'
      : 'Pilotage mensuel & annuel';

  return (
    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-4 shadow-sm md:p-5">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#9a6b12]">Objectifs</p>
          <h2 className="text-lg font-black text-[#2f2415]">{heroTitle}</h2>
          {primarySubtitle ? <p className="mt-1 text-xs text-[#8a7456]">Période ERP · {primarySubtitle}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onOpenAssistant ? (
            <button
              type="button"
              onClick={() => launchHeyHorizonAssistant({
                query: 'Où en suis-je sur mon objectif du mois ?',
                onNavigate,
                onOpenAssistant,
              })}
              className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-800"
            >
              <Bot size={13} />
              Hey Horizon
            </button>
          ) : null}
          <button
            type="button"
            onClick={onOpenVision}
            className="inline-flex items-center gap-1 text-xs font-black text-[#9a6b12]"
          >
            Vision détaillée <ArrowRight size={14} />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <button
          type="button"
          onClick={onOpenVision}
          className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-left transition hover:border-[#c9a96a] hover:bg-white"
        >
          <p className="text-[11px] font-bold uppercase tracking-wide text-[#8a7456]">{primaryLabel}</p>
          <div className="mt-2 flex items-end justify-between gap-3">
            <p className={`text-3xl font-black ${toneFor(primaryAttainment) === 'good' ? 'text-emerald-700' : toneFor(primaryAttainment) === 'warn' ? 'text-amber-700' : 'text-red-600'}`}>
              {primaryAttainment}%
            </p>
            <p className="text-right text-xs text-[#8a7456]">
              {fmtCurrency(primaryRealized)} / {fmtCurrency(primaryTarget)}
            </p>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#eadcc2]/60">
            <div className="h-full rounded-full bg-[#22c55e]" style={{ width: `${Math.min(100, primaryAttainment)}%` }} />
          </div>
          <p className="mt-2 text-xs text-[#8a7456]">Reste {fmtCurrency(primaryRemaining)}</p>
        </button>

        <button
          type="button"
          onClick={onOpenVision}
          className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-left transition hover:border-[#c9a96a] hover:bg-white"
        >
          <p className="text-[11px] font-bold uppercase tracking-wide text-[#8a7456]">{secondaryLabel}</p>
          <div className="mt-2 flex items-end justify-between gap-3">
            <p className={`text-3xl font-black ${toneFor(secondaryAttainment || 0) === 'good' ? 'text-emerald-700' : toneFor(secondaryAttainment || 0) === 'warn' ? 'text-amber-700' : 'text-red-600'}`}>
              {showSecondaryTarget ? `${secondaryAttainment}%` : fmtCurrency(secondaryRealized)}
            </p>
            <p className="text-right text-xs text-[#8a7456]">
              {showSecondaryTarget
                ? `${fmtCurrency(secondaryRealized)} / ${fmtCurrency(secondaryTarget)}`
                : 'Depuis le début'}
            </p>
          </div>
          {showSecondaryTarget ? (
            <>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#eadcc2]/60">
                <div className="h-full rounded-full bg-[#22c55e]" style={{ width: `${Math.min(100, secondaryAttainment)}%` }} />
              </div>
              <p className="mt-2 text-xs text-[#8a7456]">Reste {fmtCurrency(secondaryRemaining)}</p>
            </>
          ) : (
            <p className="mt-3 text-xs text-[#8a7456]">Chiffre d&apos;affaires cumulé toutes périodes confondues.</p>
          )}
        </button>
      </div>
    </section>
  );
}

export function DashboardGoalCard({ goal = {}, onOpenVision }) {
  const remaining = Math.max(0, Number(goal.monthTarget || 0) - Number(goal.realized || 0));
  const attainment = Number(goal.attainment || 0);
  return (
    <button
      type="button"
      onClick={onOpenVision}
      className="w-full rounded-2xl border border-[#d6c3a0] bg-white p-4 text-left shadow-sm transition hover:border-[#c9a96a]"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-black text-[#2f2415]">Objectif du mois</h2>
          <p className="text-[11px] text-[#8a7456]">Vision & Croissance</p>
        </div>
        <span className="inline-flex items-center gap-1 text-xs font-black text-[#9a6b12]">
          Détail <ArrowRight size={14} />
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
        <DashboardKpi label="Objectif" value={fmtCurrency(goal.monthTarget)} />
        <DashboardKpi label="Réalisé" value={fmtCurrency(goal.realized)} tone="good" />
        <DashboardKpi label="Atteinte" value={`${attainment}%`} tone={attainment >= 90 ? 'good' : attainment >= 50 ? 'warn' : 'bad'} />
        <DashboardKpi label="Reste" value={fmtCurrency(remaining)} tone={remaining > 0 ? 'warn' : 'good'} />
      </div>
    </button>
  );
}

export function DashboardHealthStrip({ health = {}, onOpenFinding, onNavigate }) {
  if (!health?.findings?.length && !health?.risks?.length) return null;
  const topFinding = health.findings?.[0];
  const topRisk = health.risks?.[0];
  return (
    <section className="rounded-2xl border border-[#d6c3a0] bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-2">
          <BrainCircuit size={16} className="text-[#9a6b12]" />
          <h2 className="text-sm font-black text-[#2f2415]">Pilotage IA (détail)</h2>
        </div>
        <button type="button" onClick={() => onNavigate?.('centre_decisionnel', { tab: 'Urgences & risques' })} className="text-xs font-black text-[#9a6b12]">
          Vision →
        </button>
      </div>
      <div className="space-y-2">
        {topFinding ? (
          <button type="button" onClick={() => onOpenFinding?.(topFinding)} className="w-full rounded-xl border border-amber-200 bg-amber-50 p-3 text-left text-sm hover:bg-amber-100/80">
            <b className="text-[#2f2415]">{topFinding.title}</b>
            <span className="mt-1 block text-xs text-amber-800">{topFinding.recommended_action || topFinding.description}</span>
          </button>
        ) : null}
        {topRisk ? (
          <button type="button" onClick={() => onOpenFinding?.(topRisk)} className="w-full rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3 text-left text-sm hover:bg-white">
            <b className="text-[#2f2415]">{topRisk.title}</b>
            <span className="mt-1 block text-xs text-[#8a7456]">{topRisk.detail}</span>
          </button>
        ) : null}
      </div>
    </section>
  );
}
