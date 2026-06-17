/**
 * Génère GUIDE_UTILISATEUR_HORIZON_FARM.pdf (+ HTML source)
 * Usage: node scripts/generate-guide-pdf.mjs
 */
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const MD_PATH = path.join(ROOT, 'docs', 'GUIDE_UTILISATEUR_HORIZON_FARM.md');
const OUT_DIR = path.join(ROOT, 'docs');
const PUBLIC_DIR = path.join(ROOT, 'public');
const HTML_PATH = path.join(PUBLIC_DIR, 'guide-utilisateur-horizon-farm.html');
const PDF_NAME = 'GUIDE_UTILISATEUR_HORIZON_FARM.pdf';
const LOGO = '/horizon-farm-logo-transparent.png';

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function inlineMd(text) {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.+?)`/g, '<code>$1</code>');
}

function parseTable(lines) {
  const rows = lines.filter((l) => l.trim().startsWith('|'));
  if (rows.length < 2) return '';
  const parseRow = (row) => row.split('|').slice(1, -1).map((c) => c.trim());
  const header = parseRow(rows[0]);
  const body = rows.slice(2).map(parseRow);
  let html = '<table><thead><tr>';
  header.forEach((h) => { html += `<th>${inlineMd(h)}</th>`; });
  html += '</tr></thead><tbody>';
  body.forEach((row) => {
    html += '<tr>';
    row.forEach((c) => { html += `<td>${inlineMd(c)}</td>`; });
    html += '</tr>';
  });
  html += '</tbody></table>';
  return html;
}

function markdownToHtml(md) {
  const lines = md.split('\n');
  const parts = [];
  let i = 0;
  let inList = false;

  const closeList = () => {
    if (inList) { parts.push('</ul>'); inList = false; }
  };

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed === '---') {
      closeList();
      parts.push('<hr class="section-break" />');
      i += 1;
      continue;
    }

    if (trimmed.startsWith('|')) {
      closeList();
      const tableLines = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i]);
        i += 1;
      }
      parts.push(parseTable(tableLines));
      continue;
    }

    const h3 = trimmed.match(/^### (.+)$/);
    if (h3) {
      closeList();
      parts.push(`<h3>${inlineMd(h3[1])}</h3>`);
      i += 1;
      continue;
    }

    const h2 = trimmed.match(/^## (.+)$/);
    if (h2) {
      closeList();
      const id = h2[1].toLowerCase().replace(/[^a-z0-9àâäéèêëïîôùûüç0-9]+/g, '-').replace(/^-|-$/g, '');
      parts.push(`<h2 id="${id}">${inlineMd(h2[1])}</h2>`);
      i += 1;
      continue;
    }

    const h1 = trimmed.match(/^# (.+)$/);
    if (h1) {
      closeList();
      parts.push(`<h1 class="doc-title">${inlineMd(h1[1])}</h1>`);
      i += 1;
      continue;
    }

    const ol = trimmed.match(/^(\d+)\. (.+)$/);
    if (ol) {
      closeList();
      parts.push(`<p class="numbered"><span class="num">${ol[1]}</span>${inlineMd(ol[2])}</p>`);
      i += 1;
      continue;
    }

    const ul = trimmed.match(/^- (.+)$/);
    if (ul) {
      if (!inList) { parts.push('<ul>'); inList = true; }
      parts.push(`<li>${inlineMd(ul[1])}</li>`);
      i += 1;
      continue;
    }

    if (trimmed === '') {
      closeList();
      i += 1;
      continue;
    }

    closeList();
    parts.push(`<p>${inlineMd(trimmed)}</p>`);
    i += 1;
  }

  closeList();
  return parts.join('\n');
}

function extractToc(md) {
  const items = [];
  for (const line of md.split('\n')) {
    const m = line.match(/^## (\d+)\. (.+)$/);
    if (m) {
      const id = line.toLowerCase().replace(/^## /, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      items.push({
        num: m[1],
        title: m[2],
        id: `${m[1]}-${m[2].toLowerCase().replace(/[^a-z0-9àâäéèêëïîôùûüç0-9]+/g, '-').replace(/^-|-$/g, '')}`,
      });
    }
  }
  return items;
}

function buildHtml(md) {
  const body = markdownToHtml(md);
  const toc = extractToc(md);
  const tocHtml = toc.map((t) =>
    `<a href="#${t.id}" class="toc-item"><span class="toc-num">${t.num}</span><span>${escapeHtml(t.title)}</span></a>`,
  ).join('\n');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>Guide utilisateur Horizon Farm</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=Fraunces:opsz,wght@9..144,600;9..144,700&display=swap" rel="stylesheet" />
  <style>
    :root {
      --hero: #052e16;
      --accent: #22c55e;
      --accent-strong: #15803d;
      --gold: #9a6b12;
      --gold-light: #b8954a;
      --surface: #fffdf8;
      --border: #eadcc2;
      --text: #2f2415;
      --muted: #8a7456;
    }

    @page {
      size: A4;
      margin: 18mm 16mm 22mm 16mm;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'DM Sans', system-ui, sans-serif;
      font-size: 10.5pt;
      line-height: 1.55;
      color: var(--text);
      background: white;
    }

    .cover {
      page-break-after: always;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 3rem 2rem;
      background:
        radial-gradient(ellipse 80% 50% at 50% 0%, rgba(34,197,94,0.12), transparent 60%),
        linear-gradient(180deg, #f6faf6 0%, var(--surface) 100%);
    }

    .cover img { height: 100px; margin-bottom: 2rem; }
    .cover .badge {
      font-size: 0.65rem;
      font-weight: 800;
      letter-spacing: 0.3em;
      text-transform: uppercase;
      color: var(--gold);
      margin-bottom: 1rem;
    }
    .cover h1 {
      font-family: 'Fraunces', Georgia, serif;
      font-size: 2.4rem;
      color: var(--hero);
      margin-bottom: 0.75rem;
    }
    .cover .subtitle {
      font-size: 1.05rem;
      color: var(--muted);
      max-width: 32ch;
      margin-bottom: 2rem;
    }
    .cover .meta {
      font-size: 0.8rem;
      color: var(--muted);
      border-top: 1px solid var(--border);
      padding-top: 1.5rem;
      margin-top: 1rem;
    }
    .cover .tagline {
      margin-top: 1.5rem;
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.35em;
      text-transform: uppercase;
      color: var(--accent-strong);
    }

    .toc-page {
      page-break-after: always;
      padding: 2rem 0;
    }
    .toc-page h2 {
      font-family: 'Fraunces', serif;
      font-size: 1.5rem;
      color: var(--hero);
      margin-bottom: 1.5rem;
      padding-bottom: 0.5rem;
      border-bottom: 3px solid var(--accent);
    }
    .toc-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.35rem 2rem;
    }
    .toc-item {
      display: flex;
      gap: 0.65rem;
      align-items: baseline;
      padding: 0.4rem 0;
      text-decoration: none;
      color: var(--text);
      font-size: 0.88rem;
      border-bottom: 1px dotted var(--border);
    }
    .toc-num {
      font-weight: 800;
      color: var(--accent-strong);
      min-width: 1.5rem;
    }

    .content { padding: 0; }

    .doc-title { display: none; }

    h2 {
      font-family: 'Fraunces', Georgia, serif;
      font-size: 1.35rem;
      font-weight: 700;
      color: var(--hero);
      margin: 1.75rem 0 0.75rem;
      padding: 0.5rem 0 0.5rem 0.75rem;
      border-left: 4px solid var(--accent);
      page-break-after: avoid;
    }

    h2:first-of-type { margin-top: 0; }

    h3 {
      font-size: 0.95rem;
      font-weight: 700;
      color: var(--gold);
      margin: 1.1rem 0 0.45rem;
      page-break-after: avoid;
    }

    p {
      margin: 0.45rem 0;
      color: var(--text);
    }

    ul {
      margin: 0.4rem 0 0.65rem 1.25rem;
      padding: 0;
    }
    li {
      margin: 0.25rem 0;
      padding-left: 0.25rem;
    }
    li::marker { color: var(--accent-strong); }

    .numbered {
      display: flex;
      gap: 0.65rem;
      align-items: flex-start;
      margin: 0.35rem 0;
    }
    .numbered .num {
      flex-shrink: 0;
      width: 1.4rem;
      height: 1.4rem;
      border-radius: 50%;
      background: var(--hero);
      color: white;
      font-size: 0.7rem;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-top: 0.1rem;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 0.65rem 0 1rem;
      font-size: 0.85rem;
      page-break-inside: avoid;
    }
    th {
      background: var(--hero);
      color: white;
      font-weight: 700;
      text-align: left;
      padding: 0.5rem 0.65rem;
    }
    th:first-child { border-radius: 0.4rem 0 0 0; }
    th:last-child { border-radius: 0 0.4rem 0 0; }
    td {
      padding: 0.45rem 0.65rem;
      border-bottom: 1px solid var(--border);
      vertical-align: top;
    }
    tr:nth-child(even) td { background: #f8fbf8; }

    strong { color: var(--hero); font-weight: 700; }
    code {
      font-size: 0.85em;
      background: #f0f7f0;
      padding: 0.1rem 0.35rem;
      border-radius: 0.25rem;
      color: var(--accent-strong);
    }

    hr.section-break {
      border: none;
      height: 0;
      margin: 0;
      page-break-before: always;
    }

    .page-footer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: 12mm;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16mm;
      font-size: 7pt;
      color: var(--muted);
      border-top: 1px solid var(--border);
      background: white;
    }

    @media print {
      .cover { min-height: 257mm; }
      a { color: inherit; text-decoration: none; }
    }
  </style>
</head>
<body>

  <section class="cover">
    <img src="${LOGO}" alt="Horizon Farm" />
    <p class="badge">Documentation officielle</p>
    <h1>Guide utilisateur</h1>
    <p class="subtitle">Piloter votre exploitation au quotidien — élevage, cultures, stock, ventes, finances et capteurs.</p>
    <p class="meta">Version juin 2026 · Exploitants agricoles, responsables d'exploitation, équipes terrain</p>
    <p class="tagline">De la terre à l'horizon</p>
  </section>

  <section class="toc-page">
    <h2>Sommaire</h2>
    <div class="toc-grid">${tocHtml}</div>
  </section>

  <main class="content">
    ${body}
  </main>

</body>
</html>`;
}

async function generatePdf() {
  const md = fs.readFileSync(MD_PATH, 'utf8');
  const html = buildHtml(md);
  fs.writeFileSync(HTML_PATH, html, 'utf8');
  console.log('✓ HTML:', HTML_PATH);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(`file://${HTML_PATH}`, { waitUntil: 'networkidle' });

  const pdfPath = path.join(OUT_DIR, PDF_NAME);
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '16mm', right: '14mm', bottom: '18mm', left: '14mm' },
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate: `
      <div style="width:100%;font-size:8px;color:#8a7456;padding:0 14mm;display:flex;justify-content:space-between;font-family:sans-serif;">
        <span>Horizon Farm — Guide utilisateur</span>
        <span>Page <span class="pageNumber"></span> / <span class="totalPages"></span></span>
      </div>
    `,
  });

  await browser.close();
  console.log('✓ PDF:', pdfPath);

  const publicPdf = path.join(PUBLIC_DIR, PDF_NAME);
  fs.copyFileSync(pdfPath, publicPdf);
  console.log('✓ Copie:', publicPdf);
}

generatePdf().catch((err) => {
  console.error(err);
  process.exit(1);
});
