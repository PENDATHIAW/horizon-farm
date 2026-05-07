export default function Btn({ children, variant = 'primary', onClick, icon: Icon, small, type = 'button', disabled }) {
  const cls = {
    primary: 'bg-[#c9a96a] hover:bg-[#b89354] text-[#2f2415] font-semibold border border-[#b89354]',
    outline: 'border border-[#b6975f] text-[#7a6240] hover:bg-[#f3e9d5]',
    danger: 'bg-red-500/10 border border-red-500/30 text-red-500 hover:bg-red-500/20',
    amber: 'bg-amber-500/15 border border-amber-500/30 text-amber-600 hover:bg-amber-500/25',
    whatsapp: 'bg-[#25D366]/10 border border-[#25D366]/30 text-[#1EA952] hover:bg-[#25D366]/20',
  }[variant];

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-2 px-3 ${small ? 'py-1.5 text-xs' : 'py-2 text-sm'} rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${cls}`}
    >
      {Icon ? <Icon size={small ? 12 : 14} /> : null}
      {children}
    </button>
  );
}

