import { Sprout } from 'lucide-react';

export default function FarmActivityNotice({
  message = '',
  farmName = '',
  actionLabel = '',
  onAction,
}) {
  if (!message) return null;
  return (
    <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 flex items-start gap-2">
      <Sprout size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
      <div className="flex-1">
        {farmName ? <p className="font-bold">{farmName}</p> : null}
        <p>{message}</p>
        {actionLabel && onAction ? (
          <button
            type="button"
            onClick={onAction}
            className="mt-2 inline-flex rounded-xl border border-amber-300 bg-white px-3 py-1.5 text-xs font-black text-amber-900 hover:bg-amber-100"
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
