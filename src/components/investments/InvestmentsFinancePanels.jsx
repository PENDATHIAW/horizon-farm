import { ArrowRight, FileText, Handshake, Landmark, PiggyBank, TrendingUp } from 'lucide-react';
import { useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  BP_LINE_STATUS_OPTIONS,
  bpCostLabel,
  BP_LINE_STATUS,
  bpCostPlannedAmount,
  bpLineStatusLabel,
  buildBpCostConcretizationRoute,
  buildBpLineStatusPatch,
  isBpCostEditable,
  launchBpCostConcretization,
  normalizeBpLineStatus,
} from '../../utils/bpLineConcretization.js';
import { HORIZON_FARM_OFFICIAL_BP } from '../../services/horizonFarmOfficialBusinessPlan.js';
import { getInvestorReadySummary } from '../../services/heyHorizonCore/index.js';
import { fmtCurrency } from '../../utils/format.js';
import BpLineActionsMenu from './BpLineActionsMenu.jsx';

const arr = (v) => (Array.isArray(v) ? v : []);
const n = (v) => Number(v || 0);

function buildCoreDataMap(props = {}) {
  return {
    business_plans: arr(props.businessPlans),
    finances: arr(props.transactions),
    investissements: arr(props.investissements || props.rows),
    bp_investment_lines: arr(props.bpInvestmentLines),
    bp_funding_sources: arr(props.bpFundingSources),
    bp_recurring_costs: arr(props.bpRecurringCosts),
    bp_revenue_projections: arr(props.bpRevenueProjections),
    sales_orders: arr(props.salesOrders),
    payments: arr(props.payments),
    stock: arr(props.stocks),
    avicole: arr(props.lots),
    animaux: arr(props.animaux),
    cultures: arr(props.cultures),
    clients: arr(props.clients),
    fournisseurs: arr(props.fournisseurs),
    documents: arr(props.documents),
  };
}

/** Guide visuel — où trouver charges, financements, prévisions et plan financier. */
export function BpDistributionNav({
  onSelectTab,
  onNavigate,
  stats = {},
}) {
  const cards = [
    {
      id: 'costs',
      title: 'Charges BP',
      subtitle: 'Hors investissements actionnables — concrétiser vers Finance, RH, Achats',
      tab: 'costs',
      stat: stats.chargesLabel || '—',
    },
    {
      id: 'funding',
      title: 'Financements',
      subtitle: 'Besoins, ressources, écart et amortissement',
      tab: 'funding',
      stat: stats.fundingLabel || '—',
    },
    {
      id: 'forecasts',
      title: 'Revenus & prévisions',
      subtitle: 'CA mensuel BP — comparer avec Suivi réel et Objectifs',
      tab: 'forecasts',
      stat: stats.revenueLabel || '—',
    },
    {
      id: 'plan',
      title: 'Suivi réel',
      subtitle: 'Prévu vs réalisé sur le BP',
      tab: 'plan',
      stat: stats.planLabel || 'Prévu / réel',
    },
    {
      id: 'documents',
      title: 'Plan financier à imprimer',
      subtitle: 'Synthèse lecture seule — Documents & Rapports',
      external: 'documents_rapports',
      stat: 'PDF / export',
    },
  ];

  return (
    <section className="rounded-3xl border border-line bg-card p-6 shadow-card space-y-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-normal text-slate">Répartition BP visible</p>
        <p className="mt-1 text-sm text-slate">
          Investissements = lignes actionnables uniquement. Charges, financements et prévisions ont leurs onglets dédiés ci-dessous.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
        {cards.map((card) => (
          <button
            key={card.id}
            type="button"
            onClick={() => {
              if (card.external) {
                onNavigate?.(card.external);
                return;
              }
              onSelectTab?.(card.tab);
            }}
            className="rounded-2xl border border-line bg-white p-4 text-left hover:border-earth/40 transition-colors"
          >
            <p className="font-semibold text-earth text-sm">{card.title}</p>
            <p className="mt-1 text-meta text-slate leading-snug">{card.subtitle}</p>
            <p className="mt-2 text-xs font-semibold text-positive">{card.stat}</p>
            <span className="mt-2 inline-flex items-center gap-1 text-meta font-semibold text-earth">
              {card.external ? 'Ouvrir Documents' : 'Voir l’onglet'}
              <ArrowRight size={12} />
            </span>
          </button>
        ))}
      </div>
      <p className="text-meta text-slate flex items-center gap-1">
        <FileText size={12} />
        Actions disponibles sur chaque ligne : Concrétiser · Compléter · Joindre preuve · Voir opération — menu « … » pour réparer une liaison exceptionnelle.
      </p>
    </section>
  );
}

