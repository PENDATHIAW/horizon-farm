import DashboardEvolution from '../../modules/DashboardEvolution.jsx';
import SalesEvolution from '../../modules/SalesEvolution.jsx';
import CommercialEvolution from '../../modules/commercial/CommercialEvolution.jsx';
import StockEvolution from '../../modules/StockEvolution.jsx';
import FinanceEvolution from '../../modules/FinanceEvolution.jsx';
import InvestissementsEvolution from '../../modules/InvestissementsEvolution.jsx';
import FournisseursEvolution from '../../modules/FournisseursEvolution.jsx';
import TachesEvolution from '../../modules/TachesEvolution.jsx';
import EquipementsEvolution from '../../modules/EquipementsEvolution.jsx';
import AvicoleEvolution from '../../modules/AvicoleEvolution.jsx';
import AnimauxEvolution from '../../modules/AnimauxEvolution.jsx';
import ClientsEvolution from '../../modules/ClientsEvolution.jsx';

import { ChartPeriodContext } from '../charts/chartPeriodContext';
import { ChartExplainContext } from '../charts/chartExplainContext.jsx';
import { CHART_EXPLAIN_MODULES } from '../../services/aiGateway/chartExplainService.js';

const arr = (v) => (Array.isArray(v) ? v : []);

function buildExplainContext(moduleId, props = {}) {
  if (!CHART_EXPLAIN_MODULES.has(moduleId)) return null;
  return {
    enabled: true,
    moduleId,
    onNavigate: props.onNavigate,
    stocks: arr(props.stocks || props.stock),
    salesOrders: arr(props.salesOrders || props.rows),
    payments: arr(props.payments),
    transactions: arr(props.transactions || props.finances),
    sante: arr(props.sante),
    vaccins: arr(props.vaccins || props.sante),
    businessEvents: arr(props.businessEvents),
    taches: arr(props.taches || props.tasks),
    alertes: arr(props.alertes),
    productionLogs: arr(props.productionLogs || props.production_oeufs_logs),
    alimentationLogs: arr(props.alimentationLogs || props.alimentation_logs),
  };
}

function withChartPeriod(content, periodFiltered, explainContext) {
  const wrapped = explainContext ? (
    <ChartExplainContext.Provider value={explainContext}>
      {content}
    </ChartExplainContext.Provider>
  ) : content;

  return (
    <ChartPeriodContext.Provider value={{ lockControls: Boolean(periodFiltered) }}>
      {wrapped}
    </ChartPeriodContext.Provider>
  );
}

