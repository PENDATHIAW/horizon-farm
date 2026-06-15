import toast from 'react-hot-toast';
import { fmtCurrency } from '../../utils/format';
import CommercialInvestorInsights from './CommercialInvestorInsights.jsx';
import { buildCommercialInvestorReport, exportCommercialInvestorPdf } from '../../utils/commercialExport.js';
import { buildCommercialPilotageBundle } from '../../utils/commercialPilotageMetrics.js';

export default function CommercialPilotagePanel({
  data = {},
  setTab,
  periodLabel = '',
  periodFiltered = false,
  marginContext = {},
  chartOptions = {},
}) {
  const pilotageOrders = periodFiltered ? (data.orders || data.ordersAll) : data.ordersAll;
  const report = buildCommercialInvestorReport({
    orders: pilotageOrders,
    payments: data.paymentsAll,
    clients: data.clients,
    deliveries: data.deliveries,
    invoices: data.invoices,
    relanceRows: data.relanceRows,
    periodLabel,
  });

  const pilotage = buildCommercialPilotageBundle({
    orders: pilotageOrders,
    payments: data.paymentsAll,
    clients: data.clients,
    marginContext,
    chartOptions,
  });

  const exportPdf = () => {
    exportCommercialInvestorPdf(report);
    toast.success('Export preuve commerciale généré');
  };

  return (
    <div className="space-y-4">
      <CommercialInvestorInsights
        orders={data.ordersAll}
        payments={data.paymentsAll}
        clients={data.clients}
        deliveries={data.deliveries}
        invoices={data.invoices}
        stocks={data.stocks}
        cultures={data.cultures}
        lots={data.lots}
        animaux={data.animaux}
        periodLabel={periodLabel}
      />

      <section className="rounded-2xl border border-[#d6c3a0] bg-white p-4">
        <p className="text-xs uppercase tracking-widest text-[#8a7456] font-black mb-3">Objectifs commercial</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3">
            <p className="text-[11px] text-[#8a7456]">Objectif mois</p>
            <p className="font-black text-[#2f2415]">{fmtCurrency(pilotage.objectives.target)}</p>
          </div>
          <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3">
            <p className="text-[11px] text-[#8a7456]">Réalisé</p>
            <p className="font-black text-emerald-700">{fmtCurrency(pilotage.objectives.actual)}</p>
          </div>
          <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3">
            <p className="text-[11px] text-[#8a7456]">Restant</p>
            <p className="font-black text-amber-700">{fmtCurrency(pilotage.objectives.remaining)}</p>
          </div>
          <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3">
            <p className="text-[11px] text-[#8a7456]">Projection fin de mois</p>
            <p className="font-black text-[#2f2415]">{fmtCurrency(pilotage.objectives.projectionEndOfMonth)}</p>
          </div>
        </div>
        <p className="mt-2 text-xs text-[#8a7456]">
          Atteinte {pilotage.objectives.attainment}% · source {pilotage.objectives.source}
        </p>
      </section>

      <section className="rounded-2xl border border-[#d6c3a0] bg-white p-4">
        <p className="text-xs uppercase tracking-widest text-[#8a7456] font-black mb-3">Produits les plus rentables (Finance → Rentabilité)</p>
        <div className="space-y-2">
          {pilotage.topProducts.length ? pilotage.topProducts.map((row) => (
            <div key={row.name} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#eadcc2] px-3 py-2 text-sm">
              <span className="font-bold text-[#2f2415]">{row.name}</span>
              <span className="text-emerald-700 font-black">Marge {fmtCurrency(row.margin)} ({row.marginRate}%)</span>
              <span className="text-xs text-[#8a7456]">CA {fmtCurrency(row.ca)} · vol. {row.volume}</span>
            </div>
          )) : (
            <p className="text-sm text-[#8a7456]">Complétez les coûts sources pour afficher les marges produits.</p>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-[#d6c3a0] bg-white p-4">
        <p className="text-xs uppercase tracking-widest text-[#8a7456] font-black mb-3">Clients stratégiques</p>
        <div className="space-y-2">
          {pilotage.strategicClients.map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={() => setTab?.('Clients & créances')}
              className="flex w-full flex-wrap items-center justify-between gap-2 rounded-xl border border-[#eadcc2] px-3 py-2 text-left text-sm hover:bg-[#fffdf8]"
            >
              <span className="font-bold text-[#2f2415]">{row.name}</span>
              <span className="text-emerald-700 font-black">CA {fmtCurrency(row.ca)}</span>
              <span className="text-xs text-[#8a7456]">{row.frequency} · marge {fmtCurrency(row.margin)} · {row.segment}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-[#d6c3a0] bg-white p-4">
        <details>
          <summary className="cursor-pointer text-xs font-black uppercase tracking-widest text-[#8a7456]">Preuve commerciale / investisseur</summary>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-[#8a7456]">{report.summary}</p>
            <button type="button" onClick={exportPdf} className="rounded-xl bg-[#2f2415] px-4 py-2 text-xs font-black text-white">
              Exporter PDF investisseur
            </button>
          </div>
        </details>
      </section>
      <p className="text-xs text-[#8a7456]">
        Écarts de réconciliation : Finance → Réconciliation · Devis : onglet Ventes
      </p>
    </div>
  );
}
