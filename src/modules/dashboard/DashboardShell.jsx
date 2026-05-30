import { ArrowRight, BrainCircuit, MapPin, Settings2, Target } from 'lucide-react';
import { MODULE_REGISTRY } from '../../config/modules.config';
import ModuleTabsBar from '../../components/module/ModuleTabsBar.jsx';
import { openFormModal } from '../../services/formModalManager';
import { fmtCurrency, fmtNumber } from '../../utils/format';

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
      <button type="button" onClick={() => onNavigate?.('achats_stock', { tab: 'Stock' })} className="min-h-[44px] rounded-xl border border-[#eadcc2] bg-white px-4 py-2 text-sm font-black text-[#2f2415]">
        Stock
      </button>
      <button type="button" onClick={() => onNavigate?.('assistant_erp')} className="min-h-[44px] rounded-xl border border-[#eadcc2] bg-white px-4 py-2 text-sm font-black text-[#2f2415]">
        Assistant ERP
      </button>
    </div>
  );
}

export function DashboardKpi({ label, value, tone = 'neutral', onClick, detail, delta }) {
  const toneCls = tone === 'good' ? 'text-emerald-700' : tone === 'warn' ? 'text-amber-700' : tone === 'bad' ? 'text-red-600' : 'text-[#2f2415]';
  const deltaCls = String(delta || '').startsWith('+')
    ? 'text-emerald-700'
    : String(delta || '').startsWith('-')
      ? 'text-red-600'
      : 'text-[#8a7456]';
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-left ${onClick ? 'transition hover:border-[#c9a96a] hover:bg-white' : ''}`}
    >
      <p className="text-[11px] font-bold uppercase tracking-wide text-[#8a7456]">{label}</p>
      <p className={`mt-1 text-xl font-black ${toneCls}`}>{value}</p>
      {detail ? <p className="mt-2 text-[10px] font-medium leading-snug text-[#8a7456]">{detail}</p> : null}
      {delta ? <p className={`mt-1 text-[10px] font-semibold ${deltaCls}`}>{delta}</p> : null}
    </Tag>
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
}) {
  return (
    <div className="space-y-3">
      <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#9a6b12]">Accueil</p>
            <h1 className="mt-1 text-2xl font-black text-[#2f2415]">{greeting || `Bonjour ${displayUser}`}</h1>
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
              Santé ERP {healthScore}/100
            </span>
            {badges.todo > 0 ? (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-black text-amber-800">
                {badges.todo} à traiter
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => onNavigate?.('objectifs_croissance', { tab: 'À traiter' })}
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

export function DashboardGoalsHero({ goal = {}, onOpenVision }) {
  const monthRemaining = Math.max(0, Number(goal.monthTarget || 0) - Number(goal.realized || 0));
  const monthAttainment = Number(goal.attainment || 0);
  const annualTarget = Number(goal.annualTarget || 0);
  const annualRealized = Number(goal.annualRealized || 0);
  const annualAttainment = Number(goal.annualAttainment || 0);
  const annualRemaining = Number(goal.annualRemaining ?? Math.max(0, annualTarget - annualRealized));
  const toneFor = (pct) => (pct >= 90 ? 'good' : pct >= 50 ? 'warn' : 'bad');

  return (
    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-4 shadow-sm md:p-5">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#9a6b12]">Objectifs</p>
          <h2 className="text-lg font-black text-[#2f2415]">Pilotage mensuel & annuel</h2>
        </div>
        <button
          type="button"
          onClick={onOpenVision}
          className="inline-flex items-center gap-1 text-xs font-black text-[#9a6b12]"
        >
          Vision détaillée <ArrowRight size={14} />
        </button>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <button
          type="button"
          onClick={onOpenVision}
          className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-left transition hover:border-[#c9a96a] hover:bg-white"
        >
          <p className="text-[11px] font-bold uppercase tracking-wide text-[#8a7456]">Objectif du mois</p>
          <div className="mt-2 flex items-end justify-between gap-3">
            <p className={`text-3xl font-black ${toneFor(monthAttainment) === 'good' ? 'text-emerald-700' : toneFor(monthAttainment) === 'warn' ? 'text-amber-700' : 'text-red-600'}`}>
              {monthAttainment}%
            </p>
            <p className="text-right text-xs text-[#8a7456]">
              {fmtCurrency(goal.realized)} / {fmtCurrency(goal.monthTarget)}
            </p>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#eadcc2]/60">
            <div className="h-full rounded-full bg-[#22c55e]" style={{ width: `${Math.min(100, monthAttainment)}%` }} />
          </div>
          <p className="mt-2 text-xs text-[#8a7456]">Reste {fmtCurrency(monthRemaining)}</p>
        </button>

        <button
          type="button"
          onClick={onOpenVision}
          className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-left transition hover:border-[#c9a96a] hover:bg-white"
        >
          <p className="text-[11px] font-bold uppercase tracking-wide text-[#8a7456]">Objectif annuel {new Date().getFullYear()}</p>
          <div className="mt-2 flex items-end justify-between gap-3">
            <p className={`text-3xl font-black ${toneFor(annualAttainment) === 'good' ? 'text-emerald-700' : toneFor(annualAttainment) === 'warn' ? 'text-amber-700' : 'text-red-600'}`}>
              {annualAttainment}%
            </p>
            <p className="text-right text-xs text-[#8a7456]">
              {fmtCurrency(annualRealized)} / {fmtCurrency(annualTarget)}
            </p>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#eadcc2]/60">
            <div className="h-full rounded-full bg-[#22c55e]" style={{ width: `${Math.min(100, annualAttainment)}%` }} />
          </div>
          <p className="mt-2 text-xs text-[#8a7456]">Reste {fmtCurrency(annualRemaining)}</p>
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
        <button type="button" onClick={() => onNavigate?.('objectifs_croissance', { tab: 'À traiter' })} className="text-xs font-black text-[#9a6b12]">
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
