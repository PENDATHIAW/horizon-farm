import { AlertTriangle, CheckCircle2, HeartPulse, Package, Stethoscope, Wallet } from 'lucide-react';
import { fmtCurrency, toNumber } from '../utils/format';

const arr = (value) => Array.isArray(value) ? value : [];
const clean = (value = '') => String(value || '').trim();
const lower = (value = '') => clean(value).toLowerCase();
const isLate = (row = {}) => ['retard', 'en_retard', 'en retard'].some((word) => lower(row.statut || row.status).includes(word));
const isTodo = (row = {}) => ['a_faire', 'à faire', 'programme', 'programmé', 'prevu', 'prévu'].some((word) => lower(row.statut || row.status).includes(word));
const isDone = (row = {}) => ['fait', 'realise', 'réalisé', 'termine', 'terminé'].some((word) => lower(row.statut || row.status).includes(word));
const healthStock = (row = {}) => ['vaccin', 'medicament', 'médicament', 'antibiotique', 'veterinaire', 'vétérinaire', 'desinfectant', 'désinfectant'].some((word) => lower(`${row.produit || ''} ${row.nom || ''} ${row.name || ''} ${row.categorie || ''}`).includes(word));
const qty = (row = {}) => toNumber(row.quantite ?? row.quantity ?? row.stock);
const seuil = (row = {}) => toNumber(row.seuil ?? row.threshold ?? row.min_quantity);
const txAmount = (row = {}) => toNumber(row.montant ?? row.amount ?? row.total ?? row.montant_total);
const isHealthCost = (row = {}) => ['sante', 'santé', 'vaccin', 'veterinaire', 'vétérinaire', 'soin'].some((word) => lower(`${row.categorie || ''} ${row.libelle || ''} ${row.module_lie || ''}`).includes(word));
const isSick = (row = {}) => ['malade', 'traitement', 'a_surveiller', 'à surveiller'].some((word) => lower(`${row.health_status || ''} ${row.statut || ''} ${row.status || ''}`).includes(word));
const targetLabel = (row = {}) => clean(row.animal_label || row.lot_label || row.cible || row.target_label || row.animal_id || row.lot_id || row.id || 'Suivi santé');

function Mini({ icon: Icon, label, value, danger = false }) {
  return <div className={`rounded-xl border p-3 ${danger ? 'border-amber-200 bg-amber-50' : 'border-[#eadcc2] bg-white'}`}><Icon size={15} className={danger ? 'text-amber-700' : 'text-[#9a6b12]'} /><p className="mt-1 text-xs text-[#8a7456]">{label}</p><p className="font-black text-[#2f2415] break-words">{value}</p></div>;
}
function Badge({ children, danger }) {
  return <span className={`rounded-full px-2 py-0.5 text-xs font-black ${danger ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-700'}`}>{children}</span>;
}

export default function HealthOperationalPanel({ rows = [], stocks = [], transactions = [], animaux = [], lots = [], onNavigate }) {
  const healthRows = arr(rows);
  const lateRows = healthRows.filter(isLate);
  const todoRows = healthRows.filter(isTodo);
  const doneRows = healthRows.filter(isDone);
  const healthStocks = arr(stocks).filter(healthStock);
  const criticalStock = healthStocks.filter((row) => seuil(row) > 0 && qty(row) <= seuil(row));
  const sickAnimals = arr(animaux).filter(isSick);
  const sickLots = arr(lots).filter(isSick);
  const healthCosts = arr(transactions).filter(isHealthCost).reduce((sum, row) => sum + txAmount(row), 0);
  const warningCount = lateRows.length + criticalStock.length + sickAnimals.length + sickLots.length;
  const priorityRows = [...lateRows, ...todoRows].slice(0, 6);

  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3"><div><p className="text-xs uppercase tracking-widest text-[#8a7456] font-black flex items-center gap-2"><HeartPulse size={15} /> Pilotage santé</p><h3 className="text-xl font-black text-[#2f2415] mt-1">Soins en retard, stock santé et risques sanitaires</h3><p className="text-sm text-[#8a7456] mt-1">Les soins doivent agir sur les animaux/lots, le stock santé, les dépenses, documents, tâches et alertes sans double saisie.</p></div>{warningCount ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"><AlertTriangle size={15} className="inline" /> {warningCount} point(s) à traiter</div> : <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 size={15} className="inline" /> Santé maîtrisée</div>}</div>
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2"><Mini icon={AlertTriangle} label="Soins en retard" value={lateRows.length} danger={lateRows.length > 0} /><Mini icon={Stethoscope} label="À faire" value={todoRows.length} danger={todoRows.length > 0} /><Mini icon={CheckCircle2} label="Réalisés" value={doneRows.length} /><Mini icon={Package} label="Stock santé critique" value={criticalStock.length} danger={criticalStock.length > 0} /><Mini icon={HeartPulse} label="Animaux/lots à risque" value={sickAnimals.length + sickLots.length} danger={sickAnimals.length + sickLots.length > 0} /><Mini icon={Wallet} label="Coûts santé" value={fmtCurrency(healthCosts)} /></div>
    <div className="overflow-x-auto rounded-2xl border border-[#eadcc2] bg-[#fffdf8]"><table className="min-w-full text-sm"><thead className="bg-[#2f2415] text-white"><tr><th className="px-3 py-2 text-left">Intervention</th><th className="px-3 py-2 text-left">Cible</th><th className="px-3 py-2 text-left">Date</th><th className="px-3 py-2 text-left">Statut</th></tr></thead><tbody>{priorityRows.length ? priorityRows.map((row) => { const danger = isLate(row); return <tr key={row.id || `${row.type}-${row.date}`} className="border-t border-[#eadcc2]"><td className="px-3 py-2"><b className="text-[#2f2415]">{row.type_soin || row.type || row.nom || row.title || 'Intervention santé'}</b><p className="text-xs text-[#8a7456]">{row.notes || row.description || ''}</p></td><td className="px-3 py-2 text-[#7d6a4a]">{targetLabel(row)}</td><td className="px-3 py-2 text-[#7d6a4a]">{row.date || row.date_prevue || row.echeance || '-'}</td><td className="px-3 py-2"><Badge danger={danger}>{danger ? 'En retard' : 'À faire'}</Badge></td></tr>; }) : <tr><td colSpan="4" className="px-3 py-6 text-center text-[#8a7456]">Aucun soin prioritaire à afficher.</td></tr>}</tbody></table></div>
    {criticalStock.length ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"><b>Stock santé à réapprovisionner :</b> {criticalStock.slice(0, 4).map((row) => `${row.produit || row.nom || row.name || row.id} (${qty(row)})`).join(' · ')}</div> : null}
    <div className="flex justify-end gap-2"><button type="button" onClick={() => onNavigate?.('stock')} className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] px-3 py-2 text-sm font-bold text-[#2f2415]">Stock santé</button><button type="button" onClick={() => onNavigate?.('animaux')} className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] px-3 py-2 text-sm font-bold text-[#2f2415]">Animaux</button><button type="button" onClick={() => onNavigate?.('avicole')} className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] px-3 py-2 text-sm font-bold text-[#2f2415]">Avicole</button></div>
  </section>;
}
