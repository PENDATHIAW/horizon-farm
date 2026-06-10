import ManureEconomyPanel from '../../components/ManureEconomyPanel.jsx';
import { getRealCultureRows } from '../CulturesTabActionsBridge.jsx';

export default function CulturesEconomieHub({ stocks = [], salesOrders = [], rows = [], businessEvents = [], dataMap = {}, onNavigate }) {
  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
        <b>Économie circulaire</b> — fumier, compost, résidus Élevage ↔ Cultures. Valorisation affichée pour investisseurs (sacs engrais remplacés, impact marge).
      </section>
      <ManureEconomyPanel
        stocks={stocks}
        salesOrders={salesOrders}
        cultures={getRealCultureRows(rows)}
        businessEvents={businessEvents}
        dataMap={dataMap}
        onNavigate={onNavigate}
      />
    </div>
  );
}