/** Pont Finance → module Financements (lecture seule, pas de duplication). */
export function InvestmentsInvestorBridge({ onNavigate, ...props }) {
  const summary = useMemo(() => getInvestorReadySummary(buildCoreDataMap(props)), [props]);

  return (
    <div className="rounded-3xl border border-line bg-card p-6 shadow-card">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-normal text-slate">
            <Handshake size={14} />
            Dossier investisseur / financeur
          </p>
          <p className="mt-1 text-sm text-slate leading-relaxed">
            Le BP et les lignes actionnables restent ici. Le pack présentable (banque, subvention, événement) est dans
            {' '}
            <b>Financements</b>
            , alimenté par les mêmes données ERP.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-2xl border border-line bg-white px-4 py-3 text-center min-w-[120px]">
            <p className="text-meta uppercase font-semibold text-slate">Préparation dossier</p>
            <p className="text-2xl font-semibold text-earth">{summary.readiness_score}%</p>
            <p className="text-xs text-slate">{summary.readiness_label}</p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate?.('financements')}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl bg-earth px-4 py-2 text-sm font-semibold text-white hover:bg-earth"
          >
            Ouvrir Financements
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
      {summary.gaps?.length ? (
        <ul className="mt-3 text-xs text-horizon-dark space-y-1 rounded-2xl border border-vigilance bg-vigilance-bg p-3">
          {summary.gaps.slice(0, 4).map((g) => (
            <li key={g}>• {g}</li>
          ))}
          {summary.gaps.length > 4 ? <li>• + {summary.gaps.length - 4} autre(s) point(s)</li> : null}
        </ul>
      ) : (
        <p className="mt-3 text-xs text-positive rounded-2xl border border-positive bg-positive-bg p-3">
          Dossier cohérent côté ERP — vous pouvez générer le pack financeur depuis Financements.
        </p>
      )}
    </div>
  );
}

