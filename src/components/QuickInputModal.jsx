import BaseModal from '../modals/BaseModal.jsx';

export default function QuickInputModal({
  open,
  title,
  description = '',
  label,
  type = 'text',
  value = '',
  onChange,
  options = [],
  submitLabel = 'Valider',
  cancelLabel = 'Annuler',
  onClose,
  onSubmit,
  busy = false,
  required = true,
  min,
  max,
  step,
}) {
  if (!open) return null;

  const trimmed = String(value ?? '').trim();
  const canSubmit = !required || trimmed.length > 0;

  const handleSubmit = () => {
    if (!canSubmit || busy) return;
    onSubmit?.(value);
  };

  const inputClass = 'w-full rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none';

  return (
    <BaseModal
      open={open}
      title={title}
      onClose={onClose}
      footer={(
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-line bg-white px-4 py-2 text-sm font-semibold text-earth">
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={!canSubmit || busy}
            onClick={handleSubmit}
            className="rounded-xl bg-earth px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            {busy ? 'Enregistrement…' : submitLabel}
          </button>
        </div>
      )}
    >
      <div className="space-y-4">
        {description ? <p className="text-sm text-slate">{description}</p> : null}
        <label className="block space-y-1 text-sm">
          {label ? <span className="font-semibold text-earth">{label}</span> : null}
          {type === 'textarea' ? (
            <textarea
              value={value}
              onChange={(event) => onChange?.(event.target.value)}
              rows={4}
              className={inputClass}
            />
          ) : type === 'select' ? (
            <select value={value} onChange={(event) => onChange?.(event.target.value)} className={inputClass}>
              {options.map((option) => {
                const optionValue = typeof option === 'object' ? option.value : option;
                const optionLabel = typeof option === 'object' ? option.label : option;
                return <option key={optionValue} value={optionValue}>{optionLabel}</option>;
              })}
            </select>
          ) : (
            <input
              type={type}
              value={value}
              min={min}
              max={max}
              step={step}
              onChange={(event) => onChange?.(event.target.value)}
              className={inputClass}
            />
          )}
        </label>
      </div>
    </BaseModal>
  );
}
