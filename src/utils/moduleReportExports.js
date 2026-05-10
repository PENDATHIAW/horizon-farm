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

function safeNumber(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function shortLabel(value, max = 12) {
  const text = String(value || '');
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function seriesValue(item, index) {
  return safeNumber(item.values?.[index] ?? item.data?.[index] ?? 0);
}

function drawEvolutionChart(doc, { labels = [], series = [] }) {
  const cleanLabels = Array.isArray(labels) ? labels : [];
  const cleanSeries = Array.isArray(series) ? series.filter((item) => Array.isArray(item.values || item.data)) : [];
  if (!cleanLabels.length || !cleanSeries.length) return 132;

  const x = 40;
  const y = 132;
  const w = 760;
  const h = 210;
  const plotX = x + 48;
  const plotY = y + 22;
  const plotW = w - 78;
  const plotH = h - 70;
  const allValues = cleanSeries.flatMap((item) => cleanLabels.map((_, index) => seriesValue(item, index)));
  const maxValue = Math.max(1, ...allValues);
  const minValue = Math.min(0, ...allValues);
  const span = Math.max(1, maxValue - minValue);

  doc.setDrawColor(234, 220, 194);
  doc.setFillColor(255, 253, 248);
  doc.roundedRect(x, y, w, h, 12, 12, 'FD');
  doc.setFontSize(11);
  doc.setTextColor(47, 36, 21);
  doc.text('Graphique d’évolution', x + 18, y + 22);

  doc.setDrawColor(214, 195, 160);
  doc.line(plotX, plotY + plotH, plotX + plotW, plotY + plotH);
  doc.line(plotX, plotY, plotX, plotY + plotH);

  doc.setFontSize(7);
  doc.setTextColor(125, 106, 74);
  for (let i = 0; i <= 4; i += 1) {
    const value = minValue + (span * i) / 4;
    const yy = plotY + plotH - ((value - minValue) / span) * plotH;
    doc.setDrawColor(240, 229, 208);
    doc.line(plotX, yy, plotX + plotW, yy);
    doc.text(Math.round(value).toLocaleString('fr-FR'), x + 10, yy + 2);
  }

  const palette = [
    [47, 36, 21],
    [0, 122, 90],
    [184, 73, 0],
    [154, 107, 18],
    [170, 20, 40],
    [70, 92, 140],
  ];
  const count = Math.max(1, cleanLabels.length - 1);

  cleanSeries.slice(0, 6).forEach((item, seriesIndex) => {
    const color = palette[seriesIndex % palette.length];
    doc.setDrawColor(...color);
    doc.setFillColor(...color);
    doc.setLineWidth(1.4);
    let prev = null;
    cleanLabels.forEach((_, index) => {
      const value = seriesValue(item, index);
      const px = plotX + (plotW * index) / count;
      const py = plotY + plotH - ((value - minValue) / span) * plotH;
      if (prev) doc.line(prev.x, prev.y, px, py);
      doc.circle(px, py, 2.2, 'F');
      prev = { x: px, y: py };
    });
  });

  const labelStep = Math.max(1, Math.ceil(cleanLabels.length / 8));
  doc.setFontSize(7);
  doc.setTextColor(125, 106, 74);
  cleanLabels.forEach((label, index) => {
    if (index % labelStep !== 0 && index !== cleanLabels.length - 1) return;
    const px = plotX + (plotW * index) / count;
    doc.text(shortLabel(label), px, plotY + plotH + 16, { align: 'center' });
  });

  let legendX = plotX;
  const legendY = y + h - 18;
  doc.setFontSize(8);
  cleanSeries.slice(0, 6).forEach((item, index) => {
    const color = palette[index % palette.length];
    doc.setFillColor(...color);
    doc.roundedRect(legendX, legendY - 7, 10, 6, 2, 2, 'F');
    doc.setTextColor(47, 36, 21);
    doc.text(shortLabel(item.name || `Série ${index + 1}`, 18), legendX + 14, legendY - 2);
    legendX += 100;
  });

  doc.setLineWidth(0.2);
  doc.setTextColor(47, 36, 21);
  return y + h + 24;
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

  const tableStartY = drawEvolutionChart(doc, { labels, series });
  const head = [['Période', ...series.map((item) => item.name)]];
  const body = labels.map((label, index) => [
    label,
    ...series.map((item) => {
      const value = seriesValue(item, index);
      const unit = item.unit ? ` ${item.unit}` : '';
      return `${Number(value || 0).toLocaleString('fr-FR')}${unit}`;
    }),
  ]);

  autoTable(doc, {
    startY: tableStartY,
    head,
    body: body.length ? body : [['Aucune donnée', ...series.map(() => '-')]],
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [47, 36, 21] },
    alternateRowStyles: { fillColor: [255, 253, 248] },
    margin: { left: 40, right: 40 },
  });

  const finalY = doc.lastAutoTable?.finalY || tableStartY + 20;
  const extras = Object.entries(extra || {}).filter(([, value]) => value !== undefined && value !== null && value !== '');
  if (extras.length) {
    autoTable(doc, {
      startY: Math.min(finalY + 24, 510),
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
