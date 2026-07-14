import { buildCommercialInvestorReport } from '../../utils/commercialExport.js';
import { buildAutoCommercialOpportunities } from '../../utils/commercialAutoOpportunities.js';
import { buildCommercialClientSegmentationIA } from '../../services/commercialClientSegmentationIA.js';

/**
 * Mode investisseur commercial - résumé max 3 lignes.
 */
export default function CommercialInvestorInsights({
  orders = [],
  payments = [],
  clients = [],
  deliveries = [],
  invoices = [],
  stocks = [],
  cultures = [],
  lots = [],
  animaux = [],
  periodLabel = '',
}) {
  const report = buildCommercialInvestorReport({
    orders,
    payments,
    clients,
    deliveries,
    invoices,
    periodLabel,
  });
  const segmentation = buildCommercialClientSegmentationIA({ clients, orders, payments });
  const autoOpps = buildAutoCommercialOpportunities({ stocks, cultures, lots, animaux, salesOrders: orders });

  const topClient = report.topClients?.[0];
  const topProduct = report.kpis?.topProducts?.[0];
  const clientShare = report.kpis?.ca > 0 && topClient
    ? Math.round((topClient.ca / report.kpis.ca) * 100)
    : 0;
  const productConcentration = report.kpis?.ca > 0 && topProduct
    ? Math.round((topProduct.total / report.kpis.ca) * 100)
    : 0;

  const growthSignal = report.kpis?.paymentRate >= 80 ? 'Encaissement solide' : 'Créances à surveiller';
  const dependencyClient = clientShare >= 40 ? `Dépendance client ${clientShare}% (${topClient?.name})` : 'Portefeuille clients diversifié';
  const dependencyProduct = productConcentration >= 50 ? `Dépendance produit ${productConcentration}%` : 'Mix produits équilibré';
  const opportunityLine = autoOpps.length
    ? `Opportunités : ${autoOpps.slice(0, 2).map((o) => o.product_name).join(', ')}`
    : 'Peu d\'opportunités immédiates';
  const riskLine = segmentation.atRisk?.length
    ? `Risques : ${segmentation.atRisk.length} client(s) à risque · créances ${report.kpis?.receivable ?? 0}`
    : growthSignal;

  const lines = [
    `Croissance CA : ${report.summary?.split('·')[0] || '-'} · ${growthSignal}`,
    `${dependencyClient} · ${dependencyProduct} · ${opportunityLine}`,
    `${riskLine} · ${segmentation.silent?.length ? `${segmentation.silent.length} client(s) silencieux` : 'Relances sous contrôle'}`,
  ].slice(0, 3);

  return (
    <section className="rounded-2xl border border-line bg-card p-4">
      <p className="text-meta font-semibold uppercase tracking-normal text-horizon-dark">Mode investisseur</p>
      <ul className="mt-2 space-y-1 text-sm text-earth">
        {lines.map((line, index) => (
          <li key={index} className="font-semibold leading-snug">{line}</li>
        ))}
      </ul>
    </section>
  );
}
