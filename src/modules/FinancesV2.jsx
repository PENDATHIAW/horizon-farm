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
import { fmtCurrency, fmtPercent, toNumber } from '../utils/format';
import { generateSequentialId } from '../utils/ids';

const safeArray = (value) => Array.isArray(value) ? value : [];
const amount = (row = {}) => toNumber(row.montant ?? row.amount ?? row.total ?? row.montant_total ?? 0);
const status = (row = {}) => String(row.statut ?? row.status ?? row.statut_paiement ?? 'paye').toLowerCase();
const isPaid = (row = {}) => !['impaye', 'annule'].includes(status(row));
const isPartialOrUnpaid = (row = {}) => ['impaye', 'partiel', 'en_retard'].includes(status(row));
const isIn = (row = {}) => String(row.type || '').toLowerCase() === 'entree';
const isOut = (row = {}) => String(row.type || '').toLowerCase() === 'sortie';
const today = () => new Date().toISOString().slice(0, 10);

const ACTIVITY_LABELS = {
  animaux: 'Animaux',
  avicole: 'Avicole',
  cultures: 'Cultures',
  stock: 'Stock',
  stocks: 'Stock',
  sante: 'Santé',
  ventes: 'Ventes',
  fournisseurs: 'Fournisseurs',
  investissements: 'Investissements',
  equipements: 'Équipements',
  autre: 'Autre',
};

const normalizeActivityKey = (row = {}) => {
  const raw = String(row.module_lie || row.module_source || row.categorie || row.category || 'autre').toLowerCase();
  if (raw.includes('avicole') || raw.includes('oeuf') || raw.includes('poulet')) return 'avicole';
  if (raw.includes('animal') || raw.includes('bovin') || raw.includes('ovin') || raw.includes('caprin')) return 'animaux';
  if (raw.includes('culture') || raw.includes('maraich')) return 'cultures';
  if (raw.includes('stock') || raw.includes('aliment')) return 'stock';
  if (raw.includes('sante') || raw.includes('santé') || raw.includes('vaccin') || raw.includes('veto')) return 'sante';
  if (raw.includes('vente') || raw.includes('client')) return 'ventes';
  if (raw.includes('fournisseur')) return 'fournisseurs';
  if (raw.includes('invest')) return 'investissements';
  if (raw.includes('equip')) return 'equipements';
  return raw || 'autre';
};

function openModule(moduleKey) {
  if (!moduleKey || typeof document === 'undefined') return;
  const navButtons = Array.from(document.querySelectorAll('nav button'));
  navButtons.find((button) => button.textContent?.toLowerCase().includes(moduleKey.toLowerCase()))?.click();
}

function computeFinance({ rows, salesOrders, payments, fournisseurs, stocks }) {
  const tx = safeArray(rows);
  const orders = safeArray(salesOrders);
  const pay = safeArray(payments);
  const suppliers = safeArray(fournisseurs);
  const stockRows = safeArray(stocks);

  const txIncomePaid = tx.filter((row) => isIn(row) && isPaid(row)).reduce((sum, row) => sum + amount(row), 0);
  const txExpensesPaid = tx.filter((row) => isOut(row) && isPaid(row)).reduce((sum, row) => sum + amount(row), 0);
  const txExpensesCommitted = tx.filter(isOut).reduce((sum, row) => sum + amount(row), 0);
  const paymentsTotal = pay.reduce((sum, row) => sum + amount(row), 0);
  const ordersTotal = orders.filter((order) => status(order) !== 'annule').reduce((sum, order) => sum + amount(order), 0);
  const ordersPaid = orders.reduce((sum, order) => sum + toNumber(order.montant_paye), 0);
  const receivablesFromOrders = orders.filter((order) => status(order) !== 'annule' && toNumber(order.reste_a_payer) > 0).reduce((sum, order) => sum + toNumber(order.reste_a_payer), 0);
  const receivablesFromTx = tx.filter((row) => isIn(row) && isPartialOrUnpaid(row)).reduce((sum, row) => sum + amount(row), 0);
  const debtsFromTx = tx.filter((row) => isOut(row) && isPartialOrUnpaid(row)).reduce((sum, row) => sum + amount(row), 0);
  const debtsFromSuppliers = suppliers.reduce((sum, supplier) => sum + toNumber(supplier.dettes), 0);
  const stockValue = stockRows.reduce((sum, item) => sum + toNumber(item.quantite ?? item.quantity) * toNumber(item.prix_unitaire ?? item.unit_price ?? item.price), 0);

  const cashIn = Math.max(txIncomePaid, paymentsTotal, ordersPaid);
  const revenue = Math.max(ordersTotal, txIncomePaid + receivablesFromTx, cashIn + receivablesFromOrders);
  const expenses = txExpensesCommitted;
  const cash = cashIn - txExpensesPaid;
  const margin = revenue - expenses;
  const receivables = receivablesFromOrders + receivablesFromTx;
  const debts = debtsFromTx + debtsFromSuppliers;
  const marginRate = revenue > 0 ? (margin / revenue) * 100 : 0;

  return { cashIn, revenue, expenses, cash, margin, receivables, debts, marginRate, stockValue, txExpensesPaid, ordersTotal, paymentsTotal };
}

