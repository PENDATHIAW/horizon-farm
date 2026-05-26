const sizeMap = {
  compact: {
    wrapper: 'w-10 h-10 rounded-2xl p-1.5',
    image: 'w-full h-full object-contain',
  },
  sidebar: {
    wrapper: 'w-11 h-11 rounded-2xl p-1.5',
    image: 'w-full h-full object-contain',
  },
  header: {
    wrapper: 'w-28 h-10 rounded-xl px-2 py-1',
    image: 'w-full h-full object-contain',
  },
  login: {
    wrapper: 'w-64 h-40 rounded-[2rem] px-5 py-4',
    image: 'w-full h-full object-contain',
  },
};

export default function BrandLogo({ variant = 'sidebar', showText = false, className = '' }) {
  const styles = sizeMap[variant] || sizeMap.sidebar;
  const logoSrc = variant === 'compact' ? '/brand-icon-192.png' : '/brand-logo.png';

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className={`${styles.wrapper} bg-white border border-[#dfe7dd] shadow-sm shadow-emerald-900/10 flex items-center justify-center overflow-hidden shrink-0 ring-1 ring-white/80`}>
        <img src={logoSrc} alt="Horizon Farm" className={styles.image} />
      </div>
      {showText ? (
        <div className="min-w-0">
          <div className="font-black text-[#1f1f1d] text-sm leading-tight truncate tracking-tight">Horizon Farm</div>
          <div className="text-[10px] text-[#0f6b57] font-bold tracking-[0.18em] truncate">DE LA TERRE À L'HORIZON</div>
        </div>
      ) : null}
    </div>
  );
}
