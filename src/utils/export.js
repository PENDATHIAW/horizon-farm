import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const sanitizeRows = (rows = [], columns = []) => {
  if (!Array.isArray(rows)) return [];
  if (!columns.length) return rows;
  return rows.map((row) => {
    const out = {};
    columns.forEach((col) => {
      out[col] = row?.[col] ?? '';
    });
    return out;
  });
};

export const exportToCsv = ({ rows = [], columns = [], fileName = 'export.csv' }) => {
  const safeRows = sanitizeRows(rows, columns);
  const header = columns.length ? columns : Object.keys(safeRows[0] || {});
  const lines = [header.join(';')];

  safeRows.forEach((row) => {
    const line = header
      .map((key) => {
        const raw = row?.[key] ?? '';
        const value = String(raw).replaceAll('"', '""');
        return `"${value}"`;
      })
      .join(';');
    lines.push(line);
  });

  const blob = new Blob([`\uFEFF${lines.join('\n')}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
};

export const exportToExcel = ({ rows = [], columns = [], sheetName = 'Data', fileName = 'export.xlsx' }) => {
  const safeRows = sanitizeRows(rows, columns);
  const worksheet = XLSX.utils.json_to_sheet(safeRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, fileName);
};

export const exportToPdf = ({ rows = [], columns = [], title = 'Export', fileName = 'export.pdf' }) => {
  const safeRows = sanitizeRows(rows, columns);
  const header = columns.length ? columns : Object.keys(safeRows[0] || {});
  const body = safeRows.map((row) => header.map((key) => String(row?.[key] ?? '')));

  const doc = new jsPDF({ orientation: 'landscape' });
  doc.setFontSize(14);
  doc.text(title, 14, 16);

  autoTable(doc, {
    head: [header],
    body,
    startY: 22,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [34, 197, 94] },
  });

  doc.save(fileName);
};


