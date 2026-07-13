import { useEffect, useState } from 'react';
import { currentBuildSha, isStaleAppBundle, purgeStalePwaCache } from '../services/pwa';

const LIVE_APP_URL = 'https://horizon-farm-git-main-pendathiaws-projects.vercel.app';

export default function ProductionUpdateBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStaleAppBundle()) {
      queueMicrotask(() => setVisible(true));
      return;
    }

    fetch('/api/build-info', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((info) => {
        if (!info?.sha || info.sha === 'local') return;
        const embedded = currentBuildSha();
        if (embedded !== 'dev' && embedded !== info.sha) {
          setVisible(true);
          return;
        }
        const seen = localStorage.getItem('horizon-farm-build-sha');
        if (seen && seen !== info.sha) setVisible(true);
        localStorage.setItem('horizon-farm-build-sha', info.sha);
      })
      .catch(() => {});
  }, []);

  if (!visible) return null;

  const reload = () => purgeStalePwaCache({ reload: true });

  return (
    <div className="fixed inset-x-0 top-0 z-[100] border-b border-vigilance bg-vigilance-bg px-4 py-3 shadow-float">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-horizon-dark">Mise à jour Horizon Farm disponible</p>
          <p className="text-xs text-horizon-dark">
            Cette version est ancienne ou mélange d&apos;anciens fichiers JS (modules qui plantent). Rechargez pour obtenir la version à jour.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={LIVE_APP_URL}
            className="rounded-xl bg-earth px-4 py-2 text-xs font-semibold text-white"
          >
            Ouvrir la version à jour
          </a>
          <button type="button" onClick={reload} className="rounded-xl border border-vigilance bg-white px-4 py-2 text-xs font-semibold text-horizon-dark">
            Recharger
          </button>
          <button type="button" onClick={() => setVisible(false)} className="rounded-xl px-3 py-2 text-xs font-semibold text-horizon-dark">
            Plus tard
          </button>
        </div>
      </div>
    </div>
  );
}
