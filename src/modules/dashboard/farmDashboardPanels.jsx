import { ArrowRight, Building2, MapPin, TrendingDown, TrendingUp } from 'lucide-react';
import { fmtCurrency, fmtNumber } from '../../utils/format';
import { QUICK_ACTION_ROUTES } from '../../utils/farmConsolidation.js';

function toneClass(tone = 'neutral') {
  if (tone === 'good') return 'text-emerald-700';
  if (tone === 'warn') return 'text-amber-700';
  if (tone === 'bad') return 'text-red-600';
  return 'text-[#2f2415]';
}

export function DashboardAllFarmsCompactPanel({ context = null, onExpand, onManageFarms }) {
  if (!context?.activeFarmCount || context.activeFarmCount <= 1) return null;
  const { totals, avgExploitationScore, bestFarm, riskiestFarm } = context;

  return (
    <section className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-800">Groupe</p>
          <h2 className="mt-0.5 text-base font-black text-[#2f2415]">
            {context.activeFarmCount} ferme(s) · score {avgExploitationScore}/100
          </h2>
          <p className="mt-1 text-xs text-[#6b8a6b]">
            CA {fmtCurrency(totals.ca)} · Trésorerie {fmtCurrency(totals.cashNet)}
          </p>
          <div className="mt-2 space-y-1 text-xs text-[#6b8a6b]">
            {bestFarm ? <p>Meilleure : <b className="text-[#2f2415]">{bestFarm.name}</b> ({bestFarm.exploitationScore}/100)</p> : null}
            {riskiestFarm ? <p>À risque : <b className="text-[#2f2415]">{riskiestFarm.name}</b> ({riskiestFarm.alerts} alerte(s))</p> : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {onExpand ? (
            <button type="button" onClick={onExpand} className="rounded-xl border border-emerald-300 bg-white px-3 py-1.5 text-xs font-black text-emerald-800">
              Voir comparaison détaillée
            </button>
          ) : null}
          {onManageFarms ? (
            <button type="button" onClick={onManageFarms} className="rounded-xl border border-emerald-300 bg-white px-3 py-1.5 text-xs font-black text-emerald-800">
              Gérer les fermes
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function DashboardAllFarmsPanel({ context = null, onNavigate, onManageFarms }) {
  if (!context?.activeFarmCount || context.activeFarmCount <= 1) return null;
  const { totals, avgExploitationScore, avgInvestorScore, comparisonRows, bestFarm, riskiestFarm } = context;

  return (
    <section className="rounded-3xl border border-[#22c55e]/30 bg-gradient-to-br from-[#f0fdf4] to-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-800">Vue toutes les fermes</p>
          <h2 className="mt-1 text-xl font-black text-[#2f2415]">Consolidation groupe</h2>
          <p className="mt-1 text-sm text-[#6b8a6b]">{context.activeFarmCount} ferme(s) active(s) — pilotage direction.</p>
        </div>
        {onManageFarms ? (
          <button type="button" onClick={onManageFarms} className="rounded-xl border border-emerald-300 bg-white px-3 py-2 text-xs font-black text-emerald-800">
            Gérer les fermes
          </button>
        ) : null}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-6">
        <Stat label="Fermes actives" value={fmtNumber(context.activeFarmCount)} />
        <Stat label="CA consolidé" value={fmtCurrency(totals.ca)} />
        <Stat label="Trésorerie" value={fmtCurrency(totals.cashNet)} tone={totals.cashNet >= 0 ? 'good' : 'bad'} />
        <Stat label="Stock critique" value={fmtNumber(totals.stockCritical)} tone={totals.stockCritical ? 'warn' : 'good'} />
        <Stat label="Alertes" value={fmtNumber(totals.alerts)} tone={totals.alerts ? 'warn' : 'good'} />
        <Stat label="Score exploitation" value={`${avgExploitationScore}/100`} />
        <Stat label="Score investisseur" value={`${avgInvestorScore}/100`} />
        <Stat label="Effectifs" value={fmtNumber(totals.headcount)} />
        <Stat label="Cultures" value={`${fmtNumber(totals.parcelCount)} parcelle(s)`} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        {bestFarm ? (
          <HighlightCard icon={TrendingUp} title="Meilleure ferme" name={bestFarm.name} detail={`Score ${bestFarm.exploitationScore}/100 · CA ${fmtCurrency(bestFarm.ca)}`} tone="good" />
        ) : null}
        {riskiestFarm ? (
          <HighlightCard icon={TrendingDown} title="Ferme la plus à risque" name={riskiestFarm.name} detail={`${riskiestFarm.alerts} alerte(s) · stock critique ${riskiestFarm.stockCritical}`} tone="warn" />
        ) : null}
      </div>

      <FarmComparisonTable rows={comparisonRows} onNavigate={onNavigate} className="mt-4" />
    </section>
  );
}

export function FarmComparisonTable({ rows = [], className = '' }) {
  if (!rows.length) return null;
  return (
    <div className={`overflow-x-auto rounded-2xl border border-[#eadcc2] bg-white ${className}`}>
      <table className="min-w-full text-left text-sm">
        <thead className="bg-[#fffdf8] text-[11px] uppercase tracking-wide text-[#8a7456]">
          <tr>
            <th className="px-3 py-2">Ferme</th>
            <th className="px-3 py-2">Activités</th>
            <th className="px-3 py-2">CA</th>
            <th className="px-3 py-2">Trésorerie</th>
            <th className="px-3 py-2">Stock crit.</th>
            <th className="px-3 py-2">Alertes</th>
            <th className="px-3 py-2">Score</th>
            <th className="px-3 py-2">Statut</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.farmId} className="border-t border-[#eadcc2]/70">
              <td className="px-3 py-2 font-bold text-[#2f2415]">{row.name}</td>
              <td className="px-3 py-2 text-[#8a7456]">{row.activities}</td>
              <td className="px-3 py-2">{fmtCurrency(row.ca)}</td>
              <td className={`px-3 py-2 ${row.cashNet >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{fmtCurrency(row.cashNet)}</td>
              <td className="px-3 py-2">{row.stockCritical}</td>
              <td className="px-3 py-2">{row.alerts}</td>
              <td className="px-3 py-2 font-black">{row.exploitationScore}/100</td>
              <td className="px-3 py-2">
                {row.isLaunching ? <span className="text-amber-700">Lancement</span> : row.status}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DashboardActivityKpiStrip({ cards = [], farmName = '' }) {
  if (!cards.length) return null;
  return (
    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm">
      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#9a6b12]">KPI adaptés</p>
      <h2 className="mt-1 text-lg font-black text-[#2f2415]">{farmName || 'Ferme active'}</h2>
      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.key} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-[#8a7456]">{card.label}</p>
            <p className="mt-1 text-xl font-black text-[#2f2415]">{card.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function DashboardAdaptedQuickActions({ actions = [], onNavigate }) {
  if (!actions.length) return null;
  const navigateAction = (action) => {
    const route = QUICK_ACTION_ROUTES[action.key] || { module: action.module, tab: action.tab };
    onNavigate?.(route.module, route.tab ? { tab: route.tab } : undefined);
  };
  return (
    <section className="rounded-2xl border border-[#d6c3a0] bg-white p-4 shadow-sm">
      <h2 className="text-sm font-black text-[#2f2415]">Actions rapides adaptées</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {actions.map((action) => (
          <button
            key={action.key}
            type="button"
            onClick={() => navigateAction(action)}
            className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] px-3 py-2 text-xs font-black text-[#2f2415] hover:border-[#22c55e]"
          >
            {action.label}
          </button>
        ))}
      </div>
    </section>
  );
}

export function DashboardAdaptedAlertsPanel({ alerts = [] }) {
  if (!alerts.length) return null;
  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <h2 className="text-sm font-black text-amber-900">Alertes adaptées</h2>
      <ul className="mt-2 space-y-1 text-sm text-amber-900">
        {alerts.slice(0, 8).map((entry) => (
          <li key={entry}>• {entry}</li>
        ))}
      </ul>
    </section>
  );
}

export function FarmLocationGrid({ cards = [], onNavigate }) {
  if (!cards.length) return null;
  return (
    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <MapPin size={18} className="text-[#9a6b12]" />
        <h2 className="text-lg font-black text-[#2f2415]">Localisation des fermes</h2>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <article key={card.id} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-black text-[#2f2415]">{card.name}</p>
                <p className="text-xs text-[#8a7456]">{card.region} · {card.commune}</p>
              </div>
              <Building2 size={16} className="text-[#9a6b12] shrink-0" />
            </div>
            <p className="mt-2 text-xs text-[#8a7456]">{card.activities}</p>
            <p className="mt-1 text-xs text-[#8a7456]">Statut : {card.status || 'active'}</p>
            {card.weatherTemp != null ? (
              <p className="mt-2 text-xs text-sky-800">{card.weatherTemp}°C · {card.weatherCondition || 'Conditions stables'}</p>
            ) : null}
            <p className="mt-1 text-xs text-[#8a7456]">
              {card.latitude != null && card.longitude != null
                ? `GPS ${card.latitude}, ${card.longitude}`
                : 'Coordonnées à renseigner'}
            </p>
            {card.mainAlerts?.length ? (
              <ul className="mt-2 space-y-0.5 text-[10px] text-amber-800">
                {card.mainAlerts.slice(0, 2).map((entry) => <li key={entry}>• {entry}</li>)}
              </ul>
            ) : null}
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="font-bold text-[#2f2415]">Score {card.score ?? '—'}/100</span>
              <span className="text-[#8a7456]">{card.alerts} alerte(s)</span>
            </div>
          </article>
        ))}
      </div>
      {onNavigate ? (
        <button type="button" onClick={() => onNavigate('gestion_systeme', { tab: 'Fermes' })} className="mt-4 inline-flex items-center gap-1 text-xs font-black text-[#9a6b12]">
          Voir la comparaison complète <ArrowRight size={14} />
        </button>
      ) : null}
    </section>
  );
}

function Stat({ label, value, tone = 'neutral' }) {
  return (
    <div className="rounded-2xl border border-[#eadcc2] bg-white p-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-[#8a7456]">{label}</p>
      <p className={`mt-1 text-lg font-black ${toneClass(tone)}`}>{value}</p>
    </div>
  );
}

function HighlightCard({ icon: Icon, title, name, detail, tone = 'neutral' }) {
  return (
    <div className={`rounded-2xl border p-4 ${tone === 'good' ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide">
        <Icon size={14} />
        {title}
      </div>
      <p className="mt-2 text-base font-black text-[#2f2415]">{name}</p>
      <p className="mt-1 text-sm text-[#8a7456]">{detail}</p>
    </div>
  );
}

export function FarmDemoModeBanner({ enabled = false, onToggle }) {
  if (!enabled) return null;
  return (
    <div className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-900 flex flex-wrap items-center justify-between gap-2">
      <span>Mode démo multi-fermes actif — fermes fictives ajoutées pour démonstration uniquement.</span>
      {onToggle ? (
        <button type="button" onClick={onToggle} className="rounded-lg border border-violet-300 bg-white px-3 py-1 text-xs font-black">
          Désactiver
        </button>
      ) : null}
    </div>
  );
}
