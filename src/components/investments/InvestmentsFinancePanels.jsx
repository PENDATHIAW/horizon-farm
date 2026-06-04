import { ArrowRight, Handshake, Landmark, PiggyBank, TrendingUp } from 'lucide-react';
import { useMemo } from 'react';
import { HORIZON_FARM_OFFICIAL_BP } from '../../services/horizonFarmOfficialBusinessPlan.js';
import { getInvestorReadySummary } from '../../services/heyHorizonCore/index.js';
import { fmtCurrency } from '../../utils/format.js';

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

/** Pont Finance → module Investisseurs & Forums (lecture seule, pas de duplication). */
export function InvestmentsInvestorBridge({ onNavigate, ...props }) {
  const summary = useMemo(() => getInvestorReadySummary(buildCoreDataMap(props)), [props]);

  return (
    <div className="rounded-3xl border border-[#d6c3a0] bg-gradient-to-br from-[#fffdf8] to-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#8a7456]">
            <Handshake size={14} />
            Dossier investisseur / financeur
          </p>
          <p className="mt-1 text-sm text-[#7d6a4a] leading-relaxed">
            Le BP et les lignes actionnables restent ici. Le pack présentable (banque, subvention, forum) est dans
            {' '}
            <b>Investisseurs & Forums</b>
            , alimenté par les mêmes données ERP.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-2xl border border-[#eadcc2] bg-white px-4 py-3 text-center min-w-[120px]">
            <p className="text-[10px] uppercase font-black text-[#8a7456]">Préparation dossier</p>
            <p className="text-2xl font-black text-[#2f2415]">{summary.readiness_score}%</p>
            <p className="text-xs text-[#8a7456]">{summary.readiness_label}</p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate?.('investisseurs_forums')}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl bg-[#2f2415] px-4 py-2 text-sm font-black text-white hover:bg-[#3d2f1d]"
          >
            Ouvrir Investisseurs & Forums
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
      {summary.gaps?.length ? (
        <ul className="mt-3 text-xs text-amber-900 space-y-1 rounded-2xl border border-amber-200 bg-amber-50 p-3">
          {summary.gaps.slice(0, 4).map((g) => (
            <li key={g}>• {g}</li>
          ))}
          {summary.gaps.length > 4 ? <li>• + {summary.gaps.length - 4} autre(s) point(s)</li> : null}
        </ul>
      ) : (
        <p className="mt-3 text-xs text-emerald-800 rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
          Dossier cohérent côté ERP — vous pouvez générer le pack forum depuis Investisseurs & Forums.
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
    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
      <div>
        <p className="flex items-center gap-2 text-lg font-black text-[#2f2415]">
          <Landmark size={20} />
          Financement & scénario financeur
        </p>
        <p className="mt-1 text-sm text-[#8a7456]">Ressources du BP officiel Horizon Farm — à croiser avec le dossier investisseur.</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
          <p className="text-xs text-[#8a7456]">Besoins démarrage</p>
          <p className="mt-1 text-lg font-black text-[#2f2415]">{fmtCurrency(besoins)}</p>
        </div>
        <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
          <p className="text-xs text-[#8a7456]">Ressources déclarées</p>
          <p className="mt-1 text-lg font-black text-emerald-700">{fmtCurrency(ressourcesTotal)}</p>
        </div>
        <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
          <p className="text-xs text-[#8a7456]">Écart besoins / ressources</p>
          <p className={`mt-1 text-lg font-black ${ecart === 0 ? 'text-emerald-700' : 'text-amber-700'}`}>{fmtCurrency(ecart)}</p>
        </div>
        <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
          <p className="text-xs text-[#8a7456]">Amortissement ({amort.years || 2} ans)</p>
          <p className="mt-1 text-lg font-black text-[#2f2415]">{fmtCurrency(amort.amortizableAmount)}</p>
        </div>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-[#eadcc2]">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="bg-[#fffdf8] text-left text-xs uppercase text-[#8a7456]">
              <th className="px-3 py-2">Source</th>
              <th className="px-3 py-2 text-right">Montant</th>
            </tr>
          </thead>
          <tbody>
            {fundingRows.map((row) => (
              <tr key={row.id || row.designation} className="border-t border-[#eadcc2]">
                <td className="px-3 py-2 font-bold text-[#2f2415]">{row.designation || row.nom || row.name || '—'}</td>
                <td className="px-3 py-2 text-right">{fmtCurrency(n(row.montant ?? row.amount ?? row.total))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {amort.annualDepreciation?.length ? (
        <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-sm text-[#5c4a32]">
          <p className="flex items-center gap-2 font-black text-[#2f2415]">
            <PiggyBank size={16} />
            Plan d’amortissement annuel
          </p>
          <p className="mt-2 text-xs text-[#8a7456]">
            {amort.annualDepreciation.map((v, i) => `An ${i + 1}: ${fmtCurrency(v)}`).join(' · ')}
          </p>
        </div>
      ) : null}
    </section>
  );
}

/** Tableau charges récurrentes BP (hors lignes actionnables Investissements). */
export function BpMonthlyCostsPanel({ costs = [] }) {
  const rows = arr(costs);
  const monthlyTotal = rows.reduce((s, r) => s + n(r.montant_mensuel ?? r.amount ?? r.montant), 0);
  const annualTotal = rows.reduce((s, r) => s + n(r.montant_annuel ?? r.annual ?? (n(r.montant_mensuel ?? r.amount) * 12)), 0);

  return (
    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
      <div>
        <p className="flex items-center gap-2 text-lg font-black text-[#2f2415]">
          <PiggyBank size={20} />
          Charges mensuelles BP
        </p>
        <p className="mt-1 text-sm text-[#8a7456]">Charges récurrentes importées depuis l’onglet Hypothèses — pilotées aussi dans Finance et RH.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 max-w-md">
        <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
          <p className="text-xs text-[#8a7456]">Total mensuel</p>
          <p className="mt-1 text-lg font-black text-[#2f2415]">{fmtCurrency(monthlyTotal)}</p>
        </div>
        <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
          <p className="text-xs text-[#8a7456]">Total annuel estimé</p>
          <p className="mt-1 text-lg font-black text-[#2f2415]">{fmtCurrency(annualTotal || monthlyTotal * 12)}</p>
        </div>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-[#eadcc2]">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="bg-[#fffdf8] text-left text-xs uppercase text-[#8a7456]">
              <th className="px-3 py-2">Poste</th>
              <th className="px-3 py-2">Catégorie</th>
              <th className="px-3 py-2 text-right">Mensuel</th>
              <th className="px-3 py-2 text-right">Annuel</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 40).map((r, i) => (
              <tr key={r.id || i} className="border-t border-[#eadcc2]">
                <td className="px-3 py-2 font-bold text-[#2f2415]">{r.designation || r.nom || '—'}</td>
                <td className="px-3 py-2 text-[#8a7456]">{r.categorie || r.category || '—'}</td>
                <td className="px-3 py-2 text-right">{fmtCurrency(n(r.montant_mensuel ?? r.amount))}</td>
                <td className="px-3 py-2 text-right">{fmtCurrency(n(r.montant_annuel ?? r.annual ?? n(r.montant_mensuel ?? r.amount) * 12))}</td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-[#8a7456]">Aucune charge BP — importez ou synchronisez le plan.</td>
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
    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
      <div>
        <p className="flex items-center gap-2 text-lg font-black text-[#2f2415]">
          <TrendingUp size={20} />
          Prévisions CA BP
        </p>
        <p className="mt-1 text-sm text-[#8a7456]">Revenus par période — comparer avec l’onglet Suivi réel et Objectifs & Croissance.</p>
      </div>
      <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 max-w-xs">
        <p className="text-xs text-[#8a7456]">CA prévu cumulé (lignes affichées)</p>
        <p className="mt-1 text-lg font-black text-[#2f2415]">{fmtCurrency(annual)}</p>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-[#eadcc2]">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="bg-[#fffdf8] text-left text-xs uppercase text-[#8a7456]">
              <th className="px-3 py-2">Période</th>
              <th className="px-3 py-2">Activité</th>
              <th className="px-3 py-2 text-right">CA estimé</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 24).map((r, i) => (
              <tr key={r.id || i} className="border-t border-[#eadcc2]">
                <td className="px-3 py-2">{r.mois || r.periode || r.period || r.label || '—'}</td>
                <td className="px-3 py-2 text-[#8a7456]">{r.activite || r.activity || r.designation || '—'}</td>
                <td className="px-3 py-2 text-right font-bold">{fmtCurrency(n(r.ca_estime ?? r.revenue ?? r.montant))}</td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td colSpan={3} className="px-3 py-6 text-center text-[#8a7456]">Aucune projection — synchronisez le BP.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
