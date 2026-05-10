import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const STORAGE_KEY = 'horizon_farm_reports_module_exports';

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
    id: entry.id || `RPT-${Date.now()}`,
    created_at: entry.created_at || new Date().toISOString(),
    module: entry.module || 'Module',
    title: entry.title || 'Rapport module',
    period: entry.period || 'Toutes les périodes',
    status: 'genere',
    channel: 'PDF',
    report_type: 'export_module',
    filename: entry.filename || `rapport-${Date.now()}.pdf`,
    summary: entry.summary || '',
  };
  const existingIndex = exportsList.findIndex((existing) => existing.module === item.module && existing.title === item.title && existing.period === item.period);
  const next = existingIndex >= 0 ? [item, ...exportsList.filter((_, index) => index !== existingIndex)] : [item, ...exportsList];
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next.slice(0, 100)));
  window.dispatchEvent(new CustomEvent('horizon-farm-report-export-created', { detail: item }));
  return item;
}

export function buildModuleReportPdf({ module = 'Module', title = 'Rapport', period = 'Toutes les périodes', subtitle = '', labels = [], series = [], extra = {} }) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const now = new Date();
  const filename = `${String(module).toLowerCase().replace(/[^a-z0-9]+/gi, '-')}-${String(title).toLowerCase().replace(/[^a-z0-9]+/gi, '-')}-${now.toISOString().slice(0, 10)}.pdf`;

  doc.setFontSize(18);
  doc.text('Horizon Farm — Rapport module', 40, 42);
  doc.setFontSize(13);
  doc.text(`${module} · ${title}`, 40, 66);
  doc.setFontSize(10);
  doc.text(`Période : ${period}`, 40, 84);
  doc.text(`Généré le : ${now.toLocaleString('fr-FR')}`, 40, 100);
  if (subtitle) doc.text(String(subtitle).slice(0, 140), 40, 116);

  const head = [['Période', ...series.map((item) => item.name)]];
  const body = labels.map((label, index) => [
    label,
    ...series.map((item) => {
      const value = item.values?.[index] ?? item.data?.[index] ?? 0;
      const unit = item.unit ? ` ${item.unit}` : '';
      return `${Number(value || 0).toLocaleString('fr-FR')}${unit}`;
    }),
  ]);

  autoTable(doc, {
    startY: 140,
    head,
    body: body.length ? body : [['Aucune donnée', ...series.map(() => '-')]],
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [47, 36, 21] },
    alternateRowStyles: { fillColor: [255, 253, 248] },
    margin: { left: 40, right: 40 },
  });

  const finalY = doc.lastAutoTable?.finalY || 160;
  const extras = Object.entries(extra || {}).filter(([, value]) => value !== undefined && value !== null && value !== '');
  if (extras.length) {
    autoTable(doc, {
      startY: finalY + 24,
      head: [['Élément', 'Valeur']],
      body: extras.slice(0, 20).map(([key, value]) => [key, typeof value === 'object' ? JSON.stringify(value) : String(value)]),
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [138, 116, 86] },
      margin: { left: 40, right: 40 },
    });
  }

  return { doc, filename };
}

export function exportModuleReportPdf(payload) {
  const { doc, filename } = buildModuleReportPdf(payload);
  doc.save(filename);
  return saveModuleReportExport({
    module: payload.module,
    title: payload.title,
    period: payload.period,
    filename,
    summary: payload.subtitle,
  });
}
