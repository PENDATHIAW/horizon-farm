import { AlertTriangle, Link2 } from 'lucide-react';
import { buildDocumentsGapRows } from '../../utils/documentsIntegrity.js';



export default function DocumentsGapRepairPanel({
  documents = [],
  transactions = [],
  salesOrders = [],
  payments = [],
  invoices = [],
  onSelectOrphan,
  onOpenLink,
}) {
  const gaps = buildDocumentsGapRows({ documents, transactions, salesOrders, payments, invoices });

  if (!gaps.length) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
        Aucun écart documentaire détecté (orphelins, preuves, factures, doublons).
      </div>
    );
  }

  return (
    <section className="rounded-3xl border border-amber-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <p className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-amber-700">
          <AlertTriangle size={15} /> Écarts documents
        </p>
        <h3 className="mt-1 text-lg font-black text-[#2f2415]">Réparations prioritaires</h3>
      </div>
      <div className="space-y-2">
        {gaps.slice(0, 12).map((gap) => (
          <div key={gap.issue_key} className="flex flex-col gap-2 rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <b className="text-sm text-[#2f2415]">{gap.title}</b>
              <p className="text-xs text-[#8a7456]">{gap.detail}</p>
            </div>
            {gap.repair === 'link_document' || gap.repair === 'link_proof' || gap.repair === 'link_invoice' ? (
              <button
                type="button"
                onClick={() => {
                  onSelectOrphan?.(gap.record_id);
                  onOpenLink?.(gap);
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 px-2 py-1 text-xs font-black text-emerald-700"
              >
                <Link2 size={14} /> Lier
              </button>
            ) : (
              <span className="rounded-full border border-[#eadcc2] px-2 py-0.5 text-xs font-black text-[#8a7456]">À vérifier</span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
