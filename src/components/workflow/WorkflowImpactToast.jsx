import { AlertTriangle, CheckCircle2, MinusCircle, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { IMPACT_STATUS } from '../../utils/workflowImpactConstants.js';

const statusMeta = {
  [IMPACT_STATUS.CREATED]: {
    icon: CheckCircle2,
    className: 'text-positive',
    suffix: (row) => row.detail || 'Créé',
  },
  [IMPACT_STATUS.NA]: {
    icon: MinusCircle,
    className: 'text-slate',
    suffix: (row) => row.reason || 'Non applicable',
  },
  [IMPACT_STATUS.ERROR]: {
    icon: AlertTriangle,
    className: 'text-urgent',
    suffix: (row) => row.reason || 'Erreur à corriger',
  },
};

export default function WorkflowImpactToast({ journal, toastId }) {
  const rows = journal?.rows || [];
  const hasError = rows.some((row) => row.status === IMPACT_STATUS.ERROR);

  return (
    <div className={`rounded-2xl border bg-card shadow-float overflow-hidden ${hasError ? 'border-urgent' : 'border-line'}`}>
      <div className={`px-4 py-3 border-b flex items-start justify-between gap-3 ${hasError ? 'border-urgent bg-urgent-bg' : 'border-line bg-vigilance-bg'}`}>
        <div>
          <p className="text-xs uppercase tracking-normal text-slate font-semibold">{journal?.operationLabel || 'Opération'}</p>
          <p className="text-base font-semibold text-earth mt-1">{journal?.title || 'Opération enregistrée'}</p>
        </div>
        <button type="button" onClick={() => toast.dismiss(toastId)} className="text-slate hover:text-earth">
          <X size={16} />
        </button>
      </div>
      <ul className="px-4 py-3 space-y-2 text-sm">
        {rows.map((row) => {
          const meta = statusMeta[row.status] || statusMeta[IMPACT_STATUS.NA];
          const Icon = meta.icon;
          return (
            <li key={row.key} className="flex items-start gap-2">
              <Icon size={15} className={`mt-1 shrink-0 ${meta.className}`} />
              <div className="min-w-0">
                <span className="font-semibold text-earth">{row.label}</span>
                <span className={`block text-xs ${meta.className}`}>{meta.suffix(row)}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