function computeActivities(rows = [], alimentationLogs = []) {
  const map = new Map();
  const ensure = (key) => {
    if (!map.has(key)) map.set(key, { id: key, label: ACTIVITY_LABELS[key] || key, recettes: 0, depenses: 0, transactions: 0 });
    return map.get(key);
  };

  safeArray(rows).forEach((row) => {
    const key = normalizeActivityKey(row);
    const item = ensure(key);
    if (isIn(row)) item.recettes += amount(row);
    if (isOut(row)) item.depenses += amount(row);
    item.transactions += 1;
  });

  safeArray(alimentationLogs).forEach((log) => {
    const key = String(log.lot_id || log.lotId || '').toLowerCase().includes('avi') ? 'avicole' : 'animaux';
    const item = ensure(key);
    item.depenses += toNumber(log.cout_total ?? log.total_cost ?? log.montant);
  });

  return Array.from(map.values()).map((item) => {
    const marge = item.recettes - item.depenses;
    const roi = item.depenses > 0 ? (marge / item.depenses) * 100 : item.recettes > 0 ? 100 : 0;
    return { ...item, marge, roi };
  }).sort((a, b) => b.marge - a.marge);
}

function PriorityCard({ title, value, detail, moduleKey, danger = false }) {
  return (
    <button type="button" onClick={() => openModule(moduleKey)} className={`text-left rounded-xl border p-4 hover:border-[#b6975f] transition-all ${danger ? 'bg-red-50/70 border-red-200' : 'bg-[#fffdf8] border-[#d6c3a0]'}`}>
      <p className="font-bold text-[#2f2415]">{title}</p>
      <p className="text-2xl font-black text-[#2f2415] mt-1">{value}</p>
      <p className="text-xs text-[#8a7456] mt-1">{detail}</p>
      <p className="text-xs font-semibold text-[#9a6b12] mt-3">Ouvrir le module</p>
    </button>
  );
}

