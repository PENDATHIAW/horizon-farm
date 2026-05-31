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

const arr = (v) => (Array.isArray(v) ? v : []);

function withChartPeriod(content, periodFiltered) {
  return (
    <ChartPeriodContext.Provider value={{ lockControls: Boolean(periodFiltered) }}>
      {content}
    </ChartPeriodContext.Provider>
  );
}

export default function ModuleGraphiquesTab({ moduleId, periodFiltered, ...props }) {
  const onNavigate = props.onNavigate;
  switch (moduleId) {
    case 'dashboard':
      return withChartPeriod((
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
      ), periodFiltered);
    case 'centre_ia':
      return withChartPeriod((
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
      ), periodFiltered);
    case 'objectifs_croissance':
      return withChartPeriod((
        <div className="space-y-6">
          <section className="rounded-2xl border border-[#d6c3a0] bg-white p-4 shadow-sm">
            <h2 className="text-sm font-black text-[#2f2415]">Performance financière & objectifs</h2>
            <p className="mt-1 text-xs text-[#8a7456]">Trésorerie, encaissements et trajectoire commerciale du plan de croissance.</p>
            <div className="mt-3 space-y-4">
              <FinanceEvolution rows={arr(props.transactions || props.finances)} payments={arr(props.payments)} salesOrders={arr(props.salesOrders)} onNavigate={onNavigate} />
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
                vaccins={arr(props.vaccins || props.sante)}
                businessEvents={arr(props.businessEvents)}
                transactions={arr(props.transactions)}
                businessPlans={arr(props.businessPlans)}
                investissements={arr(props.investissements)}
                periodFiltered={periodFiltered}
                periodScope={props.periodScope}
                onNavigate={onNavigate}
              />
            </div>
          </section>
          <section className="rounded-2xl border border-[#d6c3a0] bg-white p-4 shadow-sm">
            <h2 className="text-sm font-black text-[#2f2415]">Investissements & pipeline financeur</h2>
            <p className="mt-1 text-xs text-[#8a7456]">Lecture croisée des investissements, business plans et ventes à convertir.</p>
            <div className="mt-3 space-y-4">
              <InvestissementsEvolution rows={arr(props.investissements)} businessPlans={arr(props.businessPlans)} onNavigate={onNavigate} />
              <SalesEvolution rows={arr(props.salesOrders)} payments={arr(props.payments)} opportunities={arr(props.opportunities)} onNavigate={onNavigate} />
            </div>
          </section>
        </div>
      ), periodFiltered);
    case 'elevage':
      return withChartPeriod((
        <div className="space-y-4">
          <AvicoleEvolution rows={arr(props.lots)} productionLogs={arr(props.productionLogs)} alimentationLogs={arr(props.alimentationLogs)} transactions={arr(props.transactions)} onNavigate={onNavigate} />
          <AnimauxEvolution rows={arr(props.animaux)} alimentationLogs={arr(props.alimentationLogs)} salesOrders={arr(props.salesOrders)} payments={arr(props.payments)} onNavigate={onNavigate} />
        </div>
      ), periodFiltered);
    case 'commercial':
      return withChartPeriod((
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
      ), periodFiltered);
    case 'achats_stock':
      return withChartPeriod((
        <div className="space-y-4">
          <StockEvolution rows={arr(props.stocks || props.rows)} alimentationLogs={arr(props.alimentationLogs)} onNavigate={onNavigate} />
          <FournisseursEvolution rows={arr(props.fournisseurs)} transactions={arr(props.transactions)} onNavigate={onNavigate} />
        </div>
      ), periodFiltered);
    case 'finance_pilotage':
      return withChartPeriod((
        <div className="space-y-4">
          <FinanceEvolution rows={arr(props.transactions || props.finances || props.rows)} payments={arr(props.payments)} salesOrders={arr(props.salesOrders)} onNavigate={onNavigate} />
          <InvestissementsEvolution rows={arr(props.investissements)} businessPlans={arr(props.businessPlans)} onNavigate={onNavigate} />
        </div>
      ), periodFiltered);
    case 'activite_suivi':
      return withChartPeriod(<TachesEvolution rows={arr(props.taches || props.tasks)} onNavigate={onNavigate} />, periodFiltered);
    case 'documents_rapports':
      return withChartPeriod((
        <div className="space-y-4">
          <FinanceEvolution rows={arr(props.transactions || props.finances)} onNavigate={onNavigate} />
          <ClientsEvolution rows={arr(props.clients)} salesOrders={arr(props.salesOrders)} payments={arr(props.payments)} onNavigate={onNavigate} />
        </div>
      ), periodFiltered);
    case 'rh':
      return withChartPeriod(<EquipementsEvolution rows={arr(props.equipements)} transactions={arr(props.transactions)} onNavigate={onNavigate} />, periodFiltered);
    default:
      return (
        <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-5 text-sm text-[#8a7456]">
          Graphiques en cours de branchement pour ce module.
        </div>
      );
  }
}
