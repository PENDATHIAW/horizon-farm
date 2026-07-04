import ObjectiveSupplyPanel from './ObjectiveSupplyPanel.jsx';
import CrossAnalyticsSections from './CrossAnalyticsSections.jsx';
import { fmtNumber } from '../../utils/format';
import { buildClientSegmentation } from '../../services/clientSegmentationEngine.js';
import { buildSupplierDecisionSummary } from '../../services/supplierDecisionEngine.js';

const arr = (v) => (Array.isArray(v) ? v : []);

export default function ObjectifsFluxTab({ dataMap = {}, analytics = {}, onNavigate }) {
  const clients = buildClientSegmentation(arr(dataMap.clients), dataMap);
  const suppliers = buildSupplierDecisionSummary(arr(dataMap.fournisseurs), dataMap);
  const stockRows = arr(dataMap.stock || dataMap.stocks);
  const stockQty = stockRows.reduce((s, r) => s + Number(r.quantite ?? r.quantity ?? 0), 0);
  const criticalStock = stockRows.filter((r) => Number(r.quantite ?? r.quantity ?? 0) <= Number(r.seuil_alerte ?? r.min_qty ?? 0)).length;
  const dueClients = (clients.segments || []).filter((c) => c.isDueForReorder);

  const cross = analytics.cross || {};
  const crossForTab = {
    clientQuality: cross.clientQuality,
    shrinkage: cross.shrinkage,
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
        <div>
          <h3 className="text-lg font-black text-[#2f2415]">Synthèse de Couverture Stratégique</h3>
          <p className="text-sm text-[#8a7456]">Volumes exigés par le BP croisés avec clients, fournisseurs et stock.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-4">
            <p className="text-xs font-black text-[#8a7456]">Fidélisation Clients</p>
            <p className="mt-2 font-black text-[#2f2415]">
              {fmtNumber(clients.totals?.clients ?? 0)} clients actifs · {fmtNumber(dueClients.length)} à relancer
            </p>
          </div>
          <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-4">
            <p className="text-xs font-black text-[#8a7456]">Approvisionnement</p>
            <p className="mt-2 font-black text-[#2f2415]">
              {fmtNumber(suppliers.strategic?.length ?? 0)} fournisseurs stratégiques · {fmtNumber(suppliers.risks?.length ?? 0)} risques rupture
            </p>
          </div>
          <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-4">
            <p className="text-xs font-black text-[#8a7456]">Inventaire Physique</p>
            <p className="mt-2 font-black text-[#2f2415]">
              {fmtNumber(stockQty)} unités en stock · {fmtNumber(criticalStock)} alertes critiques
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-amber-200 bg-amber-50/50 p-5 shadow-sm">
        <p className="text-xs uppercase tracking-widest text-amber-900 font-black">Recommandation d&apos;ancrage IA</p>
        <p className="mt-2 text-sm text-amber-950">
          Vos objectifs du Business Plan exigent d&apos;écouler de gros volumes. Le système vous recommande de qualifier vos
          contacts prioritaires (Boucheries, Hôtels, Grossistes) dans le module Commercial pour sécuriser vos ventes futures.
        </p>
        <button
          type="button"
          onClick={() => onNavigate?.('commercial', { tab: 'Clients & créances' })}
          className="mt-3 rounded-xl border border-amber-300 bg-white px-4 py-2 text-xs font-black text-amber-900 hover:bg-amber-100"
        >
          Qualifier les clients prioritaires → Commercial
        </button>
      </section>

      <ObjectiveSupplyPanel dataMap={dataMap} onNavigate={onNavigate} compact />
      <CrossAnalyticsSections cross={crossForTab} />
    </div>
  );
}