function ActivityRow({ activity }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-[#fffdf8] border border-[#e7d9be] p-3">
      <div>
        <p className="text-sm font-black text-[#2f2415]">{activity.label}</p>
        <p className="text-xs text-[#8a7456]">Recettes {fmtCurrency(activity.recettes)} · Dépenses {fmtCurrency(activity.depenses)} · ROI {fmtPercent(activity.roi)}</p>
      </div>
      <p className={`font-black ${activity.marge >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{fmtCurrency(activity.marge)}</p>
    </div>
  );
}

export default function FinancesV2({
  rows = [],
  loading,
  onCreate,
  onUpdate,
  onDelete,
  onRefresh,
  stocks = [],
  fournisseurs = [],
  alimentationLogs = [],
  businessPlans = [],
  salesOrders = [],
  payments = [],
}) {
  const [typeFilter, setTypeFilter] = useState('tous');
  const [statusFilter, setStatusFilter] = useState('tous');
  const [activityFilter, setActivityFilter] = useState('tous');
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);

  const summary = useMemo(() => computeFinance({ rows, salesOrders, payments, fournisseurs, stocks }), [rows, salesOrders, payments, fournisseurs, stocks]);
  const activities = useMemo(() => computeActivities(rows, alimentationLogs), [rows, alimentationLogs]);
  const deficitActivities = activities.filter((activity) => activity.marge < 0);
  const openReceivables = safeArray(salesOrders).filter((order) => status(order) !== 'annule' && toNumber(order.reste_a_payer) > 0);
  const supplierDebts = safeArray(fournisseurs).filter((supplier) => toNumber(supplier.dettes) > 0);
  const txWithoutProof = safeArray(rows).filter((row) => amount(row) > 0 && !row.justificatif_url && ['sortie', 'entree'].includes(String(row.type).toLowerCase()));

  const financeFormFields = useMemo(() => {
    const bpOptions = safeArray(businessPlans).map((bp) => ({ value: bp.id, label: bp.nom || bp.id }));
    return (MODULE_FORM_FIELDS.finances || []).map((field) => field.key === 'business_plan_id' && bpOptions.length ? { ...field, type: 'select', options: [{ value: '', label: '— Aucun —' }, ...bpOptions] } : field);
  }, [businessPlans]);

  const filtered = useMemo(() => safeArray(rows).filter((row) => {
    const typeOk = typeFilter === 'tous' || String(row.type || '').toLowerCase() === typeFilter;
    const statusOk = statusFilter === 'tous' || status(row) === statusFilter;
    const activityOk = activityFilter === 'tous' || normalizeActivityKey(row) === activityFilter;
    return typeOk && statusOk && activityOk;
  }), [rows, typeFilter, statusFilter, activityFilter]);

  const priorities = [
    summary.receivables > 0 ? { title: 'Créances clients', value: fmtCurrency(summary.receivables), detail: `${openReceivables.length} vente(s)/paiement(s) à relancer.`, moduleKey: 'Ventes', danger: true } : null,
    summary.debts > 0 ? { title: 'Dettes à suivre', value: fmtCurrency(summary.debts), detail: `${supplierDebts.length} fournisseur(s) ou sortie(s) non réglée(s).`, moduleKey: 'Fournisseurs', danger: true } : null,
    deficitActivities.length ? { title: 'Activités déficitaires', value: deficitActivities.length, detail: deficitActivities.map((a) => a.label).join(', '), moduleKey: 'Impact Business', danger: true } : null,
    txWithoutProof.length ? { title: 'Justificatifs manquants', value: txWithoutProof.length, detail: 'Transactions sans reçu/facture attaché.', moduleKey: 'Documents', danger: false } : null,
    summary.margin < 0 ? { title: 'Marge négative', value: fmtCurrency(summary.margin), detail: 'Vérifier prix, coûts et ventes réelles.', moduleKey: 'Impact Business', danger: true } : null,
  ].filter(Boolean);

  const submitCreate = async (payload) => {
    try {
      setSaving(true);
      await onCreate?.({ ...payload, statut: payload.statut || 'paye' });
      await onRefresh?.();
      toast.success('Transaction ajoutée');
      setModal(null);
    } catch (error) {
      toast.error(error.message || 'Erreur création transaction');
    } finally {
      setSaving(false);
    }
  };

  const submitEdit = async (payload) => {
    if (!selected) return;
    try {
      setSaving(true);
      await onUpdate?.(selected.id, payload);
      await onRefresh?.();
      toast.success('Transaction modifiée');
      setModal(null);
    } catch (error) {
      toast.error(error.message || 'Erreur modification transaction');
    } finally {
      setSaving(false);
    }
  };

  const submitDelete = async () => {
    if (!selected) return;
    try {
      setSaving(true);
      await onDelete?.(selected.id);
      await onRefresh?.();
      toast.success('Transaction supprimée');
      setModal(null);
    } catch (error) {
      toast.error(error.message || 'Erreur suppression transaction');
    } finally {
      setSaving(false);
    }
  };

  const doExports = () => {
    exportToCsv({ rows: filtered, fileName: 'transactions-finances.csv' });
    exportToExcel({ rows: filtered, fileName: 'finances-horizon-farm.xlsx', sheetName: 'Transactions' });
    exportToPdf({ rows: filtered, title: 'Finances Horizon Farm', fileName: 'finances-horizon-farm.pdf' });
    toast.success('Exports finances générés');
  };

  const columns = [
    { key: 'date', label: 'Date', sortable: true },
    { key: 'libelle', label: 'Libellé', sortable: true, render: (row) => <span className="font-semibold text-[#2f2415]">{row.libelle}</span> },
    { key: 'type', label: 'Type', sortable: true, render: (row) => <span className={`inline-flex items-center gap-1 font-semibold ${isIn(row) ? 'text-emerald-600' : 'text-red-500'}`}>{isIn(row) ? <ArrowUp size={12} /> : <ArrowDown size={12} />}{row.type}</span> },
    { key: 'categorie', label: 'Catégorie', sortable: true },
    { key: 'module_lie', label: 'Module', sortable: true, render: (row) => ACTIVITY_LABELS[normalizeActivityKey(row)] || row.module_lie || '-' },
    { key: 'montant', label: 'Montant', sortable: true, render: (row) => <span className={`font-black ${isIn(row) ? 'text-emerald-600' : 'text-red-500'}`}>{isIn(row) ? '+' : '-'}{fmtCurrency(amount(row))}</span> },
    { key: 'statut', label: 'Statut', sortable: true, render: (row) => <Badge status={row.statut || 'paye'} /> },
    { key: 'paiement', label: 'Paiement', sortable: true },
    { key: 'actions', label: 'Actions', render: (row) => <div className="flex gap-1"><ActionIconButton icon={Eye} color="sky" title="Voir" onClick={() => { setSelected(row); setModal('details'); }} /><ActionIconButton icon={Edit} color="amber" title="Modifier" onClick={() => { setSelected(row); setModal('edit'); }} /><ActionIconButton icon={Trash2} color="red" title="Supprimer" onClick={() => { setSelected(row); setModal('delete'); }} /></div> },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Finances"
        sub="Cash réel, chiffre d’affaires, créances, dettes, dépenses par activité et données propres pour Impact Business."
        actions={<><Btn icon={RefreshCw} variant="outline" small onClick={onRefresh}>Refresh</Btn><Btn icon={Plus} small onClick={() => setModal('create')}>Ajouter recette/dépense</Btn><Btn icon={Download} variant="outline" small onClick={doExports}>Exporter</Btn></>}
      />

      <div className="grid grid-cols-2 xl:grid-cols-6 gap-4">
        <KpiCard icon={TrendingUp} label="CA facturé" value={fmtCurrency(summary.revenue)} sub="ventes + recettes" color="bg-emerald-500/20 text-emerald-500" />
        <KpiCard icon={CreditCard} label="Cash encaissé" value={fmtCurrency(summary.cashIn)} sub="paiements réels" color="bg-sky-500/20 text-sky-500" />
        <KpiCard icon={TrendingDown} label="Dépenses engagées" value={fmtCurrency(summary.expenses)} color="bg-red-500/20 text-red-500" />
        <KpiCard icon={Wallet} label="Cash net" value={fmtCurrency(summary.cash)} color={summary.cash >= 0 ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'} />
        <KpiCard icon={Landmark} label="Créances" value={fmtCurrency(summary.receivables)} color="bg-amber-500/20 text-amber-500" />
        <KpiCard icon={BookOpen} label="Marge" value={fmtCurrency(summary.margin)} sub={fmtPercent(summary.marginRate)} color={summary.margin >= 0 ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'} />
      </div>

      <div className="bg-white border border-[#d6c3a0] rounded-2xl p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="font-black text-[#2f2415]">Priorités financières</h3>
            <p className="text-sm text-[#8a7456]">Uniquement les actions utiles : relance, dette, déficit, justificatif ou impact business.</p>
          </div>
          <Btn variant="outline" small onClick={() => openModule('Comptabilité')}>Comptabilité</Btn>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {priorities.length ? priorities.map((item) => <PriorityCard key={item.title} {...item} />) : <div className="md:col-span-2 xl:col-span-3 bg-[#fffdf8] border border-[#d6c3a0] rounded-xl p-4 text-sm text-[#8a7456]">Aucune priorité financière critique détectée.</div>}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 bg-white border border-[#d6c3a0] rounded-2xl p-5">
          <h3 className="font-black text-[#2f2415] mb-4">Rentabilité par activité</h3>
          <div className="space-y-2">
            {activities.length ? activities.map((activity) => <ActivityRow key={activity.id} activity={activity} />) : <p className="text-sm text-[#8a7456]">Aucune activité financière détectée pour l’instant.</p>}
          </div>
        </div>
        <div className="bg-white border border-[#d6c3a0] rounded-2xl p-5">
          <h3 className="font-black text-[#2f2415] mb-4">Connexions finances</h3>
          <div className="space-y-2 text-sm text-[#7d6a4a]">
            <button className="w-full text-left rounded-xl border border-[#d6c3a0] bg-[#fffdf8] p-3 hover:border-[#b6975f]" onClick={() => openModule('Ventes')}>Ventes → CA, paiements, créances</button>
            <button className="w-full text-left rounded-xl border border-[#d6c3a0] bg-[#fffdf8] p-3 hover:border-[#b6975f]" onClick={() => openModule('Stock')}>Stock → achats, valeur stock, alimentation</button>
            <button className="w-full text-left rounded-xl border border-[#d6c3a0] bg-[#fffdf8] p-3 hover:border-[#b6975f]" onClick={() => openModule('Santé')}>Santé → frais vétérinaires</button>
            <button className="w-full text-left rounded-xl border border-[#d6c3a0] bg-[#fffdf8] p-3 hover:border-[#b6975f]" onClick={() => openModule('Impact Business')}>Impact Business → valeur créée</button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {['tous', 'entree', 'sortie'].map((filter) => <FilterButton key={filter} active={typeFilter === filter} onClick={() => setTypeFilter(filter)}>{filter === 'entree' ? 'Recettes' : filter === 'sortie' ? 'Dépenses' : 'Toutes'}</FilterButton>)}
        {['tous', 'paye', 'partiel', 'impaye', 'annule'].map((filter) => <FilterButton key={filter} active={statusFilter === filter} onClick={() => setStatusFilter(filter)}>{filter}</FilterButton>)}
        {['tous', ...activities.map((activity) => activity.id)].map((filter) => <FilterButton key={filter} active={activityFilter === filter} onClick={() => setActivityFilter(filter)}>{filter === 'tous' ? 'Toutes activités' : ACTIVITY_LABELS[filter] || filter}</FilterButton>)}
      </div>

      <DataTable title="Transactions financières" rows={filtered} columns={columns} loading={loading} initialSortKey="date" searchPlaceholder="Rechercher transaction, catégorie, module..." />

      <DetailsModal open={modal === 'details'} onClose={() => setModal(null)} data={selected} title="Détail transaction" />
      <CreateModal open={modal === 'create'} onClose={() => setModal(null)} onSubmit={submitCreate} fields={financeFormFields} initialValues={{ id: generateSequentialId('finances', rows), type: 'entree', date: today(), statut: 'paye', paiement: 'Wave' }} autoId={() => generateSequentialId('finances', rows)} uploadFolder="finances" loading={saving} title="Ajouter recette / dépense" submitLabel="Ajouter" />
      <EditModal open={modal === 'edit'} onClose={() => setModal(null)} onSubmit={submitEdit} fields={financeFormFields} initialValues={selected || {}} uploadFolder="finances" loading={saving} title="Modifier transaction" submitLabel="Enregistrer" />
      <DeleteModal open={modal === 'delete'} onClose={() => setModal(null)} onConfirm={submitDelete} itemLabel={selected ? `${selected.libelle}` : ''} loading={saving} />
    </div>
  );
}

function FilterButton({ active, onClick, children }) {
  return <button type="button" onClick={onClick} className={`px-3 py-1.5 rounded-lg text-xs capitalize transition-all ${active ? 'bg-[#2f2415] text-white font-semibold' : 'bg-[#fffdf8] border border-[#d6c3a0] text-[#8a7456]'}`}>{children}</button>;
}
