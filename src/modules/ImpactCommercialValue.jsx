import { AlertTriangle, Handshake, ShieldCheck, Star, TrendingUp, Users } from 'lucide-react';
import { buildClientSegmentation } from '../services/clientSegmentationEngine';
import { buildSupplierDecisionSummary } from '../services/supplierDecisionEngine';
import { fmtCurrency } from '../utils/format';

const arr = (value) => Array.isArray(value) ? value : [];

function Mini({ icon: Icon, label, value, tone = 'neutral' }) {
  const cls = tone === 'good' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : tone === 'bad' ? 'border-red-200 bg-red-50 text-red-700' : tone === 'warn' ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-[#eadcc2] bg-[#fffdf8] text-[#7d6a4a]';
  return <div className={`rounded-2xl border p-4 ${cls}`}><Icon size={17} /><p className="mt-2 text-xl font-black text-[#2f2415]">{value}</p><p className="text-xs font-bold">{label}</p></div>;
}

function ActionLine({ title, detail, tone = 'neutral' }) {
  const cls = tone === 'bad' ? 'text-red-700' : tone === 'warn' ? 'text-amber-800' : 'text-[#7d6a4a]';
  return <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3"><p className="font-black text-[#2f2415]">{title}</p><p className={`mt-1 text-xs ${cls}`}>{detail}</p></div>;
}

export default function ImpactCommercialValue(props) {
  const clients = arr(props.clients);
  const fournisseurs = arr(props.fournisseurs);
  const clientSegmentation = buildClientSegmentation(clients, {
    sales_orders: arr(props.salesOrdersAll?.length ? props.salesOrdersAll : (props.salesOrders || props.sales_orders || [])),
    payments: arr(props.paymentsAll?.length ? props.paymentsAll : (props.payments || [])),
  });
  const supplierSummary = buildSupplierDecisionSummary(fournisseurs, {
    stocks: props.stocks || props.stock || [],
    finances: props.transactions || props.finances || [],
  });

  const vip = clientSegmentation.bySegment['VIP / Gros acheteur'] || [];
  const relance = [
    ...(clientSegmentation.bySegment['À relancer'] || []),
    ...(clientSegmentation.bySegment['À risque paiement'] || []),
  ];
  const dormant = clientSegmentation.bySegment.Dormant || [];
  const bonPayeur = clientSegmentation.bySegment['Bon payeur'] || [];
  const topClients = clientSegmentation.segments.slice().sort((a, b) => b.loyaltyScore - a.loyaltyScore).slice(0, 4);
  const riskySuppliers = supplierSummary.risks.slice(0, 4);
  const strategicSuppliers = supplierSummary.strategic.slice(0, 4);

  const actions = [
    relance.length ? { title: 'Créances client à transformer en cash', detail: `${relance.length} client(s) à relancer pour protéger ${fmtCurrency(clientSegmentation.totals.receivables)}.`, tone: 'warn' } : null,
    vip.length ? { title: 'Sécuriser les clients qui peuvent acheter souvent', detail: `${vip.length} client(s) VIP/gros acheteurs à appeler avant les pics de demande.`, tone: 'good' } : null,
    dormant.length ? { title: 'Réactiver les clients dormants', detail: `${dormant.length} client(s) ont déjà acheté mais doivent être réactivés.`, tone: 'warn' } : null,
    supplierSummary.risks.length ? { title: 'Sécuriser les fournisseurs à risque', detail: `${supplierSummary.risks.length} fournisseur(s) peuvent bloquer la production ou créer une rupture.`, tone: 'bad' } : null,
    supplierSummary.strategic.length ? { title: 'Négocier avec les fournisseurs stratégiques', detail: `${supplierSummary.strategic.length} fournisseur(s) conditionnent une partie importante de l’approvisionnement.`, tone: 'good' } : null,
  ].filter(Boolean);

  return (
    <div className="rounded-3xl border border-[#d6c3a0] bg-white p-5 space-y-4">
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-[#9a6b12] font-black">Impact commercial</p>
        <h2 className="mt-1 text-xl font-black text-[#2f2415]">Ce que l’ERP aide à vendre, fidéliser et sécuriser</h2>
        <p className="mt-1 text-sm text-[#8a7456]">Cette lecture relie clients, créances, fournisseurs et risques d’approvisionnement à la croissance du chiffre d’affaires.</p>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-6 gap-3">
        <Mini icon={Users} label="Clients segmentés" value={clientSegmentation.totals.clients} />
        <Mini icon={Star} label="VIP / gros acheteurs" value={vip.length} tone="good" />
        <Mini icon={AlertTriangle} label="Clients à relancer" value={relance.length} tone={relance.length ? 'warn' : 'good'} />
        <Mini icon={TrendingUp} label="Créances client" value={fmtCurrency(clientSegmentation.totals.receivables)} tone={clientSegmentation.totals.receivables > 0 ? 'warn' : 'good'} />
        <Mini icon={Handshake} label="Fournisseurs stratégiques" value={supplierSummary.strategic.length} tone="good" />
        <Mini icon={ShieldCheck} label="Fournisseurs à risque" value={supplierSummary.risks.length} tone={supplierSummary.risks.length ? 'bad' : 'good'} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
        <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
          <p className="font-black text-[#2f2415]">Clients à protéger</p>
          <div className="mt-3 space-y-2">
            {topClients.map((client) => <ActionLine key={client.id || client.name} title={`${client.name} · ${client.segment}`} detail={`${client.channel} · score fidélité ${client.loyaltyScore}/100 · ${client.action}`} />)}
            {!topClients.length ? <p className="text-sm text-[#8a7456]">Aucun client exploitable pour le moment.</p> : null}
          </div>
        </div>
        <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
          <p className="font-black text-[#2f2415]">Fournisseurs à sécuriser</p>
          <div className="mt-3 space-y-2">
            {[...riskySuppliers, ...strategicSuppliers].slice(0, 4).map((supplier) => <ActionLine key={supplier.id || supplier.name} title={`${supplier.name} · ${supplier.segment}`} detail={`${supplier.category} · risque ${supplier.riskScore}% · dépendance ${supplier.dependencyScore}% · ${supplier.action}`} tone={supplier.riskScore >= 60 ? 'bad' : 'neutral'} />)}
            {!riskySuppliers.length && !strategicSuppliers.length ? <p className="text-sm text-[#8a7456]">Aucun fournisseur prioritaire identifié.</p> : null}
          </div>
        </div>
        <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
          <p className="font-black text-[#2f2415]">Actions qui créent de la valeur</p>
          <div className="mt-3 space-y-2">
            {actions.map((action) => <ActionLine key={action.title} title={action.title} detail={action.detail} tone={action.tone} />)}
            {!actions.length ? <p className="text-sm text-[#8a7456]">La base commerciale est propre. Continuer à qualifier clients et fournisseurs.</p> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
