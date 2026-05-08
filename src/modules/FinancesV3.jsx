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

const REVENUE_ACTIVITIES = {
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

const COST_ACTIVITIES = {
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

const ACTIVITY_LABELS = { ventes: 'Ventes globales', ...REVENUE_ACTIVITIES, ...COST_ACTIVITIES };
const REVENUE_KEYS = Object.keys(REVENUE_ACTIVITIES);
const COST_KEYS = Object.keys(COST_ACTIVITIES);

function ensureFinanceFields() {
  const fields = MODULE_FORM_FIELDS.finances || [];
  const categorie = fields.find((field) => field.key === 'categorie');
  if (categorie) {
    categorie.options = [
      'Vente animaux', 'Vente oeufs', 'Vente poulets de chair', 'Vente pondeuses reformees', 'Vente cultures', 'Vente produits transformes',
      'Prestation agricole', 'Location materiel', 'Transport facture', 'Subvention', 'Financement', 'Apport proprietaire', 'Remboursement',
      'Alimentation', 'Sante', 'Stock / achat', 'Salaires', 'Transport', 'Energie', 'Maintenance', 'Investissements', 'Equipements', 'Fournisseurs', 'Autre',
    ];
  }
  const moduleLie = fields.find((field) => field.key === 'module_lie');
  if (moduleLie) {
    moduleLie.options = [
      'animaux', 'avicole_oeufs', 'avicole_chair', 'avicole_reformes', 'cultures', 'produits_transformes', 'services_agricoles', 'location_materiel', 'transport_service',
      'subventions', 'financements', 'stock', 'sante', 'fournisseurs', 'investissements', 'equipements', 'autre',
    ];
  }
}

function textOf(row = {}) {
  return `${row.module_lie || ''} ${row.module_source || ''} ${row.categorie || ''} ${row.category || ''} ${row.type_produit || ''} ${row.product_type || ''} ${row.source_type || ''} ${row.libelle || ''} ${row.nom || ''}`.toLowerCase();
}

function normalizeActivityKey(row = {}) {
  const text = textOf(row);
  if (!text || text.trim() === 'finances' || text.trim() === 'finance') return isIn(row) ? 'autres_revenus' : 'autres_charges';

  if (text.includes('subvention')) return 'subventions';
  if (text.includes('financement') || text.includes('apport')) return 'financements';
  if (text.includes('remboursement')) return isIn(row) ? 'autres_revenus' : 'autres_charges';
  if (text.includes('location')) return 'location_materiel';
  if (text.includes('prestation') || text.includes('service agricole') || text.includes('service')) return 'services_agricoles';
  if (text.includes('transport') && isIn(row)) return 'transport_service';
  if (text.includes('produit transforme') || text.includes('transform')) return 'produits_transformes';
  if (text.includes('vente oeuf') || text.includes('œuf') || text.includes('oeuf')) return 'avicole_oeufs';
  if (text.includes('chair') || text.includes('poulet')) return 'avicole_chair';
  if (text.includes('reforme') || text.includes('réform')) return 'avicole_reformes';
  if (text.includes('avicole') || text.includes('pondeuse')) return isIn(row) ? 'avicole_oeufs' : 'alimentation';
  if (text.includes('culture') || text.includes('maraich') || text.includes('recolte') || text.includes('récolte')) return 'cultures';
  if (text.includes('animal') || text.includes('bovin') || text.includes('ovin') || text.includes('caprin') || text.includes('betail') || text.includes('bétail')) return 'animaux';

  if (text.includes('sante') || text.includes('santé') || text.includes('vaccin') || text.includes('veto') || text.includes('vét')) return 'sante';
  if (text.includes('aliment')) return 'alimentation';
  if (text.includes('stock') || text.includes('achat')) return 'stock';
  if (text.includes('salaire') || text.includes('main') || text.includes('ouvrier')) return 'main_oeuvre';
  if (text.includes('fournisseur')) return 'fournisseurs';
  if (text.includes('transport')) return 'transport_charge';
  if (text.includes('energie') || text.includes('énergie') || text.includes('electric') || text.includes('carburant')) return 'energie';
  if (text.includes('maintenance') || text.includes('reparation') || text.includes('réparation')) return 'maintenance';
  if (text.includes('invest')) return 'investissements';
  if (text.includes('equip')) return 'equipements';
  if (text.includes('vente') || text.includes('client') || text.includes('paiement')) return 'ventes';

  return isIn(row) ? 'autres_revenus' : 'autres_charges';
}

function openModule(moduleKey) {
  if (!moduleKey || typeof document === 'undefined') return;
  const navButtons = Array.from(document.querySelectorAll('nav button'));
  navButtons.find((button) => button.textContent?.toLowerCase().includes(moduleKey.toLowerCase()))?.click();
}

function getOrderTotal(order = {}) {
  return amount(order) || toNumber(order.montant_total) || toNumber(order.total_ttc) || toNumber(order.total_ht);
}

function getOrderPaid(order = {}) {
  return toNumber(order.montant_paye ?? order.paid_amount ?? order.amount_paid);
}

function getOrderRemaining(order = {}) {
  const explicit = toNumber(order.reste_a_payer ?? order.remaining_amount, NaN);
  if (Number.isFinite(explicit)) return Math.max(0, explicit);
  return Math.max(0, getOrderTotal(order) - getOrderPaid(order));
}

function makeActivity(id) {
  const kind = REVENUE_KEYS.includes(id) || id === 'ventes' ? 'revenue' : 'cost';
  return { id, label: ACTIVITY_LABELS[id] || id, kind, products: 0, charges: 0, paid: 0, receivables: 0, transactions: 0, sources: new Set() };
}

function computeFinance({ rows, salesOrders, payments, fournisseurs, stocks }) {
  const tx = safeArray(rows).filter(hasAmount);
  const orders = safeArray(salesOrders).filter((order) => status(order) !== 'annule');
  const pay = safeArray(payments).filter(hasAmount);
  const suppliers = safeArray(fournisseurs);
  const stockRows = safeArray(stocks);

  const txIncomePaid = tx.filter((row) => isIn(row) && isPaid(row)).reduce((sum, row) => sum + amount(row), 0);
  const txExpensesPaid = tx.filter((row) => isOut(row) && isPaid(row)).reduce((sum, row) => sum + amount(row), 0);
  const expenses = tx.filter(isOut).reduce((sum, row) => sum + amount(row), 0);
  const paymentsTotal = pay.reduce((sum, row) => sum + amount(row), 0);
  const ordersTotal = orders.reduce((sum, order) => sum + getOrderTotal(order), 0);
  const ordersPaid = orders.reduce((sum, order) => sum + getOrderPaid(order), 0);
  const receivablesFromOrders = orders.reduce((sum, order) => sum + getOrderRemaining(order), 0);
  const receivablesFromTx = tx.filter((row) => isIn(row) && isPartialOrUnpaid(row)).reduce((sum, row) => sum + amount(row), 0);
  const debtsFromTx = tx.filter((row) => isOut(row) && isPartialOrUnpaid(row)).reduce((sum, row) => sum + amount(row), 0);
  const debtsFromSuppliers = suppliers.reduce((sum, supplier) => sum + toNumber(supplier.dettes), 0);
  const stockValue = stockRows.reduce((sum, item) => sum + toNumber(item.quantite ?? item.quantity) * toNumber(item.prix_unitaire ?? item.unit_price ?? item.price), 0);

  const cashIn = Math.max(txIncomePaid, paymentsTotal, ordersPaid);
  const revenue = Math.max(ordersTotal, txIncomePaid + receivablesFromTx, cashIn + receivablesFromOrders);
  const cash = cashIn - txExpensesPaid;
  const margin = revenue - expenses;
  const receivables = receivablesFromOrders + receivablesFromTx;
  const debts = debtsFromTx + debtsFromSuppliers;
  const marginRate = revenue > 0 ? (margin / revenue) * 100 : 0;

  return { cashIn, revenue, expenses, cash, margin, receivables, debts, marginRate, stockValue, paymentsTotal, ordersTotal };
}

function computeActivities({ rows = [], alimentationLogs = [], salesOrders = [], payments = [], fournisseurs = [], stocks = [] }) {
  const map = new Map();
  const ensure = (key) => {
    if (!map.has(key)) map.set(key, makeActivity(key));
    return map.get(key);
  };

  safeArray(rows).filter(hasAmount).forEach((row) => {
    const key = normalizeActivityKey(row);
    const item = ensure(key);
    if (isIn(row)) item.products += amount(row);
    if (isOut(row)) item.charges += amount(row);
    if (isIn(row) && isPaid(row)) item.paid += amount(row);
    if (isIn(row) && isPartialOrUnpaid(row)) item.receivables += amount(row);
    item.transactions += 1;
    item.sources.add('Transactions');
  });

  safeArray(salesOrders).filter((order) => status(order) !== 'annule').forEach((order) => {
    const key = normalizeActivityKey({ ...order, type: 'entree', categorie: order.categorie || order.category || order.source_type || 'vente' });
    const item = ensure(REVENUE_KEYS.includes(key) ? key : 'ventes');
    item.products += getOrderTotal(order);
    item.paid += getOrderPaid(order);
    item.receivables += getOrderRemaining(order);
    item.sources.add('Ventes');
  });

  safeArray(payments).filter(hasAmount).forEach((payment) => {
    const item = ensure('ventes');
    item.paid += amount(payment);
    item.sources.add('Paiements');
  });

  safeArray(alimentationLogs).forEach((log) => {
    const cost = toNumber(log.cout_total ?? log.total_cost ?? log.montant_total ?? log.montant);
    if (cost <= 0) return;
    const text = `${log.type_cible || ''} ${log.cible_id || ''} ${log.lot_id || ''} ${log.categorie || ''}`.toLowerCase();
    const key = text.includes('avicole') || text.includes('lot') || text.includes('poule') ? 'avicole_chair' : 'animaux';
    const item = ensure(key);
    item.charges += cost;
    item.sources.add('Alimentation');
  });

  const supplierDebts = safeArray(fournisseurs).reduce((sum, supplier) => sum + toNumber(supplier.dettes), 0);
  if (supplierDebts > 0) {
    const item = ensure('fournisseurs');
    item.charges += supplierDebts;
    item.sources.add('Fournisseurs');
  }

  const stockValue = safeArray(stocks).reduce((sum, item) => sum + toNumber(item.quantite ?? item.quantity) * toNumber(item.prix_unitaire ?? item.unit_price ?? item.price), 0);
  if (stockValue > 0) {
    const item = ensure('stock');
    item.stockValue = stockValue;
    item.sources.add('Stock');
  }

  return Array.from(map.values()).map((item) => {
    const margin = item.products - item.charges;
    const roi = item.charges > 0 ? (margin / item.charges) * 100 : item.products > 0 ? 100 : 0;
    const pendingCosts = item.kind === 'revenue' && item.products === 0 && item.charges > 0;
    return { ...item, margin, roi, pendingCosts, sourcesLabel: Array.from(item.sources).join(' + ') || 'Aucune donnée' };
  }).filter((item) => item.products || item.charges || item.paid || item.receivables || item.stockValue || item.transactions).sort((a, b) => b.margin - a.margin);
}

function computeRevenueCoverage(activities) {
  return REVENUE_KEYS.map((key) => {
    const item = activities.find((activity) => activity.id === key);
    return {
      key,
      label: REVENUE_ACTIVITIES[key],
      amount: item?.products || 0,
      paid: item?.paid || 0,
      receivables: item?.receivables || 0,
      active: Boolean(item?.products || item?.paid || item?.receivables),
    };
  });
}

function PriorityCard({ title, value, detail, moduleKey, danger = false, cta = 'Ouvrir le module' }) {
  return (
    <button type="button" onClick={() => openModule(moduleKey)} className={`text-left rounded-xl border p-4 hover:border-[#b6975f] transition-all ${danger ? 'bg-red-50/70 border-red-200' : 'bg-[#fffdf8] border-[#d6c3a0]'}`}>
      <p className="font-bold text-[#2f2415]">{title}</p>
      <p className="text-2xl font-black text-[#2f2415] mt-1">{value}</p>
      <p className="text-xs text-[#8a7456] mt-1">{detail}</p>
      <p className="text-xs font-semibold text-[#9a6b12] mt-3">{cta}</p>
    </button>
  );
}

function ActivityRow({ activity }) {
  let detail = '';
  let mainLabel = activity.kind === 'revenue' ? 'Marge' : 'Charge nette';
  if (activity.kind === 'cost') {
    detail = `Charges ${fmtCurrency(activity.charges)}${activity.stockValue ? ` · Valeur stock ${fmtCurrency(activity.stockValue)}` : ''} · Source ${activity.sourcesLabel}`;
  } else if (activity.pendingCosts) {
    mainLabel = 'Charges en attente';
    detail = `Charges ${fmtCurrency(activity.charges)} · Aucun produit enregistré · Source ${activity.sourcesLabel}`;
  } else {
    detail = `Produits ${fmtCurrency(activity.products)} · Encaissé ${fmtCurrency(activity.paid)} · Charges ${fmtCurrency(activity.charges)} · Créances ${fmtCurrency(activity.receivables)} · ROI ${fmtPercent(activity.roi)}`;
  }
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-[#fffdf8] border border-[#e7d9be] p-3">
      <div>
        <p className="text-sm font-black text-[#2f2415]">{activity.label}</p>
        <p className="text-xs text-[#8a7456]">{detail}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-[10px] uppercase tracking-wide text-[#8a7456]">{mainLabel}</p>
        <p className={`font-black ${activity.margin >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{fmtCurrency(activity.margin)}</p>
      </div>
    </div>
  );
}

function RevenueChip({ item }) {
  return (
    <div className={`rounded-xl border p-3 ${item.active ? 'bg-emerald-50/70 border-emerald-200' : 'bg-[#fffdf8] border-[#d6c3a0]'}`}>
      <p className="text-sm font-black text-[#2f2415]">{item.label}</p>
      <p className={`text-lg font-black mt-1 ${item.active ? 'text-emerald-600' : 'text-[#8a7456]'}`}>{fmtCurrency(item.amount)}</p>
      <p className="text-xs text-[#8a7456]">encaissé {fmtCurrency(item.paid)} · créances {fmtCurrency(item.receivables)}</p>
    </div>
  );
}

function InsightCard({ icon: Icon, title, value, detail }) {
  return (
    <div className="bg-white border border-[#d6c3a0] rounded-2xl p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#fff3d8] text-[#9a6b12] flex items-center justify-center"><Icon size={18} /></div>
        <div><p className="text-xs text-[#8a7456]">{title}</p><p className="text-xl font-black text-[#2f2415] mt-1">{value}</p><p className="text-xs text-[#7d6a4a] mt-1">{detail}</p></div>
      </div>
    </div>
  );
}

function FilterButton({ active, onClick, children }) {
  return <button type="button" onClick={onClick} className={`px-3 py-1.5 rounded-lg text-xs capitalize transition-all ${active ? 'bg-[#2f2415] text-white font-semibold' : 'bg-[#fffdf8] border border-[#d6c3a0] text-[#8a7456]'}`}>{children}</button>;
}

export default function FinancesV3({
  rows = [], loading, onCreate, onUpdate, onDelete, onRefresh,
  stocks = [], fournisseurs = [], alimentationLogs = [], businessPlans = [], salesOrders = [], payments = [],
}) {
  ensureFinanceFields();
  const [typeFilter, setTypeFilter] = useState('tous');
  const [statusFilter, setStatusFilter] = useState('tous');
  const [activityFilter, setActivityFilter] = useState('tous');
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);

  const validRows = useMemo(() => safeArray(rows).filter(hasAmount), [rows]);
  const zeroRows = useMemo(() => safeArray(rows).filter((row) => !hasAmount(row)), [rows]);
  const summary = useMemo(() => computeFinance({ rows: validRows, salesOrders, payments, fournisseurs, stocks }), [validRows, salesOrders, payments, fournisseurs, stocks]);
  const activities = useMemo(() => computeActivities({ rows: validRows, alimentationLogs, salesOrders, payments, fournisseurs, stocks }), [validRows, alimentationLogs, salesOrders, payments, fournisseurs, stocks]);
  const revenueCoverage = useMemo(() => computeRevenueCoverage(activities), [activities]);
  const activeRevenueCount = revenueCoverage.filter((item) => item.active).length;
  const pendingCostActivities = activities.filter((activity) => activity.pendingCosts);
  const deficitActivities = activities.filter((activity) => activity.kind === 'revenue' && !activity.pendingCosts && activity.products > 0 && activity.margin < 0);
  const openReceivableOrders = safeArray(salesOrders).filter((order) => status(order) !== 'annule' && getOrderRemaining(order) > 0);
  const openReceivableTransactions = validRows.filter((row) => isIn(row) && isPartialOrUnpaid(row));
  const supplierDebts = safeArray(fournisseurs).filter((supplier) => toNumber(supplier.dettes) > 0);
  const txWithoutProof = validRows.filter((row) => !row.justificatif_url && ['sortie', 'entree'].includes(String(row.type).toLowerCase()));
  const chargesToWatch = activities.filter((activity) => activity.kind === 'cost').reduce((sum, item) => sum + item.charges, 0);

  const financeFormFields = useMemo(() => {
    const bpOptions = safeArray(businessPlans).map((bp) => ({ value: bp.id, label: bp.nom || bp.id }));
    return (MODULE_FORM_FIELDS.finances || []).map((field) => field.key === 'business_plan_id' && bpOptions.length ? { ...field, type: 'select', options: [{ value: '', label: '— Aucun —' }, ...bpOptions] } : field);
  }, [businessPlans]);

  const filtered = useMemo(() => validRows.filter((row) => {
    const typeOk = typeFilter === 'tous' || String(row.type || '').toLowerCase() === typeFilter;
    const statusOk = statusFilter === 'tous' || status(row) === statusFilter;
    const activityOk = activityFilter === 'tous' || normalizeActivityKey(row) === activityFilter;
    return typeOk && statusOk && activityOk;
  }), [validRows, typeFilter, statusFilter, activityFilter]);

  const priorities = [
    summary.receivables > 0 ? { title: 'Créances clients', value: fmtCurrency(summary.receivables), detail: `${openReceivableOrders.length + openReceivableTransactions.length} élément(s) à relancer ou vérifier.`, moduleKey: 'Ventes', cta: 'Ouvrir ventes / relances', danger: true } : null,
    summary.debts > 0 ? { title: 'Dettes à suivre', value: fmtCurrency(summary.debts), detail: `${supplierDebts.length} fournisseur(s) ou sortie(s) non réglée(s).`, moduleKey: 'Fournisseurs', cta: 'Ouvrir fournisseurs', danger: true } : null,
    deficitActivities.length ? { title: 'Marge négative', value: fmtNumber(deficitActivities.length), detail: deficitActivities.map((a) => a.label).join(', '), moduleKey: 'Impact Business', cta: 'Analyser impact business', danger: true } : null,
    pendingCostActivities.length ? { title: 'Charges en attente de vente', value: fmtNumber(pendingCostActivities.length), detail: pendingCostActivities.map((a) => a.label).join(', '), moduleKey: 'Ventes', cta: 'Vérifier opportunités de vente', danger: false } : null,
    txWithoutProof.length ? { title: 'Justificatifs manquants', value: fmtNumber(txWithoutProof.length), detail: 'Transactions sans reçu/facture attaché.', moduleKey: 'Documents', cta: 'Ouvrir documents', danger: false } : null,
  ].filter(Boolean);

  const submitCreate = async (payload) => {
    try { setSaving(true); await onCreate?.({ ...payload, statut: payload.statut || 'paye' }); await onRefresh?.(); toast.success('Transaction ajoutée'); setModal(null); }
    catch (error) { toast.error(error.message || 'Erreur création transaction'); }
    finally { setSaving(false); }
  };
  const submitEdit = async (payload) => {
    if (!selected) return;
    try { setSaving(true); await onUpdate?.(selected.id, payload); await onRefresh?.(); toast.success('Transaction modifiée'); setModal(null); }
    catch (error) { toast.error(error.message || 'Erreur modification transaction'); }
    finally { setSaving(false); }
  };
  const submitDelete = async () => {
    if (!selected) return;
    try { setSaving(true); await onDelete?.(selected.id); await onRefresh?.(); toast.success('Transaction supprimée'); setModal(null); }
    catch (error) { toast.error(error.message || 'Erreur suppression transaction'); }
    finally { setSaving(false); }
  };
  const doExports = () => {
    exportToCsv({ rows: filtered, fileName: 'transactions-finances.csv' });
    exportToExcel({ rows: filtered, fileName: 'finances-horizon-farm.xlsx', sheetName: 'Transactions' });
    exportToPdf({ rows: filtered, title: 'Finances Horizon Farm', fileName: 'finances-horizon-farm.pdf' });
    toast.success('Exports finances générés');
  };

  const columns = [
    { key: 'date', label: 'Date', sortable: true },
    { key: 'libelle', label: 'Libellé', sortable: true, render: (row) => <span className="font-semibold text-[#2f2415]">{row.libelle || '-'}</span> },
    { key: 'type', label: 'Type', sortable: true, render: (row) => <span className={`inline-flex items-center gap-1 font-semibold ${isIn(row) ? 'text-emerald-600' : 'text-red-500'}`}>{isIn(row) ? <ArrowUp size={12} /> : <ArrowDown size={12} />}{isIn(row) ? 'produit' : 'charge'}</span> },
    { key: 'categorie', label: 'Catégorie', sortable: true, render: (row) => row.categorie || row.category || '-' },
    { key: 'module_lie', label: 'Activité', sortable: true, render: (row) => ACTIVITY_LABELS[normalizeActivityKey(row)] || row.module_lie || '-' },
    { key: 'montant', label: 'Montant', sortable: true, render: (row) => <span className={`font-black ${isIn(row) ? 'text-emerald-600' : 'text-red-500'}`}>{isIn(row) ? '+' : '-'}{fmtCurrency(amount(row))}</span> },
    { key: 'statut', label: 'Statut', sortable: true, render: (row) => <Badge status={row.statut || 'paye'} /> },
    { key: 'paiement', label: 'Paiement', sortable: true },
    { key: 'actions', label: 'Actions', render: (row) => <div className="flex gap-1"><ActionIconButton icon={Eye} color="sky" title="Voir" onClick={() => { setSelected(row); setModal('details'); }} /><ActionIconButton icon={Edit} color="amber" title="Modifier" onClick={() => { setSelected(row); setModal('edit'); }} /><ActionIconButton icon={Trash2} color="red" title="Supprimer" onClick={() => { setSelected(row); setModal('delete'); }} /></div> },
  ];

  return (
    <div className="space-y-6 pt-2">
      <SectionHeader title="Finances" sub="Toutes les sources d’argent de la ferme: animaux, avicole, cultures, services, transformation, subventions, financements, avec charges et cash réel." actions={<><Btn icon={RefreshCw} variant="outline" small onClick={onRefresh}>Refresh</Btn><Btn icon={Plus} small onClick={() => setModal('create')}>Ajouter produit/charge</Btn><Btn icon={Download} variant="outline" small onClick={doExports}>Exporter</Btn></>} />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4">
        <KpiCard icon={TrendingUp} label="Produits / CA" value={fmtCurrency(summary.revenue)} sub={`${activeRevenueCount} source(s) active(s)`} color="bg-emerald-500/20 text-emerald-500" />
        <KpiCard icon={CreditCard} label="Cash encaissé" value={fmtCurrency(summary.cashIn)} sub="paiements reçus" color="bg-sky-500/20 text-sky-500" />
        <KpiCard icon={TrendingDown} label="Charges engagées" value={fmtCurrency(summary.expenses)} color="bg-red-500/20 text-red-500" />
        <KpiCard icon={Wallet} label="Cash net" value={fmtCurrency(summary.cash)} color={summary.cash >= 0 ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'} />
        <KpiCard icon={Landmark} label="Créances" value={fmtCurrency(summary.receivables)} color="bg-amber-500/20 text-amber-500" />
        <KpiCard icon={BookOpen} label="Marge estimée" value={fmtCurrency(summary.margin)} sub={fmtPercent(summary.marginRate)} color={summary.margin >= 0 ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <InsightCard icon={FileText} title="Justificatifs à compléter" value={fmtNumber(txWithoutProof.length)} detail="Chaque produit/charge importante doit avoir reçu, facture ou preuve." />
        <InsightCard icon={AlertTriangle} title="Charges à suivre" value={fmtCurrency(chargesToWatch)} detail="Santé, stock, fournisseurs, équipements, alimentation et maintenance." />
        <InsightCard icon={BookOpen} title="Écritures ignorées" value={fmtNumber(zeroRows.length)} detail="Les lignes à 0 FCFA sont masquées pour éviter de fausser l’analyse." />
      </div>

      <div className="bg-white border border-[#d6c3a0] rounded-2xl p-5">
        <h3 className="font-black text-[#2f2415] mb-2">Sources de revenus agricoles couvertes</h3>
        <p className="text-sm text-[#8a7456] mb-4">Cette section vérifie que l’argent peut venir de toutes les activités productives, pas seulement du module Ventes global.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {revenueCoverage.map((item) => <RevenueChip key={item.key} item={item} />)}
        </div>
      </div>

      <div className="bg-white border border-[#d6c3a0] rounded-2xl p-5">
        <div className="flex items-center justify-between gap-3 mb-4"><div><h3 className="font-black text-[#2f2415]">Priorités financières</h3><p className="text-sm text-[#8a7456]">Les liens apparaissent uniquement lorsqu’une action est utile.</p></div><Btn variant="outline" small onClick={() => openModule('Comptabilité')}>Préparer comptabilité</Btn></div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {priorities.length ? priorities.map((item) => <PriorityCard key={item.title} {...item} />) : <div className="md:col-span-2 xl:col-span-3 bg-[#fffdf8] border border-[#d6c3a0] rounded-xl p-4 text-sm text-[#8a7456]">Aucune priorité financière critique détectée.</div>}
        </div>
      </div>

      <div className="bg-white border border-[#d6c3a0] rounded-2xl p-5"><h3 className="font-black text-[#2f2415] mb-4">Économie par activité</h3><div className="space-y-2">{activities.length ? activities.map((activity) => <ActivityRow key={activity.id} activity={activity} />) : <p className="text-sm text-[#8a7456]">Aucune activité financière détectée pour l’instant.</p>}</div></div>

      <div className="flex flex-wrap gap-2">
        {['tous', 'entree', 'sortie'].map((filter) => <FilterButton key={filter} active={typeFilter === filter} onClick={() => setTypeFilter(filter)}>{filter === 'entree' ? 'Produits' : filter === 'sortie' ? 'Charges' : 'Toutes'}</FilterButton>)}
        {['tous', 'paye', 'partiel', 'impaye', 'annule'].map((filter) => <FilterButton key={filter} active={statusFilter === filter} onClick={() => setStatusFilter(filter)}>{filter}</FilterButton>)}
        {['tous', ...activities.map((activity) => activity.id)].map((filter) => <FilterButton key={filter} active={activityFilter === filter} onClick={() => setActivityFilter(filter)}>{filter === 'tous' ? 'Toutes activités' : ACTIVITY_LABELS[filter] || filter}</FilterButton>)}
      </div>

      <DataTable title="Transactions financières" rows={filtered} columns={columns} loading={loading} initialSortKey="date" searchPlaceholder="Rechercher transaction, catégorie, activité..." />

      <DetailsModal open={modal === 'details'} onClose={() => setModal(null)} data={selected} title="Détail transaction" />
      <CreateModal open={modal === 'create'} onClose={() => setModal(null)} onSubmit={submitCreate} fields={financeFormFields} initialValues={{ id: generateSequentialId('finances', rows), type: 'entree', date: today(), statut: 'paye', paiement: 'Wave' }} autoId={() => generateSequentialId('finances', rows)} uploadFolder="finances" loading={saving} title="Ajouter produit / charge" submitLabel="Ajouter" />
      <EditModal open={modal === 'edit'} onClose={() => setModal(null)} onSubmit={submitEdit} fields={financeFormFields} initialValues={selected || {}} uploadFolder="finances" loading={saving} title="Modifier transaction" submitLabel="Enregistrer" />
      <DeleteModal open={modal === 'delete'} onClose={() => setModal(null)} onConfirm={submitDelete} itemLabel={selected ? `${selected.libelle}` : ''} loading={saving} />
    </div>
  );
}
