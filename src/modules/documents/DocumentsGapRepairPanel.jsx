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
      <div className="rounded-2xl border border-positive bg-positive-bg p-4 text-sm text-positive">
        Aucun écart documentaire détecté (orphelins, preuves, factures, doublons).
      </div>
    );
  }

  return (
    <section className="rounded-3xl border border-vigilance bg-white p-6 shadow-card">
      <div className="mb-4">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-normal text-horizon-dark">
          <AlertTriangle size={15} /> Écarts documents
        </p>
        <h3 className="mt-1 text-lg font-semibold text-earth">Réparations prioritaires</h3>
      </div>
      <div className="space-y-2">
        {gaps.slice(0, 12).map((gap) => (
          <div key={gap.issue_key} className="flex flex-col gap-2 rounded-2xl border border-line bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <b className="text-sm text-earth">{gap.title}</b>
              <p className="text-xs text-slate">{gap.detail}</p>
            </div>
            {gap.repair === 'link_document' || gap.repair === 'link_proof' || gap.repair === 'link_invoice' ? (
              <button
                type="button"
                onClick={() => {
                  onSelectOrphan?.(gap.record_id);
                  onOpenLink?.(gap);
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-positive px-2 py-1 text-xs font-semibold text-positive"
              >
                <Link2 size={14} /> Lier
              </button>
            ) : (
              <span className="rounded-full border border-line px-2 py-1 text-xs font-semibold text-slate">À vérifier</span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
