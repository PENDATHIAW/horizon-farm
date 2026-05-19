export default function Btn({ children, variant = 'primary', onClick, icon: Icon, small, type = 'button', disabled, ariaLabel, title, className = '' }) {
  const cls = {
    primary: 'bg-[#2f2415] hover:bg-[#3d2f1d] text-white border border-[#2f2415] shadow-sm shadow-[#2f2415]/10',
    outline: 'bg-white/70 border border-[#d6c3a0] text-[#7a6240] hover:bg-[#fffdf8] hover:border-[#c9a96a]',
    danger: 'bg-red-50 border border-red-200 text-red-600 hover:bg-red-100',
    amber: 'bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100',
    whatsapp: 'bg-[#25D366]/10 border border-[#25D366]/25 text-[#168a3d] hover:bg-[#25D366]/20',
  }[variant] || '';

  const compact = small ? 'min-h-[36px] px-3 py-1.5 text-xs rounded-xl' : 'min-h-[44px] px-4 py-2.5 text-sm rounded-2xl';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel || (typeof children === 'string' ? children : undefined)}
      title={title}
      className={`inline-flex items-center justify-center gap-2 ${compact} font-black transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#c9a96a]/30 ${cls} ${className}`}
    >
      {Icon ? <Icon size={small ? 13 : 16} aria-hidden="true" /> : null}
      {children}
    </button>
  );
}
