import { Activity, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { evaluateErpHealth, HEALTH_STATUS } from '../services/erpHealthCheck.js';
import { isBrowserOffline, readOfflineQueue } from '../services/offlineQueueService.js';
import { isSimulatedDataModeEnabled } from '../utils/uiPreferences.js';

const STATUS_STYLE = {
  ok: { dot: 'bg-positive', text: 'text-positive', label: 'Sain' },
  info: { dot: 'bg-horizon-dark', text: 'text-horizon-dark', label: 'Information' },
  warn: { dot: 'bg-vigilance', text: 'text-horizon-dark', label: 'À surveiller' },
  degraded: { dot: 'bg-urgent', text: 'text-urgent', label: 'Dégradé' },
  down: { dot: 'bg-urgent', text: 'text-urgent', label: 'Panne' },
};

function storageAvailable() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    const key = '__hf_health_probe__';
    window.localStorage.setItem(key, '1');
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

function collectReport(dataMap = {}) {
  return evaluateErpHealth({
    dataMap,
    offlineQueue: readOfflineQueue(),
    online: !isBrowserOffline(),
    storageAvailable: storageAvailable(),
    simulatedMode: isSimulatedDataModeEnabled(),
  });
}

/**
 * Centre de santé ERP (HF-P0-007) : rend visibles les dégradations silencieuses
 * (stockage, réseau, file de synchronisation, données non chargées, mode démo).
 */
export default function ErpHealthPanel({ dataMap = {} }) {
  const [tick, setTick] = useState(0);
  const report = useMemo(() => { void tick; return collectReport(dataMap); }, [dataMap, tick]);
  const refresh = useCallback(() => setTick((value) => value + 1), []);

  useEffect(() => {
    const handler = () => setTick((value) => value + 1);
    window.addEventListener('online', handler);
    window.addEventListener('offline', handler);
    window.addEventListener('horizon-farm-data-mode-changed', handler);
    return () => {
      window.removeEventListener('online', handler);
      window.removeEventListener('offline', handler);
      window.removeEventListener('horizon-farm-data-mode-changed', handler);
    };
  }, []);

  const global = STATUS_STYLE[report.status] || STATUS_STYLE.ok;

  return (
    <section className="rounded-2xl border border-line bg-white p-6 shadow-card">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 font-semibold text-earth">
            <Activity size={19} aria-hidden="true" /> Santé du système
          </h2>
          <p className="mt-1 text-sm text-slate">État observable côté client : stockage, réseau, synchronisation, données et services.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center gap-2 rounded-full border border-line bg-card px-3 py-1 text-sm font-semibold ${global.text}`}>
            <span className={`h-2.5 w-2.5 rounded-full ${global.dot}`} aria-hidden="true" />
            {global.label}
          </span>
          <button type="button" onClick={refresh} className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold text-earth hover:bg-card" data-testid="erp-health-refresh">
            <RefreshCw size={15} aria-hidden="true" /> Actualiser
          </button>
        </div>
      </div>

      <div className="divide-y divide-line">
        {report.checks.map((check) => {
          const style = STATUS_STYLE[check.status] || STATUS_STYLE.ok;
          return (
            <div key={check.id} className="grid gap-1 py-3 sm:grid-cols-[1fr_auto] sm:items-start">
              <div className="min-w-0">
                <p className="flex items-center gap-2 font-semibold text-earth">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${style.dot}`} aria-hidden="true" />
                  {check.label}
                </p>
                <p className="mt-0.5 text-sm text-slate">{check.message}</p>
                {check.action ? <p className="mt-0.5 text-xs font-semibold text-horizon-dark">Action : {check.action}</p> : null}
              </div>
              <span className={`text-xs font-semibold sm:text-right ${style.text}`}>{style.label}</span>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-slate">
        Les contrôles approfondis (droits d’accès et intégrité de la base) sont assurés côté serveur et par la validation continue, hors de ce tableau.
      </p>
    </section>
  );
}

export { HEALTH_STATUS };
