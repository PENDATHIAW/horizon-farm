import { AlertTriangle, CheckCircle2, Coins, PackageCheck, ShoppingCart, Sprout } from 'lucide-react';
import { fmtCurrency, fmtNumber, toNumber } from '../utils/format';

const arr = (value) => Array.isArray(value) ? value : [];
const clean = (value = '') => String(value || '').trim();
const lower = (value = '') => clean(value).toLowerCase();
const qty = (row = {}) => toNumber(row.quantite_disponible ?? row.quantite_recoltee ?? row.rendement_reel ?? row.quantite ?? row.quantity);
const cost = (row = {}) => toNumber(row.cout_total_reel ?? row.cout_total ?? row.cost ?? row.depenses);
const revenue = (row = {}) => toNumber(row.revenu_reel ?? row.ca_reel ?? row.montant_vente ?? row.revenue);
const loss = (row = {}) => toNumber(row.valeur_perte_estimee ?? row.perte_estimee ?? row.montant_sinistre);
const score = (row = {}) => toNumber(row.score_sante ?? row.health_score ?? 100);
const saleAmount = (row = {}) => toNumber(row.montant_total ?? row.total ?? row.amount ?? row.montant);
const saleText = (row = {}) => lower(`${row.product_name || ''} ${row.source_type || ''} ${row.sale_kind || ''} ${row.source_module || ''}`);
const isCultureSale = (row = {}) => saleText(row).includes('culture') || saleText(row).includes('recolte') || saleText(row).includes('récolte');
const isRisk = (row = {}) => ['perdu', 'sinistre', 'risque', 'retard'].some((word) => lower(`${row.statut || ''} ${row.status || ''}`).includes(word)) || score(row) < 80 || loss(row) > 0;
const cultureName = (row = {}) => clean(row.nom || row.culture || row.type || row.name || row.id || 'Culture');
const uniqueRows = (rows = []) => Array.from(new Map(arr(rows).map((row, index) => [clean(row.id || row.culture_id || cultureName(row) || `culture-${index}`), row])).values());

function Mini({ icon: Icon, label, value, danger = false }) {
  return <div className={`rounded-xl border p-3 ${danger ? 'border-vigilance bg-vigilance-bg' : 'border-line bg-white'}`}><Icon size={15} className={danger ? 'text-horizon-dark' : 'text-horizon-dark'} /><p className="mt-1 text-xs text-slate">{label}</p><p className="font-semibold text-earth break-words">{value}</p></div>;
}
function Badge({ children, danger }) {
  return <span className={`rounded-full px-2 py-1 text-xs font-semibold ${danger ? 'bg-vigilance-bg text-horizon-dark' : 'bg-positive-bg text-positive'}`}>{children}</span>;
}

export default function CultureOperationalHealthPanel({ rows = [], salesOrders = [], onNavigate }) {
  const cultures = arr(rows);
  const active = cultures.filter((row) => !['perdu', 'termine', 'terminé', 'vendu'].includes(lower(row.statut || row.status)));
  const riskRows = active.filter(isRisk);
  const stockReady = active.reduce((sum, row) => sum + qty(row), 0);
  const totalCost = cultures.reduce((sum, row) => sum + cost(row), 0);
  const totalRevenue = cultures.reduce((sum, row) => sum + revenue(row), 0);
  const salesRevenue = arr(salesOrders).filter(isCultureSale).reduce((sum, row) => sum + saleAmount(row), 0);
  const margin = totalRevenue + salesRevenue - totalCost;
  const priorityRows = uniqueRows([...riskRows, ...active.filter((row) => qty(row) > 0)]).slice(0, 6);

  return <section className="rounded-3xl border border-line bg-white p-6 shadow-card space-y-4">
    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3"><div><p className="text-xs uppercase tracking-normal text-slate font-semibold flex items-center gap-2"><Sprout size={15} /> Pilotage cultures</p><h3 className="text-xl font-semibold text-earth mt-1">Parcelles, récoltes, ventes et risques</h3><p className="text-sm text-slate mt-1">Les cultures doivent relier intrants, météo, coûts, récoltes, ventes et pertes sans double saisie.</p></div>{riskRows.length ? <div className="rounded-2xl border border-vigilance bg-vigilance-bg p-3 text-sm text-horizon-dark"><AlertTriangle size={15} className="inline" /> {riskRows.length} culture(s) à surveiller</div> : <div className="rounded-2xl border border-positive bg-positive-bg p-3 text-sm text-positive"><CheckCircle2 size={15} className="inline" /> Cultures maîtrisées</div>}</div>
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2"><Mini icon={Sprout} label="Cultures actives" value={active.length} /><Mini icon={AlertTriangle} label="À risque" value={riskRows.length} danger={riskRows.length > 0} /><Mini icon={PackageCheck} label="Quantité disponible" value={fmtNumber(stockReady)} /><Mini icon={ShoppingCart} label="Ventes cultures" value={fmtCurrency(salesRevenue)} /><Mini icon={Coins} label="Coûts" value={fmtCurrency(totalCost)} danger={totalCost > totalRevenue + salesRevenue} /><Mini icon={Coins} label="Marge estimée" value={fmtCurrency(margin)} danger={margin < 0} /></div>
    <div className="overflow-x-auto rounded-2xl border border-line bg-card"><table className="min-w-full text-sm"><thead className="bg-earth text-white"><tr><th className="px-3 py-2 text-left">Culture</th><th className="px-3 py-2 text-right">Disponible</th><th className="px-3 py-2 text-right">Coût</th><th className="px-3 py-2 text-right">Perte</th><th className="px-3 py-2 text-left">Statut</th></tr></thead><tbody>{priorityRows.length ? priorityRows.map((row) => { const danger = isRisk(row); return <tr key={row.id || cultureName(row)} className="border-t border-line"><td className="px-3 py-2"><b className="text-earth">{cultureName(row)}</b><p className="text-xs text-slate">Score santé : {score(row) || '—'}%</p></td><td className="px-3 py-2 text-right font-semibold text-earth">{fmtNumber(qty(row))} {row.unite || row.unite_recolte || ''}</td><td className="px-3 py-2 text-right text-slate">{fmtCurrency(cost(row))}</td><td className="px-3 py-2 text-right text-slate">{fmtCurrency(loss(row))}</td><td className="px-3 py-2"><Badge danger={danger}>{danger ? 'À surveiller' : 'Disponible'}</Badge></td></tr>; }) : <tr><td colSpan="5" className="px-3 py-6 text-center text-slate">Aucune culture enregistrée pour le moment.</td></tr>}</tbody></table></div>
    <div className="flex flex-wrap justify-end gap-2"><button type="button" onClick={() => onNavigate?.('achats_stock', { tab: 'Stock' })} className="rounded-xl border border-line bg-card px-3 py-2 text-sm font-semibold text-earth">Intrants stock</button><button type="button" onClick={() => onNavigate?.('commercial', { tab: 'Opportunités' })} className="rounded-xl border border-line bg-card px-3 py-2 text-sm font-semibold text-earth">Commercial</button><button type="button" onClick={() => onNavigate?.('cultures', { tab: 'Intrants & Météo' })} className="rounded-xl border border-line bg-card px-3 py-2 text-sm font-semibold text-earth">Météo</button></div>
  </section>;
}
