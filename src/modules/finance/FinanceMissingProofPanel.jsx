import { FileText, Plus } from 'lucide-react';
import { emitHorizonForm } from '../../services/formModalManager.js';
import { fmtCurrency } from '../../utils/format.js';
import { FinanceSection } from './financeUi.jsx';

export default function FinanceMissingProofPanel({ items = [], compact = false }) {
  if (!items.length) return null;

  const today = new Date().toISOString().slice(0, 10);

  return (
    <FinanceSection
      title={compact ? 'Écritures sans justificatif' : 'Conformité · justificatifs manquants'}
      subtitle={compact ? 'Attacher une preuve depuis Trésorerie ou Documents.' : 'Chaque écriture significative doit avoir une pièce justificative.'}
    >
      <div className="divide-y divide-[#eadcc2]/60">
        {items.map((row) => (
          <div key={row.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-black text-[#2f2415]">{row.title}</p>
              <p className="text-xs text-[#8a7456]">
                {String(row.date || '—').slice(0, 10)} · {fmtCurrency(row.amount)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => emitHorizonForm('finances', 'finance_entry', 'Attacher justificatif', { id: row.id, date: row.date || today })}
                className="inline-flex items-center gap-1 rounded-lg border border-[#d6c3a0] bg-white px-3 py-1.5 text-xs font-black text-[#2f2415]"
              >
                <FileText size={12} /> Preuve
              </button>
              {!compact ? (
                <button
                  type="button"
                  onClick={() => emitHorizonForm('documents', 'document_upload', 'Ajouter justificatif', { finance_id: row.id, date: row.date || today })}
                  className="inline-flex items-center gap-1 rounded-lg bg-[#22c55e] px-3 py-1.5 text-xs font-black text-[#052e16]"
                >
                  <Plus size={12} /> Document
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </FinanceSection>
  );
}
