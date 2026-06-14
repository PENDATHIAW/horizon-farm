export default function RhConfirmBanner({
  open = false,
  title = '',
  message = '',
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  onConfirm,
  onCancel,
  tone = 'warn',
}) {
  if (!open) return null;
  const border = tone === 'danger' ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50';
  const confirmCls = tone === 'danger'
    ? 'bg-red-700 text-white hover:bg-red-800'
    : 'bg-[#2f2415] text-white hover:opacity-90';
  return (
    <div className={`rounded-2xl border p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${border}`}>
      <div>
        <b className="text-sm text-[#2f2415]">{title}</b>
        {message ? <p className="mt-1 text-sm text-[#8a7456]">{message}</p> : null}
      </div>
      <div className="flex gap-2 shrink-0">
        <button type="button" onClick={onCancel} className="rounded-lg border border-[#d6c3a0] bg-white px-3 py-2 text-xs font-black text-[#2f2415]">
          {cancelLabel}
        </button>
        <button type="button" onClick={onConfirm} className={`rounded-lg px-3 py-2 text-xs font-black ${confirmCls}`}>
          {confirmLabel}
        </button>
      </div>
    </div>
  );
}
