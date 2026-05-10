const STORAGE_KEY = 'horizon_farm_module_report_exports';

export function readModuleReportExports() {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveModuleReportExport(entry) {
  if (typeof window === 'undefined') return null;
  const exportsList = readModuleReportExports();
  const item = {
    id: entry.id || `EXPORT-${Date.now()}`,
    created_at: entry.created_at || new Date().toISOString(),
    module: entry.module || 'module',
    title: entry.title || 'Rapport module',
    period: entry.period || 'Toutes les périodes',
    format: entry.format || 'json',
    payload: entry.payload || {},
  };
  const next = [item, ...exportsList].slice(0, 100);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent('horizon-farm-report-export-created', { detail: item }));
  return item;
}

export function downloadJsonReport({ filename, payload }) {
  if (typeof document === 'undefined') return;
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `rapport-module-${Date.now()}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
