const VARIANTS = Object.freeze({
  primary: 'border border-horizon bg-horizon text-earth shadow-card hover:bg-horizon-dark hover:text-pure',
  secondary: 'border border-earth bg-earth text-pure hover:bg-leaf',
  outline: 'border border-line bg-pure text-ink hover:border-leaf hover:bg-mist',
  danger: 'border border-urgent bg-pure text-urgent hover:bg-urgent-bg',
  amber: 'border border-vigilance bg-vigilance-bg text-horizon-dark hover:bg-pure',
  whatsapp: 'border border-positive bg-positive-bg text-positive hover:bg-pure',
});

export default function Btn({ children, variant = 'primary', onClick, icon: Icon, small, type = 'button', disabled, ariaLabel, title, className = '' }) {
  const dimensions = small ? 'min-h-11 px-3 py-2 text-xs' : 'min-h-11 px-4 py-2 text-sm';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel || (typeof children === 'string' ? children : undefined)}
      title={title}
      className={`inline-flex items-center justify-center gap-2 rounded-control font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${dimensions} ${VARIANTS[variant] || VARIANTS.outline} ${className}`}
    >
      {Icon ? <Icon size={small ? 14 : 17} aria-hidden="true" /> : null}
      {children}
    </button>
  );
}
