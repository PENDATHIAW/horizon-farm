import ClientSalesHealthPanel from './ClientSalesHealthPanel.jsx';
import Clients from './Clients.jsx';
import ClientsEvolution from './ClientsEvolution.jsx';
import TradeDocumentsHealth from './TradeDocumentsHealth.jsx';

export default function ClientsReadable(props) {
  return (
    <div className="clients-readable-order space-y-6">
      <ClientSalesHealthPanel
        rows={props.rows || []}
        salesOrders={props.salesOrders || []}
        payments={props.payments || []}
        onNavigate={props.onNavigate}
      />
      <TradeDocumentsHealth
        mode="clients"
        rows={props.rows || []}
        salesOrders={props.salesOrders || []}
        payments={props.payments || []}
        finances={props.transactions || []}
        onNavigate={props.onNavigate}
      />
      <Clients {...props} hideEvolution />
      <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
        <div>
          <p className="flex items-center gap-2 text-lg font-black text-[#2f2415]">Évolution clients</p>
          <p className="mt-1 text-sm text-[#8a7456]">Courbes et tendances commerciales placées en bas pour garder les relances et actions en priorité.</p>
        </div>
        <ClientsEvolution rows={props.rows || []} salesOrders={props.salesOrders || []} payments={props.payments || []} onNavigate={props.onNavigate} />
      </section>
    </div>
  );
}
