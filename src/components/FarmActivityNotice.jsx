import { Sprout } from 'lucide-react';

export default function FarmActivityNotice({ message = '', farmName = '' }) {
  if (!message) return null;
  return (
    <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 flex items-start gap-2">
      <Sprout size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
      <div>
        {farmName ? <p className="font-bold">{farmName}</p> : null}
        <p>{message}</p>
      </div>
    </div>
  );
}
