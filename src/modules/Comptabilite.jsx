import { AlertTriangle, Archive, BarChart2, BookOpen, CheckCircle, CreditCard, Download, FileText, Landmark, Layers, Plus, RefreshCw, Scale, Wallet } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Btn from '../components/Btn';
import KpiCard from '../components/KpiCard';
import SectionHeader from '../components/SectionHeader';
import CreateModal from '../modals/CreateModal';
import { comptabiliteService } from '../services/comptabiliteService';
import { buildFinanceAlerts, computeAccountingReports } from '../utils/accounting';
import { exportToCsv, exportToExcel, exportToPdf } from '../utils/export';
import { fmtCurrency } from '../utils/format';

const TABS = ['Guide', 'Journaux', 'Plan comptable', 'Grand livre', 'Balance', 'Rapports', 'Dettes', 'Creances', 'Budgets', 'Clotures', 'Justificatifs'];

const budgetFields = [
  { key: 'id', label: 'ID', type: 'text', required: true },
  { key: 'period', label: 'Periode', type: 'text', required: true },
  { key: 'category', label: 'Categorie', type: 'text', required: true },
  { key: 'budget_amount', label: 'Budget prevu', type: 'number' },
  { key: 'actual_amount', label: 'Reel actuel', type: 'number' },
  { key: 'status', label: 'Statut', type: 'select', options: ['ouvert', 'depasse', 'clos'] },
  { key: 'notes', label: 'Notes', type: 'text' },
];

const closureFields = [
  { key: 'id', label: 'ID', type: 'text', required: true },
  { key: 'period', label: 'Periode', type: 'text', required: true },
  { key: 'closure_type', label: 'Type cloture', type: 'select', options: ['mensuelle', 'annuelle'] },
  { key: 'status', label: 'Statut', type: 'select', options: ['brouillon', 'cloture', 'archive'] },
];

const documentFields = [
  { key: 'id', label: 'ID', type: 'text', required: true },
  { key: 'transaction_id', label: 'Transaction liee', type: 'text' },
  { key: 'entry_id', label: 'Ecriture liee', type: 'text' },
  { key: 'label', label: 'Libelle document', type: 'text', required: true },
  { key: 'document_type', label: 'Type document', type: 'select', options: ['facture', 'recu', 'photo', 'autre'] },
  { key: 'file_url', label: 'Fichier / image', type: 'image' },
];

const StatBadge = ({ status }) => {
  const cls = status === 'valide'
    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
    : status === 'annule'
      ? 'bg-red-500/10 text-red-500 border-red-500/20'
      : 'bg-amber-500/10 text-amber-600 border-amber-500/20';
  return <span className={`text-xs px-2 py-1 rounded-full border ${cls}`}>{status || 'brouillon'}</span>;
};

