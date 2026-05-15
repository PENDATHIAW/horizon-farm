import { BarChart3, Receipt, ShieldCheck } from 'lucide-react';
import ObjectivePerformanceCard from '../components/ObjectivePerformanceCard.jsx';
import SalesEvolution from './SalesEvolution.jsx';
import SalesMarginsBridge from './SalesMarginsBridge.jsx';
import VentesV2 from './VentesV2.jsx';

function ModuleSection({ icon: Icon, title, subtitle, children }) {
  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4"><div><p className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><Icon size={20} /> {title}</p>{subtitle ? <p className="mt-1 text-sm text-[#8a7456]">{subtitle}</p> : null}</div>{children}</section>;
}

export default function VentesV3(props) {
  const payments = props.paymentsList || props.payments || [];
  const dataMap = {
    sales_orders: props.rows || [],
    payments,
    finances: props.transactions || [],
    avicole: props.lots || [],
    animaux: props.animaux || [],
    cultures: props.cultures || [],
    stock: props.stocks || [],
  };

  return <div className="space-y-6 ventes-mobile-structured"><style>{`@media (max-width: 640px){.ventes-mobile-structured .rounded-2xl{border-radius:18px}.ventes-mobile-structured table{font-size:12px}.ventes-mobile-structured th,.ventes-mobile-structured td{padding-left:10px!important;padding-right:10px!important}.ventes-mobile-structured .text-2xl{font-size:1.35rem}.ventes-mobile-structured .grid{gap:.75rem}.ventes-mobile-structured .overflow-x-auto{max-width:100vw}}`}</style>
    <ObjectivePerformanceCard dataMap={dataMap} activity="global" title="Objectif & Performance commerciale" onNavigate={props.onNavigate} />
    <ModuleSection icon={Receipt} title="Commandes, clients et paiements" subtitle="Créer les ventes, suivre les paiements, factures, livraisons et statuts sans double encaissement."><VentesV2 {...props} /></ModuleSection>
    <ModuleSection icon={ShieldCheck} title="Marges et contrôle des ventes" subtitle="Vérifier le coût, l’encaissement, le reste à payer et le statut de chaque vente."><SalesMarginsBridge rows={props.rows || []} payments={payments} transactions={props.transactions || []} lots={props.lots || []} animaux={props.animaux || []} cultures={props.cultures || []} stocks={props.stocks || []} alimentationLogs={props.alimentationLogs || []} productionLogs={props.productionLogs || []} vaccins={props.vaccins || []} businessEvents={props.businessEvents || []} onUpdate={props.onUpdate} onRefresh={props.onRefresh} /></ModuleSection>
    <ModuleSection icon={BarChart3} title="Évolution des ventes" subtitle="Graphes des commandes, encaissements, impayés et performance commerciale."><SalesEvolution rows={props.rows || []} payments={payments} onNavigate={props.onNavigate} /></ModuleSection>
  </div>;
}
