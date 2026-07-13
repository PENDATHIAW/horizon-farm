import { Sprout } from 'lucide-react';

export default function FarmActivityNotice({
  message = '',
  farmName = '',
  actionLabel = '',
  onAction,
}) {
  if (!message) return null;
  return (
    <div className="mb-4 rounded-2xl border border-vigilance bg-vigilance-bg px-4 py-3 text-sm text-horizon-dark flex items-start gap-2">
      <Sprout size={16} className="mt-1 shrink-0" aria-hidden="true" />
      <div className="flex-1">
        {farmName ? <p className="font-semibold">{farmName}</p> : null}
        <p>{message}</p>
        {actionLabel && onAction ? (
          <button
            type="button"
            onClick={onAction}
            className="mt-2 inline-flex rounded-xl border border-vigilance bg-white px-3 py-2 text-xs font-semibold text-horizon-dark hover:bg-vigilance-bg"
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
