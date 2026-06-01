import { FolderOpen, Link2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { createMissingProofTask } from '../services/heyHorizonRecommendationActions.js';
import { summarizeOrphanDocuments } from '../services/documentsOrphanSyncService';

export default function DocumentsOrphanSyncPanel({ documents = [], onApply, busyId, setTab, onNavigate, actionHandlers = {} }) {
  const summary = summarizeOrphanDocuments(documents);
  if (!summary.count) {
    return (
      <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
        <p className="text-sm font-black text-emerald-800 flex items-center gap-2"><FolderOpen size={16} /> Bibliothèque cohérente</p>
        <p className="mt-1 text-sm text-emerald-700">Tous les documents visibles sont rattachés à une opération métier.</p>
      </section>
    );
  }

  const attachTask = async (row) => {
    try {
      await createMissingProofTask({
        transactionLabel: row.title,
        amount: row.amount ? `${row.amount} FCFA` : '—',
        transactionId: row.docId,
        handlers: actionHandlers,
      });
      toast.success(`Tâche créée pour : ${row.title}`);
    } catch (error) {
      toast.error(error.message || 'Création impossible');
    }
  };

  return (
    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#8a7456] font-black flex items-center gap-2"><Link2 size={15} /> Documents orphelins</p>
          <h3 className="text-xl font-black text-[#2f2415] mt-1">Rattacher les fichiers sans source métier</h3>
          <p className="text-sm text-[#8a7456] mt-1">Factures, reçus ou pièces déposées sans lien vente, finance ou module d’origine.</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{summary.label}</div>
      </div>
      <div className="space-y-2">
        {summary.rows.slice(0, 6).map((row) => (
          <div key={row.id} className="flex flex-col gap-2 rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-3 sm:flex-row sm:items-center sm:justify-between">
            <button type="button" onClick={() => setTab?.('Bibliothèque')} className="text-left">
              <b className="text-[#2f2415]">{row.title}</b>
              <p className="text-xs text-[#8a7456]">{row.detail}</p>
            </button>
            <div className="flex gap-2">
              <button type="button" onClick={() => onNavigate?.('finance_pilotage')} className="rounded-lg border border-[#d6c3a0] bg-white px-2 py-1 text-xs font-black">Finance</button>
              <button type="button" disabled={busyId === row.id} onClick={() => (row.finding && onApply ? onApply(row.finding) : attachTask(row))} className="rounded-lg bg-[#22c55e] px-2 py-1 text-xs font-black text-[#052e16] disabled:opacity-50">{busyId === row.id ? '…' : 'Créer tâche'}</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
