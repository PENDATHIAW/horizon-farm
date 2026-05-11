import { AlertTriangle, CheckCircle2, Link2, PackageSearch, TrendingDown } from 'lucide-react';
import { calculateSalesMargin } from '../utils/salesMarginEngine';
import { fmtCurrency, fmtNumber, toNumber } from '../utils/format';
import { enrichSalesOrderStatus, remainingForOrder } from '../utils/salesStatuses';

const arr = (value) => Array.isArray(value) ? value : [];
const clean = (value) => String(value || '').trim();
const lower = (value) => clean(value).toLowerCase();
const qty = (row = {}) => Math.max(1, toNumber(row.quantity ?? row.quantite ?? row.qty ?? 1));
const sourceId = (row = {}) => clean(row.source_id || row.product_id || row.entity_id || row.asset_id || row.stock_id || row.lot_id || row.animal_id || row.culture_id);
const sourceType = (row = {}) => lower(row.source_type || row.type_vente || row.product_type || row.source_module || row.module_lie);
const stockQty = (row = {}) => toNumber(row.quantite ?? row.quantity ?? row.qty ?? row.quantite_disponible ?? row.stock_quantity ?? row.quantite_stock);
const stockCost = (row = {}) => toNumber(row.cout_revient_unitaire ?? row.cout_unitaire_calcule ?? row.prixUnit ?? row.prixunit ?? row.prix_unitaire ?? row.unit_price);
const label = (row = {}) => row.product_name || row.produit || row.libelle || row.title || row.id || 'Vente';
const isCancelled = (row = {}) => ['annule', 'annulé', 'cancelled'].includes(lower(row.status || row.statut || row.statut_commande));

function findStock(order = {}, stocks = []) {
  const ids = [order.stock_id, order.source_id, order.source_record_id, order.related_id, order.entity_id, order.asset_id].map(clean).filter(Boolean);
  const product = lower(order.product_name || order.produit || order.libelle);
  return arr(stocks).find((stock) => ids.includes(clean(stock.id)) || ids.includes(clean(stock.source_record_id)) || ids.includes(clean(stock.origine_id)))
    || arr(stocks).find((stock) => product && lower(stock.produit || stock.name || stock.nom).includes(product));
}

