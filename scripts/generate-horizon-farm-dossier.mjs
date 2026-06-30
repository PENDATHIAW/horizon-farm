/**
 * Génère le dossier investisseur Horizon Farm (HTML + PDF)
 * Usage: node scripts/generate-horizon-farm-dossier.mjs
 */
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import {
  BRAND,
  IDENTITY,
  FINANCE,
  REVENUE_ACTIVITIES,
  STARTUP_LINES,
  TEAM,
  TALLOW_PRODUCTS,
  ROADMAP,
  RISKS,
  fmtFcfa,
  fmtM,
} from './horizon-farm-dossier-data.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'docs', 'pitch');
const PUBLIC_DIR = path.join(ROOT, 'public');
const HTML_OUT = path.join(OUT_DIR, 'HORIZON_FARM_DOSSIER.html');
const PDF_OUT = path.join(OUT_DIR, 'HORIZON_FARM_DOSSIER.pdf');
const PDF_PUBLIC = path.join(PUBLIC_DIR, 'HORIZON_FARM_DOSSIER.pdf');
const LOGO_SVG = fs.readFileSync(path.join(PUBLIC_DIR, 'brand-logo-transparent.svg'), 'utf8');

fs.mkdirSync(OUT_DIR, { recursive: true });

function barChart(data, { max, height = 120, color = BRAND.greenMid }) {
  const w = 100 / data.length;
  return `<svg viewBox="0 0 400 ${height + 40}" class="chart-svg" xmlns="http://www.w3.org/2000/svg">
    ${data
      .map((d, i) => {
        const h = (d.value / max) * height;
        const x = i * (400 / data.length) + 8;
        const bw = 400 / data.length - 16;
        return `<rect x="${x}" y="${height - h + 10}" width="${bw}" height="${h}" fill="${color}" rx="4"/>
          <text x="${x + bw / 2}" y="${height + 28}" text-anchor="middle" font-size="9" fill="${BRAND.muted}">${d.label}</text>
          <text x="${x + bw / 2}" y="${height - h + 4}" text-anchor="middle" font-size="8" fill="${BRAND.black}">${d.display}</text>`;
      })
      .join('')}
  </svg>`;
}

