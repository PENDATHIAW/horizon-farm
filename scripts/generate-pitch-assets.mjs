/**
 * Génère PITCH_HORIZON_FARM.pdf et PITCH_HORIZON_FARM.pptx
 * Usage: node scripts/generate-pitch-assets.mjs
 */
import { chromium } from 'playwright';
import pptxgen from 'pptxgenjs';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'docs', 'pitch');
const PUBLIC_DIR = path.join(ROOT, 'public');
const HTML_PATH = path.join(PUBLIC_DIR, 'pitch-horizon-farm.html');
const LOGO = path.join(PUBLIC_DIR, 'horizon-farm-logo-transparent.png');

const BRAND = {
  hero: '052e16',
  accent: '22c55e',
  accentStrong: '15803d',
  gold: '9a6b12',
  goldLight: 'b8954a',
  sun: 'e8a317',
  surface: 'fffdf8',
  border: 'eadcc2',
  text: '2f2415',
  muted: '8a7456',
  white: 'FFFFFF',
  darkBg: '041a0d',
};

fs.mkdirSync(OUT_DIR, { recursive: true });

const SLIDES = [
  {
    layout: 'cover',
    kicker: 'ERP agricole intégré',
    title: "De la terre\nà l'horizon",
    body: 'Pilotez élevage, cultures, stock, ventes et finances — avec capteurs connectés et un assistant qui parle votre langue du terrain.',
    footer: 'Pitch client · 2026',
    dark: true,
  },
  {
    kicker: 'Le constat',
    title: 'Cinq freins qui coûtent cher',
    bullets: [
      'Données dispersées — carnets, WhatsApp, tableurs qui ne se parlent pas.',
      'Décisions tardives — rupture d\'aliment, mortalité : on réagit trop tard.',
      'Trésorerie opaque — difficile de savoir ce qui est vraiment encaissé.',
      'Traçabilité faible — banques et clients demandent des preuves introuvables.',
      'Outils inadaptés — ERP génériques ou gadgets sans métier agricole.',
    ],
    note: 'Résultat : pertes, marges floues, croissance difficile à financer.',
  },
  {
    kicker: 'Notre vision',
    title: 'Une exploitation lisible en dix secondes',
    quote: '« Vous ouvrez l\'app le matin : effectifs, stock critique, trésorerie, capteurs, et la première action à faire — sans jargon, sans dix fichiers Excel. »',
    dark: true,
  },
  {
    kicker: 'La solution',
    title: 'Sept piliers, un seul flux',
    bullets: [
      'Accueil dirigeant — état global, capteurs, conseil actionnable',
      'Élevage & cultures — lots, animaux, parcelles, récoltes',
      'Stock & achats — réceptions, seuils, DLC, fournisseurs',
      'Commercial — vente → livraison → encaissement → marge',
      'Finance — trésorerie, créances, rentabilité',
      'Smart Farm — capteurs TC, caméras, alertes automatiques',
      'Hey Horizon — phrase terrain → brouillon validé',
    ],
    footer: 'Vente → Stock → Trésorerie → Activité & Suivi',
  },
  {
    kicker: 'Accueil',
    title: 'Le carnet du dirigeant',
    twoCol: [
      ['ÉLEVAGE', '4 300 têtes', '4 000 pondeuses · 300 chair'],
      ['CULTURES', '12 parcelles', '8,5 ha exploités'],
      ['STOCK', '47 produits', '⚠ Rupture aliment'],
      ['FINANCE', '2,4 M FCFA', 'Créances · Dettes'],
    ],
    highlight: 'CAPTEURS : 28°C · Humidité 62 % · 2 capteurs en ligne',
  },
  {
    kicker: 'Hey Horizon',
    title: "L'assistant qui comprend le terrain",
    body: 'Pas de formulaire compliqué : vous parlez, Horizon prépare, vous validez. Aucune écriture sans votre accord.',
    chat: [
      { role: 'user', text: "J'ai vendu 20 tablettes d'œufs à 70 000 FCFA, payé Orange Money." },
      { role: 'bot', text: 'Brouillon vente · 20 tablettes · 70 000 FCFA · Paiement reçu\n→ Valider & enregistrer' },
    ],
    dark: true,
  },
  {
    kicker: 'Smart Farm',
    title: 'Capteurs & alertes automatiques',
    bullets: [
      'Chaleur poulailler — ventilation planifiée avant pertes',
      'Sol sec — irrigation et suivi parcelle',
      'Intrusion nocturne — notification immédiate',
    ],
    metrics: [
      { label: 'Poulailler A', value: '28°C' },
      { label: 'Serre tomates', value: '18% sol' },
    ],
    alert: 'Chaleur détectée → tâche ventilation créée',
  },
  {
    kicker: 'Scénario démo',
    title: 'Une matinée type à la ferme',
    timeline: [
      ['08h00 — Accueil', 'Cartes domaine, capteurs 28°C, conseil stock aliment bas.'],
      ['08h15 — Hey Horizon', '« Réception 20 sacs aliment AgroFeed 480 000 F » → validation.'],
      ['09h00 — Commercial', 'Vente restaurant, encaissement Orange Money, marge visible.'],
      ['10h30 — Smart Farm', 'Alerte chaleur → Activité & Suivi « À traiter maintenant ».'],
      ['Soir — Journal', 'Vente, réception, paiement, soin : tout est tracé.'],
    ],
  },
  {
    kicker: 'Impact',
    title: 'Bénéfices mesurables',
    bars: [
      { label: 'Temps de saisie', value: '−50%' },
      { label: 'Visibilité trésorerie', value: '+100%' },
      { label: 'Ruptures stock', value: '−30%' },
      { label: 'Surveillance capteurs', value: '24/7' },
      { label: 'Marge par vente', value: '1 clic' },
    ],
    dark: true,
  },
  {
    kicker: 'Cibles',
    title: 'Pour qui ?',
    personas: [
      ['Aviculteur', 'Chair, ponte, lots, œufs'],
      ['Éleveur', 'Bovins, ovins, caprins'],
      ['Maraîcher', 'Parcelles, irrigation, capteurs'],
      ['Mixte', 'Élevage + cultures'],
      ['Coopérative', 'Multi-producteurs'],
      ['Investisseur', 'Traçabilité, indicateurs'],
    ],
  },
  {
    kicker: 'Accompagnement',
    title: 'Trois phases de déploiement',
    phases: [
      ['1 · Découverte', 'Compte démo, modules prioritaires, 5 saisies quotidiennes à digitaliser.'],
      ['2 · Pilote', 'Configuration ferme, formation, capteurs pilote, point hebdo.'],
      ['3 · Généralisation', 'Multi-fermes, rapports banque, Smart Farm, mobile money.'],
    ],
  },
  {
    kicker: 'Objections',
    title: 'On nous dit souvent…',
    bullets: [
      '« Mon équipe n\'est pas digital » → Hey Horizon : phrases simples. Accueil sans formation longue.',
      '« J\'ai déjà Excel » → Excel ne relie pas vente, stock et capteurs.',
      '« La connexion est mauvaise » → Saisie hors ligne, sync au retour réseau.',
    ],
  },
  {
    kicker: 'Pourquoi Horizon Farm',
    title: "Pas un gadget.\nUn copilote d'exploitation.",
    quote: 'ERP métier + capteurs + assistant terrain — interconnectés. Ce que vous saisissez le matin éclaire votre décision du soir.',
    dark: true,
  },
  {
    layout: 'cta',
    kicker: 'Prochaine étape',
    title: 'Prêt à piloter votre exploitation autrement ?',
    body: 'Essai guidé 30 minutes · Pilote 30 jours · Plan de déploiement personnalisé',
    cta: 'Demander une démo',
    email: 'contact@horizon-farm.app',
    footer: "Horizon Farm — De la terre à l'horizon",
  },
];

