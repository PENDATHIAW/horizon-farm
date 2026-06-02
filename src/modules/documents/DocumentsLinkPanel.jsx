import { Link2, Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { fmtCurrency } from '../../utils/format';
import {
  commitDocumentLink,
  DOCUMENT_TARGET_TYPES,
  isDocumentOrphan,
  listLinkTargetOptions,
  targetTypeOptions,
} from '../../utils/documentsWorkflow.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const labelOf = (row = {}) => row.title || row.nom || row.name || row.filename || row.libelle || row.id || 'Document';

export default function DocumentsLinkPanel({
  documents = [],
  transactions = [],
  salesOrders = [],
  payments = [],
  invoices = [],
  stocks = [],
  healthRecords = [],
  equipment = [],
  cultures = [],
  people = [],
  tasks = [],
  alertes = [],
  preselectedDocumentId = '',
  onLink,
  compact = false,
}) {
  const orphans = useMemo(() => arr(documents).filter(isDocumentOrphan), [documents]);
  const [documentId, setDocumentId] = useState(preselectedDocumentId || orphans[0]?.id || '');
  const [targetType, setTargetType] = useState(DOCUMENT_TARGET_TYPES.FINANCE);
  const [targetId, setTargetId] = useState('');
  const [busy, setBusy] = useState(false);

  const context = useMemo(() => ({
    documents,
    transactions,
    salesOrders,
    payments,
    invoices,
    stocks,
    healthRecords,
    equipment,
    cultures,
    people,
    tasks,
    alertes,
  }), [documents, transactions, salesOrders, payments, invoices, stocks, healthRecords, equipment, cultures, people, tasks, alertes]);

  const targetOptions = useMemo(
    () => listLinkTargetOptions(targetType, context),
    [targetType, context],
  );

  const selectedDoc = arr(documents).find((doc) => String(doc.id) === String(documentId));

  const submit = async () => {
    if (!onLink) return toast.error('Liaison document indisponible.');
    setBusy(true);
    try {
      await onLink({
        document_id: documentId,
        target_type: targetType,
        target_id: targetId || targetOptions[0]?.value,
      });
      toast.success('Document lié à l’opération source');
      setTargetId('');
    } catch (error) {
      toast.error(error.message || 'Liaison impossible');
    } finally {
      setBusy(false);
    }
  };

  if (!orphans.length && !preselectedDocumentId) {
    return compact ? null : (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
        Aucun document orphelin — les preuves sont rattachées depuis les formulaires source.
      </div>
    );
  }

  return (
    <section className={`rounded-3xl border border-[#d6c3a0] bg-white shadow-sm ${compact ? 'p-4' : 'p-5'}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#8a7456]">
            <Link2 size={15} /> Lier document
          </p>
          <h3 className="mt-1 text-lg font-black text-[#2f2415]">Rattacher une preuve orpheline</h3>
          <p className="mt-1 text-sm text-[#8a7456]">
            Documents sert à la bibliothèque et aux réparations — les opérations métier restent le point de départ normal.
          </p>
        </div>
        {!compact ? (
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-black text-amber-800">
            {orphans.length} orphelin(s)
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <label className="space-y-1">
          <span className="text-xs font-bold text-[#8a7456]">Document orphelin</span>
          <select
            value={documentId}
            onChange={(e) => setDocumentId(e.target.value)}
            className="w-full min-h-[44px] rounded-xl border border-[#d6c3a0] bg-[#fffdf8] px-3 py-2 text-sm"
          >
            {arr(documents).filter((doc) => isDocumentOrphan(doc) || String(doc.id) === String(documentId)).map((doc) => (
              <option key={doc.id} value={doc.id}>{labelOf(doc)}</option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-xs font-bold text-[#8a7456]">Opération source</span>
          <select
            value={targetType}
            onChange={(e) => { setTargetType(e.target.value); setTargetId(''); }}
            className="w-full min-h-[44px] rounded-xl border border-[#d6c3a0] bg-[#fffdf8] px-3 py-2 text-sm"
          >
            {targetTypeOptions().map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-xs font-bold text-[#8a7456]">Enregistrement</span>
          <select
            value={targetId || targetOptions[0]?.value || ''}
            onChange={(e) => setTargetId(e.target.value)}
            className="w-full min-h-[44px] rounded-xl border border-[#d6c3a0] bg-[#fffdf8] px-3 py-2 text-sm"
          >
            {targetOptions.length ? targetOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}{opt.amount ? ` · ${fmtCurrency(opt.amount)}` : ''}
              </option>
            )) : <option value="">Aucune opération disponible</option>}
          </select>
        </label>
      </div>

      {selectedDoc ? (
        <p className="mt-3 text-xs text-[#8a7456]">
          Fichier : {selectedDoc.file_url || selectedDoc.url || '—'} · Montant doc : {fmtCurrency(selectedDoc.montant ?? selectedDoc.amount)}
        </p>
      ) : null}

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          disabled={busy || !documentId || !targetOptions.length}
          onClick={submit}
          className="inline-flex items-center gap-2 rounded-xl bg-[#22c55e] px-4 py-2 text-sm font-black text-[#052e16] disabled:opacity-50"
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Link2 size={16} />}
          {busy ? 'Liaison…' : 'Lier le document'}
        </button>
      </div>
    </section>
  );
}

export { commitDocumentLink };
