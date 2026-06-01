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
  const logoSrc = variant === 'compact' ? '/brand-logo.svg' : '/brand-logo.svg';

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className={`${styles.wrapper} bg-white border border-[#d1e5d1] shadow-sm shadow-[#d1e5d1]/30 flex items-center justify-center overflow-hidden shrink-0`}>
        <img src={logoSrc} alt="Horizon Farm" className={styles.image} />
      </div>
      {showText ? (
        <div className="min-w-0">
          <div className="font-black text-[#052e16] text-sm leading-tight truncate">HORIZON FARM</div>
          <div className="text-[10px] text-[#15803d] font-semibold tracking-widest truncate">DE LA TERRE A L'HORIZON</div>
        </div>
      ) : null}
    </div>
  );
}
