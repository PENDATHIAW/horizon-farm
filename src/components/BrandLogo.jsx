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
    wrapper: 'w-32 h-12 rounded-xl px-1 py-1',
    image: 'w-full h-full object-contain',
    src: '/brand-logo-transparent.png',
  },
  login: {
    wrapper: 'w-64 h-auto',
    image: 'w-full h-auto object-contain',
    src: '/brand-logo-transparent.png',
  },
};

export default function BrandLogo({ variant = 'sidebar', showText = false, inverse = false, className = '' }) {
  const styles = sizeMap[variant] || sizeMap.sidebar;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className={`${styles.wrapper} ${inverse ? 'bg-pure' : ''} flex items-center justify-center overflow-hidden shrink-0`}>
        <img src={styles.src} alt="Horizon Farm" className={styles.image} />
      </div>
      {showText ? (
        <div className="min-w-0">
          <div className={`truncate font-display text-sm font-semibold leading-tight ${inverse ? 'text-pure' : 'text-earth'}`}>HORIZON FARM</div>
          <div className={`truncate text-meta font-medium ${inverse ? 'text-line' : 'text-leaf'}`}>DE LA TERRE A L&apos;HORIZON</div>
        </div>
      ) : null}
    </div>
  );
}
