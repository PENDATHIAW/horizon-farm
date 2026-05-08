import { AlertTriangle, ArrowDown, ArrowUp, BookOpen, CreditCard, Download, Edit, Eye, FileText, Landmark, Plus, RefreshCw, Trash2, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
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

const safeArray = (value) => Array.isArray(value) ? value : [];
const amount = (row = {}) => toNumber(row.montant ?? row.amount ?? row.total ?? row.montant_total ?? row.total_amount ?? row.prix_total ?? 0);
const hasAmount = (row = {}) => Math.abs(amount(row)) > 0;
const status = (row = {}) => String(row.statut ?? row.status ?? row.statut_paiement ?? 'paye').toLowerCase();
const isIn = (row = {}) => String(row.type || '').toLowerCase() === 'entree';
const isOut = (row = {}) => String(row.type || '').toLowerCase() === 'sortie';
const isPaid = (row = {}) => !['impaye', 'annule'].includes(status(row));
const isUnpaid = (row = {}) => ['impaye', 'partiel', 'en_retard'].includes(status(row));
const today = () => new Date().toISOString().slice(0, 10);

const ACTIVITIES = {
  animaux: 'Animaux',
  avicole_oeufs: 'Œufs',
  avicole_chair: 'Poulets de chair',
  avicole_reformes: 'Pondeuses réformées',
  cultures: 'Cultures',
  produits_transformes: 'Produits transformés',
  services_agricoles: 'Services agricoles',
  location_materiel: 'Location matériel',
  transport_service: 'Transport facturé',
  subventions: 'Subventions',
  financements: 'Financements / apports',
  autres_revenus: 'Autres revenus',
  alimentation: 'Alimentation',
  stock: 'Stock / achats',
  sante: 'Santé',
  main_oeuvre: 'Main-d’œuvre',
  fournisseurs: 'Fournisseurs',
  transport_charge: 'Transport charge',
  energie: 'Énergie',
  maintenance: 'Maintenance',
  investissements: 'Investissements',
  equipements: 'Équipements',
  autres_charges: 'Autres charges',
};
const REVENUE_KEYS = ['animaux', 'avicole_oeufs', 'avicole_chair', 'avicole_reformes', 'cultures', 'produits_transformes', 'services_agricoles', 'location_materiel', 'transport_service', 'subventions', 'financements', 'autres_revenus'];
const COST_KEYS = ['alimentation', 'stock', 'sante', 'main_oeuvre', 'fournisseurs', 'transport_charge', 'energie', 'maintenance', 'investissements', 'equipements', 'autres_charges'];

function setupFinanceFields() {
  const fields = MODULE_FORM_FIELDS.finances || [];
  const categorie = fields.find((field) => field.key === 'categorie');
  if (categorie) categorie.options = ['Vente animaux', 'Vente oeufs', 'Vente poulets de chair', 'Vente pondeuses reformees', 'Vente cultures', 'Vente produits transformes', 'Prestation agricole', 'Location materiel', 'Transport facture', 'Subvention', 'Financement', 'Apport proprietaire', 'Remboursement', 'Alimentation', 'Sante', 'Stock / achat', 'Salaires', 'Transport', 'Energie', 'Maintenance', 'Investissements', 'Equipements', 'Fournisseurs', 'Autre'];
  const moduleLie = fields.find((field) => field.key === 'module_lie');
  if (moduleLie) moduleLie.options = [...REVENUE_KEYS, ...COST_KEYS];
}

function textOf(row = {}) {
  return `${row.module_lie || ''} ${row.module_source || ''} ${row.categorie || ''} ${row.category || ''} ${row.type_produit || ''} ${row.product_type || ''} ${row.source_type || ''} ${row.libelle || ''} ${row.nom || ''}`.toLowerCase();
}
function activityKey(row = {}) {
  const t = textOf(row);
  if (t.includes('subvention')) return 'subventions';
  if (t.includes('financement') || t.includes('apport')) return 'financements';
  if (t.includes('location')) return 'location_materiel';
  if (t.includes('prestation') || t.includes('service agricole')) return 'services_agricoles';
  if (t.includes('transport') && isIn(row)) return 'transport_service';
  if (t.includes('transform')) return 'produits_transformes';
  if (t.includes('oeuf') || t.includes('œuf')) return 'avicole_oeufs';
  if (t.includes('chair') || t.includes('poulet')) return 'avicole_chair';
  if (t.includes('reforme') || t.includes('réform')) return 'avicole_reformes';
  if (t.includes('avicole') || t.includes('pondeuse')) return isIn(row) ? 'avicole_oeufs' : 'alimentation';
  if (t.includes('culture') || t.includes('recolte') || t.includes('récolte') || t.includes('maraich')) return 'cultures';
  if (t.includes('animal') || t.includes('bovin') || t.includes('ovin') || t.includes('caprin') || t.includes('betail') || t.includes('bétail')) return 'animaux';
  if (t.includes('sante') || t.includes('santé') || t.includes('vaccin') || t.includes('veto')) return 'sante';
  if (t.includes('aliment')) return 'alimentation';
  if (t.includes('stock') || t.includes('achat')) return 'stock';
  if (t.includes('salaire') || t.includes('main') || t.includes('ouvrier')) return 'main_oeuvre';
  if (t.includes('fournisseur')) return 'fournisseurs';
  if (t.includes('transport')) return 'transport_charge';
  if (t.includes('energie') || t.includes('énergie') || t.includes('electric') || t.includes('carburant')) return 'energie';
  if (t.includes('maintenance') || t.includes('reparation') || t.includes('réparation')) return 'maintenance';
  if (t.includes('invest')) return 'investissements';
  if (t.includes('equip')) return 'equipements';
  return isIn(row) ? 'autres_revenus' : 'autres_charges';
}
function openModule(moduleKey) {
  if (!moduleKey || typeof document === 'undefined') return;
  Array.from(document.querySelectorAll('nav button')).find((button) => button.textContent?.toLowerCase().includes(moduleKey.toLowerCase()))?.click();
}
function orderTotal(order = {}) { return amount(order) || toNumber(order.montant_total) || toNumber(order.total_ttc) || toNumber(order.total_ht); }
function orderPaid(order = {}) { return toNumber(order.montant_paye ?? order.paid_amount ?? order.amount_paid); }
function orderRemaining(order = {}) {
  const explicit = toNumber(order.reste_a_payer ?? order.remaining_amount, NaN);
  return Number.isFinite(explicit) ? Math.max(0, explicit) : Math.max(0, orderTotal(order) - orderPaid(order));
}
function emptyActivity(id) {
  return { id, label: ACTIVITIES[id] || id, products: 0, paid: 0, receivables: 0, charges: 0, stockValue: 0, kind: REVENUE_KEYS.includes(id) ? 'revenue' : 'cost' };
}

function computeFinance({ rows, salesOrders, payments, fournisseurs, stocks, alimentationLogs }) {
  const tx = safeArray(rows).filter(hasAmount);
  const activities = Object.fromEntries([...REVENUE_KEYS, ...COST_KEYS].map((id) => [id, emptyActivity(id)]));

  tx.forEach((row) => {
    const key = activityKey(row);
    if (isIn(row)) {
      const k = REVENUE_KEYS.includes(key) ? key : 'autres_revenus';
      activities[k].products += amount(row);
      if (isPaid(row)) activities[k].paid += amount(row);
      if (isUnpaid(row)) activities[k].receivables += amount(row);
    }
    if (isOut(row)) {
      const k = activities[key] ? key : 'autres_charges';
      activities[k].charges += amount(row);
    }
  });

  safeArray(alimentationLogs).forEach((log) => {
    const cost = toNumber(log.cout_total ?? log.total_cost ?? log.montant_total ?? log.montant);
    if (cost <= 0) return;
    const t = `${log.type_cible || ''} ${log.cible_id || ''} ${log.lot_id || ''} ${log.categorie || ''}`.toLowerCase();
    activities[t.includes('avicole') || t.includes('lot') || t.includes('poule') ? 'avicole_chair' : 'animaux'].charges += cost;
  });

  const supplierDebts = safeArray(fournisseurs).reduce((sum, f) => sum + toNumber(f.dettes), 0);
  activities.fournisseurs.charges += supplierDebts;
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
  const debts = tx.filter((row) => isOut(row) && isUnpaid(row)).reduce((sum, row) => sum + amount(row), 0) + supplierDebts;
  const margin = revenue - expenses;
  const rowsOut = Object.values(activities).map((activity) => ({
    ...activity,
    total: activity.products || activity.charges || activity.paid || activity.receivables || activity.stockValue,
    margin: activity.products - activity.charges,
    roi: activity.charges > 0 ? ((activity.products - activity.charges) / activity.charges) * 100 : activity.products > 0 ? 100 : 0,
  })).filter((activity) => activity.total).sort((a, b) => Math.abs(b.margin) - Math.abs(a.margin));
  return {
    activities: rowsOut,
    summary: { revenue, cashIn, expenses, paidExpenses, cash: cashIn - paidExpenses, receivables, debts, margin, marginRate: revenue > 0 ? (margin / revenue) * 100 : 0 },
  };
}

function InsightCard({ icon: Icon, title, value, detail }) {
  return <div className="bg-white border border-[#d6c3a0] rounded-2xl p-4"><div className="flex items-start gap-3"><div className="w-10 h-10 rounded-xl bg-[#fff3d8] text-[#9a6b12] flex items-center justify-center"><Icon size={18} /></div><div><p className="text-xs text-[#8a7456]">{title}</p><p className="text-xl font-black text-[#2f2415] mt-1">{value}</p><p className="text-xs text-[#7d6a4a] mt-1">{detail}</p></div></div></div>;
}
function ActionCard({ icon: Icon, title, value, detail, moduleKey, danger }) {
  return <button type="button" onClick={() => openModule(moduleKey)} className={`text-left rounded-xl border p-4 transition-all hover:border-[#b6975f] ${danger ? 'bg-red-50 border-red-200' : 'bg-[#fffdf8] border-[#d6c3a0]'}`}><div className="flex gap-3"><div className="w-9 h-9 rounded-xl bg-[#fff3d8] text-[#9a6b12] flex items-center justify-center shrink-0"><Icon size={17} /></div><div><p className="font-black text-[#2f2415]">{title}</p><p className="text-lg font-black text-[#2f2415] mt-1">{value}</p><p className="text-xs text-[#8a7456] mt-1">{detail}</p><p className="text-xs font-semibold text-[#9a6b12] mt-2">Ouvrir {moduleKey}</p></div></div></button>;
}
function ActivityCard({ activity }) {
  const isRevenue = activity.kind === 'revenue';
  const hasReceivables = activity.receivables > 0;
  return <div className="rounded-xl border border-[#d6c3a0] bg-[#fffdf8] p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-black text-[#2f2415]">{activity.label}</p><p className="text-2xl font-black text-[#2f2415] mt-1">{fmtCurrency(isRevenue ? activity.products : activity.charges)}</p></div><span className={`text-[10px] uppercase rounded-full px-2 py-1 ${isRevenue ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>{isRevenue ? 'Produit' : 'Charge'}</span></div><div className="mt-3 space-y-1 text-xs text-[#8a7456]"><p>Encaissé: {fmtCurrency(activity.paid)}</p>{hasReceivables ? <p>Créances: {fmtCurrency(activity.receivables)}</p> : null}{activity.charges > 0 && isRevenue ? <p>Dépenses liées: {fmtCurrency(activity.charges)}</p> : null}{activity.stockValue > 0 ? <p>Valeur stock: {fmtCurrency(activity.stockValue)}</p> : null}{isRevenue ? <p>Marge: {fmtCurrency(activity.margin)} · ROI {fmtPercent(activity.roi)}</p> : null}</div></div>;
}
function FilterButton({ active, onClick, children }) {
  return <button type="button" onClick={onClick} className={`px-3 py-1.5 rounded-lg text-xs capitalize transition-all ${active ? 'bg-[#2f2415] text-white font-semibold' : 'bg-[#fffdf8] border border-[#d6c3a0] text-[#8a7456]'}`}>{children}</button>;
}

export default function FinancesV7({ rows = [], loading, onCreate, onUpdate, onDelete, onRefresh, stocks = [], fournisseurs = [], alimentationLogs = [], businessPlans = [], salesOrders = [], payments = [] }) {
  setupFinanceFields();
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
  const actions = [
    summary.receivables > 0 ? { icon: Receipt, title: 'Créances à relancer', value: fmtCurrency(summary.receivables), detail: 'Commandes ou paiements non soldés.', moduleKey: 'Ventes', danger: true } : null,
    missingProof > 0 ? { icon: FileText, title: 'Justificatifs', value: fmtNumber(missingProof), detail: 'Reçus/factures à attacher.', moduleKey: 'Documents', danger: false } : null,
    criticalStock > 0 ? { icon: Package, title: 'Stock critique', value: fmtNumber(criticalStock), detail: 'Articles à vérifier ou réapprovisionner.', moduleKey: 'Stock', danger: true } : null,
    { icon: BookOpen, title: 'Comptabilité', value: 'Préparer', detail: 'Passer les transactions propres en écritures.', moduleKey: 'Comptabilité', danger: false },
  ].filter(Boolean).slice(0, 4);
  const financeFormFields = useMemo(() => {
    const bpOptions = safeArray(businessPlans).map((bp) => ({ value: bp.id, label: bp.nom || bp.id }));
    return (MODULE_FORM_FIELDS.finances || []).map((field) => field.key === 'business_plan_id' && bpOptions.length ? { ...field, type: 'select', options: [{ value: '', label: '— Aucun —' }, ...bpOptions] } : field);
  }, [businessPlans]);
  const filtered = useMemo(() => validRows.filter((row) => (typeFilter === 'tous' || String(row.type || '').toLowerCase() === typeFilter) && (statusFilter === 'tous' || status(row) === statusFilter) && (activityFilter === 'tous' || activityKey(row) === activityFilter)), [validRows, typeFilter, statusFilter, activityFilter]);
  const save = async (action, message) => { try { setSaving(true); await action(); await onRefresh?.(); toast.success(message); setModal(null); } catch (e) { toast.error(e.message || 'Action impossible'); } finally { setSaving(false); } };
  const doExports = () => { exportToCsv({ rows: filtered, fileName: 'transactions-finances.csv' }); exportToExcel({ rows: filtered, fileName: 'finances-horizon-farm.xlsx', sheetName: 'Transactions' }); exportToPdf({ rows: filtered, title: 'Finances Horizon Farm', fileName: 'finances-horizon-farm.pdf' }); toast.success('Exports finances générés'); };
  const columns = [
    { key: 'date', label: 'Date', sortable: true },
    { key: 'libelle', label: 'Libellé', sortable: true, render: (row) => <span className="font-semibold text-[#2f2415]">{row.libelle || '-'}</span> },
    { key: 'type', label: 'Type', sortable: true, render: (row) => <span className={`inline-flex items-center gap-1 font-semibold ${isIn(row) ? 'text-emerald-600' : 'text-red-500'}`}>{isIn(row) ? <ArrowUp size={12} /> : <ArrowDown size={12} />}{isIn(row) ? 'produit' : 'charge'}</span> },
    { key: 'categorie', label: 'Catégorie', sortable: true, render: (row) => row.categorie || row.category || '-' },
    { key: 'module_lie', label: 'Activité', sortable: true, render: (row) => ACTIVITIES[activityKey(row)] || '-' },
    { key: 'montant', label: 'Montant', sortable: true, render: (row) => <span className={`font-black ${isIn(row) ? 'text-emerald-600' : 'text-red-500'}`}>{isIn(row) ? '+' : '-'}{fmtCurrency(amount(row))}</span> },
    { key: 'statut', label: 'Statut', sortable: true, render: (row) => <Badge status={row.statut || 'paye'} /> },
    { key: 'paiement', label: 'Paiement', sortable: true },
    { key: 'actions', label: 'Actions', render: (row) => <div className="flex gap-1"><ActionIconButton icon={Eye} color="sky" title="Voir" onClick={() => { setSelected(row); setModal('details'); }} /><ActionIconButton icon={Edit} color="amber" title="Modifier" onClick={() => { setSelected(row); setModal('edit'); }} /><ActionIconButton icon={Trash2} color="red" title="Supprimer" onClick={() => { setSelected(row); setModal('delete'); }} /></div> },
  ];

  return <div className="space-y-6 pt-2">
    <SectionHeader title="Finances" sub="Lecture simple: ce qui est facturé, ce qui est réellement encaissé, ce qui reste à relancer, et les charges." actions={<><Btn icon={RefreshCw} variant="outline" small onClick={onRefresh}>Refresh</Btn><Btn icon={Plus} small onClick={() => setModal('create')}>Ajouter produit/charge</Btn><Btn icon={Download} variant="outline" small onClick={doExports}>Exporter</Btn></>} />
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4"><KpiCard icon={TrendingUp} label="Produits / CA" value={fmtCurrency(summary.revenue)} sub={`${activeRevenue} source(s) active(s)`} color="bg-emerald-500/20 text-emerald-500" /><KpiCard icon={CreditCard} label="Cash encaissé" value={fmtCurrency(summary.cashIn)} sub="argent réellement reçu" color="bg-sky-500/20 text-sky-500" /><KpiCard icon={TrendingDown} label="Charges engagées" value={fmtCurrency(summary.expenses)} sub="dépenses enregistrées" color="bg-red-500/20 text-red-500" /><KpiCard icon={Wallet} label="Cash net" value={fmtCurrency(summary.cash)} sub="cash encaissé - charges payées" color={summary.cash >= 0 ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'} /><KpiCard icon={Landmark} label="Créances" value={fmtCurrency(summary.receivables)} sub="reste à encaisser" color="bg-amber-500/20 text-amber-500" /><KpiCard icon={BookOpen} label="Marge estimée" value={fmtCurrency(summary.margin)} sub={`CA - charges · ${fmtPercent(summary.marginRate)}`} color={summary.margin >= 0 ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'} /></div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4"><InsightCard icon={FileText} title="Justificatifs à compléter" value={fmtNumber(missingProof)} detail="Preuves utiles pour comptabilité et contrôle." /><InsightCard icon={AlertTriangle} title="Charges à suivre" value={fmtCurrency(summary.expenses)} detail="Dépenses qui réduisent cash et marge." /><InsightCard icon={Landmark} title="Cash à sécuriser" value={fmtCurrency(summary.receivables)} detail="Montant à relancer ou vérifier côté ventes." /></div>
    <div className="bg-white border border-[#d6c3a0] rounded-2xl p-5"><div className="mb-4"><h3 className="font-black text-[#2f2415]">Actions rapides</h3><p className="text-sm text-[#8a7456]">Uniquement les liens qui servent à corriger ou expliquer les chiffres.</p></div><div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">{actions.map((action) => <ActionCard key={action.title} {...action} />)}</div></div>
    <div className="bg-white border border-[#d6c3a0] rounded-2xl p-5"><h3 className="font-black text-[#2f2415] mb-2">Activités financières</h3><p className="text-sm text-[#8a7456] mb-4">On affiche seulement les activités avec un produit, une charge, une créance ou une valeur stock.</p><div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">{activities.length ? activities.map((activity) => <ActivityCard key={activity.id} activity={activity} />) : <p className="text-sm text-[#8a7456]">Aucune activité financière détectée.</p>}</div></div>
    <div className="flex flex-wrap gap-2">{['tous', 'entree', 'sortie'].map((f) => <FilterButton key={f} active={typeFilter === f} onClick={() => setTypeFilter(f)}>{f === 'entree' ? 'Produits' : f === 'sortie' ? 'Charges' : 'Toutes'}</FilterButton>)}{['tous', 'paye', 'partiel', 'impaye', 'annule'].map((f) => <FilterButton key={f} active={statusFilter === f} onClick={() => setStatusFilter(f)}>{f}</FilterButton>)}{['tous', ...activities.map((a) => a.id)].map((f) => <FilterButton key={f} active={activityFilter === f} onClick={() => setActivityFilter(f)}>{f === 'tous' ? 'Toutes activités' : ACTIVITIES[f] || f}</FilterButton>)}</div>
    <DataTable title="Transactions financières" rows={filtered} columns={columns} loading={loading} initialSortKey="date" searchPlaceholder="Rechercher transaction, catégorie, activité..." />
    <DetailsModal open={modal === 'details'} onClose={() => setModal(null)} data={selected} title="Détail transaction" />
    <CreateModal open={modal === 'create'} onClose={() => setModal(null)} onSubmit={(payload) => save(() => onCreate?.({ ...payload, statut: payload.statut || 'paye' }), 'Transaction ajoutée')} fields={financeFormFields} initialValues={{ id: generateSequentialId('finances', rows), type: 'entree', date: today(), statut: 'paye', paiement: 'Wave' }} autoId={() => generateSequentialId('finances', rows)} uploadFolder="finances" loading={saving} title="Ajouter produit / charge" submitLabel="Ajouter" />
    <EditModal open={modal === 'edit'} onClose={() => setModal(null)} onSubmit={(payload) => selected && save(() => onUpdate?.(selected.id, payload), 'Transaction modifiée')} fields={financeFormFields} initialValues={selected || {}} uploadFolder="finances" loading={saving} title="Modifier transaction" submitLabel="Enregistrer" />
    <DeleteModal open={modal === 'delete'} onClose={() => setModal(null)} onConfirm={() => selected && save(() => onDelete?.(selected.id), 'Transaction supprimée')} itemLabel={selected ? `${selected.libelle}` : ''} loading={saving} />
  </div>;
}
