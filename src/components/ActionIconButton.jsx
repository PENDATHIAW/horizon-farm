export default function ActionIconButton({ icon: Icon, onClick, title, ariaLabel, color = 'emerald', disabled = false }) {
  const tones = {
    emerald: 'hover:text-emerald-600 focus-visible:ring-emerald-500/25',
    amber: 'hover:text-amber-600 focus-visible:ring-amber-500/25',
    red: 'hover:text-red-600 focus-visible:ring-red-500/25',
    whatsapp: 'hover:text-[#168a3d] focus-visible:ring-[#25D366]/25',
    sky: 'hover:text-sky-600 focus-visible:ring-sky-500/25',
  };
  const label = ariaLabel || title || 'Action';

  return (
    <button
      type="button"
      title={title || label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-transparent text-[#8a7456] transition-all duration-200 hover:bg-[#fff8e8] hover:border-[#d6c3a0] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-4 ${tones[color] || tones.emerald}`}
    >
      {Icon ? <Icon size={17} aria-hidden="true" /> : null}
    </button>
  );
}
