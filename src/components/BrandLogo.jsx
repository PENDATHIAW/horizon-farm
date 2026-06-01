const sizeMap = {
  compact: {
    wrapper: 'w-10 h-10 rounded-2xl p-1',
    image: 'w-full h-full object-contain',
    src: '/brand-logo-transparent.png',
  },
  sidebar: {
    wrapper: 'w-11 h-11 rounded-2xl p-1',
    image: 'w-full h-full object-contain',
    src: '/brand-logo-transparent.png',
  },
  header: {
    wrapper: 'w-32 h-12 rounded-xl px-1 py-0.5',
    image: 'w-full h-full object-contain',
    src: '/brand-logo-transparent.png',
  },
  login: {
    wrapper: 'w-64 h-auto',
    image: 'w-full h-auto object-contain',
    src: '/brand-logo-transparent.png',
  },
};

export default function BrandLogo({ variant = 'sidebar', showText = false, className = '' }) {
  const styles = sizeMap[variant] || sizeMap.sidebar;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className={`${styles.wrapper} flex items-center justify-center overflow-hidden shrink-0`}>
        <img src={styles.src} alt="Horizon Farm" className={styles.image} />
      </div>
      {showText ? (
        <div className="min-w-0">
          <div className="font-black text-[#052e16] text-sm leading-tight truncate">HORIZON FARM</div>
          <div className="text-[10px] text-[#15803d] font-semibold tracking-widest truncate">DE LA TERRE A L&apos;HORIZON</div>
        </div>
      ) : null}
    </div>
  );
}
