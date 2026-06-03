import { AlertTriangle, CheckCircle2, MinusCircle, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { IMPACT_STATUS } from '../../utils/workflowImpactJournal';

const statusMeta = {
  [IMPACT_STATUS.CREATED]: {
    icon: CheckCircle2,
    className: 'text-emerald-700',
    suffix: (row) => row.detail || 'Créé',
  },
  [IMPACT_STATUS.NA]: {
    icon: MinusCircle,
    className: 'text-[#8a7456]',
    suffix: (row) => row.reason || 'Non applicable',
  },
  [IMPACT_STATUS.ERROR]: {
    icon: AlertTriangle,
    className: 'text-red-700',
    suffix: (row) => row.reason || 'Erreur à corriger',
  },
};

export default function WorkflowImpactToast({ journal, toastId }) {
  const rows = journal?.rows || [];
  const hasError = rows.some((row) => row.status === IMPACT_STATUS.ERROR);

  return (
    <div className={`rounded-2xl border bg-[#fffdf8] shadow-lg overflow-hidden ${hasError ? 'border-red-200' : 'border-[#d6c3a0]'}`}>
      <div className={`px-4 py-3 border-b flex items-start justify-between gap-3 ${hasError ? 'border-red-100 bg-red-50' : 'border-[#eadcc2] bg-[#fff9ef]'}`}>
        <div>
          <p className="text-xs uppercase tracking-widest text-[#8a7456] font-black">{journal?.operationLabel || 'Opération'}</p>
          <p className="text-base font-black text-[#2f2415] mt-0.5">{journal?.title || 'Opération enregistrée'}</p>
        </div>
        <button type="button" onClick={() => toast.dismiss(toastId)} className="text-[#8a7456] hover:text-[#2f2415]">
          <X size={16} />
        </button>
      </div>
      <ul className="px-4 py-3 space-y-2 text-sm">
        {rows.map((row) => {
          const meta = statusMeta[row.status] || statusMeta[IMPACT_STATUS.NA];
          const Icon = meta.icon;
          return (
            <li key={row.key} className="flex items-start gap-2">
              <Icon size={15} className={`mt-0.5 shrink-0 ${meta.className}`} />
              <div className="min-w-0">
                <span className="font-semibold text-[#2f2415]">{row.label}</span>
                <span className={`block text-xs ${meta.className}`}>{meta.suffix(row)}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