export default function Comptabilite({ transactions = [], clients = [], fournisseurs = [], onRefreshFinances }) {
  const [activeTab, setActiveTab] = useState('Guide');
  const [data, setData] = useState({ accounts: [], entries: [], lines: [], budgets: [], closures: [], documents: [], treasuryAccounts: [], treasuryMovements: [] });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState(null);
  const modalDefaults = useMemo(() => {
    const period = '2025-07';
    return {
      budget: { id: `BUD-${String(data.budgets.length + 1).padStart(3, '0')}`, period, status: 'ouvert' },
      closure: { id: `CLO-${String(data.closures.length + 1).padStart(3, '0')}`, period, closure_type: 'mensuelle', status: 'brouillon' },
      document: { id: `DOC-${String(data.documents.length + 1).padStart(3, '0')}`, document_type: 'recu' },
    };
  }, [data.budgets.length, data.closures.length, data.documents.length]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const next = await comptabiliteService.getAll();
      setData(next);
    } catch (error) {
      toast.error(error.message || 'Chargement comptabilite impossible');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => load());
  }, [load]);

  const reports = useMemo(
    () => computeAccountingReports({ ...data, transactions }),
    [data, transactions]
  );

  const alerts = useMemo(
    () => buildFinanceAlerts({ transactions, treasuryAccounts: data.treasuryAccounts }),
    [transactions, data.treasuryAccounts]
  );

  const draftableTransactions = useMemo(
    () => transactions.filter((transaction) => !transaction.accounting_entry_id && Number(transaction.montant || 0) > 0),
    [transactions]
  );

  const dettes = useMemo(
    () => transactions.filter((transaction) => transaction.type === 'sortie' && ['impaye', 'partiel'].includes(transaction.statut)),
    [transactions]
  );

  const creances = useMemo(
    () => transactions.filter((transaction) => transaction.type === 'entree' && ['impaye', 'partiel'].includes(transaction.statut)),
    [transactions]
  );

  const generateDrafts = async () => {
    if (!draftableTransactions.length) {
      toast.success('Toutes les transactions ont deja une ecriture');
      return;
    }

    setSaving(true);
    try {
      await Promise.all(draftableTransactions.map((transaction) => comptabiliteService.createDraftFromTransaction(transaction, data.accounts)));
      await Promise.all([load(), onRefreshFinances?.()]);
      toast.success('Ecritures brouillon generees automatiquement');
    } catch (error) {
      toast.error(error.message || 'Generation comptable impossible. Verifie le script SQL Supabase.');
    } finally {
      setSaving(false);
    }
  };

  const validateEntry = async (entryId) => {
    setSaving(true);
    try {
      await comptabiliteService.validateEntry(entryId);
      await load();
      toast.success('Ecriture validee');
    } catch (error) {
      toast.error(error.message || 'Validation impossible');
    } finally {
      setSaving(false);
    }
  };

  const submitBudget = async (payload) => {
    setSaving(true);
    try {
      await comptabiliteService.createBudget(payload);
      await load();
      setModal(null);
      toast.success('Budget ajoute');
    } catch (error) {
      toast.error(error.message || 'Budget impossible');
    } finally {
      setSaving(false);
    }
  };

  const submitClosure = async (payload) => {
    setSaving(true);
    try {
      await comptabiliteService.createClosure({ ...payload, summary: reports });
      await load();
      setModal(null);
      toast.success('Cloture ajoutee');
    } catch (error) {
      toast.error(error.message || 'Cloture impossible');
    } finally {
      setSaving(false);
    }
  };

  const submitDocument = async (payload) => {
    setSaving(true);
    try {
      await comptabiliteService.uploadDocument({ ...payload, uploaded_at: new Date().toISOString() });
      await load();
      setModal(null);
      toast.success('Justificatif archive');
    } catch (error) {
      toast.error(error.message || 'Archivage impossible');
    } finally {
      setSaving(false);
    }
  };

  const doExports = () => {
    exportToCsv({ rows: reports.balance, fileName: 'balance-comptable.csv' });
    exportToExcel({ rows: reports.balance, fileName: 'comptabilite.xlsx', sheetName: 'Balance' });
    exportToPdf({ rows: reports.balance, title: 'Balance comptable simplifiee', fileName: 'balance-comptable.pdf' });
    toast.success('Exports comptables generes');
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Comptabilite guidee"
        sub="SYSCOHADA-lite - journaux, dettes, creances, budgets et rapports simples"
        actions={
          <>
            <Btn icon={RefreshCw} variant="outline" small onClick={load} disabled={loading}>Refresh</Btn>
            <Btn icon={BookOpen} variant="outline" small onClick={generateDrafts} disabled={saving}>Comptabiliser transactions</Btn>
            <Btn icon={Download} variant="outline" small onClick={doExports}>Exports comptables</Btn>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Wallet} label="Tresorerie" value={fmtCurrency(reports.bilan.tresorerie)} sub="cash + banque + mobile money" color="bg-emerald-500/20 text-emerald-400" />
        <KpiCard icon={BarChart2} label="Resultat net" value={fmtCurrency(reports.result.net)} sub="revenus - charges" color="bg-sky-500/20 text-sky-400" />
        <KpiCard icon={AlertTriangle} label="Dettes fournisseurs" value={fmtCurrency(reports.bilan.dettes)} sub={`${dettes.length} operation(s) a suivre`} color="bg-red-500/20 text-red-400" />
        <KpiCard icon={CreditCard} label="Creances clients" value={fmtCurrency(reports.bilan.creances)} sub={`${creances.length} client(s) debiteur(s)`} color="bg-amber-500/20 text-amber-500" />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`shrink-0 px-3 py-2 rounded-xl text-sm border transition-all ${activeTab === tab ? 'bg-[#c9a96a] border-[#b89354] text-[#2f2415] font-semibold' : 'bg-[#ffffff] border-[#d6c3a0] text-[#8a7456] hover:border-[#b89354]'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Guide' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-[#ffffff] border border-[#d6c3a0] rounded-2xl p-5">
            <p className="font-bold text-[#2f2415] mb-2">Mode simple pour non-comptable</p>
            <p className="text-sm text-[#7d6a4a] leading-6">
              Tu saisis une recette, une depense, une dette ou un paiement dans Finances. Horizon Farm propose automatiquement les comptes SYSCOHADA-lite,
              cree une ecriture brouillon, puis tu peux la valider ici. Les mots compliques sont traduits en notions metier: argent encaisse,
              fournisseur a payer, client doit de l'argent, depense validee.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
              <div className="bg-[#fffdf8] rounded-xl border border-[#e7d9be] p-3"><p className="text-xs text-[#8a7456]">1. Saisie</p><p className="font-semibold text-[#2f2415]">Recette / Depense</p></div>
              <div className="bg-[#fffdf8] rounded-xl border border-[#e7d9be] p-3"><p className="text-xs text-[#8a7456]">2. Brouillon</p><p className="font-semibold text-[#2f2415]">Ecriture proposee</p></div>
              <div className="bg-[#fffdf8] rounded-xl border border-[#e7d9be] p-3"><p className="text-xs text-[#8a7456]">3. Rapport</p><p className="font-semibold text-[#2f2415]">Balance / Resultat</p></div>
            </div>
          </div>
          <div className="bg-[#ffffff] border border-[#d6c3a0] rounded-2xl p-5">
            <p className="font-bold text-[#2f2415] mb-3">Alertes comptables</p>
            <div className="space-y-2">
              {alerts.length ? alerts.slice(0, 5).map((alert) => (
                <div key={alert.id} className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3">
                  <p className="text-sm font-semibold text-[#2f2415]">{alert.title}</p>
                  <p className="text-xs text-[#8a7456]">{alert.message}</p>
                </div>
              )) : <p className="text-sm text-[#8a7456]">Aucune alerte critique.</p>}
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === 'Journaux' ? (
        <div className="bg-[#ffffff] border border-[#d6c3a0] rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#d6c3a0] flex items-center justify-between">
            <p className="font-semibold text-[#2f2415]">Journaux comptables</p>
            <span className="text-xs text-[#8a7456]">{draftableTransactions.length} transaction(s) sans ecriture</span>
          </div>
          <div className="divide-y divide-[#e7d9be]">
            {data.entries.length ? data.entries.map((entry) => (
              <div key={entry.id} className="p-4 flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex-1">
                  <p className="text-sm font-bold text-[#2f2415]">{entry.label}</p>
                  <p className="text-xs text-[#8a7456]">{entry.entry_date} - journal {entry.journal} - ref {entry.reference}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-[#2f2415]">{fmtCurrency(entry.total_debit)}</span>
                  <StatBadge status={entry.status} />
                  {entry.status === 'brouillon' ? <Btn small icon={CheckCircle} onClick={() => validateEntry(entry.id)} disabled={saving}>Valider</Btn> : null}
                </div>
              </div>
            )) : <div className="p-8 text-center text-[#8a7456]">Aucune ecriture. Clique sur "Comptabiliser transactions".</div>}
          </div>
        </div>
      ) : null}

      {activeTab === 'Plan comptable' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {data.accounts.map((account) => (
            <div key={account.id} className="bg-[#ffffff] border border-[#d6c3a0] rounded-2xl p-4">
              <p className="text-xs font-bold text-[#b89354]">Compte {account.code}</p>
              <p className="font-semibold text-[#2f2415]">{account.name}</p>
              <p className="text-xs text-[#8a7456] mt-2">{account.description}</p>
            </div>
          ))}
        </div>
      ) : null}

      {activeTab === 'Grand livre' ? (
        <SimpleTable title="Grand livre simplifie" rows={reports.grandLivre} columns={['entry_id', 'account_code', 'label', 'debit', 'credit']} />
      ) : null}

      {activeTab === 'Balance' ? (
        <SimpleTable title="Balance simplifiee" rows={reports.balance} columns={['code', 'name', 'type', 'debit', 'credit', 'solde']} moneyColumns={['debit', 'credit', 'solde']} />
      ) : null}

      {activeTab === 'Rapports' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ReportCard icon={Scale} title="Compte de resultat" rows={[['Revenus', reports.result.revenues], ['Charges', reports.result.expenses], ['Resultat net', reports.result.net]]} />
          <ReportCard icon={Landmark} title="Bilan simplifie" rows={[['Actifs', reports.bilan.actifs], ['Passifs', reports.bilan.passifs], ['Tresorerie', reports.bilan.tresorerie], ['Dettes', reports.bilan.dettes], ['Creances', reports.bilan.creances]]} />
        </div>
      ) : null}

      {activeTab === 'Dettes' ? (
        <SimpleTable title="Fournisseurs a payer" rows={dettes.map((row) => ({ ...row, fournisseur: fournisseurs.find((f) => f.id === row.fournisseur_id)?.nom || row.fournisseur_id }))} columns={['date', 'libelle', 'fournisseur', 'montant', 'statut', 'paiement']} moneyColumns={['montant']} />
      ) : null}

      {activeTab === 'Creances' ? (
        <SimpleTable title="Clients debiteurs" rows={creances.map((row) => ({ ...row, client: clients.find((c) => c.id === row.client_id)?.nom || row.client_id }))} columns={['date', 'libelle', 'client', 'montant', 'statut', 'paiement']} moneyColumns={['montant']} />
      ) : null}

      {activeTab === 'Budgets' ? (
        <div className="space-y-3">
          <Btn icon={Plus} small onClick={() => setModal('budget')}>Ajouter budget</Btn>
          <SimpleTable title="Budgets mensuels" rows={reports.budgets} columns={['period', 'category', 'budget_amount', 'actual_amount', 'ecart', 'status']} moneyColumns={['budget_amount', 'actual_amount', 'ecart']} />
        </div>
      ) : null}

      {activeTab === 'Clotures' ? (
        <div className="space-y-3">
          <Btn icon={Archive} small onClick={() => setModal('closure')}>Nouvelle cloture</Btn>
          <SimpleTable title="Clotures" rows={data.closures} columns={['period', 'closure_type', 'status', 'closed_at']} />
        </div>
      ) : null}

      {activeTab === 'Justificatifs' ? (
        <div className="space-y-3">
          <Btn icon={FileText} small onClick={() => setModal('document')}>Archiver justificatif</Btn>
          <SimpleTable title="Documents lies" rows={data.documents} columns={['label', 'document_type', 'transaction_id', 'entry_id', 'uploaded_at']} />
        </div>
      ) : null}

      <CreateModal open={modal === 'budget'} onClose={() => setModal(null)} onSubmit={submitBudget} fields={budgetFields} initialValues={modalDefaults.budget} loading={saving} title="Ajouter budget" submitLabel="Ajouter" />
      <CreateModal open={modal === 'closure'} onClose={() => setModal(null)} onSubmit={submitClosure} fields={closureFields} initialValues={modalDefaults.closure} loading={saving} title="Nouvelle cloture" submitLabel="Creer" />
      <CreateModal open={modal === 'document'} onClose={() => setModal(null)} onSubmit={submitDocument} fields={documentFields} initialValues={modalDefaults.document} uploadFolder="comptabilite" loading={saving} title="Archiver justificatif" submitLabel="Archiver" />
    </div>
  );
}

function SimpleTable({ title, rows = [], columns = [], moneyColumns = [] }) {
  return (
    <div className="bg-[#ffffff] border border-[#d6c3a0] rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-[#d6c3a0]"><p className="font-semibold text-[#2f2415]">{title}</p></div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#fffdf8] border-b border-[#e7d9be]">
              {columns.map((column) => <th key={column} className="text-left text-xs text-[#8a7456] uppercase px-4 py-3">{column}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.length ? rows.map((row, index) => (
              <tr key={row.id || `${title}-${index}`} className="border-b border-[#e7d9be]/70 hover:bg-[#fffdf8]">
                {columns.map((column) => (
                  <td key={column} className="px-4 py-3 text-[#2f2415]">
                    {moneyColumns.includes(column) ? fmtCurrency(row[column]) : String(row[column] ?? '-')}
                  </td>
                ))}
              </tr>
            )) : (
              <tr><td colSpan={columns.length} className="px-4 py-8 text-center text-[#8a7456]">Aucune donnee pour le moment.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReportCard({ icon: Icon = Layers, title, rows = [] }) {
  return (
    <div className="bg-[#ffffff] border border-[#d6c3a0] rounded-2xl p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-[#c9a96a]/20 text-[#9a7438] flex items-center justify-center"><Icon size={18} /></div>
        <p className="font-bold text-[#2f2415]">{title}</p>
      </div>
      <div className="space-y-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between rounded-xl bg-[#fffdf8] border border-[#e7d9be] px-3 py-2">
            <span className="text-sm text-[#7d6a4a]">{label}</span>
            <span className="font-semibold text-[#2f2415]">{fmtCurrency(value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
