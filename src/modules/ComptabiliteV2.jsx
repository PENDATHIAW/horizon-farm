import { AlertTriangle, Archive, BookOpen, CheckCircle, CreditCard, Download, FileText, Landmark, Plus, RefreshCw, Scale, Wallet } from 'lucide-react';
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

const safeArray = (value) => Array.isArray(value) ? value : [];
const amount = (row = {}) => toNumber(row.montant ?? row.amount ?? 0);
const hasAmount = (row = {}) => Math.abs(amount(row)) > 0;
const isUnpaid = (row = {}) => ['impaye', 'partiel', 'en_retard'].includes(String(row.statut || '').toLowerCase());
const isIn = (row = {}) => String(row.type || '').toLowerCase() === 'entree';
const isOut = (row = {}) => String(row.type || '').toLowerCase() === 'sortie';
const isBalanced = (entry = {}) => toNumber(entry.total_debit) === toNumber(entry.total_credit);
const monthKey = () => new Date().toISOString().slice(0, 7);

function statusClass(status) {
  if (status === 'valide') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (status === 'annule') return 'bg-red-50 text-red-600 border-red-200';
  return 'bg-amber-50 text-amber-700 border-amber-200';
}
function StatusBadge({ status }) {
  return <span className={`text-xs px-2 py-1 rounded-full border ${statusClass(status)}`}>{status || 'brouillon'}</span>;
}
function openOrNavigate(onNavigate, moduleKey) {
  if (onNavigate) return onNavigate(moduleKey);
  if (typeof document !== 'undefined') Array.from(document.querySelectorAll('nav button')).find((button) => button.textContent?.toLowerCase().includes(moduleKey.toLowerCase()))?.click();
}
function ActionCard({ icon: Icon, title, value, detail, action, danger }) {
  return <button type="button" onClick={action} className={`text-left rounded-xl border p-4 transition-all hover:border-[#b6975f] ${danger ? 'bg-red-50 border-red-200' : 'bg-[#fffdf8] border-[#d6c3a0]'}`}><div className="flex gap-3"><div className="w-9 h-9 rounded-xl bg-[#fff3d8] text-[#9a6b12] flex items-center justify-center shrink-0"><Icon size={17} /></div><div><p className="font-black text-[#2f2415]">{title}</p><p className="text-lg font-black text-[#2f2415] mt-1">{value}</p><p className="text-xs text-[#8a7456] mt-1">{detail}</p></div></div></button>;
}
function EntryCard({ entry, onValidate, saving }) {
  return <div className="rounded-2xl border border-[#d6c3a0] bg-white p-4"><div className="flex flex-col md:flex-row md:items-center gap-3"><div className="flex-1"><div className="flex items-center gap-2 flex-wrap"><p className="font-black text-[#2f2415]">{entry.label || entry.reference || entry.id}</p><StatusBadge status={entry.status} /></div><p className="text-xs text-[#8a7456] mt-1">{entry.entry_date} · journal {entry.journal || '-'} · réf {entry.reference || '-'}</p><p className="text-xs text-[#8a7456] mt-1">Débit {fmtCurrency(entry.total_debit)} · Crédit {fmtCurrency(entry.total_credit)} {isBalanced(entry) ? '· équilibrée' : '· à corriger'}</p></div><div className="flex items-center gap-2"><p className="font-black text-[#2f2415]">{fmtCurrency(entry.total_debit)}</p>{entry.status === 'brouillon' ? <Btn small icon={CheckCircle} onClick={() => onValidate(entry.id)} disabled={saving}>Valider</Btn> : null}</div></div></div>;
}
function SimpleTable({ title, rows = [], columns = [] }) {
  return <div className="bg-white border border-[#d6c3a0] rounded-2xl overflow-hidden"><div className="px-5 py-4 border-b border-[#d6c3a0]"><p className="font-semibold text-[#2f2415]">{title}</p></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-[#fffdf8] border-b border-[#e7d9be]">{columns.map((column) => <th key={column} className="text-left text-xs text-[#8a7456] uppercase px-4 py-3">{column}</th>)}</tr></thead><tbody>{rows.length ? rows.map((row, index) => <tr key={row.id || `${title}-${index}`} className="border-b border-[#e7d9be]/70 hover:bg-[#fffdf8]">{columns.map((column) => <td key={column} className="px-4 py-3 text-[#2f2415]">{moneyFields.includes(column) ? fmtCurrency(row[column]) : String(row[column] ?? '-')}</td>)}</tr>) : <tr><td colSpan={columns.length} className="px-4 py-8 text-center text-[#8a7456]">Aucune donnée pour le moment.</td></tr>}</tbody></table></div></div>;
}
function ReportCard({ title, rows = [] }) {
  return <div className="bg-white border border-[#d6c3a0] rounded-2xl p-5"><p className="font-black text-[#2f2415] mb-4">{title}</p><div className="space-y-2">{rows.map(([label, value]) => <div key={label} className="flex items-center justify-between rounded-xl bg-[#fffdf8] border border-[#e7d9be] px-3 py-2"><span className="text-sm text-[#7d6a4a]">{label}</span><span className="font-black text-[#2f2415]">{fmtCurrency(value)}</span></div>)}</div></div>;
}

export default function ComptabiliteV2({ transactions = [], clients = [], fournisseurs = [], onRefreshFinances, onNavigate }) {
  const [activeTab, setActiveTab] = useState('Synthèse');
  const [data, setData] = useState({ accounts: [], entries: [], lines: [], budgets: [], closures: [], documents: [], treasuryAccounts: [], treasuryMovements: [] });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await comptabiliteService.getAll());
    } catch (error) {
      toast.error(error.message || 'Chargement comptabilité impossible');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { queueMicrotask(() => load()); }, [load]);

  const validTransactions = useMemo(() => safeArray(transactions).filter(hasAmount), [transactions]);
  const reports = useMemo(() => computeAccountingReports({ ...data, transactions: validTransactions }), [data, validTransactions]);
  const alerts = useMemo(() => buildFinanceAlerts({ transactions: validTransactions, treasuryAccounts: data.treasuryAccounts }), [validTransactions, data.treasuryAccounts]);
  const draftableTransactions = useMemo(() => validTransactions.filter((trx) => !trx.accounting_entry_id && !['annule'].includes(String(trx.statut || '').toLowerCase())), [validTransactions]);
  const drafts = useMemo(() => safeArray(data.entries).filter((entry) => entry.status === 'brouillon'), [data.entries]);
  const unbalanced = useMemo(() => safeArray(data.entries).filter((entry) => !isBalanced(entry)), [data.entries]);
  const dettes = useMemo(() => validTransactions.filter((trx) => isOut(trx) && isUnpaid(trx)), [validTransactions]);
  const creances = useMemo(() => validTransactions.filter((trx) => isIn(trx) && isUnpaid(trx)), [validTransactions]);
  const missingProof = useMemo(() => validTransactions.filter((trx) => !trx.justificatif_url), [validTransactions]);
  const modalDefaults = useMemo(() => ({
    budget: { id: `BUD-${String(data.budgets.length + 1).padStart(3, '0')}`, period: monthKey(), status: 'ouvert' },
    closure: { id: `CLO-${String(data.closures.length + 1).padStart(3, '0')}`, period: monthKey(), closure_type: 'mensuelle', status: 'brouillon' },
    document: { id: `DOC-${String(data.documents.length + 1).padStart(3, '0')}`, document_type: 'recu' },
  }), [data.budgets.length, data.closures.length, data.documents.length]);

  const generateDrafts = async () => {
    if (!draftableTransactions.length) {
      toast.success('Toutes les transactions utiles sont déjà préparées');
      return;
    }
    setSaving(true);
    try {
      await Promise.all(draftableTransactions.map((transaction) => comptabiliteService.createDraftFromTransaction(transaction, data.accounts)));
      await Promise.all([load(), onRefreshFinances?.()]);
      toast.success('Écritures brouillon créées');
    } catch (error) {
      toast.error(error.message || 'Génération comptable impossible');
    } finally {
      setSaving(false);
    }
  };
  const validateEntry = async (entryId) => {
    setSaving(true);
    try {
      await comptabiliteService.validateEntry(entryId);
      await load();
      toast.success('Écriture validée');
    } catch (error) {
      toast.error(error.message || 'Validation impossible');
    } finally {
      setSaving(false);
    }
  };
  const submitBudget = async (payload) => { setSaving(true); try { await comptabiliteService.createBudget(payload); await load(); setModal(null); toast.success('Budget ajouté'); } catch (error) { toast.error(error.message || 'Budget impossible'); } finally { setSaving(false); } };
  const submitClosure = async (payload) => { setSaving(true); try { await comptabiliteService.createClosure({ ...payload, summary: reports }); await load(); setModal(null); toast.success('Clôture créée'); } catch (error) { toast.error(error.message || 'Clôture impossible'); } finally { setSaving(false); } };
  const submitDocument = async (payload) => { setSaving(true); try { await comptabiliteService.uploadDocument({ ...payload, uploaded_at: new Date().toISOString() }); await load(); setModal(null); toast.success('Justificatif archivé'); } catch (error) { toast.error(error.message || 'Archivage impossible'); } finally { setSaving(false); } };
  const doExports = () => {
    exportToCsv({ rows: reports.balance, fileName: 'balance-comptable.csv' });
    exportToExcel({ rows: reports.balance, fileName: 'comptabilite.xlsx', sheetName: 'Balance' });
    exportToPdf({ rows: reports.balance, title: 'Balance comptable simplifiée', fileName: 'balance-comptable.pdf' });
    toast.success('Exports comptables générés');
  };

  const actions = [
    draftableTransactions.length ? { icon: BookOpen, title: 'Transactions à préparer', value: fmtNumber(draftableTransactions.length), detail: 'Créer les écritures depuis Finances.', action: generateDrafts, danger: true } : null,
    drafts.length ? { icon: CheckCircle, title: 'Écritures à valider', value: fmtNumber(drafts.length), detail: 'Brouillons prêts à contrôler.', action: () => setActiveTab('À valider'), danger: true } : null,
    missingProof.length ? { icon: FileText, title: 'Justificatifs manquants', value: fmtNumber(missingProof.length), detail: 'À compléter dans Documents.', action: () => openOrNavigate(onNavigate, 'documents'), danger: false } : null,
    creances.length ? { icon: CreditCard, title: 'Créances à suivre', value: fmtCurrency(reports.bilan.creances), detail: 'Clients ou ventes non soldés.', action: () => openOrNavigate(onNavigate, 'ventes'), danger: true } : null,
  ].filter(Boolean).slice(0, 4);

  return <div className="space-y-6">
    <SectionHeader title="Comptabilité" sub="Validation simple des flux financiers: préparer, contrôler, valider, puis sortir les rapports." actions={<><Btn icon={RefreshCw} variant="outline" small onClick={load} disabled={loading}>Refresh</Btn><Btn icon={BookOpen} variant="outline" small onClick={generateDrafts} disabled={saving}>Préparer écritures</Btn><Btn icon={Download} variant="outline" small onClick={doExports}>Exporter</Btn></>} />

    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
      <KpiCard icon={Wallet} label="Trésorerie" value={fmtCurrency(reports.bilan.tresorerie)} sub="caisse + banque + mobile money" color="bg-emerald-500/20 text-emerald-500" />
      <KpiCard icon={Scale} label="Résultat net" value={fmtCurrency(reports.result.net)} sub="produits - charges validés" color={reports.result.net >= 0 ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'} />
      <KpiCard icon={AlertTriangle} label="À préparer" value={fmtNumber(draftableTransactions.length)} sub="transactions finances" color="bg-amber-500/20 text-amber-500" />
      <KpiCard icon={Landmark} label="Créances" value={fmtCurrency(reports.bilan.creances)} sub={`${creances.length} ligne(s) à suivre`} color="bg-amber-500/20 text-amber-500" />
      <KpiCard icon={CreditCard} label="Dettes" value={fmtCurrency(reports.bilan.dettes)} sub={`${dettes.length} ligne(s) à payer`} color="bg-red-500/20 text-red-500" />
    </div>

    <div className="flex gap-2 overflow-x-auto pb-1">{TABS.map((tab) => <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`shrink-0 px-3 py-2 rounded-xl text-sm border transition-all ${activeTab === tab ? 'bg-[#c9a96a] border-[#b89354] text-[#2f2415] font-semibold' : 'bg-white border-[#d6c3a0] text-[#8a7456] hover:border-[#b89354]'}`}>{tab}</button>)}</div>

    {activeTab === 'Synthèse' ? <div className="space-y-4">
      <div className="bg-white border border-[#d6c3a0] rounded-2xl p-5"><div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4"><div><p className="font-black text-[#2f2415]">Actions comptables</p><p className="text-sm text-[#8a7456]">Seulement ce qui demande une décision ou une correction.</p></div><Btn small icon={BookOpen} onClick={generateDrafts} disabled={saving}>Préparer depuis Finances</Btn></div><div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">{actions.length ? actions.map((item) => <ActionCard key={item.title} {...item} />) : <p className="text-sm text-[#8a7456]">Aucune action urgente.</p>}</div></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4"><ReportCard title="Compte de résultat" rows={[["Produits", reports.result.revenues], ["Charges", reports.result.expenses], ["Résultat net", reports.result.net]]} /><ReportCard title="Bilan simplifié" rows={[["Actifs", reports.bilan.actifs], ["Trésorerie", reports.bilan.tresorerie], ["Créances", reports.bilan.creances], ["Dettes", reports.bilan.dettes]]} /></div>
    </div> : null}

    {activeTab === 'À valider' ? <div className="space-y-3"><div className="bg-white border border-[#d6c3a0] rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3"><div><p className="font-black text-[#2f2415]">Écritures proposées</p><p className="text-sm text-[#8a7456]">On valide seulement ce qui est équilibré et justifié.</p></div><Btn small icon={CheckCircle} onClick={generateDrafts} disabled={saving}>Préparer manquantes</Btn></div>{data.entries.length ? data.entries.map((entry) => <EntryCard key={entry.id} entry={entry} onValidate={validateEntry} saving={saving} />) : <div className="bg-white border border-[#d6c3a0] rounded-2xl p-8 text-center text-[#8a7456]">Aucune écriture. Clique sur “Préparer écritures”.</div>}</div> : null}

    {activeTab === 'Contrôles' ? <div className="grid grid-cols-1 lg:grid-cols-2 gap-4"><SimpleTable title="Transactions sans écriture" rows={draftableTransactions.map((row) => ({ ...row, montant: amount(row) }))} columns={['date', 'libelle', 'type', 'categorie', 'montant', 'statut']} /><SimpleTable title="Justificatifs manquants" rows={missingProof.map((row) => ({ ...row, montant: amount(row) }))} columns={['date', 'libelle', 'type', 'montant', 'statut']} /><SimpleTable title="Écritures déséquilibrées" rows={unbalanced} columns={['entry_date', 'label', 'journal', 'total_debit', 'total_credit', 'status']} /><div className="bg-white border border-[#d6c3a0] rounded-2xl p-5"><p className="font-black text-[#2f2415] mb-3">Alertes</p><div className="space-y-2">{alerts.length ? alerts.slice(0, 6).map((alert) => <div key={alert.id} className="rounded-xl border border-amber-200 bg-amber-50 p-3"><p className="text-sm font-semibold text-[#2f2415]">{alert.title}</p><p className="text-xs text-[#8a7456]">{alert.message}</p></div>) : <p className="text-sm text-[#8a7456]">Aucune alerte critique.</p>}</div></div></div> : null}

    {activeTab === 'Rapports' ? <div className="space-y-4"><div className="grid grid-cols-1 lg:grid-cols-2 gap-4"><SimpleTable title="Balance" rows={reports.balance} columns={['code', 'name', 'type', 'debit', 'credit', 'solde']} /><SimpleTable title="Grand livre" rows={reports.grandLivre} columns={['entry_id', 'account_code', 'label', 'debit', 'credit']} /></div><div className="grid grid-cols-1 lg:grid-cols-2 gap-4"><SimpleTable title="Créances clients" rows={creances.map((row) => ({ ...row, client: clients.find((client) => client.id === row.client_id)?.nom || row.client_id, montant: amount(row) }))} columns={['date', 'libelle', 'client', 'montant', 'statut', 'paiement']} /><SimpleTable title="Dettes fournisseurs" rows={dettes.map((row) => ({ ...row, fournisseur: fournisseurs.find((f) => f.id === row.fournisseur_id)?.nom || row.fournisseur_id, montant: amount(row) }))} columns={['date', 'libelle', 'fournisseur', 'montant', 'statut', 'paiement']} /></div></div> : null}

    {activeTab === 'Archives' ? <div className="space-y-4"><div className="flex flex-wrap gap-2"><Btn icon={Plus} small onClick={() => setModal('budget')}>Budget</Btn><Btn icon={Archive} small onClick={() => setModal('closure')}>Clôture</Btn><Btn icon={FileText} small onClick={() => setModal('document')}>Justificatif</Btn></div><SimpleTable title="Budgets" rows={reports.budgets} columns={['period', 'category', 'budget_amount', 'actual_amount', 'ecart', 'status']} /><SimpleTable title="Clôtures" rows={data.closures} columns={['period', 'closure_type', 'status', 'closed_at']} /><SimpleTable title="Justificatifs archivés" rows={data.documents} columns={['label', 'document_type', 'transaction_id', 'entry_id', 'uploaded_at']} /></div> : null}

    <CreateModal open={modal === 'budget'} onClose={() => setModal(null)} onSubmit={submitBudget} fields={budgetFields} initialValues={modalDefaults.budget} loading={saving} title="Ajouter budget" submitLabel="Ajouter" />
    <CreateModal open={modal === 'closure'} onClose={() => setModal(null)} onSubmit={submitClosure} fields={closureFields} initialValues={modalDefaults.closure} loading={saving} title="Nouvelle clôture" submitLabel="Créer" />
    <CreateModal open={modal === 'document'} onClose={() => setModal(null)} onSubmit={submitDocument} fields={documentFields} initialValues={modalDefaults.document} uploadFolder="comptabilite" loading={saving} title="Archiver justificatif" submitLabel="Archiver" />
  </div>;
}
