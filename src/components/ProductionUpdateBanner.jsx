import { useEffect, useState } from 'react';

const STALE_SCRIPT_MARKERS = ['index-DrX_eSIh.js'];
const LIVE_APP_URL = 'https://horizon-farm-git-main-pendathiaws-projects.vercel.app';

function currentScriptMarker() {
  const script = document.querySelector('script[src*="/assets/index-"]');
  const src = script?.getAttribute('src') || '';
  return STALE_SCRIPT_MARKERS.find((marker) => src.includes(marker)) || '';
}

export default function ProductionUpdateBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stale = currentScriptMarker();
    if (stale) {
      setVisible(true);
      return;
    }

    fetch('/api/build-info', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((info) => {
        if (!info?.sha || info.sha === 'local') return;
        const seen = localStorage.getItem('horizon-farm-build-sha');
        if (seen && seen !== info.sha) setVisible(true);
        localStorage.setItem('horizon-farm-build-sha', info.sha);
      })
      .catch(() => {});
  }, []);

  if (!visible) return null;

  const reload = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => Promise.all(regs.map((reg) => reg.unregister()))).finally(() => {
        window.location.reload();
      });
      return;
    }
    window.location.reload();
  };

  return (
    <div className="fixed inset-x-0 top-0 z-[100] border-b border-amber-300 bg-amber-50 px-4 py-3 shadow-lg">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-black text-amber-950">Mise à jour Horizon Farm disponible</p>
          <p className="text-xs text-amber-900">
            Cette version est ancienne (onglets annexes et correctifs récents absents). Ouvrez la version à jour ou rechargez après promotion Vercel Production.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={LIVE_APP_URL}
            className="rounded-xl bg-[#2f2415] px-4 py-2 text-xs font-black text-white"
          >
            Ouvrir la version à jour
          </a>
          <button type="button" onClick={reload} className="rounded-xl border border-amber-300 bg-white px-4 py-2 text-xs font-black text-amber-950">
            Recharger
          </button>
          <button type="button" onClick={() => setVisible(false)} className="rounded-xl px-3 py-2 text-xs font-bold text-amber-800">
            Plus tard
          </button>
        </div>
      </div>
    </div>
  );
}
