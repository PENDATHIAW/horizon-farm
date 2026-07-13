export default function ActionIconButton({ icon: Icon, onClick, title, ariaLabel, color = 'emerald', disabled = false }) {
  const tones = {
    emerald: 'hover:text-positive focus-visible:ring-positive',
    amber: 'hover:text-horizon-dark focus-visible:ring-vigilance',
    red: 'hover:text-urgent focus-visible:ring-urgent',
    whatsapp: 'hover:text-leaf focus-visible:ring-positive/25',
    sky: 'hover:text-neutral focus-visible:ring-line',
  };
  const label = ariaLabel || title || 'Action';

  return (
    <button
      type="button"
      title={title || label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-transparent text-slate transition-all duration-200 hover:bg-vigilance-bg hover:border-line disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-4 ${tones[color] || tones.emerald}`}
    >
      {Icon ? <Icon size={17} aria-hidden="true" /> : null}
    </button>
  );
}
