import { runErpHealthEngine, loadLastHealthEngineSnapshot } from '../../services/erpHealthEngine';

let cachedFingerprint = null;
let cachedReport = null;

/** Cache Santé ERP par empreinte données - mêmes résultats, moins de recalculs. */
export function getDashboardHealthReport(dataFingerprint, buildData) {
  const fingerprint = String(dataFingerprint || '');
  if (fingerprint && fingerprint === cachedFingerprint && cachedReport) {
    return cachedReport;
  }

  const report = runErpHealthEngine(buildData());
  const snap = loadLastHealthEngineSnapshot();
  if (snap?.autoExecution) report.autoExecution = snap.autoExecution;
  if (snap?.counts?.ux != null && report.counts) report.counts.ux = snap.counts.ux;

  cachedFingerprint = fingerprint;
  cachedReport = report;
  return report;
}

export function resetDashboardHealthCacheForTests() {
  cachedFingerprint = null;
  cachedReport = null;
}
