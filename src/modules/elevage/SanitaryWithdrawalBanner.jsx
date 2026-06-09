import { AlertTriangle } from 'lucide-react';
import {
  findActiveWithdrawals,
  formatWithdrawalLabel,
} from '../../utils/sanitaryWithdrawal.js';

export default function SanitaryWithdrawalBanner({ healthRows = [], className = '' }) {
  const active = findActiveWithdrawals(healthRows);
  if (!active.length) return null;

  return (
    <div
      className={`rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 ${className}`}
      role="alert"
    >
      <p className="flex items-center gap-2 font-black">
        <AlertTriangle size={18} className="shrink-0" />
        Délai sanitaire en cours — vente et transformation bloquées
      </p>
      <ul className="mt-2 space-y-1 text-red-800">
        {active.slice(0, 5).map((row) => (
          <li key={row.id || formatWithdrawalLabel(row)}>{formatWithdrawalLabel(row)}</li>
        ))}
        {active.length > 5 ? (
          <li className="text-xs font-bold">+{active.length - 5} autre(s) traitement(s) actif(s)</li>
        ) : null}
      </ul>
      <p className="mt-2 text-xs text-red-700">
        Les raccourcis Commercial et transformation demandent une confirmation explicite si vous dérogez.
      </p>
    </div>
  );
}