function Issue({ icon: Icon, title, value, hint, danger = false }) {
  return <div className={`rounded-2xl border p-4 ${danger ? 'border-red-200 bg-red-50' : 'border-[#eadcc2] bg-[#fffdf8]'}`}>
    <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-[#8a7456]"><Icon size={14} /> {title}</p>
    <p className={`mt-2 text-xl font-black ${danger ? 'text-red-600' : 'text-[#2f2415]'}`}>{value}</p>
    {hint ? <p className="mt-1 text-xs text-[#8a7456]">{hint}</p> : null}
  </div>;
}

export default function SalesQualityControl({ rows = [], stocks = [], animaux = [], lots = [], cultures = [], paymentsList = [], payments = [], alimentationLogs = [], vaccins = [], businessEvents = [], productionLogs = [] }) {
  const paymentRows = arr(paymentsList || payments);
  const context = { stocks, animaux, lots, cultures, payments: paymentRows, paymentsList: paymentRows, alimentationLogs, vaccins, businessEvents, productionLogs };
  const enriched = arr(rows).filter((row) => !isCancelled(row)).map((order) => {
    const status = enrichSalesOrderStatus(order, paymentRows);
    const margin = calculateSalesMargin(order, context);
    const stock = findStock(order, stocks);
    const issues = [];
    const sid = sourceId(order);
    const stype = sourceType(order);
    if (!sid && stype !== 'autre') issues.push('Source non liée');
    if (stype.includes('stock') && !stock) issues.push('Stock introuvable');
    if (stock && qty(order) > stockQty(stock)) issues.push('Quantité vendue supérieure au stock');
    if (stock && stockCost(stock) <= 0) issues.push('Coût stock manquant');
    if (margin.cout_revient <= 0 && margin.chiffre_affaires > 0) issues.push('Coût de revient nul');
    if (margin.marge_directe < 0) issues.push('Marge négative');
    const remaining = remainingForOrder(status, paymentRows);
    if (remaining > 0) issues.push('Reste à encaisser');
    return { order, status, margin, stock, issues, remaining };
  });

  const sourceMissing = enriched.filter((item) => item.issues.includes('Source non liée')).length;
  const costMissing = enriched.filter((item) => item.issues.includes('Coût de revient nul') || item.issues.includes('Coût stock manquant')).length;
  const stockRisk = enriched.filter((item) => item.issues.includes('Stock introuvable') || item.issues.includes('Quantité vendue supérieure au stock')).length;
  const negativeMargin = enriched.filter((item) => item.margin.marge_directe < 0).length;
  const risky = enriched.filter((item) => item.issues.length).slice(0, 8);
  const totalMargin = enriched.reduce((sum, item) => sum + toNumber(item.margin.marge_directe), 0);
  const totalCost = enriched.reduce((sum, item) => sum + toNumber(item.margin.cout_revient), 0);

  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
      <div>
        <p className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><PackageSearch size={20} /> Contrôle ventes, stock & marge</p>
        <p className="mt-1 text-sm text-[#8a7456]">Vérifie les ventes mal liées, les coûts manquants, les ruptures et les marges à risque.</p>
      </div>
      <div className={`${risky.length ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'} rounded-2xl border px-4 py-3 text-sm font-bold`}>{risky.length ? `${risky.length} vente(s) à vérifier` : 'Ventes cohérentes'}</div>
    </div>

    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      <Issue icon={Link2} title="Sources non liées" value={sourceMissing} danger={sourceMissing > 0} />
      <Issue icon={PackageSearch} title="Risques stock" value={stockRisk} danger={stockRisk > 0} />
      <Issue icon={AlertTriangle} title="Coûts manquants" value={costMissing} danger={costMissing > 0} />
      <Issue icon={TrendingDown} title="Marges négatives" value={negativeMargin} danger={negativeMargin > 0} />
      <Issue icon={CheckCircle2} title="Marge suivie" value={fmtCurrency(totalMargin)} hint={`coût ${fmtCurrency(totalCost)}`} danger={totalMargin < 0} />
    </div>

    {risky.length ? <div className="overflow-x-auto rounded-2xl border border-[#eadcc2]">
      <table className="min-w-full text-sm">
        <thead><tr className="border-b border-[#eadcc2] bg-[#fffdf8] text-left text-xs uppercase text-[#8a7456]"><th className="py-2 px-3">Vente</th><th className="py-2 px-3">Source</th><th className="py-2 px-3">Stock</th><th className="py-2 px-3">Coût</th><th className="py-2 px-3">Marge</th><th className="py-2 px-3">À vérifier</th></tr></thead>
        <tbody>{risky.map((item) => <tr key={item.order.id} className="border-b border-[#f0e5d0]"><td className="py-3 px-3 font-bold text-[#2f2415]">{label(item.order)}<p className="text-xs text-[#8a7456]">{item.order.id}</p></td><td className="py-3 px-3">{sourceType(item.order) || '—'}<p className="text-xs text-[#8a7456]">{sourceId(item.order) || 'non lié'}</p></td><td className="py-3 px-3">{item.stock ? `${fmtNumber(stockQty(item.stock))} ${item.stock.unite || ''}` : '—'}</td><td className="py-3 px-3">{fmtCurrency(item.margin.cout_revient)}<p className="text-xs text-[#8a7456]">{item.margin.cout_source}</p></td><td className={`py-3 px-3 font-bold ${item.margin.marge_directe < 0 ? 'text-red-600' : 'text-emerald-700'}`}>{fmtCurrency(item.margin.marge_directe)}</td><td className="py-3 px-3"><div className="flex flex-wrap gap-1">{item.issues.map((issue) => <span key={issue} className="rounded-full bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700">{issue}</span>)}</div></td></tr>)}</tbody>
      </table>
    </div> : <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 size={16} className="inline" /> Aucune incohérence critique détectée sur les ventes ouvertes.</div>}
  </section>;
}
