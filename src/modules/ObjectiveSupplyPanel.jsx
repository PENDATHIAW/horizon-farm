import { HeartHandshake, Package, Truck } from 'lucide-react';
import { buildClientSegmentation } from '../services/clientSegmentationEngine';
import { fmtCurrency, fmtNumber, toNumber } from '../utils/format';

const arr = (value) => (Array.isArray(value) ? value : []);

function criticalStocks(stocks = []) {
  return arr(stocks).filter((row) => {
    const qty = toNumber(row.quantite ?? row.quantity);
    const threshold = toNumber(row.seuil ?? row.seuil_alerte ?? row.threshold);
    return threshold > 0 && qty <= threshold;
  });
}

function suppliersWithDebt(fournisseurs = []) {
  return arr(fournisseurs).filter((row) => toNumber(row.dettes) > 0);
}

function Mini({ icon: Icon, label, value, hint }) {
  return (
    <div className="rounded-xl border border-[#eadcc2] bg-white px-3 py-3 min-w-0">
      <Icon size={14} className="text-[#9a6b12]" />
      <p className="mt-1 text-[10px] text-[#8a7456]">{label}</p>
      <p className="text-sm font-black text-[#2f2415] truncate">{value}</p>
      {hint ? <p className="mt-1 text-[11px] text-[#8a7456] line-clamp-2">{hint}</p> : null}
    </div>
  );
}

export default function ObjectiveSupplyPanel({ dataMap = {}, onNavigate }) {
  const salesOrders = arr(dataMap.sales_orders || dataMap.salesOrders);
  const payments = arr(dataMap.payments);
  const clients = arr(dataMap.clients);
  const fournisseurs = arr(dataMap.fournisseurs);
  const stocks = arr(dataMap.stock || dataMap.stocks);

  const segmentation = buildClientSegmentation(clients, { sales_orders: salesOrders, payments });
  const debts = suppliersWithDebt(fournisseurs);
  const critical = criticalStocks(stocks);
  const totalDebt = debts.reduce((sum, row) => sum + toNumber(row.dettes), 0);

  return (
    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#8a7456] font-black flex items-center gap-2">
            <HeartHandshake size={15} /> Fidélisation, fournisseurs & stock
          </p>
          <h3 className="text-xl font-black text-[#2f2415] mt-1">Sécuriser la demande et les approvisionnements</h3>
          <p className="text-sm text-[#8a7456] mt-1">
            Relie les objectifs commerciaux aux clients à fidéliser, aux dettes fournisseurs et aux stocks sous seuil.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => onNavigate?.('clients')} className="rounded-xl border border-[#d6c3a0] px-3 py-2 text-xs font-black text-[#7d6a4a] hover:border-emerald-400 hover:text-emerald-700">Clients</button>
          <button type="button" onClick={() => onNavigate?.('fournisseurs')} className="rounded-xl border border-[#d6c3a0] px-3 py-2 text-xs font-black text-[#7d6a4a] hover:border-emerald-400 hover:text-emerald-700">Fournisseurs</button>
          <button type="button" onClick={() => onNavigate?.('stock')} className="rounded-xl bg-[#2f2415] px-3 py-2 text-xs font-black text-white hover:bg-[#3d2f1d]">Stock</button>
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <Mini icon={HeartHandshake} label="Clients VIP" value={fmtNumber(segmentation.totals?.vip || 0)} hint="À fidéliser en priorité" />
        <Mini icon={HeartHandshake} label="À relancer" value={fmtNumber((segmentation.bySegment?.['À relancer'] || []).length)} hint={`${segmentation.totals?.receivableClients || 0} client(s) avec créances`} />
        <Mini icon={Truck} label="Dettes fournisseurs" value={fmtCurrency(totalDebt)} hint={`${debts.length} fournisseur(s) concerné(s)`} />
        <Mini icon={Package} label="Stocks sous seuil" value={fmtNumber(critical.length)} hint={critical[0]?.produit || critical[0]?.name || 'Aucune rupture détectée'} />
      </div>

      {(critical.length > 0 || debts.length > 0) ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
          {critical.slice(0, 3).map((row) => (
            <div key={row.id || row.produit} className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <Package size={14} className="inline" /> Stock critique : <b>{row.produit || row.name || row.nom}</b> — {fmtNumber(toNumber(row.quantite ?? row.quantity))} restant(s)
            </div>
          ))}
          {debts.slice(0, 3).map((row) => (
            <div key={row.id || row.nom} className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              <Truck size={14} className="inline" /> Dette : <b>{row.nom || row.name || row.id}</b> — {fmtCurrency(toNumber(row.dettes))}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          Fidélisation, fournisseurs et stock semblent sous contrôle pour l’instant.
        </div>
      )}
    </section>
  );
}
