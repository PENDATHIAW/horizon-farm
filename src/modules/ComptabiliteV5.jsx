import { AlertTriangle, Archive, Beef, Bird, BookOpen, CheckCircle, CreditCard, Download, FileText, Landmark, Package, Plus, RefreshCw, Sprout, Syringe, TrendingUp, Truck, Wallet, Wrench } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Btn from '../components/Btn';
import KpiCard from '../components/KpiCard';
import SectionHeader from '../components/SectionHeader';
import CreateModal from '../modals/CreateModal';
import { comptabiliteService } from '../services/comptabiliteService';
import { buildFinanceAlerts, computeAccountingReports } from '../utils/accounting';
import { exportToCsv, exportToExcel, exportToPdf } from '../utils/export';
import { fmtCurrency, fmtNumber, toNumber } from '../utils/format';

const TABS = ['Synthèse', 'À valider', 'Contrôles', 'Rapports', 'Archives'];
const moneyFields = ['montant', 'debit', 'credit', 'solde', 'budget_amount', 'actual_amount', 'ecart'];
const safeArray = (value) => Array.isArray(value) ? value : [];
const amount = (row = {}) => toNumber(row.montant ?? row.amount ?? row.total ?? row.montant_total ?? row.total_amount ?? row.prix_total ?? 0);
const hasAmount = (row = {}) => Math.abs(amount(row)) > 0;
const status = (row = {}) => String(row.statut ?? row.status ?? row.statut_paiement ?? 'paye').toLowerCase();
const isIn = (row = {}) => String(row.type || '').toLowerCase() === 'entree';
const isOut = (row = {}) => String(row.type || '').toLowerCase() === 'sortie';
const isPaid = (row = {}) => !['impaye', 'annule'].includes(status(row));
const isUnpaid = (row = {}) => ['impaye', 'partiel', 'en_retard'].includes(status(row));
const isBalanced = (entry = {}) => toNumber(entry.total_debit) === toNumber(entry.total_credit);
const monthKey = () => new Date().toISOString().slice(0, 7);

const budgetFields = [
  { key: 'id', label: 'ID', type: 'text', required: true },
  { key: 'period', label: 'Période', type: 'text', required: true },
  { key: 'category', label: 'Activité / charge', type: 'select', options: ['Alimentation', 'Santé', 'Cultures', 'Avicole', 'Animaux', 'Stock', 'Salaires', 'Transport', 'Investissements', 'Autre'], required: true },
  { key: 'budget_amount', label: 'Budget prévu', type: 'number' },
  { key: 'actual_amount', label: 'Réel actuel', type: 'number' },
  { key: 'status', label: 'Statut', type: 'select', options: ['ouvert', 'depasse', 'clos'] },
  { key: 'notes', label: 'Notes', type: 'text' },
];
const closureFields = [
  { key: 'id', label: 'ID', type: 'text', required: true },
  { key: 'period', label: 'Période', type: 'text', required: true },
  { key: 'closure_type', label: 'Type clôture', type: 'select', options: ['mensuelle', 'annuelle'] },
  { key: 'status', label: 'Statut', type: 'select', options: ['brouillon', 'cloture', 'archive'] },
];
const documentFields = [
  { key: 'id', label: 'ID', type: 'text', required: true },
  { key: 'transaction_id', label: 'Transaction liée', type: 'text' },
  { key: 'entry_id', label: 'Écriture liée', type: 'text' },
  { key: 'label', label: 'Libellé document', type: 'text', required: true },
  { key: 'document_type', label: 'Type document', type: 'select', options: ['facture', 'recu', 'photo', 'autre'] },
  { key: 'file_url', label: 'Fichier / image', type: 'image' },
];

