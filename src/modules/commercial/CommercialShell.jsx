import { ArrowRight, Plus } from 'lucide-react';
import ModuleTabsBar from '../../components/module/ModuleTabsBar.jsx';
import { fmtCurrency } from '../../utils/format';

export function CommercialKpi({ label, value, tone = 'neutral', onClick }) {
  const toneCls = tone === 'good' ? 'text-emerald-700' : tone === 'warn' ? 'text-amber-700' : tone === 'bad' ? 'text-red-600' : 'text-[#2f2415]';
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag type={onClick ? 'button' : undefined} onClick={onClick} className={`rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-left ${onClick ? 'hover:border-[#c9a96a] hover:bg-white transition' : ''}`}>
      <p className="text-[11px] font-bold uppercase tracking-wide text-[#8a7456]">{label}</p>
      <p className={`mt-1 text-xl font-black ${toneCls}`}>{value}</p>
    </Tag>
  );
}

export function CommercialQuickActions({ setTab, onNewSale }) {
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={() => { onNewSale?.() || setTab('Ventes'); }} className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#2f2415] px-4 py-2 text-sm font-black text-white">
        <Plus size={16} /> Nouvelle vente
      </button>
      <button type="button" onClick={() => setTab('Ventes')} className="min-h-[44px] rounded-xl border border-[#eadcc2] bg-white px-4 py-2 text-sm font-black text-[#2f2415]">Devis & ventes</button>
      <button type="button" onClick={() => setTab('Livraisons')} className="min-h-[44px] rounded-xl border border-[#eadcc2] bg-white px-4 py-2 text-sm font-black text-[#2f2415]">Livraisons</button>
      <button type="button" onClick={() => setTab('Clients')} className="min-h-[44px] rounded-xl border border-[#eadcc2] bg-white px-4 py-2 text-sm font-black text-[#2f2415]">Clients & créances</button>
      <button type="button" onClick={() => setTab('Relances')} className="min-h-[44px] rounded-xl border border-[#eadcc2] bg-white px-4 py-2 text-sm font-black text-[#2f2415]">Relances</button>
    </div>
  );
}

export function CommercialTodoRow({ title, detail, actionLabel, onAction, onOpen, busy }) {
  return (
    <div className="flex flex-col gap-2 border-b border-[#eadcc2]/60 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <button type="button" onClick={onOpen} className="text-left">
        <p className="font-black text-[#2f2415]">{title}</p>
        {detail ? <p className="text-xs text-[#8a7456]">{detail}</p> : null}
      </button>
      {actionLabel ? (
        <button type="button" disabled={busy} onClick={onAction} className="shrink-0 rounded-lg bg-[#2f2415] px-3 py-1.5 text-xs font-black text-white disabled:opacity-50">{busy ? '…' : actionLabel}</button>
      ) : null}
    </div>
  );
}

import PeriodScopeBadge from '../../components/PeriodScopeBadge.jsx';
import HeyHorizonQuickAsk from '../../components/HeyHorizonQuickAsk.jsx';

export function CommercialModuleHeader({ tab, setTab, healthScore, badges = {}, periodLabel = '', onNavigate, onOpenAssistant }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#9a6b12]">Commercial</p>
          <h1 className="text-2xl font-black text-[#2f2415]">Ventes & clients</h1>
          {periodLabel ? <div className="mt-2"><PeriodScopeBadge label={periodLabel} /></div> : null}
          <HeyHorizonQuickAsk moduleKey="commercial" onNavigate={onNavigate} onOpenAssistant={onOpenAssistant} className="mt-2" />
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className={`rounded-full border px-3 py-1 text-xs font-black ${healthScore >= 75 ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>Santé {healthScore}/100</span>
          {badges.receivable > 0 ? <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-black text-amber-800">Créances {fmtCurrency(badges.receivable)}</span> : null}
          {badges.todo > 0 ? <span className="rounded-full border border-[#eadcc2] bg-white px-3 py-1 text-xs font-black text-[#2f2415]">{badges.todo} à traiter</span> : null}
        </div>
      </div>
      <ModuleTabsBar moduleId="commercial" active={tab} onChange={setTab} tabBadges={badges.tabs || {}} wrap />
    </div>
  );
}

export function CommercialTopClients({ rows = [], setTab, subtitle = 'Par chiffre d\'affaires commandé' }) {
  if (!rows.length) return null;
  return (
    <section className="rounded-2xl border border-[#d6c3a0] bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-black text-[#2f2415]">Top clients</h2>
          <p className="text-[11px] text-[#8a7456]">{subtitle}</p>
        </div>
        <button type="button" onClick={() => setTab('Clients')} className="inline-flex items-center gap-1 text-xs font-black text-[#9a6b12]">Voir tout <ArrowRight size={14} /></button>
      </div>
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.id || row.name} className="flex items-center justify-between rounded-xl bg-[#fffdf8] px-3 py-2">
            <span className="font-bold text-[#2f2415]">{row.name}</span>
            <span className="text-sm font-black text-emerald-700">{fmtCurrency(row.total)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