/** Financement BP, écart besoins/ressources et amortissement (vue financeur). */
export function BpFundingFinanceurPanel({ bpFundingSources = [], besoinsTotal = 0 }) {
  const official = HORIZON_FARM_OFFICIAL_BP;
  const fundingRows = arr(bpFundingSources).length
    ? arr(bpFundingSources)
    : official.funding.lines.map((line, i) => ({ id: `fund-${i}`, designation: line.designation, montant: line.amount, amount: line.amount }));

  const ressourcesTotal = fundingRows.reduce((s, r) => s + n(r.montant ?? r.amount ?? r.total), 0);
  const besoins = n(besoinsTotal) || official.startupNeeds.officialTotal;
  const ecart = besoins - ressourcesTotal;
  const amort = official.amortization || {};

  return (
    <section className="rounded-3xl border border-line bg-white p-6 shadow-card space-y-4">
      <div>
        <p className="flex items-center gap-2 text-lg font-semibold text-earth">
          <Landmark size={20} />
          Financement & scénario financeur
        </p>
        <p className="mt-1 text-sm text-slate">Ressources du BP officiel Horizon Farm — à croiser avec le dossier investisseur.</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-line bg-card p-4">
          <p className="text-xs text-slate">Besoins démarrage</p>
          <p className="mt-1 text-lg font-semibold text-earth">{fmtCurrency(besoins)}</p>
        </div>
        <div className="rounded-2xl border border-line bg-card p-4">
          <p className="text-xs text-slate">Ressources déclarées</p>
          <p className="mt-1 text-lg font-semibold text-positive">{fmtCurrency(ressourcesTotal)}</p>
        </div>
        <div className="rounded-2xl border border-line bg-card p-4">
          <p className="text-xs text-slate">Écart besoins / ressources</p>
          <p className={`mt-1 text-lg font-semibold ${ecart === 0 ? 'text-positive' : 'text-horizon-dark'}`}>{fmtCurrency(ecart)}</p>
        </div>
        <div className="rounded-2xl border border-line bg-card p-4">
          <p className="text-xs text-slate">Amortissement ({amort.years || 2} ans)</p>
          <p className="mt-1 text-lg font-semibold text-earth">{fmtCurrency(amort.amortizableAmount)}</p>
        </div>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-line">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="bg-card text-left text-xs uppercase text-slate">
              <th className="px-3 py-2">Source</th>
              <th className="px-3 py-2 text-right">Montant</th>
            </tr>
          </thead>
          <tbody>
            {fundingRows.map((row) => (
              <tr key={row.id || row.designation} className="border-t border-line">
                <td className="px-3 py-2 font-semibold text-earth">{row.designation || row.nom || row.name || '—'}</td>
                <td className="px-3 py-2 text-right">{fmtCurrency(n(row.montant ?? row.amount ?? row.total))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {amort.annualDepreciation?.length ? (
        <div className="rounded-2xl border border-line bg-card p-4 text-sm text-slate">
          <p className="flex items-center gap-2 font-semibold text-earth">
            <PiggyBank size={16} />
            Plan d’amortissement annuel
          </p>
          <p className="mt-2 text-xs text-slate">
            {amort.annualDepreciation.map((v, i) => `An ${i + 1}: ${fmtCurrency(v)}`).join(' · ')}
          </p>
        </div>
      ) : null}
    </section>
  );
}

const MODULE_LABELS = {
  finance_pilotage: 'Finance & Pilotage',
  rh: 'RH',
  achats_stock: 'Achats & Stock',
  commercial: 'Commercial',
  objectifs_croissance: 'Objectifs & Croissance',
};

/** Tableau charges récurrentes BP avec statut et concrétisation (comme les lignes investissement). */
export function BpMonthlyCostsPanel({
  costs = [],
  costTotals = {},
  onNavigate,
  onUpdateBpRecurringCost,
  onRefreshBpRecurringCosts,
  needsSync = false,
  onRequestSync,
  transactions = [],
  onLineAction,
}) {
  const rows = arr(costs);
  const monthlyTotal = rows.reduce((s, r) => s + n(r.montant_mensuel ?? r.amount ?? r.montant), 0);


  const updateCostStatus = async (cost, status) => {
    if (!isBpCostEditable(cost)) return toast.error('Resynchronisez le BP pour modifier cette charge.');
    const current = normalizeBpLineStatus(cost);
    if (status !== current && [BP_LINE_STATUS.A_CONCRETISER, BP_LINE_STATUS.CONCRETISE_PARTIEL, BP_LINE_STATUS.EN_COURS].includes(status)) {
      const partial = status === BP_LINE_STATUS.CONCRETISE_PARTIEL;
      const result = launchBpCostConcretization(cost, { onNavigate, partial });
      if (!result.ok) return toast.error('Impossible d’ouvrir la fiche de cette charge.');
      return;
    }
    try {
      await onUpdateBpRecurringCost?.(cost.id, buildBpLineStatusPatch(status));
      await onRefreshBpRecurringCosts?.();
      toast.success(`Statut · ${bpLineStatusLabel(status)}`);
    } catch (error) {
      toast.error(error.message || 'Statut impossible');
    }
  };

  return (
    <section className="rounded-3xl border border-line bg-white p-6 shadow-card space-y-4">
      <div>
        <p className="flex items-center gap-2 text-lg font-semibold text-earth">
          <PiggyBank size={20} />
          Charges mensuelles BP
        </p>
        <p className="mt-1 text-sm text-slate">
          Chaque ligne peut être concrétisée vers Finance, RH ou Achats — comme les investissements actionnables.
        </p>
      </div>

      {needsSync ? (
        <div className="rounded-2xl border border-vigilance bg-vigilance-bg p-4 text-sm text-horizon-dark">
          <p className="font-semibold">Charges en lecture seule</p>
          <p className="mt-1">Cliquez <b>Resynchroniser le BP officiel</b> en haut pour enregistrer les lignes et activer Concrétiser / Modifier le statut.</p>
          {onRequestSync ? (
            <button type="button" onClick={onRequestSync} className="mt-3 rounded-xl bg-earth px-4 py-2 text-xs font-semibold text-white">
              Resynchroniser maintenant
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-line bg-card p-4">
          <p className="text-xs text-slate">Prévu (mensuel)</p>
          <p className="mt-1 text-lg font-semibold text-earth">{fmtCurrency(costTotals.prevu ?? monthlyTotal)}</p>
        </div>
        <div className="rounded-2xl border border-line bg-card p-4">
          <p className="text-xs text-slate">Concrétisé</p>
          <p className="mt-1 text-lg font-semibold text-positive">{fmtCurrency(costTotals.concretise ?? 0)}</p>
        </div>
        <div className="rounded-2xl border border-line bg-card p-4">
          <p className="text-xs text-slate">Reste</p>
          <p className="mt-1 text-lg font-semibold text-horizon-dark">{fmtCurrency(costTotals.reste ?? monthlyTotal)}</p>
        </div>
        <div className="rounded-2xl border border-line bg-card p-4">
          <p className="text-xs text-slate">Lignes</p>
          <p className="mt-1 text-lg font-semibold text-earth">{String(costTotals.count ?? rows.length)}</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-line">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="bg-card text-left text-xs uppercase text-slate">
              <th className="px-3 py-2">Poste</th>
              <th className="px-3 py-2">Module cible</th>
              <th className="px-3 py-2 text-right">Prévu</th>
              <th className="px-3 py-2 text-right">Payé</th>
              <th className="px-3 py-2 text-right">Reste</th>
              <th className="px-3 py-2">Statut</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const status = normalizeBpLineStatus(r);
              return (
                <tr key={r.id || i} className="border-t border-line">
                  <td className="px-3 py-2 font-semibold text-earth">{bpCostLabel(r)}</td>
                  <td className="px-3 py-2 text-slate">{MODULE_LABELS[r.module_cible] || r.module_cible || '—'}</td>
                  <td className="px-3 py-2 text-right">{fmtCurrency(bpCostPlannedAmount(r))}</td>
                  <td className="px-3 py-2 text-right">{fmtCurrency(r.montant_paye ?? r.montant_reel ?? 0)}</td>
                  <td className="px-3 py-2 text-right">{fmtCurrency(r.reste_a_realiser ?? Math.max(0, bpCostPlannedAmount(r) - n(r.montant_paye ?? r.montant_reel)))}</td>
                  <td className="px-3 py-2">
                    {isBpCostEditable(r) ? (
                      <select
                        value={status}
                        onChange={(e) => updateCostStatus(r, e.target.value)}
                        className="rounded-lg border border-line bg-white px-2 py-1 text-xs font-semibold text-earth"
                      >
                        {BP_LINE_STATUS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-slate">{bpLineStatusLabel(status)}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <BpLineActionsMenu
                      line={r}
                      kind="cost"
                      transactions={transactions}
                      onAction={onLineAction}
                      allowPreviewActions={!isBpCostEditable(r) && Boolean(buildBpCostConcretizationRoute(r))}
                      compact
                    />
                  </td>
                </tr>
              );
            })}
            {!rows.length ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-slate">Aucune charge BP — resynchronisez le plan officiel.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** CA prévisionnel mensuel (onglet Périodicité revenus). */
export function BpRevenueForecastsPanel({ projections = [] }) {
  const rows = arr(projections);
  const annual = rows.reduce((s, r) => s + n(r.ca_estime ?? r.revenue ?? r.montant), 0);

  return (
    <section className="rounded-3xl border border-line bg-white p-6 shadow-card space-y-4">
      <div>
        <p className="flex items-center gap-2 text-lg font-semibold text-earth">
          <TrendingUp size={20} />
          Prévisions CA BP
        </p>
        <p className="mt-1 text-sm text-slate">Revenus par période — comparer avec l’onglet Suivi réel et Objectifs & Croissance.</p>
      </div>
      <div className="rounded-2xl border border-line bg-card p-4 max-w-xs">
        <p className="text-xs text-slate">CA prévu cumulé (lignes affichées)</p>
        <p className="mt-1 text-lg font-semibold text-earth">{fmtCurrency(annual)}</p>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-line">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="bg-card text-left text-xs uppercase text-slate">
              <th className="px-3 py-2">Période</th>
              <th className="px-3 py-2">Activité</th>
              <th className="px-3 py-2 text-right">CA estimé</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 24).map((r, i) => (
              <tr key={r.id || i} className="border-t border-line">
                <td className="px-3 py-2">{r.mois || r.periode || r.period || r.label || '—'}</td>
                <td className="px-3 py-2 text-slate">{r.activite || r.activity || r.designation || '—'}</td>
                <td className="px-3 py-2 text-right font-semibold">{fmtCurrency(n(r.ca_estime ?? r.revenue ?? r.montant))}</td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td colSpan={3} className="px-3 py-6 text-center text-slate">Aucune projection — synchronisez le BP.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