function addBrandHeader(slide, pptx, slideNum, dark = false) {
  if (fs.existsSync(LOGO)) {
    slide.addImage({ path: LOGO, x: 0.4, y: 0.25, w: 1.8, h: 0.55 });
  }
  slide.addText(`${String(slideNum).padStart(2, '0')} / ${String(SLIDES.length).padStart(2, '0')}`, {
    x: 8.8, y: 0.35, w: 1.0, h: 0.3,
    fontSize: 8, bold: true, color: dark ? '6B9A7A' : BRAND.muted, align: 'right',
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 5.45, w: 10, h: 0.08,
    fill: { type: 'solid', color: BRAND.accent },
    line: { color: BRAND.accent, width: 0 },
  });
}

async function generatePptx() {
  const pptx = new pptxgen();
  pptx.author = 'Horizon Farm';
  pptx.title = 'Horizon Farm — Pitch client';
  pptx.subject = 'ERP agricole intégré';
  pptx.layout = 'LAYOUT_16x9';

  SLIDES.forEach((data, index) => {
    const slide = pptx.addSlide();
    const dark = data.dark;
    const bg = dark ? BRAND.darkBg : BRAND.surface;
    slide.background = { color: bg };

    if (data.layout === 'cover') {
      if (fs.existsSync(LOGO)) {
        slide.addImage({ path: LOGO, x: 3.2, y: 0.8, w: 3.6, h: 1.1 });
      }
      slide.addText(data.kicker, {
        x: 0.8, y: 2.2, w: 8.4, h: 0.4,
        fontSize: 11, bold: true, color: BRAND.goldLight, align: 'center', charSpacing: 4,
      });
      slide.addText(data.title, {
        x: 0.8, y: 2.6, w: 8.4, h: 1.4,
        fontSize: 40, bold: true, color: BRAND.white, align: 'center', fontFace: 'Georgia',
      });
      slide.addText(data.body, {
        x: 1.5, y: 4.1, w: 7.0, h: 0.9,
        fontSize: 14, color: 'A7D4B5', align: 'center',
      });
      slide.addText(data.footer, {
        x: 0.8, y: 5.1, w: 8.4, h: 0.3,
        fontSize: 9, bold: true, color: BRAND.goldLight, align: 'center', charSpacing: 3,
      });
      return;
    }

    if (data.layout === 'cta') {
      addBrandHeader(slide, pptx, index + 1);
      slide.addText(data.kicker, {
        x: 0.8, y: 1.2, w: 8.4, h: 0.35,
        fontSize: 11, bold: true, color: BRAND.gold, align: 'center', charSpacing: 3,
      });
      slide.addText(data.title, {
        x: 0.8, y: 1.7, w: 8.4, h: 1.0,
        fontSize: 32, bold: true, color: BRAND.hero, align: 'center', fontFace: 'Georgia',
      });
      slide.addText(data.body, {
        x: 1.2, y: 2.9, w: 7.6, h: 0.6,
        fontSize: 14, color: BRAND.muted, align: 'center',
      });
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 3.5, y: 3.7, w: 3.0, h: 0.65, rectRadius: 0.2,
        fill: { color: BRAND.accentStrong },
      });
      slide.addText(data.cta, {
        x: 3.5, y: 3.75, w: 3.0, h: 0.55,
        fontSize: 14, bold: true, color: BRAND.white, align: 'center',
      });
      slide.addText(`${data.footer}\n${data.email}`, {
        x: 0.8, y: 4.7, w: 8.4, h: 0.5,
        fontSize: 10, color: BRAND.muted, align: 'center',
      });
      return;
    }

    addBrandHeader(slide, pptx, index + 1, dark);

    const titleColor = dark ? BRAND.white : BRAND.hero;
    const textColor = dark ? 'C8E6C9' : BRAND.muted;
    const kickerColor = dark ? BRAND.goldLight : BRAND.gold;

    slide.addText(data.kicker, {
      x: 0.6, y: 0.95, w: 8.8, h: 0.3,
      fontSize: 10, bold: true, color: kickerColor, charSpacing: 3,
    });
    slide.addText(data.title, {
      x: 0.6, y: 1.25, w: 8.8, h: 0.75,
      fontSize: 28, bold: true, color: titleColor, fontFace: 'Georgia',
    });

    let y = 2.1;

    if (data.quote) {
      slide.addShape(pptx.ShapeType.rect, {
        x: 0.6, y, w: 0.06, h: 1.1, fill: { color: BRAND.accent },
      });
      slide.addText(data.quote, {
        x: 0.85, y, w: 8.3, h: 1.2,
        fontSize: 15, italic: true, color: dark ? 'DCFCE7' : BRAND.text,
      });
      y += 1.4;
    }

    if (data.body) {
      slide.addText(data.body, { x: 0.6, y, w: 8.8, h: 0.7, fontSize: 13, color: textColor });
      y += 0.85;
    }

    if (data.bullets?.length) {
      const bulletText = data.bullets.map((b) => ({ text: b, options: { bullet: true, breakLine: true } }));
      slide.addText(bulletText, {
        x: 0.6, y, w: 8.8, h: 2.8,
        fontSize: 12, color: dark ? 'E8F5E9' : BRAND.text, valign: 'top',
      });
      y += 2.9;
    }

    if (data.twoCol) {
      data.twoCol.forEach((row, i) => {
        const col = i % 2;
        const rowIdx = Math.floor(i / 2);
        const x = 0.6 + col * 4.5;
        const cy = y + rowIdx * 1.15;
        slide.addShape(pptx.ShapeType.roundRect, {
          x, y: cy, w: 4.2, h: 1.0, rectRadius: 0.1,
          fill: { color: 'ECFDF5' }, line: { color: BRAND.accent, width: 1 },
        });
        slide.addText(row[0], { x: x + 0.15, y: cy + 0.08, w: 3.9, h: 0.2, fontSize: 8, bold: true, color: BRAND.accentStrong });
        slide.addText(row[1], { x: x + 0.15, y: cy + 0.28, w: 3.9, h: 0.3, fontSize: 16, bold: true, color: BRAND.text, fontFace: 'Georgia' });
        slide.addText(row[2], { x: x + 0.15, y: cy + 0.62, w: 3.9, h: 0.3, fontSize: 9, color: BRAND.muted });
      });
      y += 2.5;
      if (data.highlight) {
        slide.addShape(pptx.ShapeType.roundRect, {
          x: 0.6, y, w: 8.8, h: 0.55, rectRadius: 0.08,
          fill: { color: 'ECFDF5' }, line: { color: BRAND.accent, width: 1 },
        });
        slide.addText(data.highlight, { x: 0.75, y: y + 0.12, w: 8.5, h: 0.35, fontSize: 11, bold: true, color: BRAND.accentStrong });
      }
    }

    if (data.chat) {
      data.chat.forEach((msg, i) => {
        const isUser = msg.role === 'user';
        slide.addShape(pptx.ShapeType.roundRect, {
          x: isUser ? 4.5 : 0.8, y: y + i * 0.85, w: 4.5, h: 0.75, rectRadius: 0.12,
          fill: { color: isUser ? BRAND.hero : BRAND.white },
          line: isUser ? { width: 0 } : { color: BRAND.border, width: 1 },
        });
        slide.addText(msg.text, {
          x: isUser ? 4.65 : 0.95, y: y + 0.05 + i * 0.85, w: 4.2, h: 0.65,
          fontSize: 10, color: isUser ? BRAND.white : BRAND.text,
        });
      });
    }

    if (data.metrics) {
      data.metrics.forEach((m, i) => {
        slide.addShape(pptx.ShapeType.roundRect, {
          x: 5.5 + i * 2.0, y, w: 1.8, h: 1.0, rectRadius: 0.1,
          fill: { color: i === 0 ? 'F0FDF4' : 'FFFBEB' },
        });
        slide.addText(m.label, { x: 5.55 + i * 2.0, y: y + 0.1, w: 1.7, h: 0.2, fontSize: 8, color: BRAND.muted, align: 'center' });
        slide.addText(m.value, { x: 5.55 + i * 2.0, y: y + 0.35, w: 1.7, h: 0.45, fontSize: 22, bold: true, color: i === 0 ? BRAND.accentStrong : BRAND.gold, align: 'center', fontFace: 'Georgia' });
      });
    }

    if (data.alert) {
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 5.5, y: 1.15, w: 4.0, h: 0.5, rectRadius: 0.08, fill: { color: 'FEF3C7' },
      });
      slide.addText(`⚠ ${data.alert}`, { x: 5.6, y: 1.22, w: 3.8, h: 0.35, fontSize: 9, bold: true, color: '92400E' });
    }

    if (data.timeline) {
      data.timeline.forEach((item, i) => {
        slide.addShape(pptx.ShapeType.ellipse, {
          x: 0.65, y: y + i * 0.62 + 0.08, w: 0.12, h: 0.12, fill: { color: BRAND.accent },
        });
        slide.addText(item[0], { x: 0.9, y: y + i * 0.62, w: 8.0, h: 0.25, fontSize: 11, bold: true, color: dark ? BRAND.white : BRAND.text });
        slide.addText(item[1], { x: 0.9, y: y + i * 0.62 + 0.22, w: 8.0, h: 0.3, fontSize: 9, color: textColor });
      });
    }

    if (data.bars) {
      data.bars.forEach((bar, i) => {
        const bx = 0.8 + i * 1.75;
        const h = 0.5 + (i % 3) * 0.35;
        slide.addShape(pptx.ShapeType.rect, {
          x: bx, y: 3.8 - h, w: 1.2, h, fill: { color: i % 2 ? BRAND.sun : BRAND.accent },
        });
        slide.addText(bar.value, { x: bx, y: 2.0, w: 1.2, h: 0.3, fontSize: 12, bold: true, color: dark ? BRAND.white : BRAND.hero, align: 'center' });
        slide.addText(bar.label, { x: bx - 0.1, y: 3.95, w: 1.4, h: 0.45, fontSize: 8, color: textColor, align: 'center' });
      });
    }

    if (data.personas) {
      data.personas.forEach((p, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const px = 0.6 + col * 3.1;
        const py = y + row * 1.35;
        slide.addShape(pptx.ShapeType.roundRect, {
          x: px, y: py, w: 2.85, h: 1.15, rectRadius: 0.1,
          fill: { color: BRAND.white }, line: { color: BRAND.border, width: 1 },
        });
        slide.addText(p[0], { x: px + 0.1, y: py + 0.15, w: 2.65, h: 0.3, fontSize: 11, bold: true, color: BRAND.hero, align: 'center' });
        slide.addText(p[1], { x: px + 0.1, y: py + 0.5, w: 2.65, h: 0.5, fontSize: 8, color: BRAND.muted, align: 'center' });
      });
    }

    if (data.phases) {
      data.phases.forEach((ph, i) => {
        const px = 0.6 + i * 3.1;
        slide.addShape(pptx.ShapeType.roundRect, {
          x: px, y, w: 2.9, h: 2.2, rectRadius: 0.12,
          fill: { color: BRAND.white }, line: { color: BRAND.border, width: 1.5 },
        });
        slide.addText(ph[0], { x: px + 0.15, y: y + 0.2, w: 2.6, h: 0.4, fontSize: 13, bold: true, color: BRAND.hero, fontFace: 'Georgia' });
        slide.addText(ph[1], { x: px + 0.15, y: y + 0.7, w: 2.6, h: 1.3, fontSize: 9, color: BRAND.muted, valign: 'top' });
      });
    }

    if (data.note) {
      slide.addText(data.note, { x: 0.6, y: 5.0, w: 8.8, h: 0.3, fontSize: 9, italic: true, color: BRAND.muted });
    }

    if (data.footer && !data.phases) {
      slide.addText(data.footer, { x: 0.6, y: 5.0, w: 8.8, h: 0.3, fontSize: 10, bold: true, color: BRAND.accentStrong, align: 'center' });
    }
  });

  const outPath = path.join(OUT_DIR, 'PITCH_HORIZON_FARM.pptx');
  await pptx.writeFile({ fileName: outPath });
  console.log('✓ PPTX:', outPath);
  return outPath;
}

