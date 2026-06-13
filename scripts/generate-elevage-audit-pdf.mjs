/**
 * Génère le PDF de l'audit module Élevage depuis le markdown source.
 * Usage: node scripts/generate-elevage-audit-pdf.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { jsPDF } from 'jspdf';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const mdPath = join(root, 'docs/rapports/AUDIT_COMPLET_MODULE_ELEVAGE_2026-06-09.md');
const pdfPath = join(root, 'docs/rapports/AUDIT_COMPLET_MODULE_ELEVAGE_2026-06-09.pdf');

const md = readFileSync(mdPath, 'utf8');
const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

const margin = 18;
const pageWidth = doc.internal.pageSize.getWidth();
const pageHeight = doc.internal.pageSize.getHeight();
const maxWidth = pageWidth - margin * 2;
let y = 22;

function ensureSpace(needed = 8) {
  if (y + needed > pageHeight - 15) {
    doc.addPage();
    y = 22;
  }
}

function writeLines(lines, { fontSize = 10, lineHeight = 4.8, color = [47, 36, 21], font = 'normal' } = {}) {
  doc.setFont('helvetica', font);
  doc.setFontSize(fontSize);
  doc.setTextColor(...color);
  for (const line of lines) {
    ensureSpace(lineHeight);
    doc.text(line, margin, y);
    y += lineHeight;
  }
}

function writeBlock(text, opts = {}) {
  const lines = doc.splitTextToSize(String(text || ''), maxWidth);
  writeLines(lines, opts);
  if (opts.gapAfter) y += opts.gapAfter;
}

// Page de garde
doc.setFillColor(47, 36, 21);
doc.rect(0, 0, pageWidth, 42, 'F');
doc.setTextColor(255, 253, 248);
doc.setFont('helvetica', 'bold');
doc.setFontSize(20);
doc.text('Audit complet — Module Élevage', margin, 18);
doc.setFontSize(11);
doc.setFont('helvetica', 'normal');
doc.text('Horizon Farm ERP · Vision 2026–2027', margin, 28);
doc.text('9 juin 2026', margin, 35);

y = 52;
doc.setTextColor(47, 36, 21);
writeBlock('Score global : 52/100 · Rupture critique : formulaire Reproduction non monté', { fontSize: 11, gapAfter: 4 });
writeBlock('Ce document résume l\'architecture, les 11 onglets, les doublons inter-modules, les workflows et les priorités P0–P3.', { fontSize: 10, gapAfter: 6 });

const lines = md.split('\n');
for (let i = 0; i < lines.length; i += 1) {
  const raw = lines[i];
  const line = raw.trimEnd();

  if (line.startsWith('# ')) {
    y += 4;
    writeBlock(line.replace(/^#+\s*/, ''), { fontSize: 16, font: 'bold', lineHeight: 7, gapAfter: 2 });
    continue;
  }
  if (line.startsWith('## ')) {
    y += 3;
    writeBlock(line.replace(/^#+\s*/, ''), { fontSize: 13, font: 'bold', lineHeight: 6, gapAfter: 2 });
    continue;
  }
  if (line.startsWith('### ')) {
    y += 2;
    writeBlock(line.replace(/^#+\s*/, ''), { fontSize: 11, font: 'bold', lineHeight: 5.5, gapAfter: 1 });
    continue;
  }
  if (line.startsWith('---')) {
    y += 2;
    doc.setDrawColor(214, 195, 160);
    ensureSpace(4);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;
    continue;
  }
  if (line.startsWith('|')) {
    const row = line.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
    if (row.every((c) => /^[-:]+$/.test(c))) continue;
    const text = row.join(' · ');
    writeBlock(text, { fontSize: 9, lineHeight: 4.5 });
    continue;
  }
  if (line.startsWith('```')) continue;
  if (line.startsWith('- ') || line.startsWith('* ')) {
    writeBlock(`• ${line.slice(2)}`, { fontSize: 9.5, lineHeight: 4.6 });
    continue;
  }
  if (line.startsWith('**') && line.endsWith('**')) {
    writeBlock(line.replace(/\*\*/g, ''), { fontSize: 10, font: 'bold', lineHeight: 5 });
    continue;
  }
  if (!line.trim()) {
    y += 2;
    continue;
  }
  writeBlock(line.replace(/\*\*/g, ''), { fontSize: 9.5, lineHeight: 4.6 });
}

// Pied de page sur chaque page
const totalPages = doc.getNumberOfPages();
for (let p = 1; p <= totalPages; p += 1) {
  doc.setPage(p);
  doc.setFontSize(8);
  doc.setTextColor(125, 106, 74);
  doc.setFont('helvetica', 'normal');
  doc.text('Horizon Farm — Audit Module Élevage — juin 2026', margin, pageHeight - 8);
  doc.text(`Page ${p}/${totalPages}`, pageWidth - margin - 18, pageHeight - 8);
}

const pdfBuffer = doc.output('arraybuffer');
writeFileSync(pdfPath, Buffer.from(pdfBuffer));
console.log(`PDF écrit : ${pdfPath}`);
