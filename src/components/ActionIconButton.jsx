export default function ActionIconButton({ icon: Icon, onClick, title, color = 'emerald', disabled = false }) {
  const tones = {
    emerald: 'hover:text-emerald-400',
    amber: 'hover:text-amber-400',
    red: 'hover:text-red-400',
    whatsapp: 'hover:text-[#25D366]',
    sky: 'hover:text-sky-400',
  };

  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`p-1.5 rounded-lg hover:bg-[#d6c3a0] text-[#8a7456] transition-colors ${tones[color]} disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {Icon ? <Icon size={14} /> : null}
    </button>
  );
}


