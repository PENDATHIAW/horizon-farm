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
const isPartialOrUnpaid = (row = {}) => ['impaye', 'partiel', 'en_retard'].includes(status(row));
const today = () => new Date().toISOString().slice(0, 10);

const REVENUES = {
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
};
const COSTS = {
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
const LABELS = { ...REVENUES, ...COSTS };
const REVENUE_KEYS = Object.keys(REVENUES);
const COST_KEYS = Object.keys(COSTS);

function ensureFinanceFields() {
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
function emptyRevenue(key) { return { key, label: REVENUES[key], amount: 0, paid: 0, receivables: 0, active: false }; }
function makeActivity(id, coverage, charges = 0, stockValue = 0) {
  const isRevenue = REVENUE_KEYS.includes(id);
  const products = coverage?.amount || 0;
  const paid = coverage?.paid || 0;
  const receivables = coverage?.receivables || 0;
  const margin = products - charges;
  const roi = charges > 0 ? (margin / charges) * 100 : products > 0 ? 100 : 0;
  return {
    id,
    label: LABELS[id] || id,
    kind: isRevenue ? 'revenue' : 'cost',
    products,
    paid,
    receivables,
    charges,
    stockValue,
    margin,
    roi,
    pendingCosts: isRevenue && products === 0 && charges > 0,
  };
}

function computeFinance(rows, salesOrders, payments, fournisseurs, stocks, alimentationLogs) {
  const tx = safeArray(rows).filter(hasAmount);
  const orders = safeArray(salesOrders).filter((o) => status(o) !== 'annule');
  const pay = safeArray(payments).filter(hasAmount);
  const revenueRaw = Object.fromEntries(REVENUE_KEYS.map((key) => [key, emptyRevenue(key)]));
  const chargeMap = Object.fromEntries([...REVENUE_KEYS, ...COST_KEYS].map((key) => [key, 0]));

  tx.forEach((row) => {
    const key = activityKey(row);
    if (isIn(row)) {
      const bucketKey = REVENUE_KEYS.includes(key) ? key : 'autres_revenus';
      revenueRaw[bucketKey].amount += amount(row);
      if (isPaid(row)) revenueRaw[bucketKey].paid += amount(row);
      if (isPartialOrUnpaid(row)) revenueRaw[bucketKey].receivables += amount(row);
    }
    if (isOut(row)) {
      const bucketKey = chargeMap[key] !== undefined ? key : 'autres_charges';
      chargeMap[bucketKey] += amount(row);
    }
  });

  safeArray(alimentationLogs).forEach((log) => {
    const cost = toNumber(log.cout_total ?? log.total_cost ?? log.montant_total ?? log.montant);
    if (cost <= 0) return;
    const t = `${log.type_cible || ''} ${log.cible_id || ''} ${log.lot_id || ''} ${log.categorie || ''}`.toLowerCase();
    chargeMap[t.includes('avicole') || t.includes('lot') || t.includes('poule') ? 'avicole_chair' : 'animaux'] += cost;
  });

  const supplierDebts = safeArray(fournisseurs).reduce((s, f) => s + toNumber(f.dettes), 0);
  if (supplierDebts > 0) chargeMap.fournisseurs += supplierDebts;
  const stockValue = safeArray(stocks).reduce((s, item) => s + toNumber(item.quantite ?? item.quantity) * toNumber(item.prix_unitaire ?? item.unit_price ?? item.price), 0);

  const txPaidRevenue = tx.filter((r) => isIn(r) && isPaid(r)).reduce((s, r) => s + amount(r), 0);
  const txRevenue = tx.filter(isIn).reduce((s, r) => s + amount(r), 0);
  const txUnpaidRevenue = tx.filter((r) => isIn(r) && isPartialOrUnpaid(r)).reduce((s, r) => s + amount(r), 0);
  const paymentTotal = pay.reduce((s, p) => s + amount(p), 0);
  const ordersTotal = orders.reduce((s, o) => s + orderTotal(o), 0);
  const ordersPaid = orders.reduce((s, o) => s + orderPaid(o), 0);
  const ordersReceivable = orders.reduce((s, o) => s + orderRemaining(o), 0);
  const cashIn = Math.max(txPaidRevenue, paymentTotal, ordersPaid);
  const receivables = ordersReceivable + txUnpaidRevenue;
  const revenue = Math.max(txRevenue, ordersTotal, cashIn + receivables);

  const specificKeys = REVENUE_KEYS.filter((key) => key !== 'autres_revenus');
  const specificProducts = specificKeys.reduce((s, key) => s + revenueRaw[key].amount, 0);
  const specificPaid = specificKeys.reduce((s, key) => s + revenueRaw[key].paid, 0);
  const specificReceivables = specificKeys.reduce((s, key) => s + revenueRaw[key].receivables, 0);

  const coverage = REVENUE_KEYS.map((key) => {
    const base = { ...revenueRaw[key] };
    if (key === 'autres_revenus') {
      base.amount = Math.max(0, revenue - specificProducts);
      base.paid = Math.max(0, cashIn - specificPaid);
      base.receivables = Math.max(0, receivables - specificReceivables);
    }
    base.active = Boolean(base.amount || base.paid || base.receivables);
    return base;
  });

  const expenses = tx.filter(isOut).reduce((s, r) => s + amount(r), 0);
  const txExpensesPaid = tx.filter((r) => isOut(r) && isPaid(r)).reduce((s, r) => s + amount(r), 0);
  const debts = tx.filter((r) => isOut(r) && isPartialOrUnpaid(r)).reduce((s, r) => s + amount(r), 0) + supplierDebts;
  const margin = revenue - expenses;
  const summary = { revenue, cashIn, expenses, cash: cashIn - txExpensesPaid, receivables, debts, margin, marginRate: revenue > 0 ? (margin / revenue) * 100 : 0 };

  const activities = [
    ...coverage.filter((item) => item.active || chargeMap[item.key] > 0).map((item) => makeActivity(item.key, item, chargeMap[item.key] || 0)),
    ...COST_KEYS.filter((key) => chargeMap[key] > 0 || (key === 'stock' && stockValue > 0)).map((key) => makeActivity(key, null, chargeMap[key] || 0, key === 'stock' ? stockValue : 0)),
  ].sort((a, b) => b.margin - a.margin);

  return { summary, coverage, activities, chargeMap, stockValue };
}

function RevenueChip({ item }) {
  return <div className={`rounded-xl border p-3 ${item.active ? 'bg-emerald-50/70 border-emerald-200' : 'bg-[#fffdf8] border-[#d6c3a0]'}`}><p className="text-sm font-black text-[#2f2415]">{item.label}</p><p className={`text-lg font-black mt-1 ${item.active ? 'text-emerald-600' : 'text-[#8a7456]'}`}>{fmtCurrency(item.amount)}</p><p className="text-xs text-[#8a7456]">encaissé {fmtCurrency(item.paid)} · créances {fmtCurrency(item.receivables)}</p></div>;
}
function ActivityRow({ activity }) {
  const label = activity.pendingCosts ? 'Charges en attente' : activity.kind === 'revenue' ? 'Marge' : 'Charge nette';
  const detail = activity.kind === 'cost'
    ? `Charges ${fmtCurrency(activity.charges)}${activity.stockValue ? ` · Valeur stock ${fmtCurrency(activity.stockValue)}` : ''}`
    : activity.pendingCosts
      ? `Charges ${fmtCurrency(activity.charges)} · Aucun produit enregistré`
      : `Produits ${fmtCurrency(activity.products)} · Encaissé ${fmtCurrency(activity.paid)} · Charges ${fmtCurrency(activity.charges)} · Créances ${fmtCurrency(activity.receivables)} · ROI ${fmtPercent(activity.roi)}`;
  return <div className="flex items-center justify-between gap-3 rounded-xl bg-[#fffdf8] border border-[#e7d9be] p-3"><div><p className="text-sm font-black text-[#2f2415]">{activity.label}</p><p className="text-xs text-[#8a7456]">{detail}</p></div><div className="text-right shrink-0"><p className="text-[10px] uppercase tracking-wide text-[#8a7456]">{label}</p><p className={`font-black ${activity.margin >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{fmtCurrency(activity.margin)}</p></div></div>;
}
function InsightCard({ icon: Icon, title, value, detail }) { return <div className="bg-white border border-[#d6c3a0] rounded-2xl p-4"><div className="flex items-start gap-3"><div className="w-10 h-10 rounded-xl bg-[#fff3d8] text-[#9a6b12] flex items-center justify-center"><Icon size={18} /></div><div><p className="text-xs text-[#8a7456]">{title}</p><p className="text-xl font-black text-[#2f2415] mt-1">{value}</p><p className="text-xs text-[#7d6a4a] mt-1">{detail}</p></div></div></div>; }
function PriorityCard({ title, value, detail, moduleKey, danger, cta }) { return <button type="button" onClick={() => openModule(moduleKey)} className={`text-left rounded-xl border p-4 hover:border-[#b6975f] transition-all ${danger ? 'bg-red-50/70 border-red-200' : 'bg-[#fffdf8] border-[#d6c3a0]'}`}><p className="font-bold text-[#2f2415]">{title}</p><p className="text-2xl font-black text-[#2f2415] mt-1">{value}</p><p className="text-xs text-[#8a7456] mt-1">{detail}</p><p className="text-xs font-semibold text-[#9a6b12] mt-3">{cta}</p></button>; }
function FilterButton({ active, onClick, children }) { return <button type="button" onClick={onClick} className={`px-3 py-1.5 rounded-lg text-xs capitalize transition-all ${active ? 'bg-[#2f2415] text-white font-semibold' : 'bg-[#fffdf8] border border-[#d6c3a0] text-[#8a7456]'}`}>{children}</button>; }

export default function FinancesV5({ rows = [], loading, onCreate, onUpdate, onDelete, onRefresh, stocks = [], fournisseurs = [], alimentationLogs = [], businessPlans = [], salesOrders = [], payments = [] }) {
  ensureFinanceFields();
  const [typeFilter, setTypeFilter] = useState('tous');
  const [statusFilter, setStatusFilter] = useState('tous');
  const [activityFilter, setActivityFilter] = useState('tous');
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);

  const validRows = useMemo(() => safeArray(rows).filter(hasAmount), [rows]);
  const { summary, coverage, activities, chargeMap } = useMemo(() => computeFinance(rows, salesOrders, payments, fournisseurs, stocks, alimentationLogs), [rows, salesOrders, payments, fournisseurs, stocks, alimentationLogs]);
  const activeRevenueCount = coverage.filter((item) => item.active).length;
  const pendingCostActivities = activities.filter((a) => a.pendingCosts);
  const txWithoutProof = validRows.filter((row) => !row.justificatif_url && ['sortie', 'entree'].includes(String(row.type).toLowerCase()));
  const chargesToWatch = COST_KEYS.reduce((sum, key) => sum + (chargeMap[key] || 0), 0);
  const openReceivableOrders = safeArray(salesOrders).filter((order) => status(order) !== 'annule' && orderRemaining(order) > 0);
  const openReceivableTransactions = validRows.filter((row) => isIn(row) && isPartialOrUnpaid(row));
  const supplierDebts = safeArray(fournisseurs).filter((f) => toNumber(f.dettes) > 0);
  const financeFormFields = useMemo(() => {
    const bpOptions = safeArray(businessPlans).map((bp) => ({ value: bp.id, label: bp.nom || bp.id }));
    return (MODULE_FORM_FIELDS.finances || []).map((field) => field.key === 'business_plan_id' && bpOptions.length ? { ...field, type: 'select', options: [{ value: '', label: '— Aucun —' }, ...bpOptions] } : field);
  }, [businessPlans]);
  const filtered = useMemo(() => validRows.filter((row) => (typeFilter === 'tous' || String(row.type || '').toLowerCase() === typeFilter) && (statusFilter === 'tous' || status(row) === statusFilter) && (activityFilter === 'tous' || activityKey(row) === activityFilter)), [validRows, typeFilter, statusFilter, activityFilter]);
  const priorities = [
    summary.receivables > 0 ? { title: 'Créances clients', value: fmtCurrency(summary.receivables), detail: `${openReceivableOrders.length + openReceivableTransactions.length} élément(s) à relancer ou vérifier.`, moduleKey: 'Ventes', cta: 'Ouvrir ventes / relances', danger: true } : null,
    summary.debts > 0 ? { title: 'Dettes à suivre', value: fmtCurrency(summary.debts), detail: `${supplierDebts.length} fournisseur(s) ou sortie(s) non réglée(s).`, moduleKey: 'Fournisseurs', cta: 'Ouvrir fournisseurs', danger: true } : null,
    pendingCostActivities.length ? { title: 'Charges en attente de vente', value: fmtNumber(pendingCostActivities.length), detail: pendingCostActivities.map((a) => a.label).join(', '), moduleKey: 'Ventes', cta: 'Vérifier opportunités de vente', danger: false } : null,
    txWithoutProof.length ? { title: 'Justificatifs manquants', value: fmtNumber(txWithoutProof.length), detail: 'Transactions sans reçu/facture attaché.', moduleKey: 'Documents', cta: 'Ouvrir documents', danger: false } : null,
  ].filter(Boolean);
  const save = async (action, message) => { try { setSaving(true); await action(); await onRefresh?.(); toast.success(message); setModal(null); } catch (e) { toast.error(e.message || 'Action impossible'); } finally { setSaving(false); } };
  const doExports = () => { exportToCsv({ rows: filtered, fileName: 'transactions-finances.csv' }); exportToExcel({ rows: filtered, fileName: 'finances-horizon-farm.xlsx', sheetName: 'Transactions' }); exportToPdf({ rows: filtered, title: 'Finances Horizon Farm', fileName: 'finances-horizon-farm.pdf' }); toast.success('Exports finances générés'); };
  const columns = [
    { key: 'date', label: 'Date', sortable: true },
    { key: 'libelle', label: 'Libellé', sortable: true, render: (row) => <span className="font-semibold text-[#2f2415]">{row.libelle || '-'}</span> },
    { key: 'type', label: 'Type', sortable: true, render: (row) => <span className={`inline-flex items-center gap-1 font-semibold ${isIn(row) ? 'text-emerald-600' : 'text-red-500'}`}>{isIn(row) ? <ArrowUp size={12} /> : <ArrowDown size={12} />}{isIn(row) ? 'produit' : 'charge'}</span> },
    { key: 'categorie', label: 'Catégorie', sortable: true, render: (row) => row.categorie || row.category || '-' },
    { key: 'module_lie', label: 'Activité', sortable: true, render: (row) => LABELS[activityKey(row)] || '-' },
    { key: 'montant', label: 'Montant', sortable: true, render: (row) => <span className={`font-black ${isIn(row) ? 'text-emerald-600' : 'text-red-500'}`}>{isIn(row) ? '+' : '-'}{fmtCurrency(amount(row))}</span> },
    { key: 'statut', label: 'Statut', sortable: true, render: (row) => <Badge status={row.statut || 'paye'} /> },
    { key: 'paiement', label: 'Paiement', sortable: true },
    { key: 'actions', label: 'Actions', render: (row) => <div className="flex gap-1"><ActionIconButton icon={Eye} color="sky" title="Voir" onClick={() => { setSelected(row); setModal('details'); }} /><ActionIconButton icon={Edit} color="amber" title="Modifier" onClick={() => { setSelected(row); setModal('edit'); }} /><ActionIconButton icon={Trash2} color="red" title="Supprimer" onClick={() => { setSelected(row); setModal('delete'); }} /></div> },
  ];
  return <div className="space-y-6 pt-2">
    <SectionHeader title="Finances" sub="Toutes les sources d’argent de la ferme: animaux, avicole, cultures, services, transformation, subventions, financements, avec charges et cash réel." actions={<><Btn icon={RefreshCw} variant="outline" small onClick={onRefresh}>Refresh</Btn><Btn icon={Plus} small onClick={() => setModal('create')}>Ajouter produit/charge</Btn><Btn icon={Download} variant="outline" small onClick={doExports}>Exporter</Btn></>} />
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4"><KpiCard icon={TrendingUp} label="Produits / CA" value={fmtCurrency(summary.revenue)} sub={`${activeRevenueCount} source(s) active(s)`} color="bg-emerald-500/20 text-emerald-500" /><KpiCard icon={CreditCard} label="Cash encaissé" value={fmtCurrency(summary.cashIn)} sub="paiements reçus" color="bg-sky-500/20 text-sky-500" /><KpiCard icon={TrendingDown} label="Charges engagées" value={fmtCurrency(summary.expenses)} color="bg-red-500/20 text-red-500" /><KpiCard icon={Wallet} label="Cash net" value={fmtCurrency(summary.cash)} color={summary.cash >= 0 ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'} /><KpiCard icon={Landmark} label="Créances" value={fmtCurrency(summary.receivables)} color="bg-amber-500/20 text-amber-500" /><KpiCard icon={BookOpen} label="Marge estimée" value={fmtCurrency(summary.margin)} sub={fmtPercent(summary.marginRate)} color={summary.margin >= 0 ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'} /></div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4"><InsightCard icon={FileText} title="Justificatifs à compléter" value={fmtNumber(txWithoutProof.length)} detail="Chaque produit/charge importante doit avoir reçu, facture ou preuve." /><InsightCard icon={AlertTriangle} title="Charges à suivre" value={fmtCurrency(chargesToWatch)} detail="Santé, stock, fournisseurs, équipements, alimentation et maintenance." /><InsightCard icon={Landmark} title="Cash à sécuriser" value={fmtCurrency(summary.receivables)} detail={`${openReceivableOrders.length + openReceivableTransactions.length} élément(s) à relancer ou vérifier.`} /></div>
    <div className="bg-white border border-[#d6c3a0] rounded-2xl p-5"><h3 className="font-black text-[#2f2415] mb-2">Sources de revenus agricoles couvertes</h3><p className="text-sm text-[#8a7456] mb-4">Cette section vérifie que l’argent vient des activités productives réelles. Le total des sources est aligné sur Produits / CA.</p><div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">{coverage.map((item) => <RevenueChip key={item.key} item={item} />)}</div></div>
    <div className="bg-white border border-[#d6c3a0] rounded-2xl p-5"><div className="flex items-center justify-between gap-3 mb-4"><div><h3 className="font-black text-[#2f2415]">Priorités financières</h3><p className="text-sm text-[#8a7456]">Les liens apparaissent uniquement lorsqu’une action est utile.</p></div><Btn variant="outline" small onClick={() => openModule('Comptabilité')}>Préparer comptabilité</Btn></div><div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">{priorities.length ? priorities.map((p) => <PriorityCard key={p.title} {...p} />) : <div className="md:col-span-2 xl:col-span-3 bg-[#fffdf8] border border-[#d6c3a0] rounded-xl p-4 text-sm text-[#8a7456]">Aucune priorité financière critique détectée.</div>}</div></div>
    <div className="bg-white border border-[#d6c3a0] rounded-2xl p-5"><h3 className="font-black text-[#2f2415] mb-4">Économie par activité</h3><div className="space-y-2">{activities.length ? activities.map((a) => <ActivityRow key={a.id} activity={a} />) : <p className="text-sm text-[#8a7456]">Aucune activité financière détectée pour l’instant.</p>}</div></div>
    <div className="flex flex-wrap gap-2">{['tous', 'entree', 'sortie'].map((f) => <FilterButton key={f} active={typeFilter === f} onClick={() => setTypeFilter(f)}>{f === 'entree' ? 'Produits' : f === 'sortie' ? 'Charges' : 'Toutes'}</FilterButton>)}{['tous', 'paye', 'partiel', 'impaye', 'annule'].map((f) => <FilterButton key={f} active={statusFilter === f} onClick={() => setStatusFilter(f)}>{f}</FilterButton>)}{['tous', ...activities.map((a) => a.id)].map((f) => <FilterButton key={f} active={activityFilter === f} onClick={() => setActivityFilter(f)}>{f === 'tous' ? 'Toutes activités' : LABELS[f] || f}</FilterButton>)}</div>
    <DataTable title="Transactions financières" rows={filtered} columns={columns} loading={loading} initialSortKey="date" searchPlaceholder="Rechercher transaction, catégorie, activité..." />
    <DetailsModal open={modal === 'details'} onClose={() => setModal(null)} data={selected} title="Détail transaction" />
    <CreateModal open={modal === 'create'} onClose={() => setModal(null)} onSubmit={(payload) => save(() => onCreate?.({ ...payload, statut: payload.statut || 'paye' }), 'Transaction ajoutée')} fields={financeFormFields} initialValues={{ id: generateSequentialId('finances', rows), type: 'entree', date: today(), statut: 'paye', paiement: 'Wave' }} autoId={() => generateSequentialId('finances', rows)} uploadFolder="finances" loading={saving} title="Ajouter produit / charge" submitLabel="Ajouter" />
    <EditModal open={modal === 'edit'} onClose={() => setModal(null)} onSubmit={(payload) => selected && save(() => onUpdate?.(selected.id, payload), 'Transaction modifiée')} fields={financeFormFields} initialValues={selected || {}} uploadFolder="finances" loading={saving} title="Modifier transaction" submitLabel="Enregistrer" />
    <DeleteModal open={modal === 'delete'} onClose={() => setModal(null)} onConfirm={() => selected && save(() => onDelete?.(selected.id), 'Transaction supprimée')} itemLabel={selected ? `${selected.libelle}` : ''} loading={saving} />
  </div>;
}
