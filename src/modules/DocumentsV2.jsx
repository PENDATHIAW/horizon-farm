import { AlertTriangle, CheckCircle2, FileText, Receipt, ShieldCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { documentLinkedToTransaction, transactionHasProof } from '../utils/accountingProof';
import { fmtCurrency, toNumber } from '../utils/format';
import { generateSequentialId } from '../utils/ids';
import { buildDocumentProofFollowUp } from '../utils/documentWorkflows';
import useCrudModule from '../hooks/useCrudModule';
import DocumentControlPanel from './DocumentControlPanel.jsx';
import Documents from './Documents.jsx';

const arr = (value) => Array.isArray(value) ? value : [];

function ModuleSection({ icon: Icon, title, subtitle, children }) {
  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4"><div><p className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><Icon size={20} /> {title}</p>{subtitle ? <p className="mt-1 text-sm text-[#8a7456]">{subtitle}</p> : null}</div>{children}</section>;
}

async function createDocFromTransaction(tx, props, setSavingId) {
  if (!tx?.id) return toast.error('Ligne introuvable');
  if (transactionHasProof(tx, props.rows || [])) return toast.success('Preuve / facture déjà ajoutée');
  if ((props.rows || []).some((doc) => documentLinkedToTransaction(doc, tx))) return toast.success('Fiche preuve / facture déjà ouverte');
  try {
    setSavingId(tx.id);
    const doc = {
      id: generateSequentialId('documents', props.rows || []),
      title: `Preuve / facture ${tx.libelle || tx.id}`,
      document_category: tx.type === 'entree' ? 'recu' : 'facture',
      module_source: 'finances',
      entity_type: 'transaction',
      entity_id: tx.id,
      transaction_id: tx.id,
      finance_id: tx.id,
      related_id: tx.related_id || tx.source_record_id || tx.id,
      source_record_id: tx.source_record_id || tx.id,
      statut: 'a_joindre',
      status: 'a_joindre',
      verification_status: 'preuve_manquante',
      montant: toNumber(tx.montant),
      date_document: tx.date || new Date().toISOString().slice(0, 10),
      notes: `Preuve à joindre pour ${tx.libelle || tx.id} · ${fmtCurrency(tx.montant)}`,
    };
    await props.onCreate?.(doc);
    const followUp = buildDocumentProofFollowUp({ document: doc, transaction: tx });
    if (followUp) {
      await props.onCreateTask?.(followUp.task);
      await props.onCreateAlert?.(followUp.alert);
    }
    await props.onRefresh?.();
    await Promise.allSettled([props.onRefreshTasks?.(), props.onRefreshAlertes?.()]);
    toast.success('Fiche preuve créée');
  } catch {
    toast.error('Création de preuve impossible');
  } finally {
    setSavingId('');
  }
}

function DocumentsBridge(props) {
  const [savingId, setSavingId] = useState('');
  const tachesCrud = useCrudModule('taches');
  const alertesCrud = useCrudModule('alertes_center');
  const docs = arr(props.rows);
  const transactions = arr(props.transactions || props.finances);
  const missing = useMemo(() => transactions.filter((tx) => toNumber(tx.montant) > 0 && !transactionHasProof(tx, docs)).slice(0, 8), [transactions, docs]);
  const linked = useMemo(() => docs.filter((d) => d.entity_id || d.transaction_id || d.finance_id || d.related_id).length, [docs]);
  const bridgeProps = { ...props, onCreateTask: props.onCreateTask || tachesCrud.create, onRefreshTasks: props.onRefreshTasks || tachesCrud.refresh, onCreateAlert: props.onCreateAlert || alertesCrud.create, onRefreshAlertes: props.onRefreshAlertes || alertesCrud.refresh };
  return <div className="rounded-2xl border border-[#d6c3a0] bg-white p-5 space-y-4"><div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-widest text-[#8a7456]">Documents reliés</p><h3 className="font-black text-[#2f2415]">Preuves / factures à contrôler</h3><p className="text-sm text-[#8a7456] mt-1">Les montants importants doivent avoir une facture, un reçu ou une preuve. Une fiche “manquante” ne compte pas comme preuve valide.</p></div><div className="grid grid-cols-3 gap-2 text-sm"><Mini icon={FileText} label="Docs" value={docs.length} /><Mini icon={Receipt} label="Reliés" value={linked} /><Mini icon={AlertTriangle} label="À compléter" value={missing.length} /></div></div>{missing.length ? <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">{missing.map((tx) => <div key={tx.id} className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3"><p className="font-bold text-[#2f2415]">{tx.libelle || tx.id}</p><p className="text-xs text-[#8a7456] mt-1">{fmtCurrency(tx.montant)} · {tx.type}</p><button type="button" disabled={savingId === tx.id} className="mt-3 text-sm font-bold text-emerald-700 disabled:opacity-60" onClick={() => createDocFromTransaction(tx, bridgeProps, setSavingId)}><CheckCircle2 size={14} className="inline" /> {savingId === tx.id ? 'Création...' : 'Créer fiche preuve'}</button></div>)}</div> : <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3 text-sm text-[#8a7456]"><CheckCircle2 size={14} className="inline" /> Les preuves importantes sont bien suivies.</div>}</div>;
}
function Mini({ icon: Icon, label, value }) { return <div className="rounded-xl bg-[#fffdf8] border border-[#eadcc2] px-3 py-2 min-w-[100px]"><Icon size={14} className="text-[#9a6b12]" /><b className="block text-[#2f2415]">{value}</b><span className="text-xs text-[#8a7456]">{label}</span></div>; }

export default function DocumentsV2(props) {
  return <div className="space-y-6 documents-mobile-structured"><style>{`@media (max-width: 640px){.documents-mobile-structured .rounded-2xl{border-radius:18px}.documents-mobile-structured table{font-size:12px}.documents-mobile-structured th,.documents-mobile-structured td{padding-left:10px!important;padding-right:10px!important}.documents-mobile-structured .text-2xl{font-size:1.35rem}.documents-mobile-structured .grid{gap:.75rem}.documents-mobile-structured .overflow-x-auto{max-width:100vw}}`}</style>
    <DocumentControlPanel rows={props.rows || []} transactions={props.transactions || props.finances || []} salesOrders={props.salesOrders || []} invoices={props.invoices || []} businessPlans={props.businessPlans || []} investissements={props.investissements || []} onNavigate={props.onNavigate} />
    <ModuleSection icon={ShieldCheck} title="Preuves / factures à compléter" subtitle="Montants qui n’ont pas encore de preuve liée."><DocumentsBridge {...props} /></ModuleSection>
    <ModuleSection icon={FileText} title="Bibliothèque documentaire" subtitle="Documents, pièces, preuves, reçus, factures et fichiers liés à la ferme."><Documents {...props} /></ModuleSection>
  </div>;
}
