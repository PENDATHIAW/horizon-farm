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
import CulturesEvolution from '../../modules/CulturesEvolution.jsx';
import ClientsEvolution from '../../modules/ClientsEvolution.jsx';
import { buildElevageChartNarratives } from '../../utils/elevageChartNarratives.js';

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
          periodScope={props.periodScope}
          onNavigate={onNavigate}
        />
      ), periodFiltered);
    case 'centre_ia':
      return withChartPeriod((
        <div className="space-y-6">
          <section className="rounded-2xl border border-line bg-white p-4 shadow-card">
            <h2 className="text-sm font-semibold text-earth">Trésorerie & encaissements</h2>
            <p className="mt-1 text-xs text-slate">Flux financiers — cliquez sur un point pour ouvrir Finance & Pilotage.</p>
            <div className="mt-3">
              <FinanceEvolution rows={arr(props.transactions || props.finances)} payments={arr(props.payments)} salesOrders={arr(props.salesOrders)} onNavigate={onNavigate} />
            </div>
          </section>
          <section className="rounded-2xl border border-line bg-white p-4 shadow-card">
            <h2 className="text-sm font-semibold text-earth">Ventes & créances</h2>
            <p className="mt-1 text-xs text-slate">Évolution commerciale — relier aux relances clients et opportunités.</p>
            <div className="mt-3">
              <SalesEvolution rows={arr(props.salesOrders)} payments={arr(props.payments)} opportunities={arr(props.opportunities)} onNavigate={onNavigate} />
            </div>
          </section>
          <section className="rounded-2xl border border-line bg-white p-4 shadow-card">
            <h2 className="text-sm font-semibold text-earth">Stock & alertes</h2>
            <p className="mt-1 text-xs text-slate">Ruptures et tension inventaire — croiser avec l'onglet Risques.</p>
            <div className="mt-3">
              <StockEvolution rows={arr(props.stocks || props.stock)} onNavigate={onNavigate} />
            </div>
          </section>
          <section className="rounded-2xl border border-line bg-white p-4 shadow-card">
            <h2 className="text-sm font-semibold text-earth">Production avicole</h2>
            <p className="mt-1 text-xs text-slate">Lots et pontes — compléter l'onglet Cycles pour les décisions J+40.</p>
            <div className="mt-3">
              <AvicoleEvolution rows={arr(props.lots)} productionLogs={arr(props.productionLogs)} alimentationLogs={arr(props.alimentationLogs)} transactions={arr(props.transactions)} onNavigate={onNavigate} />
            </div>
          </section>
        </div>
      ), periodFiltered);
    case 'objectifs_croissance':
      return withChartPeriod((
        <div className="space-y-4">
          <FinanceEvolution rows={arr(props.transactions || props.finances)} payments={arr(props.payments)} salesOrders={arr(props.salesOrders)} onNavigate={onNavigate} />
          <SalesEvolution rows={arr(props.salesOrders)} payments={arr(props.payments)} opportunities={arr(props.opportunities)} onNavigate={onNavigate} />
        </div>
      ), periodFiltered);
    case 'elevage': {
      const chartNarratives = buildElevageChartNarratives({
        lots: arr(props.lots),
        animaux: arr(props.animaux),
        productionLogs: arr(props.productionLogs),
        alimentationLogs: arr(props.alimentationLogs),
      });
      return withChartPeriod((
        <div className="space-y-4">
          {chartNarratives.length ? (
            <section className="rounded-2xl border border-line bg-card p-4 space-y-2">
              <h2 className="text-sm font-semibold text-earth">Lecture des courbes</h2>
              {chartNarratives.map((line) => (
                <p key={line} className="text-sm text-slate">{line}</p>
              ))}
            </section>
          ) : null}
          <AvicoleEvolution rows={arr(props.lots)} productionLogs={arr(props.productionLogs)} alimentationLogs={arr(props.alimentationLogs)} transactions={arr(props.transactions)} onNavigate={onNavigate} />
          <AnimauxEvolution rows={arr(props.animaux)} alimentationLogs={arr(props.alimentationLogs)} salesOrders={arr(props.salesOrders)} payments={arr(props.payments)} onNavigate={onNavigate} />
        </div>
      ), periodFiltered);
    }
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
          periodLabel={props.periodLabel || ''}
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
    case 'cultures':
      return withChartPeriod(<CulturesEvolution rows={arr(props.cultures)} onNavigate={onNavigate} />, periodFiltered);
    default:
      return (
        <div className="rounded-2xl border border-line bg-card p-6 text-sm text-slate">
          Graphiques en cours de branchement pour ce module.
        </div>
      );
  }
}
