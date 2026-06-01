import { useEffect, useState } from 'react';
import { currentAppScriptSrc, isStaleAppBundle, purgeStalePwaCache } from '../services/pwa.js';

export default function AppVersionBadge() {
  const [buildSha, setBuildSha] = useState('');
  const [scriptSrc, setScriptSrc] = useState('');
  const stale = isStaleAppBundle();

  useEffect(() => {
    setScriptSrc(currentAppScriptSrc());
    fetch('/api/build-info', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((info) => setBuildSha(info?.sha?.slice(0, 7) || ''))
      .catch(() => {});
  }, []);

  if (!buildSha && !stale) return null;

  return (
    <div className="fixed bottom-3 right-3 z-[90] max-w-xs rounded-xl border border-[#d6c3a0] bg-white/95 px-3 py-2 text-[10px] shadow-lg backdrop-blur">
      {stale ? (
        <div className="space-y-2">
          <p className="font-black text-amber-900">Version locale obsolète (cache PWA)</p>
          <p className="text-amber-800">Bundle: {scriptSrc || 'inconnu'}</p>
          <button
            type="button"
            onClick={() => purgeStalePwaCache({ reload: true })}
            className="rounded-lg bg-[#2f2415] px-3 py-1.5 text-[10px] font-black text-white"
          >
            Forcer la mise à jour
          </button>
        </div>
      ) : (
        <p className="text-[#8a7456]">
          Build <span className="font-black text-[#2f2415]">{buildSha || '…'}</span>
        </p>
      )}
    </div>
  );
}
