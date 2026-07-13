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
      <div className="divide-y divide-line/60">
        {items.map((row) => (
          <div key={row.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-earth">{row.title}</p>
              <p className="text-xs text-slate">
                {String(row.date || '—').slice(0, 10)} · {fmtCurrency(row.amount)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => emitHorizonForm('finances', 'finance_entry', 'Attacher justificatif', { id: row.id, date: row.date || today })}
                className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-3 py-2 text-xs font-semibold text-earth"
              >
                <FileText size={12} /> Preuve
              </button>
              {!compact ? (
                <button
                  type="button"
                  onClick={() => emitHorizonForm('documents', 'document_upload', 'Ajouter justificatif', { finance_id: row.id, date: row.date || today })}
                  className="inline-flex items-center gap-1 rounded-lg bg-leaf px-3 py-2 text-xs font-semibold text-earth"
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