function donut(segments) {
  let offset = 0;
  const r = 50;
  const cx = 70;
  const cy = 70;
  const circles = segments
    .map((s) => {
      const dash = (s.pct / 100) * 2 * Math.PI * r;
      const gap = 2 * Math.PI * r;
      const el = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${s.color}" stroke-width="18"
        stroke-dasharray="${dash} ${gap}" stroke-dashoffset="${-offset}" transform="rotate(-90 ${cx} ${cy})"/>`;
      offset += dash;
      return el;
    })
    .join('');
  const legend = segments
    .map(
      (s) => `<div class="legend-item"><span class="dot" style="background:${s.color}"></span>${s.label} · ${s.pct}%</div>`,
    )
    .join('');
  return `<div class="donut-wrap"><svg viewBox="0 0 140 140" width="140" height="140">${circles}</svg><div class="legend">${legend}</div></div>`;
}

function page(num, title, kicker, body) {
  return `<section class="page">
    <header class="page-header">
      <div class="logo-mini">${LOGO_SVG.replace(/width="[^"]*"/, 'width="120"').replace(/height="[^"]*"/, 'height="45"')}</div>
      <span class="page-num">${String(num).padStart(2, '0')}</span>
    </header>
    ${kicker ? `<p class="kicker">${kicker}</p>` : ''}
    ${title ? `<h2>${title}</h2>` : ''}
    <div class="page-body">${body}</div>
    <footer class="page-footer">Horizon Farm · Dossier investisseur ${IDENTITY.year} · Confidentiel</footer>
  </section>`;
}

function coverPage() {
  return `<section class="page page-cover">
    <div class="cover-bg"></div>
    <div class="cover-content">
      <div class="cover-logo">${LOGO_SVG.replace(/width="[^"]*"/, 'width="200"').replace(/height="[^"]*"/, 'height="75"')}</div>
      <h1>${IDENTITY.project}</h1>
      <p class="cover-sub">${IDENTITY.subtitleFr}</p>
      <p class="cover-sub-en">${IDENTITY.subtitle}</p>
      <div class="cover-rule"></div>
      <p class="cover-slogan">« ${IDENTITY.slogan} »</p>
      <p class="cover-meta">${IDENTITY.location} · ${IDENTITY.year}</p>
      <p class="cover-audience">Document destiné aux investisseurs, banques, partenaires stratégiques et organismes de financement</p>
    </div>
  </section>`;
}

function tocPage() {
  const items = [
    'Résumé exécutif',
    'Vision et mission',
    'Présentation du fondateur',
    'Contexte et opportunité du marché',
    'Défis agricoles en Afrique de l\'Ouest',
    'Présentation du projet Horizon Farm',
    'Pôle Embouche Bovine',
    'Pôle Aviculture & Production d\'œufs',
    'Pôle Transformation Alimentaire',
    'Pôle Cosmétique — Tallow & Go',
    'Pourquoi le Beef Tallow',
    'Gamme Tallow & Go',
    'Synergies Horizon Farm & Tallow & Go',
    'Chaîne de valeur intégrée',
    'Impact économique & social',
    'Prévisions financières',
    'Analyse des risques',
    'Feuille de route 5 ans',
    'Besoins de financement',
    'Conclusion',
  ];
  return page(
    2,
    'Sommaire',
    'Table des matières',
    `<ol class="toc">${items.map((t, i) => `<li><span class="toc-n">${i + 3}</span>${t}</li>`).join('')}</ol>`,
  );
}

function buildHtml() {
  const maxRev = Math.max(...FINANCE.revenueY5);
  const revChart = barChart(
    FINANCE.revenueY5.map((v, i) => ({
      label: `A${i + 1}`,
      value: v,
      display: fmtM(v).replace(' FCFA', ''),
    })),
    { max: maxRev, color: BRAND.green },
  );

  const resultChart = barChart(
    FINANCE.resultY5.map((v, i) => ({
      label: `A${i + 1}`,
      value: v,
      display: fmtM(v).replace(' FCFA', ''),
    })),
    { max: Math.max(...FINANCE.resultY5), color: BRAND.gold },
  );

  const revDonut = donut(
    REVENUE_ACTIVITIES.map((a, i) => ({
      label: a.label,
      pct: a.pct,
      color: [BRAND.green, BRAND.greenMid, BRAND.gold, BRAND.greenLight][i],
    })),
  );

  const productPages = TALLOW_PRODUCTS.map((p, i) =>
    page(
      20 + i,
      p.name,
      `Gamme Tallow & Go · ${p.en}`,
      `<div class="product-sheet">
        <div class="product-header">
          <span class="product-monogram">TG</span>
          <div>
            <h3>${p.fr}</h3>
            <p class="product-size">${p.size}</p>
          </div>
        </div>
        <div class="two-col">
          <div>
            <h4>Composition</h4>
            <ul>${p.composition.map((c) => `<li>${c}</li>`).join('')}</ul>
          </div>
          <div>
            <h4>Bienfaits</h4>
            <ul class="benefits">${p.benefits.map((b) => `<li>${b}</li>`).join('')}</ul>
          </div>
        </div>
        <p class="product-note">Formulé artisanalement au Sénégal · Suif purifié issu des embouches bovines Horizon Farm</p>
      </div>`,
    ),
  ).join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <title>Horizon Farm — Dossier investisseur</title>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet"/>
  <style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'DM Sans', sans-serif; color: ${BRAND.black}; background: ${BRAND.ivory}; font-size: 10.5pt; line-height: 1.55; }
    h1, h2, h3, h4 { font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 600; color: ${BRAND.green}; }
    h2 { font-size: 26pt; margin-bottom: 0.6rem; line-height: 1.15; }
    h3 { font-size: 16pt; margin: 0.8rem 0 0.4rem; }
    h4 { font-size: 11pt; margin: 0.6rem 0 0.3rem; color: ${BRAND.gold}; text-transform: uppercase; letter-spacing: 0.08em; }
    p { margin-bottom: 0.65rem; }
    ul { margin: 0.4rem 0 0.8rem 1.2rem; }
    li { margin-bottom: 0.35rem; }
    .page { width: 210mm; height: 297mm; min-height: 297mm; max-height: 297mm; padding: 18mm 20mm 22mm; page-break-after: always; break-after: page; position: relative; background: ${BRAND.ivory}; overflow: hidden; box-sizing: border-box; }
    .page:last-child { page-break-after: auto; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.2rem; padding-bottom: 0.5rem; border-bottom: 1px solid ${BRAND.border}; }
    .logo-mini svg { height: 36px; width: auto; }
    .page-num { font-size: 9pt; color: ${BRAND.gold}; font-weight: 700; }
    .kicker { font-size: 8pt; text-transform: uppercase; letter-spacing: 0.18em; color: ${BRAND.gold}; font-weight: 700; margin-bottom: 0.35rem; }
    .page-footer { position: absolute; bottom: 12mm; left: 20mm; right: 20mm; font-size: 7.5pt; color: ${BRAND.muted}; border-top: 1px solid ${BRAND.border}; padding-top: 0.4rem; }
    .page-cover { padding: 0; display: flex; align-items: center; justify-content: center; }
    .cover-bg { position: absolute; inset: 0; background: linear-gradient(165deg, #041a0d 0%, ${BRAND.green} 45%, #0a3d20 100%); }
    .cover-bg::after { content: ''; position: absolute; inset: 0; background: radial-gradient(ellipse 80% 50% at 70% 20%, rgba(34,197,94,0.15), transparent); }
    .cover-content { position: relative; z-index: 1; text-align: center; color: #ecfdf5; padding: 2rem; }
    .cover-content h1 { color: #fff; font-size: 42pt; letter-spacing: 0.06em; margin: 1rem 0 0.5rem; }
    .cover-sub { font-size: 14pt; color: #a7d4b5; margin-bottom: 0.25rem; }
    .cover-sub-en { font-size: 10pt; color: #6b9a7a; font-style: italic; }
    .cover-rule { width: 80px; height: 3px; background: ${BRAND.goldLight}; margin: 1.5rem auto; }
    .cover-slogan { font-family: 'Cormorant Garamond', serif; font-size: 18pt; color: ${BRAND.goldLight}; font-style: italic; }
    .cover-meta { margin-top: 2rem; font-size: 10pt; color: #86efac; }
    .cover-audience { margin-top: 3rem; font-size: 8.5pt; color: #6b9a7a; max-width: 32ch; margin-left: auto; margin-right: auto; }
    .cover-logo svg text { fill: #ecfdf5 !important; }
    .stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; margin: 1rem 0; }
    .stat-card { background: #fff; border: 1px solid ${BRAND.border}; border-radius: 8px; padding: 0.75rem; text-align: center; }
    .stat-card .val { font-family: 'Cormorant Garamond', serif; font-size: 18pt; font-weight: 700; color: ${BRAND.green}; }
    .stat-card .lbl { font-size: 8pt; color: ${BRAND.muted}; text-transform: uppercase; letter-spacing: 0.06em; }
    .highlight-box { background: linear-gradient(135deg, ${BRAND.green} 0%, #0a3d20 100%); color: #ecfdf5; padding: 1rem 1.2rem; border-radius: 10px; margin: 1rem 0; }
    .highlight-box h3 { color: ${BRAND.goldLight}; margin-top: 0; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 1.2rem; }
    .three-col { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.8rem; }
    .card { background: #fff; border: 1px solid ${BRAND.border}; border-radius: 8px; padding: 0.85rem; }
    .card h3 { font-size: 12pt; margin-top: 0; }
    .icon-row { display: flex; gap: 1rem; flex-wrap: wrap; margin: 1rem 0; }
    .icon-pill { display: flex; align-items: center; gap: 0.5rem; background: #fff; border: 1px solid ${BRAND.border}; padding: 0.5rem 0.75rem; border-radius: 999px; font-size: 9pt; }
    .icon-pill .ico { width: 28px; height: 28px; border-radius: 50%; background: ${BRAND.green}; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; margin: 0.8rem 0; font-size: 9.5pt; }
    th, td { border: 1px solid ${BRAND.border}; padding: 0.45rem 0.6rem; text-align: left; }
    th { background: ${BRAND.green}; color: #fff; font-weight: 600; }
    tr:nth-child(even) { background: rgba(5,46,22,0.04); }
    .chart-wrap { background: #fff; border: 1px solid ${BRAND.border}; border-radius: 8px; padding: 0.75rem; margin: 0.8rem 0; }
    .chart-svg { width: 100%; height: auto; }
    .donut-wrap { display: flex; align-items: center; gap: 1rem; }
    .legend-item { display: flex; align-items: center; gap: 0.4rem; font-size: 9pt; margin-bottom: 0.3rem; }
    .dot { width: 8px; height: 8px; border-radius: 50%; }
    .value-chain { display: flex; align-items: stretch; gap: 0.4rem; margin: 1rem 0; }
    .vc-step { flex: 1; background: ${BRAND.green}; color: #fff; padding: 0.7rem; border-radius: 8px; text-align: center; font-size: 8.5pt; position: relative; }
    .vc-step::after { content: '→'; position: absolute; right: -12px; top: 50%; transform: translateY(-50%); color: ${BRAND.gold}; font-weight: bold; z-index: 1; }
    .vc-step:last-child::after { display: none; }
    .vc-step strong { display: block; font-size: 10pt; margin-bottom: 0.25rem; color: ${BRAND.goldLight}; }
    .timeline { border-left: 3px solid ${BRAND.green}; margin-left: 0.5rem; padding-left: 1rem; }
    .timeline-item { margin-bottom: 1rem; position: relative; }
    .timeline-item::before { content: ''; position: absolute; left: -1.35rem; top: 0.3rem; width: 10px; height: 10px; background: ${BRAND.gold}; border-radius: 50%; }
    .timeline-year { font-weight: 700; color: ${BRAND.green}; font-size: 11pt; }
    .risk-high { color: #b91c1c; font-weight: 600; }
    .risk-med { color: ${BRAND.gold}; font-weight: 600; }
    .toc { list-style: none; margin: 0; padding: 0; columns: 2; column-gap: 2rem; }
    .toc li { display: flex; gap: 0.5rem; margin-bottom: 0.5rem; font-size: 10pt; break-inside: avoid; }
    .toc-n { color: ${BRAND.gold}; font-weight: 700; min-width: 1.5rem; }
    .product-sheet { background: #fff; border: 1px solid ${BRAND.border}; border-radius: 12px; padding: 1.2rem; }
    .product-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem; padding-bottom: 0.75rem; border-bottom: 1px solid ${BRAND.border}; }
    .product-monogram { font-family: 'Cormorant Garamond', serif; font-size: 32pt; font-weight: 700; color: ${BRAND.gold}; }
    .product-size { color: ${BRAND.muted}; font-size: 9pt; }
    .product-note { font-size: 8.5pt; color: ${BRAND.muted}; font-style: italic; margin-top: 1rem; margin-bottom: 0; }
    .benefits li { list-style: none; padding-left: 1rem; position: relative; }
    .benefits li::before { content: '✓'; position: absolute; left: 0; color: ${BRAND.greenMid}; font-weight: bold; }
    .back-cover { background: ${BRAND.green}; color: #ecfdf5; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .back-cover h2 { color: #fff; font-size: 28pt; }
    .back-cover p { color: #a7d4b5; }
    .quote { font-family: 'Cormorant Garamond', serif; font-size: 14pt; font-style: italic; color: ${BRAND.green}; border-left: 4px solid ${BRAND.gold}; padding-left: 1rem; margin: 1rem 0; }
  </style>
</head>
<body>
${coverPage()}
${tocPage()}

${page(3, 'Résumé exécutif', 'Synthèse', `
<p><strong>Horizon Farm</strong> est un projet de chaîne de valeur agricole intégrée basé au Sénégal, porté par <strong>${IDENTITY.founder}</strong>. Il combine élevage avicole (pondeuses et chair), embouche bovine, transformation alimentaire et valorisation cosmétique du suif via la marque <strong>Tallow &amp; Go</strong>.</p>
<div class="stat-grid">
  <div class="stat-card"><div class="val">${fmtM(FINANCE.startupTotal)}</div><div class="lbl">Besoins démarrage</div></div>
  <div class="stat-card"><div class="val">${fmtM(FINANCE.revenueY1)}</div><div class="lbl">CA prévisionnel A1</div></div>
  <div class="stat-card"><div class="val">${fmtM(FINANCE.resultY5[4])}</div><div class="lbl">Résultat A5</div></div>
</div>
<p>Le modèle repose sur une traçabilité totale — de l'élevage au produit fini — et sur un ERP propriétaire (17 modules) permettant un pilotage en temps réel des productions, stocks, ventes et finances.</p>
<div class="highlight-box">
  <h3>Proposition de valeur</h3>
  <p style="margin:0">Une exploitation multi-pôles rentable, reproductible et verticalement intégrée, avec une extension naturelle vers la cosmétique premium au suif purifié — marché en forte croissance en Afrique et à l'international.</p>
</div>
<ul>
  <li><strong>3 000 poussins pondeuses</strong> · production d'œufs continue</li>
  <li><strong>Bandes chair</strong> · 500 sujets / cycle 40 jours</li>
  <li><strong>50 bovins/an</strong> · embouche cycle 90 jours</li>
  <li><strong>Tallow &amp; Go</strong> · 5 soins au suif · fabriqués au Sénégal</li>
</ul>`)}

${page(4, 'Vision et mission', 'Orientation stratégique', `
<div class="quote">« ${IDENTITY.slogan} — cultivez, élevez, bâtissez et faites grandir votre ferme avec sérénité. »</div>
<h3>Vision</h3>
<p>Devenir une référence ouest-africaine de l'agriculture intégrée : une ferme qui produit, transforme, valorise chaque flux (animaux, œufs, viande, suif, fumier) et inspire un modèle reproductible pour les jeunes entrepreneurs agricoles.</p>
<h3>Mission</h3>
<ul>
  <li>Produire des protéines animales accessibles et traçables (œufs, volailles, bœufs)</li>
  <li>Maîtriser la chaîne de valeur de bout en bout grâce à l'ERP Horizon Farm</li>
  <li>Valoriser le suif bovin en cosmétiques naturels premium (Tallow &amp; Go)</li>
  <li>Créer des emplois durables et transmettre un savoir-faire agricole moderne</li>
</ul>
<div class="icon-row">
  <div class="icon-pill"><span class="ico">🌱</span> Agriculture durable</div>
  <div class="icon-pill"><span class="ico">🔗</span> Chaîne intégrée</div>
  <div class="icon-pill"><span class="ico">📊</span> Pilotage data</div>
  <div class="icon-pill"><span class="ico">✨</span> Valorisation suif</div>
</div>`)}

${page(5, 'Présentation du fondateur', 'Leadership', `
<h3>${IDENTITY.founder}</h3>
<p><strong>Porteuse du projet · Coordonnatrice</strong></p>
<p>Entrepreneure agricole sénégalaise, ${IDENTITY.founder} conçoit et pilote Horizon Farm comme une réponse structurée aux défis de l'agriculture en Afrique de l'Ouest : fragmentation des données, faible traçabilité, difficultés d'accès au financement.</p>
<div class="two-col">
  <div class="card">
    <h3>Compétences clés</h3>
    <ul>
      <li>Conception du business plan financier officiel</li>
      <li>Pilotage opérationnel multi-pôles</li>
      <li>Développement ERP Horizon Farm (17 modules)</li>
      <li>Stratégie marque Tallow &amp; Go</li>
    </ul>
  </div>
  <div class="card">
    <h3>Structure juridique</h3>
    <ul>
      <li>${IDENTITY.legal}</li>
      <li>Activité : Marchandises</li>
      <li>Fiscalité : Impôt sur le revenu</li>
      <li>Contact : ${IDENTITY.contact}</li>
    </ul>
  </div>
</div>
<p>Sa rémunération de coordination (600 000 FCFA/mois) reflète l'engagement temps plein dans la structuration, le suivi terrain et le développement commercial du groupe.</p>`)}

${page(6, 'Contexte et opportunité du marché', 'Analyse', `
<h3>Un marché en tension… et en croissance</h3>
<p>L'Afrique de l'Ouest affiche une demande croissante en protéines animales et en produits de soin naturels, tandis que l'offre locale reste fragmentée et peu traçable.</p>
<div class="stat-grid">
  <div class="stat-card"><div class="val">+3,5%</div><div class="lbl">Croissance démographique régionale</div></div>
  <div class="stat-card"><div class="val">Import</div><div class="lbl">Forte dépendance protéines</div></div>
  <div class="stat-card"><div class="val">Clean beauty</div><div class="lbl">Cosmétique naturelle en essor</div></div>
</div>
<h3>Opportunités identifiées</h3>
<ul>
  <li><strong>Protéines animales</strong> — œufs et volailles : demande urbaine stable, prix résilients</li>
  <li><strong>Viande bovine</strong> — embouche : marges attractives (achat 300 000 → vente 700 000 FCFA)</li>
  <li><strong>Cosmétique au suif</strong> — niche premium, export possible, différenciation forte</li>
  <li><strong>Digital agricole</strong> — ERP intégré comme levier de crédibilité bancaire</li>
</ul>
<p>Horizon Farm se positionne à l'intersection de ces fourchettes : production agricole solide + marque cosmétique à forte valeur ajoutée.</p>`)}

${page(7, 'Défis agricoles en Afrique de l\'Ouest', 'Enjeux sectoriels', `
<div class="three-col">
  <div class="card"><h3>Données dispersées</h3><p>Carnets papier, WhatsApp, Excel non connectés — décisions tardives, pertes évitables.</p></div>
  <div class="card"><h3>Financement</h3><p>Banques exigent traçabilité et BP rigoureux — rares sont les exploitations équipées.</p></div>
  <div class="card"><h3>Logistique &amp; stock</h3><p>Ruptures d'aliment, mortalité, gaspillage — manque de pilotage temps réel.</p></div>
</div>
<div class="three-col" style="margin-top:0.8rem">
  <div class="card"><h3>Valorisation faible</h3><p>Co-produits (suif, fumier) sous-exploités — revenus laissés sur la table.</p></div>
  <div class="card"><h3>Main-d'œuvre</h3><p>Peu de parcours structurants pour les jeunes dans l'agro-business moderne.</p></div>
  <div class="card"><h3>Climat</h3><p>Variabilité accrue — besoin de capteurs, alertes et plans de continuité.</p></div>
</div>
<div class="highlight-box">
  <h3>Réponse Horizon Farm</h3>
  <p style="margin:0">ERP agricole intégré · BP financier 5 ans · chaîne de valeur verticale · marque cosmétique pour capturer la marge en bout de chaîne.</p>
</div>`)}

${page(8, 'Présentation complète du projet', 'Horizon Farm', `
<p>Horizon Farm est une exploitation agricole multi-pôles couplée à une plateforme ERP (17 modules interconnectés) et à une marque cosmétique sœur, Tallow &amp; Go.</p>
<div class="value-chain">
  <div class="vc-step"><strong>Élevage</strong>Pondeuses · Chair · Bovins</div>
  <div class="vc-step"><strong>Production</strong>Œufs · Viande · Suif</div>
  <div class="vc-step"><strong>Transform.</strong>Conditionnement · Cosmétique</div>
  <div class="vc-step"><strong>Commercial</strong>Ventes · Distribution</div>
  <div class="vc-step"><strong>Pilotage</strong>ERP · Finance · IoT</div>
</div>
<h3>ERP Horizon Farm — 17 modules</h3>
<p>Pilotage (Accueil, Assistant IA, Centre décisionnel), Production (Élevage, Cultures), Commerce (Ventes, Achats &amp; Stock), Finance (Trésorerie, BP investisseur), Terrain (Capteurs Smart Farm, RH).</p>
<p class="quote">${IDENTITY.tagline}</p>`)}

${page(9, 'Plateforme ERP — 17 modules', 'Technologie', `
<div class="three-col">
  <div class="card"><h3>Pilotage</h3><ul><li>Accueil &amp; carnet</li><li>Assistant IA Hey Horizon</li><li>Centre décisionnel</li><li>Objectifs &amp; croissance</li><li>Investisseurs</li></ul></div>
  <div class="card"><h3>Production</h3><ul><li>Élevage avicole</li><li>Animaux &amp; bovins</li><li>Santé &amp; reproduction</li><li>Cultures &amp; parcelles</li><li>Transformation</li></ul></div>
  <div class="card"><h3>Commerce</h3><ul><li>Ventes &amp; clients</li><li>Abonnements</li><li>Achats &amp; stock</li><li>Trésabilité</li><li>Documents OCR</li></ul></div>
</div>
<div class="three-col" style="margin-top:0.6rem">
  <div class="card"><h3>Finance</h3><ul><li>Trésorerie live</li><li>BP investisseur</li><li>Rentabilité activités</li><li>Réconciliation</li><li>Exports financeurs</li></ul></div>
  <div class="card"><h3>Terrain</h3><ul><li>Smart Farm IoT</li><li>Capteurs poulailler</li><li>RH &amp; équipes</li><li>Opérations</li><li>Sync ERP</li></ul></div>
  <div class="card"><h3>Valeur</h3><ul><li>10 secondes pour décider</li><li>Alertes proactives</li><li>Crédibilité banques</li><li>Zéro Excel dispersé</li><li>Scalable multi-fermes</li></ul></div>
</div>`)}

${page(10, 'Pôle Embouche Bovine', 'Production animale', `
<h3>Modèle économique</h3>
<p>Cycle d'embouche de <strong>90 jours</strong> : achat à 300 000 FCFA, vente à 700 000 FCFA — marge brute de 400 000 FCFA par tête.</p>
<table>
  <tr><th>Indicateur</th><th>Valeur</th></tr>
  <tr><td>Volume annuel</td><td>50 bovins</td></tr>
  <tr><td>CA annuel bovins</td><td>${fmtFcfa(35_000_000)}</td></tr>
  <tr><td>Coût alimentation</td><td>${fmtFcfa(2_400_000)}/an</td></tr>
  <tr><td>Coût achat animaux</td><td>${fmtFcfa(15_000_000)}/an</td></tr>
  <tr><td>Agent dédié</td><td>1 · 70 000 FCFA/mois</td></tr>
</table>
<h3>Capacités &amp; séquence opérationnelle</h3>
<ul>
  <li>M1–M3 : montée en charge (5 + 5 + 5 têtes)</li>
  <li>M4+ : cycle régulier vente/rachat de 5 bovins par mois</li>
  <li>Valorisation du suif pour Tallow &amp; Go — revenu additionnel</li>
  <li>Fumier vendu comme co-produit agricole</li>
</ul>`)}

${page(11, 'Détail charges & structure de coûts', 'Finance A1', `
<table>
  <tr><th>Charge variable</th><th>Annuel</th></tr>
  <tr><td>Aliments pondeuses</td><td>${fmtFcfa(38_880_000)}</td></tr>
  <tr><td>Aliments chair</td><td>${fmtFcfa(19_440_000)}</td></tr>
  <tr><td>Achat bovins</td><td>${fmtFcfa(15_000_000)}</td></tr>
  <tr><td>Cartons poussins chair</td><td>${fmtFcfa(12_288_000)}</td></tr>
  <tr><td>Aliments bœufs</td><td>${fmtFcfa(2_400_000)}</td></tr>
  <tr><td>Litière &amp; divers</td><td>${fmtFcfa(2_688_000)}</td></tr>
  <tr><th>Total charges variables</th><th>${fmtFcfa(91_776_000)}</th></tr>
</table>
<table>
  <tr><th>Charge fixe / masse salariale</th><th>Annuel</th></tr>
  <tr><td>Loyers (3 sites)</td><td>${fmtFcfa(5_400_000)}</td></tr>
  <tr><td>Salaires équipe terrain</td><td>${fmtFcfa(3_840_000)}</td></tr>
  <tr><td>Coordination projet</td><td>${fmtFcfa(7_200_000)}</td></tr>
  <tr><th>Total fixes + salaires A1</th><th>${fmtFcfa(17_040_000)}</th></tr>
</table>`)}

${page(12, 'Pôle Aviculture & Production d\'œufs', 'Élevage pondeuses & chair', `
<h3>Production d'œufs — 3 000 pondeuses</h3>
<p>Lancement avec 3 000 poussins pondeuses (900 FCFA/sujet). Production d'œufs sous tablettes de 30, vendues 2 200 FCFA l'unité.</p>
<table>
  <tr><th>Flux</th><th>Volume A1</th><th>CA</th></tr>
  <tr><td>Tablettes 30 œufs</td><td>16 650</td><td>${fmtFcfa(36_630_000)}</td></tr>
  <tr><td>Poulets de chair</td><td>19 008</td><td>${fmtFcfa(47_520_000)}</td></tr>
</table>
<h3>Poulets de chair</h3>
<p>Bandes de 500 sujets · cycle 40 jours · cadence 15 jours après montée en charge · 32 cartons/mois × 50 poussins.</p>
<h3>Phase 2 — Filière laitière</h3>
<p>La structuration actuelle pose les bases zootéchniques et commerciales pour une extension future vers la production laitière et sa transformation (yaourt, fromage), en synergie avec le pôle bovin.</p>`)}

${page(13, 'Calendrier de trésorerie — Année 1', 'Flux mensuels', `
<p>Le plan de trésorerie officiel montre une montée progressive jusqu'à <strong>${fmtM(FINANCE.cashEndY1)}</strong> cumulés en fin d'année 1.</p>
<table style="font-size:8pt">
  <tr><th>Mois</th><th>Encaissements</th><th>Décaissements</th><th>Solde mensuel</th><th>Trésorerie cumulée</th></tr>
  <tr><td>M1</td><td>26,3 M</td><td>23,4 M</td><td>+2,9 M</td><td>2,9 M</td></tr>
  <tr><td>M2</td><td>2,7 M</td><td>3,2 M</td><td>-0,5 M</td><td>2,4 M</td></tr>
  <tr><td>M3–M4</td><td>~6,2 M</td><td>~5,5 M</td><td>+0,7 M</td><td>3,8 M</td></tr>
  <tr><td>M5</td><td>9,7 M</td><td>7,8 M</td><td>+1,9 M</td><td>5,7 M</td></tr>
  <tr><td>M6</td><td>12,7 M</td><td>9,8 M</td><td>+2,9 M</td><td>8,6 M</td></tr>
  <tr><td>M7–M12</td><td>~14 M</td><td>~10,7 M</td><td>+3,3 M</td><td>28,5 M</td></tr>
</table>
<p><em>Source : Plan financier prévisionnel Horizon Farm — onglet Plan financier à imprimer.</em></p>`)}

${page(14, 'Pôle Transformation Alimentaire', 'Valorisation', `
<p>La transformation alimentaire couvre le conditionnement, la conservation et la commercialisation des productions animales.</p>
<div class="two-col">
  <div class="card">
    <h3>Œufs</h3>
    <ul><li>Tablettes de 30 — conditionnement</li><li>Emballages dédiés</li><li>Distribution B2B &amp; détail</li></ul>
  </div>
  <div class="card">
    <h3>Volailles</h3>
    <ul><li>Abattage &amp; découpe</li><li>Frais ou congelé</li><li>Restauration &amp; marchés</li></ul>
  </div>
</div>
<div class="two-col">
  <div class="card">
    <h3>Viande bovine</h3>
    <ul><li>Découpe par quartiers</li><li>Conservation froide</li><li>Distribution locale</li></ul>
  </div>
  <div class="card">
    <h3>Co-produits</h3>
    <ul><li>Fumier → cultures / maraîchage</li><li>Suif → Tallow &amp; Go</li><li>Économie circulaire</li></ul>
  </div>
</div>`)}

${page(15, 'Pôle Cosmétique — Tallow & Go', 'Marque sœur', `
<div class="highlight-box">
  <h3>Tallow &amp; Go</h3>
  <p style="margin:0">Cosmétiques naturels au suif purifié · Fabriqués au Sénégal · Nourrir · Clarifier · Rayonner</p>
</div>
<p><strong>Tallow &amp; Go</strong> est la continuité naturelle de l'élevage bovin Horizon Farm : le suif issu des embouches est purifié, formulé artisanalement et commercialisé sous une marque premium.</p>
<div class="stat-grid">
  <div class="stat-card"><div class="val">5</div><div class="lbl">Produits lancés</div></div>
  <div class="stat-card"><div class="val">100%</div><div class="lbl">Traçabilité suif</div></div>
  <div class="stat-card"><div class="val">SN</div><div class="lbl">Made in Senegal</div></div>
</div>
<p>Positionnement : cosmétique clean beauty, sans parabène ni silicone, adaptée à tous types de peau — marchés local, diaspora et export.</p>`)}

${page(16, 'Identité visuelle Tallow & Go', 'Branding premium', `
<div class="product-sheet" style="text-align:center;padding:2rem">
  <div class="product-monogram" style="font-size:48pt">TG</div>
  <h3 style="font-size:20pt;letter-spacing:0.15em">TALLOW &amp; GO</h3>
  <p>Nourrir • Clarifier • Rayonner</p>
  <p style="color:${BRAND.muted}">Nourish • Clarify • Glow</p>
  <div class="cover-rule" style="margin:1.5rem auto"></div>
  <p>Powered by purified beef tallow</p>
  <p><strong>Fabriqué au Sénégal</strong></p>
</div>
<p>Packaging ivoire mat, typographie serif élégante, monogramme TG embossé sur le savon SAFAA. Gamme complète en coffret premium pour distribution hôtellerie, spas et retail sélectif.</p>`)}

${page(17, 'Pourquoi le Beef Tallow ?', 'Ingrédient signature', `
<h3>Un ingrédient ancestral, redevenu essentiel</h3>
<p>Le suif de bœuf (beef tallow) est composé d'acides gras proches de la structure lipidique de la peau humaine — ce qui explique son efficacité en nutrition cutanée profonde.</p>
<div class="two-col">
  <div>
    <h4>Avantages</h4>
    <ul>
      <li>Nourrit intensément sans film occlusif agressif</li>
      <li>Compatible peaux sèches, sensibles et matures</li>
      <li>Stable, longue conservation naturelle</li>
      <li>Valorise un co-produit de l'embouche bovine</li>
      <li>Liste INCI courte et lisible</li>
    </ul>
  </div>
  <div>
    <h4>Notre approche</h4>
    <ul>
      <li>Suif issu de nos propres embouches</li>
      <li>Purification contrôlée qualité cosmétique</li>
      <li>Formulation artisanale au Sénégal</li>
      <li>Compléments botaniques locaux (moringa, nigelle, neem…)</li>
    </ul>
  </div>
</div>
<p class="quote">Du troupeau à la peau — une chaîne courte, transparente et vertueuse.</p>`)}

${page(18, 'Composition & bienfaits — Synthèse', 'Fiche technique gamme', `
<table style="font-size:8.5pt">
  <tr><th>Produit</th><th>Ingrédient clé</th><th>Bienfait principal</th></tr>
  <tr><td>SAFAA</td><td>Charbon actif · Neem · Lait</td><td>Purifie en profondeur</td></tr>
  <tr><td>AURA</td><td>Charbon · Sucre fin · Nigelle</td><td>Exfolie &amp; clarifie</td></tr>
  <tr><td>SHINY</td><td>Carotte · Hibiscus · Niacinamide</td><td>Éclat &amp; hydration</td></tr>
  <tr><td>NOOR</td><td>Moringa · Réglisse · Vitamine E</td><td>Réparation nocturne</td></tr>
  <tr><td>SOFT KISS</td><td>Ricin · Cire d'abeille · Karité</td><td>Lèvres nourries</td></tr>
</table>
<div class="highlight-box">
  <h3>Positionnement marché</h3>
  <p style="margin:0">Segment clean beauty premium · Prix accessible luxe · Origine traçable Sénégal · Export diaspora &amp; marchés occidentaux (tendance tallow skincare)</p>
</div>`)}

${page(19, 'Gamme Tallow & Go — Vue d\'ensemble', '5 soins essentiels', `
<p>La gamme couvre les rituels clés : nettoyage, exfoliation, hydratation jour, réparation nuit, soin lèvres.</p>
<table>
  <tr><th>Produit</th><th>Format</th><th>Rôle</th></tr>
  ${TALLOW_PRODUCTS.map((p) => `<tr><td><strong>${p.name}</strong> — ${p.fr}</td><td>${p.size}</td><td>${p.benefits[0]}</td></tr>`).join('')}
</table>
<div class="icon-row">
  <div class="icon-pill"><span class="ico">💧</span> Nourrit intensément</div>
  <div class="icon-pill"><span class="ico">✨</span> Clarifie le teint</div>
  <div class="icon-pill"><span class="ico">☀</span> Ravive l'éclat</div>
  <div class="icon-pill"><span class="ico">🛡</span> Tous types de peau</div>
  <div class="icon-pill"><span class="ico">🍃</span> Sans parabène</div>
  <div class="icon-pill"><span class="ico">🇸🇳</span> Fabriqué au Sénégal</div>
</div>`)}

${productPages}

${page(25, 'Synergies Horizon Farm & Tallow & Go', 'Intégration verticale', `
<div class="value-chain">
  <div class="vc-step"><strong>Embouche</strong>Bovins Horizon</div>
  <div class="vc-step"><strong>Extraction</strong>Suif purifié</div>
  <div class="vc-step"><strong>Formulation</strong>Tallow &amp; Go</div>
  <div class="vc-step"><strong>Distribution</strong>Local &amp; export</div>
</div>
<ul>
  <li><strong>Marge capturée</strong> — le suif, co-produit à faible coût, devient produit à haute valeur ajoutée</li>
  <li><strong>Traçabilité</strong> — même exigence qualité élevage → cosmétique</li>
  <li><strong>Image de marque</strong> — Horizon Farm crédibilise l'origine ; Tallow &amp; Go diversifie les revenus</li>
  <li><strong>ERP commun</strong> — stocks suif, coûts de production, marges par produit suivis dans Horizon Farm</li>
</ul>`)}

${page(26, 'Chaîne de valeur intégrée', 'Schéma global', `
<div class="chart-wrap">
  <svg viewBox="0 0 500 200" xmlns="http://www.w3.org/2000/svg" class="chart-svg">
    <rect x="10" y="70" width="90" height="60" rx="8" fill="${BRAND.green}"/>
    <text x="55" y="105" text-anchor="middle" fill="#fff" font-size="10">ÉLEVAGE</text>
    <path d="M100 100 H130" stroke="${BRAND.gold}" stroke-width="2" marker-end="url(#arrow)"/>
    <rect x="130" y="70" width="90" height="60" rx="8" fill="${BRAND.greenMid}"/>
    <text x="175" y="105" text-anchor="middle" fill="#fff" font-size="10">PRODUCTION</text>
    <path d="M220 100 H250" stroke="${BRAND.gold}" stroke-width="2"/>
    <rect x="250" y="70" width="90" height="60" rx="8" fill="${BRAND.gold}"/>
    <text x="295" y="105" text-anchor="middle" fill="#fff" font-size="10">TRANSFORM.</text>
    <path d="M340 100 H370" stroke="${BRAND.gold}" stroke-width="2"/>
    <rect x="370" y="70" width="90" height="60" rx="8" fill="${BRAND.green}"/>
    <text x="415" y="105" text-anchor="middle" fill="#fff" font-size="10">MARCHÉS</text>
    <text x="55" y="155" text-anchor="middle" font-size="8" fill="${BRAND.muted}">Pondeuses · Chair · Bovins</text>
    <text x="175" y="155" text-anchor="middle" font-size="8" fill="${BRAND.muted}">Œufs · Viande · Suif</text>
    <text x="295" y="155" text-anchor="middle" font-size="8" fill="${BRAND.muted}">Alimentaire · Cosmétique</text>
    <text x="415" y="155" text-anchor="middle" font-size="8" fill="${BRAND.muted}">B2B · B2C · Export</text>
    <rect x="150" y="10" width="200" height="40" rx="8" fill="${BRAND.black}" opacity="0.85"/>
    <text x="250" y="35" text-anchor="middle" fill="#fff" font-size="11">ERP HORIZON FARM — Pilotage transversal</text>
  </svg>
</div>
<p>Chaque maillon est instrumenté : effectifs, stocks, coûts, ventes et trésorerie consolidés en temps réel.</p>`)}

${page(27, 'Impact économique & social', 'Contribution territoriale', `
<div class="two-col">
  <div>
    <h3>Impact économique</h3>
    <ul>
      <li>CA prévisionnel A1 : <strong>${fmtM(FINANCE.revenueY1)}</strong></li>
      <li>Croissance CA sur 5 ans : +97%</li>
      <li>Résultat net A5 : <strong>${fmtM(FINANCE.resultY5[4])}</strong></li>
      <li>Trésorerie cumulée fin A1 : <strong>${fmtM(FINANCE.cashEndY1)}</strong></li>
      <li>Réduction import protéines &amp; cosmétiques</li>
    </ul>
  </div>
  <div>
    <h3>Impact social</h3>
    <ul>
      <li>Emplois directs dès A1 (voir ci-contre)</li>
      <li>Formation terrain aux pratiques modernes</li>
      <li>Modèle reproductible pour jeunes agripreneurs</li>
      <li>Valorisation savoir-faire féminin en agro-business</li>
    </ul>
  </div>
</div>
<h3>Création d'emplois — Équipe A1</h3>
<table>
  <tr><th>Poste</th><th>Effectif</th><th>Rémunération</th></tr>
  ${TEAM.map((t) => `<tr><td>${t.role}${t.name ? ` (${t.name})` : ''}</td><td>${t.count || 1}</td><td>${t.salary}</td></tr>`).join('')}
</table>
<p>Masse salariale annuelle : <strong>${fmtFcfa(11_040_000)}</strong> (hors charges)</p>`)}

${page(28, 'Prévisions financières', 'Plan 5 ans', `
<div class="two-col">
  <div class="chart-wrap"><h4>Chiffre d'affaires</h4>${revChart}</div>
  <div class="chart-wrap"><h4>Résultat net</h4>${resultChart}</div>
</div>
<div class="two-col">
  <div class="chart-wrap"><h4>Répartition CA — Année 1</h4>${revDonut}</div>
  <div>
    <table>
      <tr><th>Année</th><th>CA</th><th>Résultat</th></tr>
      ${FINANCE.revenueY5.map((r, i) => `<tr><td>A${i + 1}</td><td>${fmtM(r)}</td><td>${fmtM(FINANCE.resultY5[i])}</td></tr>`).join('')}
    </table>
  </div>
</div>
<p><em>Source : Plan financier prévisionnel Horizon Farm (Excel officiel). Projections à réconcilier avec la stratégie opérationnelle validée.</em></p>`)}

${page(29, 'Capacité autofinancement & scénarios', 'Projection', `
<div class="stat-grid">
  <div class="stat-card"><div class="val">${fmtM(FINANCE.resultY5[0])}</div><div class="lbl">CAF Année 1</div></div>
  <div class="stat-card"><div class="val">${fmtM(FINANCE.resultY5[4])}</div><div class="lbl">CAF Année 5</div></div>
  <div class="stat-card"><div class="val">×2,3</div><div class="lbl">Croissance CAF</div></div>
</div>
<p>La capacité d'autofinancement progresse régulièrement, permettant de réinvestir dans l'extension Tallow &amp; Go, la transformation alimentaire et l'ERP sans dilution excessive.</p>
<h3>Scénarios d'extension (post A1)</h3>
<ul>
  <li><strong>Cosmétique</strong> — unité formulation + export : +15–25 % marge groupe</li>
  <li><strong>Transformation</strong> — chambre froide &amp; découpe : sécurisation écoulement viande</li>
  <li><strong>Digital</strong> — licence ERP autres exploitations : revenus récurrents</li>
</ul>`)}

${page(30, 'Analyse des risques', 'Gestion proactive', `
<table>
  <tr><th>Risque</th><th>Niveau</th><th>Mitigation</th></tr>
  ${RISKS.map((r) => `<tr><td>${r.risk}</td><td class="${r.level === 'Élevé' ? 'risk-high' : 'risk-med'}">${r.level}</td><td>${r.mitigation}</td></tr>`).join('')}
</table>
<div class="highlight-box">
  <h3>Atout différenciant</h3>
  <p style="margin:0">L'ERP Horizon Farm transforme la gestion des risques en pilotage préventif : alertes stock, suivi mortalité, trésorerie prévisionnelle, traçabilité pour financeurs.</p>
</div>`)}

${page(31, 'Feuille de route sur 5 ans', '2026 — 2030', `
<div class="timeline">
  ${ROADMAP.map((r) => `<div class="timeline-item"><div class="timeline-year">${r.year} · ${r.phase}</div><ul>${r.items.map((i) => `<li>${i}</li>`).join('')}</ul></div>`).join('')}
</div>`)}

${page(32, 'Besoins de financement', 'Structure financière', `
<h3>Investissement initial</h3>
<table>
  <tr><th>Poste</th><th>Montant</th></tr>
  ${STARTUP_LINES.map((l) => `<tr><td>${l.label}</td><td>${fmtFcfa(l.amount)}</td></tr>`).join('')}
  <tr><th>Total besoins</th><th>${fmtFcfa(FINANCE.startupTotal)}</th></tr>
</table>
<h3>Financement actuel</h3>
<p>Apport personnel / familial : <strong>${fmtFcfa(FINANCE.fundingPersonal)}</strong> (100 %)</p>
<p>Horizon Farm ouvre également la voie à des partenariats bancaires (BNDE), subventions (PNUD/UGB) ou investisseurs privés pour accélérer l'extension Tallow &amp; Go et la transformation alimentaire.</p>
<div class="stat-grid">
  <div class="stat-card"><div class="val">${fmtM(FINANCE.bfrY1)}</div><div class="lbl">BFR A1</div></div>
  <div class="stat-card"><div class="val">30 j</div><div class="lbl">Crédit client</div></div>
  <div class="stat-card"><div class="val">30 j</div><div class="lbl">Dette fournisseur</div></div>
</div>`)}

${page(33, 'Conclusion', 'Horizon Farm', `
<p class="quote">Horizon Farm n'est pas une ferme de plus — c'est une chaîne de valeur intégrée, pilotée par la data, ancrée au Sénégal et ouverte sur l'Afrique de l'Ouest.</p>
<p>De l'œuf à la tablette cosmétique, chaque flux est produit, tracé et valorisé. Tallow &amp; Go apporte la touche premium qui transforme un co-produit agricole en marque exportable.</p>
<div class="highlight-box">
  <h3>Nous sollicitons votre confiance</h3>
  <p style="margin:0">Investisseurs, banques et partenaires : rejoignez une aventure agricole structurée, chiffrée et déjà opérationnelle sur le plan technologique. Ensemble, construisons un modèle durable de prospérité rurale.</p>
</div>
<p style="margin-top:1.5rem"><strong>${IDENTITY.founder}</strong><br/>Fondatrice · Horizon Farm &amp; Tallow &amp; Go<br/>${IDENTITY.contact}</p>`)}

<section class="page back-cover">
  <div class="cover-logo">${LOGO_SVG.replace(/width="[^"]*"/, 'width="180"').replace(/height="[^"]*"/, 'height="68"')}</div>
  <h2>${IDENTITY.project}</h2>
  <p>« ${IDENTITY.slogan} »</p>
  <div class="cover-rule" style="background:${BRAND.goldLight}"></div>
  <p>${IDENTITY.contact}</p>
  <p style="margin-top:2rem;font-size:8pt;color:#6b9a7a">Document confidentiel · ${IDENTITY.year}</p>
</section>
</body>
</html>`;
}

async function generatePdf(htmlPath) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle' });
  await page.emulateMedia({ media: 'print' });
  await page.pdf({
    path: PDF_OUT,
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
  });
  await browser.close();
  fs.copyFileSync(PDF_OUT, PDF_PUBLIC);
  const pages = fs.readFileSync(PDF_OUT).toString('latin1').match(/\/Type\s*\/Page[^s]/g);
  console.log(`  Pages PDF: ~${pages?.length ?? '?'}`);
}

const html = buildHtml();
fs.writeFileSync(HTML_OUT, html, 'utf8');
console.log('✓ HTML:', HTML_OUT);

await generatePdf(HTML_OUT);
console.log('✓ PDF:', PDF_OUT);
console.log('✓ PDF (public):', PDF_PUBLIC);
