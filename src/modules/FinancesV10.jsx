import { ArrowDown, ArrowUp, BookOpen, CreditCard, Download, Edit, Eye, FileText, Landmark, Package, Plus, Receipt, RefreshCw, Trash2, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import ActionIconButton from '../components/ActionIconButton';
import Badge from '../components/Badge';
import Btn from '../components/Btn';
import DataTable from '../components/DataTable';
import KpiCard from '../components/KpiCard';
import SectionHeader from '../components/SectionHeader';
import CreateModal from '../modals/CreateModal';
import DeleteModal from '../modals/DeleteModal';
import DetailsModal from '../modals/DetailsModal';
import EditModal from '../modals/EditModal';
import { MODULE_FORM_FIELDS } from '../utils/constants';
import { exportToCsv, exportToExcel, exportToPdf } from '../utils/export';
import { fmtCurrency, fmtNumber, fmtPercent, toNumber } from '../utils/format';
import { generateSequentialId } from '../utils/ids';

const safeArray = (v) => Array.isArray(v) ? v : [];
const amount = (r = {}) => toNumber(r.montant ?? r.amount ?? r.total ?? r.montant_total ?? r.total_amount ?? r.prix_total ?? 0);
const hasAmount = (r = {}) => Math.abs(amount(r)) > 0;
const status = (r = {}) => String(r.statut ?? r.status ?? r.statut_paiement ?? 'paye').toLowerCase();
const isIn = (r = {}) => String(r.type || '').toLowerCase() === 'entree';
const isOut = (r = {}) => String(r.type || '').toLowerCase() === 'sortie';
const isPaid = (r = {}) => !['impaye', 'annule'].includes(status(r));
const isUnpaid = (r = {}) => ['impaye', 'partiel', 'en_retard'].includes(status(r));
const today = () => new Date().toISOString().slice(0, 10);

const GROUPS = {
  animaux: { label: 'Animaux', type: 'entree', modules: ['Vente animaux', 'Achat animal', 'Alimentation animaux', 'Santé animaux', 'Transport animaux'] },
  avicole_oeufs: { label: 'Œufs', type: 'entree', modules: ['Vente œufs', 'Plateaux', 'Casses/pertes', 'Alimentation pondeuses', 'Soins pondeuses'] },
  avicole_chair: { label: 'Poulets de chair', type: 'entree', modules: ['Vente poulets', 'Alimentation chair', 'Soins chair', 'Transport chair', 'Pertes chair'] },
  avicole_reformes: { label: 'Pondeuses réformées', type: 'entree', modules: ['Vente pondeuses réformées', 'Transport réforme', 'Soins réforme'] },
  cultures: { label: 'Cultures', type: 'entree', modules: ['Vente récolte', 'Achat engrais', 'Achat semences', 'Main-d’œuvre culture', 'Irrigation', 'Traitement culture', 'Transport récolte'] },
  produits_transformes: { label: 'Produits transformés', type: 'entree', modules: ['Vente produit transformé', 'Emballage', 'Transformation', 'Transport produit'] },
  services_agricoles: { label: 'Services agricoles', type: 'entree', modules: ['Prestation agricole', 'Conseil agricole', 'Main-d’œuvre facturée'] },
  location_materiel: { label: 'Location matériel', type: 'entree', modules: ['Location matériel', 'Maintenance matériel loué', 'Transport matériel'] },
  location_batiment: { label: 'Location bâtiment', type: 'entree', modules: ['Location poulailler', 'Location magasin', 'Location bâtiment ferme', 'Maintenance bâtiment'] },
  location_champ: { label: 'Location champ', type: 'entree', modules: ['Location parcelle/champ', 'Préparation champ', 'Entretien champ'] },
  transport_service: { label: 'Transport facturé', type: 'entree', modules: ['Transport facturé client', 'Carburant transport', 'Maintenance transport'] },
  subventions: { label: 'Subventions', type: 'entree', modules: ['Subvention exploitation', 'Aide projet', 'Programme agricole'] },
  financements: { label: 'Financements / apports', type: 'entree', modules: ['Apport propriétaire', 'Prêt bancaire', 'Financement investisseur'] },
  autres_revenus: { label: 'Autres revenus', type: 'entree', modules: ['Autre revenu', 'Remboursement', 'Produit exceptionnel'] },
  alimentation: { label: 'Alimentation', type: 'sortie', modules: ['Achat aliment animaux', 'Achat aliment avicole', 'Transport aliment', 'Stock aliment'] },
  stock: { label: 'Stock / achats', type: 'sortie', modules: ['Achat stock', 'Achat consommables', 'Approvisionnement', 'Perte stock'] },
  sante: { label: 'Santé', type: 'sortie', modules: ['Vaccin', 'Traitement', 'Vétérinaire', 'Médicaments', 'Analyse sanitaire'] },
  main_oeuvre: { label: 'Main-d’œuvre', type: 'sortie', modules: ['Salaire', 'Journalier', 'Prime', 'Prestation reçue'] },
  fournisseurs: { label: 'Fournisseurs', type: 'sortie', modules: ['Paiement fournisseur', 'Dette fournisseur', 'Acompte fournisseur'] },
  energie: { label: 'Énergie', type: 'sortie', modules: ['Électricité', 'Carburant', 'Eau', 'Gaz'] },
  maintenance: { label: 'Maintenance', type: 'sortie', modules: ['Réparation', 'Entretien bâtiment', 'Entretien équipement', 'Pièces détachées'] },
  investissements: { label: 'Investissements', type: 'sortie', modules: ['Achat terrain', 'Construction', 'Équipement long terme', 'Projet investissement'] },
  equipements: { label: 'Équipements', type: 'sortie', modules: ['Achat équipement', 'Réparation équipement', 'Location équipement'] },
  autres_charges: { label: 'Autres charges', type: 'sortie', modules: ['Autre charge', 'Frais divers', 'Correction'] },
};
const GROUP_KEYS = Object.keys(GROUPS);
const REVENUE_KEYS = GROUP_KEYS.filter((k) => GROUPS[k].type === 'entree');
const ACTIVITY_OPTIONS = GROUP_KEYS.map((k) => ({ value: k, label: GROUPS[k].label }));
const moduleOptions = (activity) => (GROUPS[activity]?.modules || ['Autre']).map((label) => ({ value: label, label }));
const labelFor = (key) => GROUPS[key]?.label || key || '-';

function detectActivity(row = {}) {
  const explicit = String(row.categorie || row.category || '').toLowerCase();
  if (GROUPS[explicit]) return explicit;
  const text = `${row.module_lie || ''} ${row.module_source || ''} ${row.categorie || ''} ${row.category || ''} ${row.libelle || ''}`.toLowerCase();
  if (text.includes('location') && (text.includes('batiment') || text.includes('bâtiment') || text.includes('poulailler') || text.includes('magasin'))) return 'location_batiment';
  if (text.includes('location') && (text.includes('champ') || text.includes('parcelle'))) return 'location_champ';
  if (text.includes('location')) return 'location_materiel';
  if (text.includes('oeuf') || text.includes('œuf')) return 'avicole_oeufs';
  if (text.includes('chair') || text.includes('poulet')) return 'avicole_chair';
  if (text.includes('reforme') || text.includes('réform')) return 'avicole_reformes';
  if (text.includes('culture') || text.includes('recolte') || text.includes('récolte') || text.includes('engrais') || text.includes('semence')) return 'cultures';
  if (text.includes('animal') || text.includes('bovin') || text.includes('ovin') || text.includes('caprin')) return 'animaux';
  if (text.includes('sante') || text.includes('santé') || text.includes('vaccin') || text.includes('veto')) return 'sante';
  if (text.includes('aliment')) return 'alimentation';
  if (text.includes('stock') || text.includes('achat')) return 'stock';
  if (text.includes('salaire') || text.includes('main') || text.includes('ouvrier')) return 'main_oeuvre';
  if (text.includes('subvention')) return 'subventions';
  if (text.includes('financement') || text.includes('apport')) return 'financements';
  if (text.includes('fournisseur')) return 'fournisseurs';
  if (text.includes('energie') || text.includes('énergie') || text.includes('carburant')) return 'energie';
  if (text.includes('maintenance') || text.includes('reparation') || text.includes('réparation')) return 'maintenance';
  if (text.includes('invest')) return 'investissements';
  if (text.includes('equip')) return 'equipements';
  return isIn(row) ? 'autres_revenus' : 'autres_charges';
}

function orderTotal(order = {}) { return amount(order) || toNumber(order.montant_total) || toNumber(order.total_ttc) || toNumber(order.total_ht); }
function orderPaid(order = {}) { return toNumber(order.montant_paye ?? order.paid_amount ?? order.amount_paid); }
function orderRemaining(order = {}) {
  const explicit = toNumber(order.reste_a_payer ?? order.remaining_amount, NaN);
  return Number.isFinite(explicit) ? Math.max(0, explicit) : Math.max(0, orderTotal(order) - orderPaid(order));
}
function openModule(moduleKey) {
  if (!moduleKey || typeof document === 'undefined') return;
  Array.from(document.querySelectorAll('nav button')).find((button) => button.textContent?.toLowerCase().includes(moduleKey.toLowerCase()))?.click();
}
function buildFields(businessPlans) {
  const bpOptions = safeArray(businessPlans).map((bp) => ({ value: bp.id, label: bp.nom || bp.id }));
  return (MODULE_FORM_FIELDS.finances || []).map((field) => {
    if (field.key === 'categorie') return { ...field, label: 'Activité concernée', type: 'select', options: ACTIVITY_OPTIONS };
    if (field.key === 'module_lie') return { ...field, label: 'Module / dépense liée', type: 'select', options: (form) => moduleOptions(form.categorie) };
    if (field.key === 'business_plan_id' && bpOptions.length) return { ...field, type: 'select', options: [{ value: '', label: '— Aucun —' }, ...bpOptions] };
    return field;
  });
}
function deriveValues(next, changedKey, previous) {
  const out = { ...next };
  if (changedKey === 'categorie') {
    out.type = GROUPS[out.categorie]?.type || out.type;
    if (!moduleOptions(out.categorie).some((option) => option.value === out.module_lie)) out.module_lie = '';
  }
  if (changedKey === 'type' && next.type !== previous?.type) {
    out.categorie = '';
    out.module_lie = '';
  }
  return out;
}

function computeFinance({ rows, salesOrders, payments, fournisseurs, stocks, alimentationLogs }) {
  const tx = safeArray(rows).filter(hasAmount);
  const activities = Object.fromEntries(GROUP_KEYS.map((id) => [id, { id, label: labelFor(id), kind: GROUPS[id].type === 'entree' ? 'revenue' : 'cost', products: 0, paid: 0, receivables: 0, charges: 0, stockValue: 0 }]));
  tx.forEach((row) => {
    const key = detectActivity(row);
    if (isIn(row)) {
      const k = REVENUE_KEYS.includes(key) ? key : 'autres_revenus';
      activities[k].products += amount(row);
      if (isPaid(row)) activities[k].paid += amount(row);
      if (isUnpaid(row)) activities[k].receivables += amount(row);
    }
    if (isOut(row)) activities[activities[key] ? key : 'autres_charges'].charges += amount(row);
  });
  safeArray(alimentationLogs).forEach((log) => {
    const cost = toNumber(log.cout_total ?? log.total_cost ?? log.montant_total ?? log.montant);
    if (cost <= 0) return;
    const target = `${log.type_cible || ''} ${log.cible_id || ''} ${log.lot_id || ''}`.toLowerCase();
    activities[target.includes('avicole') || target.includes('lot') ? 'avicole_chair' : 'animaux'].charges += cost;
  });
  activities.fournisseurs.charges += safeArray(fournisseurs).reduce((sum, f) => sum + toNumber(f.dettes), 0);
  activities.stock.stockValue = safeArray(stocks).reduce((sum, item) => sum + toNumber(item.quantite ?? item.quantity) * toNumber(item.prix_unitaire ?? item.unit_price ?? item.price), 0);

  const orders = safeArray(salesOrders).filter((order) => status(order) !== 'annule');
  const paymentsTotal = safeArray(payments).filter(hasAmount).reduce((sum, payment) => sum + amount(payment), 0);
  const txRevenue = tx.filter(isIn).reduce((sum, row) => sum + amount(row), 0);
  const txPaid = tx.filter((row) => isIn(row) && isPaid(row)).reduce((sum, row) => sum + amount(row), 0);
  const txReceivable = tx.filter((row) => isIn(row) && isUnpaid(row)).reduce((sum, row) => sum + amount(row), 0);
  const ordersTotal = orders.reduce((sum, order) => sum + orderTotal(order), 0);
  const ordersPaid = orders.reduce((sum, order) => sum + orderPaid(order), 0);
  const ordersReceivable = orders.reduce((sum, order) => sum + orderRemaining(order), 0);
  const cashIn = Math.max(txPaid, paymentsTotal, ordersPaid);
  const receivables = ordersReceivable + txReceivable;
  const revenue = Math.max(txRevenue, ordersTotal, cashIn + receivables);
  const specificRevenue = REVENUE_KEYS.filter((key) => key !== 'autres_revenus').reduce((sum, key) => sum + activities[key].products, 0);
  const specificPaid = REVENUE_KEYS.filter((key) => key !== 'autres_revenus').reduce((sum, key) => sum + activities[key].paid, 0);
  const specificReceivables = REVENUE_KEYS.filter((key) => key !== 'autres_revenus').reduce((sum, key) => sum + activities[key].receivables, 0);
  activities.autres_revenus.products = Math.max(0, revenue - specificRevenue);
  activities.autres_revenus.paid = Math.max(0, cashIn - specificPaid);
  activities.autres_revenus.receivables = Math.max(0, receivables - specificReceivables);
  const expenses = tx.filter(isOut).reduce((sum, row) => sum + amount(row), 0);
  const paidExpenses = tx.filter((row) => isOut(row) && isPaid(row)).reduce((sum, row) => sum + amount(row), 0);
  const debts = tx.filter((row) => isOut(row) && isUnpaid(row)).reduce((sum, row) => sum + amount(row), 0) + activities.fournisseurs.charges;
  const margin = revenue - expenses;
  const list = Object.values(activities).map((activity) => ({ ...activity, total: activity.products || activity.charges || activity.paid || activity.receivables || activity.stockValue, margin: activity.products - activity.charges, roi: activity.charges > 0 ? ((activity.products - activity.charges) / activity.charges) * 100 : activity.products > 0 ? 100 : 0 })).filter((activity) => activity.total).sort((a, b) => Math.abs(b.margin) - Math.abs(a.margin));
  return { activities: list, summary: { revenue, cashIn, expenses, paidExpenses, cash: cashIn - paidExpenses, receivables, debts, margin, marginRate: revenue > 0 ? (margin / revenue) * 100 : 0 } };
}

function ActionCard({ icon: Icon, title, value, detail, moduleKey, danger }) {
  return <button type="button" onClick={() => openModule(moduleKey)} className={`text-left rounded-xl border p-4 transition-all hover:border-[#b6975f] ${danger ? 'bg-red-50 border-red-200' : 'bg-[#fffdf8] border-[#d6c3a0]'}`}><div className="flex gap-3"><div className="w-9 h-9 rounded-xl bg-[#fff3d8] text-[#9a6b12] flex items-center justify-center shrink-0"><Icon size={17} /></div><div><p className="font-black text-[#2f2415]">{title}</p><p className="text-lg font-black text-[#2f2415] mt-1">{value}</p><p className="text-xs text-[#8a7456] mt-1">{detail}</p><p className="text-xs font-semibold text-[#9a6b12] mt-2">Ouvrir {moduleKey}</p></div></div></button>;
}
function ActivityCard({ activity }) {
  const revenue = activity.kind === 'revenue';
  return <div className="rounded-xl border border-[#d6c3a0] bg-[#fffdf8] p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-black text-[#2f2415]">{activity.label}</p><p className="text-2xl font-black text-[#2f2415] mt-1">{fmtCurrency(revenue ? activity.products : activity.charges)}</p></div><span className={`text-[10px] uppercase rounded-full px-2 py-1 ${revenue ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>{revenue ? 'Produit' : 'Charge'}</span></div><div className="mt-3 space-y-1 text-xs text-[#8a7456]"><p>Encaissé: {fmtCurrency(activity.paid)}</p>{activity.receivables > 0 ? <p>Créances: {fmtCurrency(activity.receivables)}</p> : null}{activity.charges > 0 && revenue ? <p>Dépenses liées: {fmtCurrency(activity.charges)}</p> : null}{activity.stockValue > 0 ? <p>Valeur stock: {fmtCurrency(activity.stockValue)}</p> : null}{revenue ? <p>Marge: {fmtCurrency(activity.margin)} · ROI {fmtPercent(activity.roi)}</p> : null}</div></div>;
}
function FilterButton({ active, onClick, children }) {
  return <button type="button" onClick={onClick} className={`px-3 py-1.5 rounded-lg text-xs capitalize transition-all ${active ? 'bg-[#2f2415] text-white font-semibold' : 'bg-[#fffdf8] border border-[#d6c3a0] text-[#8a7456]'}`}>{children}</button>;
}

export default function FinancesV10({ rows = [], loading, onCreate, onUpdate, onDelete, onRefresh, stocks = [], fournisseurs = [], alimentationLogs = [], businessPlans = [], salesOrders = [], payments = [] }) {
  const [typeFilter, setTypeFilter] = useState('tous');
  const [statusFilter, setStatusFilter] = useState('tous');
  const [activityFilter, setActivityFilter] = useState('tous');
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const validRows = useMemo(() => safeArray(rows).filter(hasAmount), [rows]);
  const { summary, activities } = useMemo(() => computeFinance({ rows, salesOrders, payments, fournisseurs, stocks, alimentationLogs }), [rows, salesOrders, payments, fournisseurs, stocks, alimentationLogs]);
  const missingProof = validRows.filter((row) => !row.justificatif_url).length;
  const activeRevenue = activities.filter((activity) => activity.kind === 'revenue' && activity.products > 0).length;
  const criticalStock = safeArray(stocks).filter((item) => toNumber(item.quantite ?? item.quantity) <= toNumber(item.seuil ?? item.threshold)).length;
  const financeFormFields = useMemo(() => buildFields(businessPlans), [businessPlans]);
  const filtered = useMemo(() => validRows.filter((row) => (typeFilter === 'tous' || String(row.type || '').toLowerCase() === typeFilter) && (statusFilter === 'tous' || status(row) === statusFilter) && (activityFilter === 'tous' || detectActivity(row) === activityFilter)), [validRows, typeFilter, statusFilter, activityFilter]);
  const actions = [
    summary.receivables > 0 ? { icon: Receipt, title: 'Créances à relancer', value: fmtCurrency(summary.receivables), detail: 'Commandes ou paiements non soldés.', moduleKey: 'Ventes', danger: true } : null,
    missingProof > 0 ? { icon: FileText, title: 'Justificatifs', value: fmtNumber(missingProof), detail: 'Reçus/factures à attacher.', moduleKey: 'Documents' } : null,
    criticalStock > 0 ? { icon: Package, title: 'Stock critique', value: fmtNumber(criticalStock), detail: 'Articles à vérifier ou réapprovisionner.', moduleKey: 'Stock', danger: true } : null,
    { icon: BookOpen, title: 'Comptabilité', value: 'Préparer', detail: 'Passer les transactions propres en écritures.', moduleKey: 'Comptabilité' },
  ].filter(Boolean).slice(0, 4);
  const save = async (action, message) => { try { setSaving(true); await action(); await onRefresh?.(); toast.success(message); setModal(null); } catch (e) { toast.error(e.message || 'Action impossible'); } finally { setSaving(false); } };
  const doExports = () => { exportToCsv({ rows: filtered, fileName: 'transactions-finances.csv' }); exportToExcel({ rows: filtered, fileName: 'finances-horizon-farm.xlsx', sheetName: 'Transactions' }); exportToPdf({ rows: filtered, title: 'Finances Horizon Farm', fileName: 'finances-horizon-farm.pdf' }); toast.success('Exports finances générés'); };
  const columns = [
    { key: 'date', label: 'Date', sortable: true },
    { key: 'libelle', label: 'Libellé', sortable: true, render: (row) => <span className="font-semibold text-[#2f2415]">{row.libelle || '-'}</span> },
    { key: 'type', label: 'Type', sortable: true, render: (row) => <span className={`inline-flex items-center gap-1 font-semibold ${isIn(row) ? 'text-emerald-600' : 'text-red-500'}`}>{isIn(row) ? <ArrowUp size={12} /> : <ArrowDown size={12} />}{isIn(row) ? 'produit' : 'charge'}</span> },
    { key: 'categorie', label: 'Activité', sortable: true, render: (row) => labelFor(detectActivity(row)) },
    { key: 'module_lie', label: 'Module lié', sortable: true, render: (row) => row.module_lie || '-' },
    { key: 'montant', label: 'Montant', sortable: true, render: (row) => <span className={`font-black ${isIn(row) ? 'text-emerald-600' : 'text-red-500'}`}>{isIn(row) ? '+' : '-'}{fmtCurrency(amount(row))}</span> },
    { key: 'statut', label: 'Statut', sortable: true, render: (row) => <Badge status={row.statut || 'paye'} /> },
    { key: 'paiement', label: 'Paiement', sortable: true },
    { key: 'actions', label: 'Actions', render: (row) => <div className="flex gap-1"><ActionIconButton icon={Eye} color="sky" title="Voir" onClick={() => { setSelected(row); setModal('details'); }} /><ActionIconButton icon={Edit} color="amber" title="Modifier" onClick={() => { setSelected(row); setModal('edit'); }} /><ActionIconButton icon={Trash2} color="red" title="Supprimer" onClick={() => { setSelected(row); setModal('delete'); }} /></div> },
  ];
  return <div className="space-y-6 pt-2">
    <SectionHeader title="Finances" sub="Lecture simple: ce qui est facturé, ce qui est réellement encaissé, ce qui reste à relancer, et les charges." actions={<><Btn icon={RefreshCw} variant="outline" small onClick={onRefresh}>Refresh</Btn><Btn icon={Plus} small onClick={() => setModal('create')}>Ajouter produit/charge</Btn><Btn icon={Download} variant="outline" small onClick={doExports}>Exporter</Btn></>} />
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4"><KpiCard icon={TrendingUp} label="Produits / CA" value={fmtCurrency(summary.revenue)} sub={`${activeRevenue} source(s) active(s)`} color="bg-emerald-500/20 text-emerald-500" /><KpiCard icon={CreditCard} label="Cash encaissé" value={fmtCurrency(summary.cashIn)} sub="argent réellement reçu" color="bg-sky-500/20 text-sky-500" /><KpiCard icon={TrendingDown} label="Charges engagées" value={fmtCurrency(summary.expenses)} sub="dépenses enregistrées" color="bg-red-500/20 text-red-500" /><KpiCard icon={Wallet} label="Cash net" value={fmtCurrency(summary.cash)} sub="cash encaissé - charges payées" color={summary.cash >= 0 ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'} /><KpiCard icon={Landmark} label="Créances" value={fmtCurrency(summary.receivables)} sub="reste à encaisser" color="bg-amber-500/20 text-amber-500" /><KpiCard icon={BookOpen} label="Marge estimée" value={fmtCurrency(summary.margin)} sub={`CA - charges · ${fmtPercent(summary.marginRate)}`} color={summary.margin >= 0 ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'} /></div>
    <div className="bg-white border border-[#d6c3a0] rounded-2xl p-5"><div className="mb-4"><h3 className="font-black text-[#2f2415]">Actions rapides</h3><p className="text-sm text-[#8a7456]">Liens utiles seulement quand une action est nécessaire.</p></div><div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">{actions.map((action) => <ActionCard key={action.title} {...action} />)}</div></div>
    <div className="bg-white border border-[#d6c3a0] rounded-2xl p-5"><h3 className="font-black text-[#2f2415] mb-2">Activités financières</h3><p className="text-sm text-[#8a7456] mb-4">On affiche seulement les activités avec un produit, une charge, une créance ou une valeur stock.</p><div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">{activities.length ? activities.map((activity) => <ActivityCard key={activity.id} activity={activity} />) : <p className="text-sm text-[#8a7456]">Aucune activité financière détectée.</p>}</div></div>
    <div className="flex flex-wrap gap-2">{['tous', 'entree', 'sortie'].map((f) => <FilterButton key={f} active={typeFilter === f} onClick={() => setTypeFilter(f)}>{f === 'entree' ? 'Produits' : f === 'sortie' ? 'Charges' : 'Toutes'}</FilterButton>)}{['tous', 'paye', 'partiel', 'impaye', 'annule'].map((f) => <FilterButton key={f} active={statusFilter === f} onClick={() => setStatusFilter(f)}>{f}</FilterButton>)}{['tous', ...activities.map((a) => a.id)].map((f) => <FilterButton key={f} active={activityFilter === f} onClick={() => setActivityFilter(f)}>{f === 'tous' ? 'Toutes activités' : labelFor(f)}</FilterButton>)}</div>
    <DataTable title="Transactions financières" rows={filtered} columns={columns} loading={loading} initialSortKey="date" searchPlaceholder="Rechercher transaction, catégorie, activité..." />
    <DetailsModal open={modal === 'details'} onClose={() => setModal(null)} data={selected} title="Détail transaction" />
    <CreateModal open={modal === 'create'} onClose={() => setModal(null)} onSubmit={(payload) => save(() => onCreate?.({ ...payload, statut: payload.statut || 'paye' }), 'Transaction ajoutée')} fields={financeFormFields} deriveValues={deriveValues} initialValues={{ id: generateSequentialId('finances', rows), type: 'entree', date: today(), statut: 'paye', paiement: 'Wave' }} autoId={() => generateSequentialId('finances', rows)} uploadFolder="finances" loading={saving} title="Ajouter produit / charge" submitLabel="Ajouter" />
    <EditModal open={modal === 'edit'} onClose={() => setModal(null)} onSubmit={(payload) => selected && save(() => onUpdate?.(selected.id, payload), 'Transaction modifiée')} fields={financeFormFields} deriveValues={deriveValues} initialValues={selected || {}} uploadFolder="finances" loading={saving} title="Modifier transaction" submitLabel="Enregistrer" />
    <DeleteModal open={modal === 'delete'} onClose={() => setModal(null)} onConfirm={() => selected && save(() => onDelete?.(selected.id), 'Transaction supprimée')} itemLabel={selected ? `${selected.libelle}` : ''} loading={saving} />
  </div>;
}
