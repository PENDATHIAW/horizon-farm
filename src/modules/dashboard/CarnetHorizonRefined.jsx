import PeriodScopeBadge from '../../components/PeriodScopeBadge.jsx';
import { fmtCurrency } from '../../utils/format.js';
import { MapPin } from 'lucide-react';

const cx = (...v) => v.filter(Boolean).join(' ');
const money = (v) => fmtCurrency(Number(v || 0));

function Badge({ label }) {
  if (!label) return null;
  return <span className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-violet-800">{label}</span>;
}

function Card({ card, onNavigate }) {
  const clickable = Boolean(card?.navigate && onNavigate);
  const Tag = clickable ? 'button' : 'article';
  return <Tag type={clickable ? 'button' : undefined} onClick={clickable ? () => onNavigate(card.navigate.module, { tab: card.navigate.tab }) : undefined} className={cx('flex min-h-[168px] flex-col rounded-xl border border-emerald-200/50 bg-emerald-400/10 p-3 text-left', clickable && 'cursor-pointer transition hover:border-emerald-300 hover:bg-emerald-400/20')}><div className="flex items-center justify-between gap-1.5"><p className="text-[10px] font-black tracking-wide text-emerald-800/80">{card.title}</p><Badge label={card.scopeLabel} /></div><p className="mt-2 text-sm font-black leading-tight text-[#2f2415]">{card.headline}</p><ul className="mt-2 flex-1 space-y-0.5">{(card.lines || []).map((l, i) => <li key={i} className="text-[11px] leading-snug text-[#5c4d38]">• {l.text}</li>)}</ul>{card.alerts?.length ? <ul className="mt-2 border-t border-emerald-200/40 pt-2">{card.alerts.map((a, i) => <li key={i} className="text-[10px] font-semibold text-amber-800">! {a.text}</li>)}</ul> : null}{clickable ? <p className="mt-2 text-[10px] font-black text-emerald-800/70">Ouvrir le module →</p> : null}</Tag>;
}

function Projection({ item, onNavigate }) {
  const clickable = Boolean(item?.navigate && onNavigate);
  const Tag = clickable ? 'button' : 'div';
  const tone = item.tone === 'warn' ? 'border-amber-200 bg-amber-50/80' : item.tone === 'good' ? 'border-emerald-200 bg-emerald-50/80' : 'border-[#efe6d6] bg-white/70';
  const value = item.format === 'currency' ? money(item.value) : String(Number(item.value || 0).toLocaleString('fr-FR'));
  return <Tag type={clickable ? 'button' : undefined} onClick={clickable ? () => onNavigate(item.navigate.module, { tab: item.navigate.tab }) : undefined} className={cx('rounded-lg border p-2.5 text-left', tone)}><p className="text-[9px] font-black uppercase tracking-wide text-[#8a7456]">{item.label}</p><p className="mt-0.5 text-sm font-black text-[#2f2415]">{value}</p>{item.hint ? <p className="mt-0.5 text-[10px] font-medium text-[#8a7456]">{item.hint}</p> : null}</Tag>;
}

function Goal({ block, onNavigate }) {
  if (!block) return null;
  const pct = Math.min(100, Math.max(0, Number(block.attainment) || 0));
  return <button type="button" onClick={() => block.navigate && onNavigate?.(block.navigate.module, { tab: block.navigate.tab })} className="min-w-0 flex-1 rounded-lg border border-[#efe6d6] bg-white/60 p-3 text-left"><div className="flex items-center justify-between gap-2"><p className="text-[10px] font-black uppercase tracking-wide text-[#8a7456]">{block.label}</p><Badge label={block.scopeLabel} /></div><p className="mt-1 text-xs font-black text-[#2f2415]">{money(block.realized)} <span className="font-medium text-[#8a7456]">/ {money(block.target)}</span></p><div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#efe6d6]"><div className="h-full rounded-full bg-[#b8954a]" style={{ width: `${pct}%` }} /></div><p className="mt-1 text-[10px] font-semibold text-[#9a6b12]">{block.attainment} % atteint</p></button>;
}