function orderTotal(order = {}) { return amount(order) || toNumber(order.montant_total) || toNumber(order.total_ttc) || toNumber(order.total_ht); }
function orderPaid(order = {}) { return toNumber(order.montant_paye ?? order.paid_amount ?? order.amount_paid); }
function orderRemaining(order = {}) {
  const explicit = toNumber(order.reste_a_payer ?? order.remaining_amount, NaN);
  return Number.isFinite(explicit) ? Math.max(0, explicit) : Math.max(0, orderTotal(order) - orderPaid(order));
}
function financeSnapshot(transactions = [], salesOrders = [], payments = [], fournisseurs = []) {
  const tx = safeArray(transactions).filter(hasAmount);
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
  const expenses = tx.filter(isOut).reduce((sum, row) => sum + amount(row), 0);
  const paidExpenses = tx.filter((row) => isOut(row) && isPaid(row)).reduce((sum, row) => sum + amount(row), 0);
  const supplierDebts = safeArray(fournisseurs).reduce((sum, row) => sum + toNumber(row.dettes), 0);
  const debts = tx.filter((row) => isOut(row) && isUnpaid(row)).reduce((sum, row) => sum + amount(row), 0) + supplierDebts;
  return { tx, revenue, cashIn, expenses, paidExpenses, cashNet: cashIn - paidExpenses, receivables, debts, margin: revenue - expenses };
}
function hasText(row = {}, words = []) {
  const text = `${row.module_lie || ''} ${row.categorie || ''} ${row.category || ''} ${row.libelle || ''}`.toLowerCase();
  return words.some((word) => text.includes(word));
}
function navigate(onNavigate, moduleId) { if (typeof onNavigate === 'function') onNavigate(moduleId); }
function statusClass(value) {
  if (value === 'valide') return 'bg-positive-bg text-positive border-positive';
  if (value === 'annule') return 'bg-urgent-bg text-urgent border-urgent';
  return 'bg-vigilance-bg text-horizon-dark border-vigilance';
}
function StatusBadge({ value }) { return <span className={`text-xs px-2 py-1 rounded-full border ${statusClass(value)}`}>{value || 'brouillon'}</span>; }
function ActionCard({ icon: Icon, title, value, detail, action, danger }) {
  return <button type="button" onClick={action} className={`text-left rounded-xl border p-4 transition-all hover:border-horizon ${danger ? 'bg-urgent-bg border-urgent' : 'bg-card border-line'}`}><div className="flex gap-3"><div className="w-9 h-9 rounded-xl bg-vigilance-bg text-horizon-dark flex items-center justify-center shrink-0"><Icon size={17} /></div><div><p className="font-semibold text-earth">{title}</p><p className="text-lg font-semibold text-earth mt-1">{value}</p><p className="text-xs text-slate mt-1">{detail}</p></div></div></button>;
}
function LinkCard({ icon: Icon, title, value, detail, moduleId, onNavigate, active }) {
  return <button type="button" onClick={() => navigate(onNavigate, moduleId)} className={`text-left rounded-xl border p-4 transition-all hover:border-horizon ${active ? 'bg-vigilance-bg border-vigilance' : 'bg-card border-line'}`}><div className="flex gap-3"><div className="w-9 h-9 rounded-xl bg-vigilance-bg text-horizon-dark flex items-center justify-center shrink-0"><Icon size={17} /></div><div><p className="font-semibold text-earth">{title}</p><p className="text-lg font-semibold text-earth mt-1">{value}</p><p className="text-xs text-slate mt-1">{detail}</p><p className="text-xs font-semibold text-horizon-dark mt-2">Ouvrir</p></div></div></button>;
}
function EntryCard({ entry, onValidate, saving }) {
  return <div className="rounded-2xl border border-line bg-white p-4"><div className="flex flex-col md:flex-row md:items-center gap-3"><div className="flex-1"><div className="flex items-center gap-2 flex-wrap"><p className="font-semibold text-earth">{entry.label || entry.reference || entry.id}</p><StatusBadge value={entry.status} /></div><p className="text-xs text-slate mt-1">{entry.entry_date} · journal {entry.journal || '-'} · réf {entry.reference || '-'}</p><p className="text-xs text-slate mt-1">Débit {fmtCurrency(entry.total_debit)} · Crédit {fmtCurrency(entry.total_credit)} {isBalanced(entry) ? '· équilibrée' : '· à corriger'}</p></div><div className="flex items-center gap-2"><p className="font-semibold text-earth">{fmtCurrency(entry.total_debit)}</p>{entry.status === 'brouillon' ? <Btn small icon={CheckCircle} onClick={() => onValidate(entry.id)} disabled={saving}>Valider</Btn> : null}</div></div></div>;
}
function SimpleTable({ title, rows = [], columns = [] }) {
  return <div className="bg-white border border-line rounded-2xl overflow-hidden"><div className="px-6 py-4 border-b border-line"><p className="font-semibold text-earth">{title}</p></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-card border-b border-line">{columns.map((column) => <th key={column} className="text-left text-xs text-slate uppercase px-4 py-3">{column}</th>)}</tr></thead><tbody>{rows.length ? rows.map((row, index) => <tr key={row.id || `${title}-${index}`} className="border-b border-line/70 hover:bg-card">{columns.map((column) => <td key={column} className="px-4 py-3 text-earth">{moneyFields.includes(column) ? fmtCurrency(row[column]) : String(row[column] ?? '-')}</td>)}</tr>) : <tr><td colSpan={columns.length} className="px-4 py-8 text-center text-slate">Aucune donnée pour le moment.</td></tr>}</tbody></table></div></div>;
}
function ReportCard({ title, rows = [] }) {
  return <div className="bg-white border border-line rounded-2xl p-6"><p className="font-semibold text-earth mb-4">{title}</p><div className="space-y-2">{rows.map(([label, value]) => <div key={label} className="flex items-center justify-between rounded-xl bg-card border border-line px-3 py-2"><span className="text-sm text-slate">{label}</span><span className="font-semibold text-earth">{fmtCurrency(value)}</span></div>)}</div></div>;
}
function ConnectionPanel({ snapshot, transactions, clients, fournisseurs, stocks, animaux, lots, cultures, sante, investissements, equipements, onNavigate }) {
  const stockValue = safeArray(stocks).reduce((sum, item) => sum + toNumber(item.quantite ?? item.quantity) * toNumber(item.prix_unitaire ?? item.unit_price ?? item.price), 0);
  const healthCosts = snapshot.tx.filter((row) => isOut(row) && hasText(row, ['sante', 'santé', 'vaccin', 'veto', 'vétérinaire'])).reduce((sum, row) => sum + amount(row), 0);
  const animalFlows = snapshot.tx.filter((row) => hasText(row, ['animal', 'bovin', 'ovin', 'caprin'])).reduce((sum, row) => sum + amount(row), 0);
  const avicoleFlows = snapshot.tx.filter((row) => hasText(row, ['avicole', 'oeuf', 'œuf', 'poulet', 'pondeuse'])).reduce((sum, row) => sum + amount(row), 0);
  const cultureFlows = snapshot.tx.filter((row) => hasText(row, ['culture', 'recolte', 'récolte', 'engrais', 'semence'])).reduce((sum, row) => sum + amount(row), 0);
  const investmentFlows = snapshot.tx.filter((row) => hasText(row, ['invest', 'equip', 'équip', 'construction', 'terrain'])).reduce((sum, row) => sum + amount(row), 0);
  const missingProof = safeArray(transactions).filter((row) => hasAmount(row) && !row.justificatif_url).length;
  const cards = [
    { icon: Landmark, title: 'Finances', value: fmtCurrency(snapshot.revenue), detail: 'Même base que Produits / CA dans Finances.', moduleId: 'finances', active: snapshot.revenue > 0 },
    { icon: CreditCard, title: 'Ventes / Clients', value: fmtCurrency(snapshot.receivables), detail: `${safeArray(clients).length} client(s), créances à justifier ou relancer.`, moduleId: 'ventes', active: snapshot.receivables > 0 },
    { icon: Truck, title: 'Fournisseurs', value: fmtCurrency(snapshot.debts), detail: `${safeArray(fournisseurs).length} fournisseur(s), dettes et achats.`, moduleId: 'fournisseurs', active: snapshot.debts > 0 },
    { icon: FileText, title: 'Documents', value: fmtNumber(missingProof), detail: 'Justificatifs nécessaires avant clôture.', moduleId: 'documents', active: missingProof > 0 },
    { icon: Package, title: 'Stock', value: fmtCurrency(stockValue), detail: 'Valeur stock, achats, alimentation et consommables.', moduleId: 'stock', active: stockValue > 0 },
    { icon: Syringe, title: 'Santé', value: fmtCurrency(healthCosts), detail: `${safeArray(sante).length} soin(s)/vaccin(s) liés aux charges.`, moduleId: 'sante', active: healthCosts > 0 },
    { icon: Beef, title: 'Animaux', value: fmtCurrency(animalFlows), detail: `${safeArray(animaux).length} animal(aux), produits et charges.`, moduleId: 'animaux', active: animalFlows > 0 },
    { icon: Bird, title: 'Avicole', value: fmtCurrency(avicoleFlows), detail: `${safeArray(lots).length} lot(s), œufs, chair, charges.`, moduleId: 'avicole', active: avicoleFlows > 0 },
    { icon: Sprout, title: 'Cultures', value: fmtCurrency(cultureFlows), detail: `${safeArray(cultures).length} culture(s), intrants et ventes.`, moduleId: 'cultures', active: cultureFlows > 0 },
    { icon: TrendingUp, title: 'Investissements', value: fmtCurrency(investmentFlows), detail: `${safeArray(investissements).length} projet(s), immobilisations et ROI.`, moduleId: 'investissements', active: investmentFlows > 0 },
    { icon: Wrench, title: 'Équipements', value: fmtNumber(safeArray(equipements).length), detail: 'Achats, maintenance et immobilisations.', moduleId: 'equipements', active: safeArray(equipements).length > 0 },
  ];
  return <div className="bg-white border border-line rounded-2xl p-6"><div className="mb-4"><h3 className="font-semibold text-earth">Connexions comptables</h3><p className="text-sm text-slate">La comptabilité contrôle les flux venus des modules métier. Les montants partagés sont alignés sur Finances.</p></div><div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">{cards.map((card) => <LinkCard key={card.title} {...card} onNavigate={onNavigate} />)}</div></div>;
}

