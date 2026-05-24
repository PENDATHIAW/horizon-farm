import { AlertTriangle, CheckCircle2, Package, ShoppingCart, Sprout, Utensils } from 'lucide-react';
import { fmtCurrency, toNumber } from '../utils/format';

const arr = (value) => Array.isArray(value) ? value : [];
const clean = (value = '') => String(value || '').trim();
const lower = (value = '') => clean(value).toLowerCase();
const qty = (row = {}) => toNumber(row.quantite ?? row.quantity ?? row.stock);
const seuil = (row = {}) => toNumber(row.seuil ?? row.threshold ?? row.min_quantity);
const unitPrice = (row = {}) => toNumber(row.prixunit ?? row.prixUnit ?? row.prix_unitaire ?? row.unit_price);
const valueOf = (row = {}) => qty(row) * unitPrice(row);
const text = (row = {}) => lower(`${row.produit || ''} ${row.nom || ''} ${row.name || ''} ${row.categorie || ''} ${row.category || ''}`);
const isFeed = (row = {}) => ['aliment', 'provende', 'mais', 'maïs', 'son', 'tourteau'].some((word) => text(row).includes(word));
const isInput = (row = {}) => ['engrais', 'semence', 'intrant', 'fumier', 'substrat'].some((word) => text(row).includes(word));
const isHealth = (row = {}) => ['vaccin', 'medicament', 'médicament', 'antibiotique', 'veterinaire', 'vétérinaire'].some((word) => text(row).includes(word));
const isSellable = (row = {}) => row.is_sellable === true || row.vendable === true || (!isFeed(row) && !isInput(row) && !isHealth(row));

function Mini({ icon: Icon, label, value, danger = false }) {
  return <div className={`rounded-xl border p-3 ${danger ? 'border-amber-200 bg-amber-50' : 'border-[#eadcc2] bg-white'}`}><Icon size={15} className={danger ? 'text-amber-700' : 'text-[#9a6b12]'} /><p className="mt-1 text-xs text-[#8a7456]">{label}</p><p className="font-black text-[#2f2415] break-words">{value}</p></div>;
}
function Badge({ children, danger }) {
  return <span className={`rounded-full px-2 py-0.5 text-xs font-black ${danger ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-700'}`}>{children}</span>;
}

export default function StockOperationalHealthPanel({ rows = [], alimentationLogs = [], onNavigate }) {
  const stocks = arr(rows);
  const critical = stocks.filter((row) => seuil(row) > 0 && qty(row) <= seuil(row));
  const sellable = stocks.filter(isSellable);
  const feed = stocks.filter(isFeed);
  const inputs = stocks.filter(isInput);
  const health = stocks.filter(isHealth);
  const stockValue = stocks.reduce((sum, row) => sum + valueOf(row), 0);
  const feedUsed = arr(alimentationLogs).reduce((sum, row) => sum + toNumber(row.quantite ?? row.quantity), 0);
  const priorityRows = [...critical, ...sellable.filter((row) => qty(row) > 0)].slice(0, 6);
  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3"><div><p className="text-xs uppercase tracking-widest text-[#8a7456] font-black flex items-center gap-2"><Package size={15} /> Pilotage stock</p><h3 className="text-xl font-black text-[#2f2415] mt-1">Disponibilité, seuils et produits utilisables</h3><p className="text-sm text-[#8a7456] mt-1">Le stock alimente ventes, animaux, avicole, cultures, finances et alertes. Les sorties normales doivent être créées depuis les actions métier.</p></div>{critical.length ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"><AlertTriangle size={15} className="inline" /> {critical.length} stock(s) sous seuil</div> : <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 size={15} className="inline" /> Seuils maîtrisés</div>}</div>
    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-2"><Mini icon={Package} label="Lignes stock" value={stocks.length} /><Mini icon={AlertTriangle} label="Sous seuil" value={critical.length} danger={critical.length > 0} /><Mini icon={ShoppingCart} label="Vendables" value={sellable.length} /><Mini icon={Utensils} label="Aliments" value={feed.length} /><Mini icon={Sprout} label="Intrants" value={inputs.length} /><Mini icon={Package} label="Valeur estimée" value={fmtCurrency(stockValue)} /></div>
    <div className="overflow-x-auto rounded-2xl border border-[#eadcc2] bg-[#fffdf8]"><table className="min-w-full text-sm"><thead className="bg-[#2f2415] text-white"><tr><th className="px-3 py-2 text-left">Produit</th><th className="px-3 py-2 text-right">Quantité</th><th className="px-3 py-2 text-right">Seuil</th><th className="px-3 py-2 text-left">Usage</th><th className="px-3 py-2 text-left">Statut</th></tr></thead><tbody>{priorityRows.length ? priorityRows.map((row) => { const danger = seuil(row) > 0 && qty(row) <= seuil(row); const usage = isFeed(row) ? 'Alimentation' : isInput(row) ? 'Intrant culture' : isHealth(row) ? 'Santé' : 'Vendable'; return <tr key={row.id || row.produit || row.nom} className="border-t border-[#eadcc2]"><td className="px-3 py-2"><b className="text-[#2f2415]">{row.produit || row.nom || row.name || row.id}</b><p className="text-xs text-[#8a7456]">Valeur : {fmtCurrency(valueOf(row))}</p></td><td className="px-3 py-2 text-right font-black text-[#2f2415]">{qty(row)} {row.unite || row.unit || ''}</td><td className="px-3 py-2 text-right text-[#7d6a4a]">{seuil(row) || '-'}</td><td className="px-3 py-2 text-[#7d6a4a]">{usage}</td><td className="px-3 py-2"><Badge danger={danger}>{danger ? 'À réapprovisionner' : 'Disponible'}</Badge></td></tr>; }) : <tr><td colSpan="5" className="px-3 py-6 text-center text-[#8a7456]">Aucun stock enregistré pour le moment.</td></tr>}</tbody></table></div>
    <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-sm text-[#7d6a4a]"><b className="text-[#2f2415]">Alimentation utilisée :</b> {feedUsed} kg enregistrés dans les logs. Les pertes retirent la quantité du stock mais ne créent pas automatiquement une dépense.</div>
    <div className="flex justify-end gap-2"><button type="button" onClick={() => onNavigate?.('ventes')} className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] px-3 py-2 text-sm font-bold text-[#2f2415]">Ventes</button><button type="button" onClick={() => onNavigate?.('avicole')} className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] px-3 py-2 text-sm font-bold text-[#2f2415]">Avicole</button><button type="button" onClick={() => onNavigate?.('animaux')} className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] px-3 py-2 text-sm font-bold text-[#2f2415]">Animaux</button><button type="button" onClick={() => onNavigate?.('cultures')} className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] px-3 py-2 text-sm font-bold text-[#2f2415]">Cultures</button></div>
  </section>;
}