export function CarnetHorizonHeader({ displayName = 'Exploitant', location = 'Ferme principale', periodLabel = '' }) {
  return <section className="rounded-xl border border-[#e5dcc8] bg-[#fffdf8] px-4 py-3"><h1 className="text-lg font-black text-[#2f2415] sm:text-xl">Bonjour {displayName}</h1><p className="text-xs text-[#5c4d38]">Voici l&apos;état de votre exploitation</p><div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-[#8a7456]">{periodLabel ? <PeriodScopeBadge label={periodLabel} /> : null}<span className="inline-flex items-center gap-1"><MapPin size={12} />{location}</span></div></section>;
}

export default function CarnetHorizon({ carnet, onNavigate, simulatedMode = false }) {
  if (!carnet) return null;
  const showEmpty = !carnet.projections?.hasData && (carnet.startupMode || !simulatedMode);
  return <div className="space-y-3"><section className="rounded-xl border border-[#e5dcc8] bg-[#faf6ee] px-3 py-3"><p className="text-[10px] font-black uppercase tracking-wide text-[#9a6b12]">Conseil Horizon</p><p className="mt-2 text-xs text-[#2f2415]"><b>Situation —</b> {carnet.conseil?.situation || carnet.conseil?.text}</p>{carnet.conseil?.cause ? <p className="text-xs text-[#2f2415]"><b>Pourquoi —</b> {carnet.conseil.cause}</p> : null}{carnet.conseil?.action ? <p className="text-xs text-[#2f2415]"><b>À faire —</b> {carnet.conseil.action}</p> : null}</section><div className="grid grid-cols-2 gap-2 xl:grid-cols-4">{(carnet.domains || []).map((c) => <Card key={c.id} card={c} onNavigate={onNavigate} />)}</div>{carnet.capteurs ? <Card card={carnet.capteurs} onNavigate={onNavigate} /> : null}{carnet.projections?.hasData ? <section className="rounded-xl border border-[#e5dcc8] bg-[#faf6ee] px-3 py-2.5"><h2 className="text-[10px] font-black uppercase tracking-wide text-[#8a7456]">Projections & pilotage</h2><p className="mb-2 mt-0.5 text-[10px] text-[#8a7456]">Anticipation à 30 jours — CA, trésorerie, créances et stock.</p><div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">{(carnet.projections.items || []).map((i) => <Projection key={i.id} item={i} onNavigate={onNavigate} />)}</div></section> : null}{showEmpty ? <section className="rounded-xl border border-dashed border-[#d6c3a0] bg-[#fffdf8] px-3 py-3"><h2 className="text-[10px] font-black uppercase tracking-wide text-[#8a7456]">Projections & pilotage</h2><p className="mt-1 text-xs text-[#5c4d38]">Les projections apparaîtront dès qu&apos;il y aura assez de ventes, paiements, stocks ou production. Pour tester un scénario complet, activez les données simulées.</p></section> : null}{carnet.objectifs ? <section className="rounded-xl border border-[#e5dcc8] bg-[#fffdf8] px-3 py-2.5"><h2 className="text-[10px] font-black uppercase tracking-wide text-[#8a7456]">Objectifs de l&apos;exploitation</h2><p className="mb-2 text-[10px] text-[#8a7456]">Suivi selon la période active et l&apos;Année 1 du Business Plan Horizon Farm.</p><div className="flex flex-col gap-2 sm:flex-row"><Goal block={carnet.objectifs.month} onNavigate={onNavigate} /><Goal block={carnet.objectifs.year} onNavigate={onNavigate} /></div></section> : null}<section className="rounded-xl border border-[#e5dcc8] bg-[#fffdf8] px-3 py-3"><div className="mb-2 flex items-center justify-between gap-2"><div><h2 className="text-[10px] font-black uppercase tracking-wide text-[#8a7456]">Dernières actions terrain</h2><p className="text-[10px] text-[#8a7456]">Ventes, paiements, production, livraisons et opérations réellement enregistrées</p></div>{onNavigate ? <button type="button" onClick={() => onNavigate('sync_activity')} className="text-[10px] font-black text-[#9a6b12]">Voir tout →</button> : null}</div><ul className="grid grid-cols-1 gap-0.5 sm:grid-cols-2">{(carnet.journal?.items || []).map((item, i) => <li key={i} className="text-[11px] text-[#2f2415]">{item.icon} {item.text}</li>)}</ul></section></div>;
}
