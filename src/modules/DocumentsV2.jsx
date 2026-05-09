import { AlertTriangle, CheckCircle2, FileText, Receipt } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { transactionHasProof } from '../utils/accountingProof';
import { fmtCurrency, toNumber } from '../utils/format';
import { generateSequentialId } from '../utils/ids';
import Documents from './Documents.jsx';

const arr = (value) => Array.isArray(value) ? value : [];

async function createDocFromTransaction(tx, props, setSavingId) {
  if (!tx?.id) return toast.error('Transaction invalide');
  if (transactionHasProof(tx, props.rows || [])) return toast.success('Justificatif déjà lié');
  try {
    setSavingId(tx.id);
    await props.onCreate?.({
      id: generateSequentialId('documents', props.rows || []),
      title: `Justificatif ${tx.libelle || tx.id}`,
      document_category: tx.type === 'entree' ? 'recu' : 'facture',
      module_source: 'finances',
      entity_type: 'transaction',
      entity_id: tx.id,
      transaction_id: tx.id,
      finance_id: tx.id,
      related_id: tx.related_id || tx.source_record_id || tx.id,
      source_record_id: tx.source_record_id || tx.id,
      notes: `Preuve à joindre pour ${tx.libelle || tx.id} · ${fmtCurrency(tx.montant)}`,
    });
    await props.onRefresh?.();
    toast.success('Fiche preuve créée');
  } catch {
    toast.error('Création de preuve impossible');
  } finally {
    setSavingId('');
  }
}

function DocumentsBridge(props) {
  const [savingId, setSavingId] = useState('');
  const docs = arr(props.rows);
  const transactions = arr(props.transactions || props.finances);
  const missing = useMemo(() => transactions
    .filter((tx) => toNumber(tx.montant) > 0 && !transactionHasProof(tx, docs))
    .slice(0, 8), [transactions, docs]);
  const linked = useMemo(() => docs.filter((d) => d.entity_id || d.transaction_id || d.finance_id || d.related_id).length, [docs]);
  return (
    <div className="rounded-2xl border border-[#d6c3a0] bg-white p-5 space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#8a7456]">Documents connectés</p>
          <h3 className="font-black text-[#2f2415]">Justificatifs, comptabilité et contrôle</h3>
          <p className="text-sm text-[#8a7456] mt-1">Les transactions importantes doivent avoir une facture, un reçu ou une preuve liée.</p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-sm"><Mini icon={FileText} label="Docs" value={docs.length} /><Mini icon={Receipt} label="Liés" value={linked} /><Mini icon={AlertTriangle} label="À compléter" value={missing.length} /></div>
      </div>
      {missing.length ? <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">{missing.map((tx) => <div key={tx.id} className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3"><p className="font-bold text-[#2f2415]">{tx.libelle || tx.id}</p><p className="text-xs text-[#8a7456] mt-1">{fmtCurrency(tx.montant)} · {tx.type}</p><button type="button" disabled={savingId === tx.id} className="mt-3 text-sm font-bold text-emerald-700 disabled:opacity-60" onClick={() => createDocFromTransaction(tx, props, setSavingId)}><CheckCircle2 size={14} className="inline" /> {savingId === tx.id ? 'Création...' : 'Créer fiche preuve'}</button></div>)}</div> : <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3 text-sm text-[#8a7456]"><CheckCircle2 size={14} className="inline" /> Documents et transactions sont cohérents.</div>}
    </div>
  );
}
function Mini({ icon: Icon, label, value }) { return <div className="rounded-xl bg-[#fffdf8] border border-[#eadcc2] px-3 py-2 min-w-[100px]"><Icon size={14} className="text-[#9a6b12]" /><b className="block text-[#2f2415]">{value}</b><span className="text-xs text-[#8a7456]">{label}</span></div>; }

export default function DocumentsV2(props) { return <div className="space-y-6"><DocumentsBridge {...props} /><Documents {...props} /></div>; }
