import DashboardEvolution from '../../modules/DashboardEvolution.jsx';
import SalesEvolution from '../../modules/SalesEvolution.jsx';
import StockEvolution from '../../modules/StockEvolution.jsx';
import FinanceEvolution from '../../modules/FinanceEvolution.jsx';
import InvestissementsEvolution from '../../modules/InvestissementsEvolution.jsx';
import FournisseursEvolution from '../../modules/FournisseursEvolution.jsx';
import TachesEvolution from '../../modules/TachesEvolution.jsx';
import EquipementsEvolution from '../../modules/EquipementsEvolution.jsx';
import AvicoleEvolution from '../../modules/AvicoleEvolution.jsx';
import AnimauxEvolution from '../../modules/AnimauxEvolution.jsx';
import ClientsEvolution from '../../modules/ClientsEvolution.jsx';

const arr = (v) => (Array.isArray(v) ? v : []);

export default function ModuleGraphiquesTab({ moduleId, ...props }) {
  const onNavigate = props.onNavigate;
  switch (moduleId) {
    case 'dashboard':
      return (
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
      );
    case 'objectifs_croissance':
      return (
        <div className="space-y-5">
          <FinanceEvolution rows={arr(props.transactions || props.finances)} payments={arr(props.payments)} salesOrders={arr(props.salesOrders)} onNavigate={onNavigate} />
          <SalesEvolution rows={arr(props.salesOrders)} payments={arr(props.payments)} opportunities={arr(props.opportunities)} onNavigate={onNavigate} />
        </div>
      );
    case 'elevage':
      return (
        <div className="space-y-5">
          <AvicoleEvolution rows={arr(props.lots)} productionLogs={arr(props.productionLogs)} alimentationLogs={arr(props.alimentationLogs)} transactions={arr(props.transactions)} onNavigate={onNavigate} />
          <AnimauxEvolution rows={arr(props.animaux)} alimentationLogs={arr(props.alimentationLogs)} salesOrders={arr(props.salesOrders)} payments={arr(props.payments)} onNavigate={onNavigate} />
        </div>
      );
    case 'commercial':
      return (
        <SalesEvolution
          rows={arr(props.salesOrders || props.rows)}
          payments={arr(props.payments)}
          opportunities={arr(props.opportunities)}
          clients={arr(props.clients)}
          onNavigate={onNavigate}
        />
      );
    case 'achats_stock':
      return (
        <div className="space-y-5">
          <StockEvolution rows={arr(props.stocks || props.rows)} alimentationLogs={arr(props.alimentationLogs)} onNavigate={onNavigate} />
          <FournisseursEvolution rows={arr(props.fournisseurs)} transactions={arr(props.transactions)} onNavigate={onNavigate} />
        </div>
      );
    case 'finance_pilotage':
      return (
        <div className="space-y-5">
          <FinanceEvolution rows={arr(props.transactions || props.finances || props.rows)} payments={arr(props.payments)} salesOrders={arr(props.salesOrders)} onNavigate={onNavigate} />
          <InvestissementsEvolution rows={arr(props.investissements)} businessPlans={arr(props.businessPlans)} onNavigate={onNavigate} />
        </div>
      );
    case 'activite_suivi':
      return <TachesEvolution rows={arr(props.taches || props.tasks)} onNavigate={onNavigate} />;
    case 'documents_rapports':
      return (
        <div className="space-y-5">
          <FinanceEvolution rows={arr(props.transactions || props.finances)} onNavigate={onNavigate} />
          <ClientsEvolution rows={arr(props.clients)} salesOrders={arr(props.salesOrders)} payments={arr(props.payments)} onNavigate={onNavigate} />
        </div>
      );
    case 'rh':
      return <EquipementsEvolution rows={arr(props.equipements)} transactions={arr(props.transactions)} onNavigate={onNavigate} />;
    default:
      return (
        <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-5 text-sm text-[#8a7456]">
          Graphiques en cours de branchement pour ce module.
        </div>
      );
  }
}
