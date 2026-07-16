import { ArrowRight, Plus } from 'lucide-react';
import ModuleTabsBar from '../../components/module/ModuleTabsBar.jsx';
import { fmtCurrency } from '../../utils/format';

export function CommercialKpi({ label, value, tone = 'neutral', onClick }) {
  const toneCls = tone === 'good' ? 'text-positive' : tone === 'warn' ? 'text-horizon-dark' : tone === 'bad' ? 'text-urgent' : 'text-earth';
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag type={onClick ? 'button' : undefined} onClick={onClick} className={`rounded-2xl border border-line bg-card p-4 text-left ${onClick ? 'hover:border-horizon hover:bg-white transition' : ''}`}>
      <p className="text-meta font-semibold uppercase tracking-normal text-slate">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${toneCls}`}>{value}</p>
    </Tag>
  );
}

export function CommercialQuickActions({ setTab, onNewSale }) {
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={() => { onNewSale?.() || setTab('Ventes'); }} className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-earth px-4 py-2 text-sm font-semibold text-white">
        <Plus size={16} /> Nouvelle vente
      </button>
      <button type="button" onClick={() => setTab('Ventes')} className="min-h-[44px] rounded-xl border border-line bg-white px-4 py-2 text-sm font-semibold text-earth">Devis & ventes</button>
      <button type="button" onClick={() => setTab('Livraisons')} className="min-h-[44px] rounded-xl border border-line bg-white px-4 py-2 text-sm font-semibold text-earth">Livraisons</button>
      <button type="button" onClick={() => setTab('Clients & créances')} className="min-h-[44px] rounded-xl border border-line bg-white px-4 py-2 text-sm font-semibold text-earth">Clients & créances</button>
    </div>
  );
}

export function CommercialTodoRow({ title, detail, actionLabel, onAction, onOpen, busy }) {
  return (
    <div className="flex flex-col gap-2 border-b border-line/60 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <button type="button" onClick={onOpen} className="text-left">
        <p className="font-semibold text-earth">{title}</p>
        {detail ? <p className="text-xs text-slate">{detail}</p> : null}
      </button>
      {actionLabel ? (
        <button type="button" disabled={busy} onClick={onAction} className="shrink-0 rounded-lg bg-earth px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{busy ? '…' : actionLabel}</button>
      ) : null}
    </div>
  );
}

import PeriodScopeBadge from '../../components/PeriodScopeBadge.jsx';
import HeyHorizonQuickAsk from '../../components/HeyHorizonQuickAsk.jsx';

export function CommercialModuleHeader({ tab, setTab, healthScore, badges = {}, periodLabel = '', periodFiltered = false, onNavigate, onOpenAssistant }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-meta font-semibold uppercase tracking-normal text-horizon-dark">Commercial</p>
          <h1 className="text-2xl font-semibold text-earth">Ventes & clients</h1>
          {periodLabel ? <div className="mt-2"><PeriodScopeBadge label={periodLabel} /></div> : null}
          <HeyHorizonQuickAsk moduleKey="commercial" onNavigate={onNavigate} onOpenAssistant={onOpenAssistant} className="mt-2" />
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {healthScore > 0 ? (
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${healthScore >= 75 ? 'border-positive bg-positive-bg text-positive' : 'border-vigilance bg-vigilance-bg text-horizon-dark'}`}>Santé {healthScore}/100</span>
          ) : (
            <span className="rounded-full border border-line bg-white px-3 py-1 text-xs font-semibold text-slate">Santé : à évaluer</span>
          )}
          {badges.receivable > 0 ? (
            <span className="rounded-full border border-vigilance bg-vigilance-bg px-3 py-1 text-xs font-semibold text-horizon-dark">
              Créances {fmtCurrency(badges.receivable)}
              {periodFiltered ? ' · période' : ''}
            </span>
          ) : null}
          {badges.todo > 0 ? <span className="rounded-full border border-line bg-white px-3 py-1 text-xs font-semibold text-earth">{badges.todo} à traiter</span> : null}
        </div>
      </div>
      <ModuleTabsBar moduleId="commercial" active={tab} onChange={setTab} tabBadges={badges.tabs || {}} wrap />
    </div>
  );
}

export function CommercialTopClients({ rows = [], setTab, subtitle = 'Par chiffre d\'affaires commandé' }) {
  if (!rows.length) return null;
  return (
    <section className="rounded-2xl border border-line bg-white p-4 shadow-card">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-earth">Top clients</h2>
          <p className="text-meta text-slate">{subtitle}</p>
        </div>
        <button type="button" onClick={() => setTab('Clients & créances')} className="inline-flex items-center gap-1 text-xs font-semibold text-horizon-dark">Voir tout <ArrowRight size={14} /></button>
      </div>
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.id || row.name} className="flex items-center justify-between rounded-xl bg-card px-3 py-2">
            <span className="font-semibold text-earth">{row.name}</span>
            <span className="text-sm font-semibold text-positive">{fmtCurrency(row.total)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