export default function ComptabiliteV5({ transactions = [], finances = [], salesOrders = [], payments = [], clients = [], fournisseurs = [], stocks = [], animaux = [], lots = [], cultures = [], sante = [], investissements = [], equipements = [], onRefreshFinances, onNavigate }) {
  const [activeTab, setActiveTab] = useState('Synthèse');
  const [data, setData] = useState({ accounts: [], entries: [], lines: [], budgets: [], closures: [], documents: [], treasuryAccounts: [], treasuryMovements: [] });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState(null);
  const financeRows = safeArray(finances).length ? finances : transactions;
  const validTransactions = useMemo(() => safeArray(financeRows).filter(hasAmount), [financeRows]);
  const snapshot = useMemo(() => financeSnapshot(validTransactions, salesOrders, payments, fournisseurs), [validTransactions, salesOrders, payments, fournisseurs]);
  const reports = useMemo(() => computeAccountingReports({ ...data, transactions: validTransactions }), [data, validTransactions]);
  const alerts = useMemo(() => buildFinanceAlerts({ transactions: validTransactions, treasuryAccounts: data.treasuryAccounts }), [validTransactions, data.treasuryAccounts]);
  const draftableTransactions = useMemo(() => validTransactions.filter((trx) => !trx.accounting_entry_id && !['annule'].includes(status(trx))), [validTransactions]);
  const drafts = useMemo(() => safeArray(data.entries).filter((entry) => entry.status === 'brouillon'), [data.entries]);
  const unbalanced = useMemo(() => safeArray(data.entries).filter((entry) => !isBalanced(entry)), [data.entries]);
  const dettes = useMemo(() => validTransactions.filter((trx) => isOut(trx) && isUnpaid(trx)), [validTransactions]);
  const creances = useMemo(() => validTransactions.filter((trx) => isIn(trx) && isUnpaid(trx)), [validTransactions]);
  const missingProof = useMemo(() => validTransactions.filter((trx) => !trx.justificatif_url), [validTransactions]);
  const modalDefaults = useMemo(() => ({ budget: { id: `BUD-${String(data.budgets.length + 1).padStart(3, '0')}`, period: monthKey(), status: 'ouvert' }, closure: { id: `CLO-${String(data.closures.length + 1).padStart(3, '0')}`, period: monthKey(), closure_type: 'mensuelle', status: 'brouillon' }, document: { id: `DOC-${String(data.documents.length + 1).padStart(3, '0')}`, document_type: 'recu' } }), [data.budgets.length, data.closures.length, data.documents.length]);

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await comptabiliteService.getAll()); } catch (error) { toast.error(error.message || 'Chargement comptabilité impossible'); } finally { setLoading(false); }
  }, []);
  useEffect(() => { queueMicrotask(() => load()); }, [load]);

  const generateDrafts = async () => {
    if (!draftableTransactions.length) { toast.success('Toutes les transactions utiles sont déjà préparées'); return; }
    setSaving(true);
    try {
      await Promise.all(draftableTransactions.map((transaction) => comptabiliteService.createDraftFromTransaction(transaction, data.accounts)));
      await Promise.all([load(), onRefreshFinances?.()]);
      toast.success('Écritures brouillon créées');
    } catch (error) { toast.error(error.message || 'Génération comptable impossible'); } finally { setSaving(false); }
  };
  const validateEntry = async (entryId) => {
    setSaving(true);
    try {
      await comptabiliteService.validateEntry(entryId);
      await Promise.all([load(), onRefreshFinances?.()]);
      toast.success('Écriture validée et transaction finance synchronisée');
    } catch (error) { toast.error(error.message || 'Validation impossible'); } finally { setSaving(false); }
  };
  const submitBudget = async (payload) => { setSaving(true); try { await comptabiliteService.createBudget(payload); await load(); setModal(null); toast.success('Budget ajouté'); } catch (error) { toast.error(error.message || 'Budget impossible'); } finally { setSaving(false); } };
  const submitClosure = async (payload) => { setSaving(true); try { await comptabiliteService.createClosure({ ...payload, summary: reports }); await load(); setModal(null); toast.success('Clôture créée'); } catch (error) { toast.error(error.message || 'Clôture impossible'); } finally { setSaving(false); } };
  const submitDocument = async (payload) => { setSaving(true); try { await comptabiliteService.uploadDocument({ ...payload, uploaded_at: new Date().toISOString() }); await load(); setModal(null); toast.success('Justificatif archivé'); } catch (error) { toast.error(error.message || 'Archivage impossible'); } finally { setSaving(false); } };
  const doExports = () => { exportToCsv({ rows: reports.balance, fileName: 'balance-comptable.csv' }); exportToExcel({ rows: reports.balance, fileName: 'comptabilite.xlsx', sheetName: 'Balance' }); exportToPdf({ rows: reports.balance, title: 'Balance comptable simplifiée', fileName: 'balance-comptable.pdf' }); toast.success('Exports comptables générés'); };
  const actions = [
    draftableTransactions.length ? { icon: BookOpen, title: 'Transactions à préparer', value: fmtNumber(draftableTransactions.length), detail: 'Créer les écritures depuis Finances.', action: generateDrafts, danger: true } : null,
    drafts.length ? { icon: CheckCircle, title: 'Écritures à valider', value: fmtNumber(drafts.length), detail: 'Brouillons prêts à contrôler.', action: () => setActiveTab('À valider'), danger: true } : null,
    missingProof.length ? { icon: FileText, title: 'Justificatifs manquants', value: fmtNumber(missingProof.length), detail: 'À compléter dans Documents.', action: () => navigate(onNavigate, 'documents') } : null,
    snapshot.receivables > 0 ? { icon: CreditCard, title: 'Créances à suivre', value: fmtCurrency(snapshot.receivables), detail: 'Clients ou ventes non soldés.', action: () => navigate(onNavigate, 'ventes'), danger: true } : null,
  ].filter(Boolean).slice(0, 4);

  return <div className="space-y-6">
    <SectionHeader title="Comptabilité" sub="Contrôle des flux financiers: préparer les écritures, vérifier les justificatifs, valider et clôturer." actions={<><Btn icon={RefreshCw} variant="outline" small onClick={load} disabled={loading}>Refresh</Btn><Btn icon={BookOpen} variant="outline" small onClick={generateDrafts} disabled={saving}>Préparer écritures</Btn><Btn icon={Download} variant="outline" small onClick={doExports}>Exporter</Btn></>} />
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4"><KpiCard icon={TrendingUp} label="CA à contrôler" value={fmtCurrency(snapshot.revenue)} sub="aligné sur Finances" color="bg-positive text-positive" /><KpiCard icon={Wallet} label="Cash net" value={fmtCurrency(snapshot.cashNet)} sub="cash encaissé - charges payées" color={snapshot.cashNet >= 0 ? 'bg-positive text-positive' : 'bg-urgent text-urgent'} /><KpiCard icon={AlertTriangle} label="À préparer" value={fmtNumber(draftableTransactions.length)} sub="transactions finances" color="bg-vigilance text-horizon-dark" /><KpiCard icon={Landmark} label="Créances" value={fmtCurrency(snapshot.receivables)} sub="aligné sur Finances" color="bg-vigilance text-horizon-dark" /><KpiCard icon={CreditCard} label="Dettes" value={fmtCurrency(snapshot.debts)} sub={`${dettes.length} ligne(s) à payer`} color="bg-urgent text-urgent" /></div>
    <ConnectionPanel snapshot={snapshot} transactions={validTransactions} clients={clients} fournisseurs={fournisseurs} stocks={stocks} animaux={animaux} lots={lots} cultures={cultures} sante={sante} investissements={investissements} equipements={equipements} onNavigate={onNavigate} />
    <div className="flex gap-2 overflow-x-auto pb-1">{TABS.map((tab) => <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`shrink-0 px-3 py-2 rounded-xl text-sm border transition-all ${activeTab === tab ? 'bg-horizon border-horizon text-earth font-semibold' : 'bg-white border-line text-slate hover:border-horizon'}`}>{tab}</button>)}</div>
    {activeTab === 'Synthèse' ? <div className="space-y-4"><div className="bg-white border border-line rounded-2xl p-6"><div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4"><div><p className="font-semibold text-earth">Actions comptables</p><p className="text-sm text-slate">Seulement ce qui demande une décision ou une correction.</p></div><Btn small icon={BookOpen} onClick={generateDrafts} disabled={saving}>Préparer depuis Finances</Btn></div><div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">{actions.length ? actions.map((item) => <ActionCard key={item.title} {...item} />) : <p className="text-sm text-slate">Aucune action urgente.</p>}</div></div><div className="grid grid-cols-1 lg:grid-cols-2 gap-4"><ReportCard title="Compte de résultat comptable" rows={[["Produits validés", reports.result.revenues], ["Charges validées", reports.result.expenses], ["Résultat validé", reports.result.net]]} /><ReportCard title="Bilan comptable simplifié" rows={[["Actifs", reports.bilan.actifs], ["Trésorerie comptable", reports.bilan.tresorerie], ["Créances", snapshot.receivables], ["Dettes", snapshot.debts]]} /></div></div> : null}
    {activeTab === 'À valider' ? <div className="space-y-3"><div className="bg-white border border-line rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3"><div><p className="font-semibold text-earth">Écritures proposées</p><p className="text-sm text-slate">On valide seulement ce qui est équilibré et justifié.</p></div><Btn small icon={CheckCircle} onClick={generateDrafts} disabled={saving}>Préparer manquantes</Btn></div>{data.entries.length ? data.entries.map((entry) => <EntryCard key={entry.id} entry={entry} onValidate={validateEntry} saving={saving} />) : <div className="bg-white border border-line rounded-2xl p-8 text-center text-slate">Aucune écriture. Clique sur “Préparer écritures”.</div>}</div> : null}
    {activeTab === 'Contrôles' ? <div className="grid grid-cols-1 lg:grid-cols-2 gap-4"><SimpleTable title="Transactions sans écriture" rows={draftableTransactions.map((row) => ({ ...row, montant: amount(row) }))} columns={['date', 'libelle', 'type', 'categorie', 'montant', 'statut']} /><SimpleTable title="Justificatifs manquants" rows={missingProof.map((row) => ({ ...row, montant: amount(row) }))} columns={['date', 'libelle', 'type', 'montant', 'statut']} /><SimpleTable title="Écritures déséquilibrées" rows={unbalanced} columns={['entry_date', 'label', 'journal', 'total_debit', 'total_credit', 'status']} /><div className="bg-white border border-line rounded-2xl p-6"><p className="font-semibold text-earth mb-3">Alertes</p><div className="space-y-2">{alerts.length ? alerts.slice(0, 6).map((alert) => <div key={alert.id} className="rounded-xl border border-vigilance bg-vigilance-bg p-3"><p className="text-sm font-semibold text-earth">{alert.title}</p><p className="text-xs text-slate">{alert.message}</p></div>) : <p className="text-sm text-slate">Aucune alerte critique.</p>}</div></div></div> : null}
    {activeTab === 'Rapports' ? <div className="space-y-4"><div className="grid grid-cols-1 lg:grid-cols-2 gap-4"><SimpleTable title="Balance" rows={reports.balance} columns={['code', 'name', 'type', 'debit', 'credit', 'solde']} /><SimpleTable title="Grand livre" rows={reports.grandLivre} columns={['entry_id', 'account_code', 'label', 'debit', 'credit']} /></div><div className="grid grid-cols-1 lg:grid-cols-2 gap-4"><SimpleTable title="Créances clients" rows={creances.map((row) => ({ ...row, client: clients.find((client) => client.id === row.client_id)?.nom || row.client_id, montant: amount(row) }))} columns={['date', 'libelle', 'client', 'montant', 'statut', 'paiement']} /><SimpleTable title="Dettes fournisseurs" rows={dettes.map((row) => ({ ...row, fournisseur: fournisseurs.find((f) => f.id === row.fournisseur_id)?.nom || row.fournisseur_id, montant: amount(row) }))} columns={['date', 'libelle', 'fournisseur', 'montant', 'statut', 'paiement']} /></div></div> : null}
    {activeTab === 'Archives' ? <div className="space-y-4"><div className="flex flex-wrap gap-2"><Btn icon={Plus} small onClick={() => setModal('budget')}>Budget</Btn><Btn icon={Archive} small onClick={() => setModal('closure')}>Clôture</Btn><Btn icon={FileText} small onClick={() => setModal('document')}>Justificatif</Btn></div><SimpleTable title="Budgets" rows={reports.budgets} columns={['period', 'category', 'budget_amount', 'actual_amount', 'ecart', 'status']} /><SimpleTable title="Clôtures" rows={data.closures} columns={['period', 'closure_type', 'status', 'closed_at']} /><SimpleTable title="Justificatifs archivés" rows={data.documents} columns={['label', 'document_type', 'transaction_id', 'entry_id', 'uploaded_at']} /></div> : null}
    <CreateModal open={modal === 'budget'} onClose={() => setModal(null)} onSubmit={submitBudget} fields={budgetFields} initialValues={modalDefaults.budget} loading={saving} title="Ajouter budget" submitLabel="Ajouter" />
    <CreateModal open={modal === 'closure'} onClose={() => setModal(null)} onSubmit={submitClosure} fields={closureFields} initialValues={modalDefaults.closure} loading={saving} title="Nouvelle clôture" submitLabel="Créer" />
    <CreateModal open={modal === 'document'} onClose={() => setModal(null)} onSubmit={submitDocument} fields={documentFields} initialValues={modalDefaults.document} uploadFolder="comptabilite" loading={saving} title="Archiver justificatif" submitLabel="Archiver" />
  </div>;
}