async function generatePdf() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const fileUrl = `file://${HTML_PATH}`;

  await page.goto(fileUrl, { waitUntil: 'networkidle' });
  await page.emulateMedia({ media: 'print' });

  // Force all slides visible for PDF export
  await page.addStyleTag({
    content: `
      .slide { display: flex !important; position: relative !important; page-break-after: always; min-height: 100vh; }
      .nav-hint, .progress { display: none !important; }
      html, body, .deck { overflow: visible !important; height: auto !important; }
    `,
  });

  const pdfPath = path.join(OUT_DIR, 'PITCH_HORIZON_FARM.pdf');
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    landscape: true,
    printBackground: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
    preferCSSPageSize: true,
  });

  await browser.close();
  console.log('✓ PDF:', pdfPath);
  return pdfPath;
}

async function main() {
  console.log('Génération pitch Horizon Farm…');
  await generatePptx();
  await generatePdf();

  // Copies dans public/ pour téléchargement direct
  for (const ext of ['pdf', 'pptx']) {
    const src = path.join(OUT_DIR, `PITCH_HORIZON_FARM.${ext}`);
    const dest = path.join(PUBLIC_DIR, `PITCH_HORIZON_FARM.${ext}`);
    if (fs.existsSync(src)) fs.copyFileSync(src, dest);
    console.log('✓ Copie:', dest);
  }
  console.log('Terminé.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
