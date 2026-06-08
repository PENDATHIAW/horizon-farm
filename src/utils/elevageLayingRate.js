/**
 * Taux de ponte officiel Élevage V2.
 * Formule : taux_ponte = œufs produits / pondeuses actives × 100
 */

import { avicoleActiveCount } from './avicoleMetrics.js';
import { toNumber } from './format.js';

export const LAYING_RATE_NOT_CALCULABLE = 'Taux de ponte non calculable';

const arr = (value) => (Array.isArray(value) ? value : []);
const n = (value) => toNumber(value);

export function eggCountFromLog(log = {}) {
  return n(log.oeufs_produits ?? log.eggs_count ?? log.eggs ?? log.quantity);
}

export function activeLayersFromLot(lot = {}) {
  return avicoleActiveCount(lot);
}

/** Calcul officiel pour une journée ou un ramassage. */
export function computeOfficialLayingRate({ eggsProduced = 0, activeLayers = 0 } = {}) {
  const eggs = Math.max(0, n(eggsProduced));
  const birds = n(activeLayers);
  if (birds <= 0) {
    return {
      rate: null,
      calculable: false,
      label: LAYING_RATE_NOT_CALCULABLE,
      eggs,
      activeLayers: birds,
    };
  }
  const rate = Math.round((eggs / birds) * 1000) / 10;
  return {
    rate,
    calculable: true,
    label: `${rate}%`,
    eggs,
    activeLayers: birds,
  };
}

export function logsForLot(productionLogs = [], lotId = '') {
  const id = String(lotId || '');
  return arr(productionLogs).filter((log) => String(log.lot_id || log.related_id || '') === id);
}

/** Taux officiel lot — dernier ramassage ou date ciblée. */
export function computeLotOfficialLayingRate(lot = {}, productionLogs = [], options = {}) {
  const active = activeLayersFromLot(lot);
  const logs = logsForLot(productionLogs, lot.id);
  const targetDate = options.date ? String(options.date).slice(0, 10) : '';

  let sourceLog = null;
  if (targetDate) {
    sourceLog = logs.find((log) => String(log.date || log.created_at || '').slice(0, 10) === targetDate);
  } else if (logs.length) {
    sourceLog = [...logs].sort((a, b) => String(b.date || b.created_at || '').localeCompare(String(a.date || a.created_at || '')))[0];
  }

  if (!sourceLog) {
    return computeOfficialLayingRate({ eggsProduced: 0, activeLayers: active });
  }

  const result = computeOfficialLayingRate({
    eggsProduced: eggCountFromLog(sourceLog),
    activeLayers: active,
  });
  return {
    ...result,
    logId: sourceLog.id,
    date: String(sourceLog.date || sourceLog.created_at || '').slice(0, 10),
    taux_ponte: result.calculable ? result.rate : null,
    taux_ponte_calcule: result.calculable ? result.rate : null,
  };
}

/** Moyenne fenêtre glissante (jours) — œufs cumulés / (pondeuses × jours). */
export function computeWindowLayingRate(lot = {}, productionLogs = [], windowDays = 7) {
  const active = activeLayersFromLot(lot);
  const logs = logsForLot(productionLogs, lot.id);
  if (!active || !logs.length) {
    return computeOfficialLayingRate({ eggsProduced: 0, activeLayers: active });
  }
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - Math.max(1, windowDays));
  const cutoffIso = cutoff.toISOString().slice(0, 10);
  const recent = logs.filter((log) => String(log.date || log.created_at || '').slice(0, 10) >= cutoffIso);
  if (!recent.length) {
    return computeLotOfficialLayingRate(lot, productionLogs);
  }
  const totalEggs = recent.reduce((sum, log) => sum + eggCountFromLog(log), 0);
  const days = Math.max(1, recent.length);
  return computeOfficialLayingRate({
    eggsProduced: totalEggs / days,
    activeLayers: active,
  });
}

export function formatOfficialLayingRate(result = {}) {
  if (!result?.calculable || result.rate == null) return LAYING_RATE_NOT_CALCULABLE;
  return `${result.rate}%`;
}

/** Agrégat résumé Élevage — lots pondeuses actifs. */
export function aggregateSummaryLayingRate(lots = [], productionLogs = [], windowDays = 7) {
  const layers = arr(lots).filter((lot) => {
    const type = String(lot.type || lot.type_lot || lot.categorie || '').toLowerCase();
    return type.includes('pondeuse') || type.includes('ponte') || type.includes('oeuf') || type.includes('œuf');
  });
  if (!layers.length) {
    return { rate: null, calculable: false, label: LAYING_RATE_NOT_CALCULABLE, activeLayers: 0 };
  }
  const activeLayers = layers.reduce((sum, lot) => sum + activeLayersFromLot(lot), 0);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - Math.max(1, windowDays));
  const cutoffIso = cutoff.toISOString().slice(0, 10);
  const lotIds = new Set(layers.map((l) => String(l.id)));
  const recentLogs = arr(productionLogs).filter(
    (log) => lotIds.has(String(log.lot_id || '')) && String(log.date || log.created_at || '').slice(0, 10) >= cutoffIso,
  );
  if (!activeLayers || !recentLogs.length) {
    return { rate: null, calculable: false, label: LAYING_RATE_NOT_CALCULABLE, activeLayers };
  }
  const totalEggs = recentLogs.reduce((sum, log) => sum + eggCountFromLog(log), 0);
  const days = Math.max(1, new Set(recentLogs.map((log) => String(log.date || '').slice(0, 10))).size);
  return computeOfficialLayingRate({ eggsProduced: totalEggs / days, activeLayers });
}