export default function ModuleGraphiquesTab({ moduleId, periodFiltered, ...props }) {
  const onNavigate = props.onNavigate;
  const explainContext = buildExplainContext(moduleId, { ...props, onNavigate });
  const wrap = (content) => withChartPeriod(content, periodFiltered, explainContext);

  switch (moduleId) {
    case 'dashboard':
      return wrap((
        <DashboardEvolution
          salesOrders={arr(props.salesOrders)}
          payments={arr(props.payments)}
          transactions={arr(props.transactions)}
          productionLogs={arr(props.productionLogs)}
          stocks={arr(props.stocks)}
          taches={arr(props.taches)}
          alertes={arr(props.alertes)}
          onNavigate={onNavigate}
        />
      ));
    case 'centre_ia':
      return wrap((
        <div className="space-y-6">
          <section className="rounded-2xl border border-[#d6c3a0] bg-white p-4 shadow-sm">
            <h2 className="text-sm font-black text-[#2f2415]">Trésorerie & encaissements</h2>
            <p className="mt-1 text-xs text-[#8a7456]">Flux financiers — cliquez sur un point pour ouvrir Finance & Pilotage.</p>
            <div className="mt-3">
              <FinanceEvolution rows={arr(props.transactions || props.finances)} payments={arr(props.payments)} salesOrders={arr(props.salesOrders)} onNavigate={onNavigate} />
            </div>
          </section>
          <section className="rounded-2xl border border-[#d6c3a0] bg-white p-4 shadow-sm">
            <h2 className="text-sm font-black text-[#2f2415]">Ventes & créances</h2>
            <p className="mt-1 text-xs text-[#8a7456]">Évolution commerciale — relier aux relances clients et opportunités.</p>
            <div className="mt-3">
              <SalesEvolution rows={arr(props.salesOrders)} payments={arr(props.payments)} opportunities={arr(props.opportunities)} onNavigate={onNavigate} />
            </div>
          </section>
          <section className="rounded-2xl border border-[#d6c3a0] bg-white p-4 shadow-sm">
            <h2 className="text-sm font-black text-[#2f2415]">Stock & alertes</h2>
            <p className="mt-1 text-xs text-[#8a7456]">Ruptures et tension inventaire — croiser avec l'onglet Risques.</p>
            <div className="mt-3">
              <StockEvolution rows={arr(props.stocks || props.stock)} onNavigate={onNavigate} />
            </div>
          </section>
          <section className="rounded-2xl border border-[#d6c3a0] bg-white p-4 shadow-sm">
            <h2 className="text-sm font-black text-[#2f2415]">Production avicole</h2>
            <p className="mt-1 text-xs text-[#8a7456]">Lots et pontes — compléter l'onglet Cycles pour les décisions J+40.</p>
            <div className="mt-3">
              <AvicoleEvolution rows={arr(props.lots)} productionLogs={arr(props.productionLogs)} alimentationLogs={arr(props.alimentationLogs)} transactions={arr(props.transactions)} onNavigate={onNavigate} />
            </div>
          </section>
        </div>
      ));
    case 'objectifs_croissance':
      return wrap((
        <div className="space-y-4">
          <FinanceEvolution rows={arr(props.transactions || props.finances)} payments={arr(props.payments)} salesOrders={arr(props.salesOrders)} onNavigate={onNavigate} />
          <SalesEvolution rows={arr(props.salesOrders)} payments={arr(props.payments)} opportunities={arr(props.opportunities)} onNavigate={onNavigate} />
        </div>
      ));
    case 'elevage':
      return wrap((
        <div className="space-y-4">
          <AvicoleEvolution rows={arr(props.lots)} productionLogs={arr(props.productionLogs)} alimentationLogs={arr(props.alimentationLogs)} transactions={arr(props.transactions)} onNavigate={onNavigate} />
          <AnimauxEvolution rows={arr(props.animaux)} alimentationLogs={arr(props.alimentationLogs)} salesOrders={arr(props.salesOrders)} payments={arr(props.payments)} onNavigate={onNavigate} />
        </div>
      ));
    case 'commercial':
      return wrap((
        <CommercialEvolution
          rows={arr(props.salesOrders || props.rows)}
          payments={arr(props.payments)}
          opportunities={arr(props.opportunities)}
          clients={arr(props.clients)}
          lots={arr(props.lots)}
          animaux={arr(props.animaux)}
          cultures={arr(props.cultures)}
          stocks={arr(props.stocks)}
          alimentationLogs={arr(props.alimentationLogs)}
          productionLogs={arr(props.productionLogs)}
          vaccins={arr(props.vaccins)}
          businessEvents={arr(props.businessEvents)}
          transactions={arr(props.transactions)}
          businessPlans={arr(props.businessPlans)}
          investissements={arr(props.investissements)}
          periodFiltered={periodFiltered}
          periodScope={props.periodScope}
          onNavigate={onNavigate}
        />
      ));
    case 'achats_stock':
      return wrap((
        <div className="space-y-4">
          <StockEvolution rows={arr(props.stocks || props.rows)} alimentationLogs={arr(props.alimentationLogs)} onNavigate={onNavigate} />
          <FournisseursEvolution rows={arr(props.fournisseurs)} transactions={arr(props.transactions)} onNavigate={onNavigate} />
        </div>
      ));
    case 'finance_pilotage':
      return wrap((
        <div className="space-y-4">
          <FinanceEvolution rows={arr(props.transactions || props.finances || props.rows)} payments={arr(props.payments)} salesOrders={arr(props.salesOrders)} onNavigate={onNavigate} />
          <InvestissementsEvolution rows={arr(props.investissements)} businessPlans={arr(props.businessPlans)} onNavigate={onNavigate} />
        </div>
      ));
    case 'activite_suivi':
      return wrap(<TachesEvolution rows={arr(props.taches || props.tasks)} onNavigate={onNavigate} />);
    case 'documents_rapports':
      return wrap((
        <div className="space-y-4">
          <FinanceEvolution rows={arr(props.transactions || props.finances)} onNavigate={onNavigate} />
          <ClientsEvolution rows={arr(props.clients)} salesOrders={arr(props.salesOrders)} payments={arr(props.payments)} onNavigate={onNavigate} />
        </div>
      ));
    case 'rh':
      return wrap(<EquipementsEvolution rows={arr(props.equipements)} transactions={arr(props.transactions)} onNavigate={onNavigate} />);
    default:
      return (
        <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-5 text-sm text-[#8a7456]">
          Graphiques en cours de branchement pour ce module.
        </div>
      );
  }
}
