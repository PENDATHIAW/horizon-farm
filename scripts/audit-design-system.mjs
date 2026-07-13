import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { SAISIES_QUOTIDIENNES } from '../src/config/formulaires20s.config.js';
import { MODULE_OVERVIEW_KPIS } from '../src/config/moduleOverviewKpis.js';

const ROOT = process.cwd();
const failures = [];

function read(file) {
  return readFileSync(join(ROOT, file), 'utf8').replace(/^\uFEFF/, '');
}

function sourceFiles(directory) {
  const absolute = join(ROOT, directory);
  return readdirSync(absolute).flatMap((entry) => {
    const full = join(absolute, entry);
    if (statSync(full).isDirectory()) return sourceFiles(relative(ROOT, full));
    return /\.(?:js|jsx)$/.test(entry) ? [relative(ROOT, full)] : [];
  });
}

function fail(message) {
  failures.push(message);
}

function requireText(source, expected, label) {
  if (!source.includes(expected)) fail(`${label}: valeur attendue absente (${expected})`);
}

const tokens = read('src/styles/tokens.css');
const expectedTokens = {
  '--color-earth': '#14402E',
  '--color-leaf': '#1E5A40',
  '--color-horizon': '#C9971C',
  '--color-horizon-dark': '#9A7413',
  '--color-pure': '#FFFFFF',
  '--color-mist': '#F6F8F6',
  '--color-card': '#FBFCFB',
  '--color-ink': '#20302A',
  '--color-slate': '#5E6E65',
  '--color-line': '#E5EBE7',
  '--color-positive': '#2E7D52',
  '--color-positive-bg': '#EAF4EE',
  '--color-vigilance': '#C9971C',
  '--color-vigilance-bg': '#FBF3DF',
  '--color-urgent': '#C0402B',
  '--color-urgent-bg': '#F9EAE7',
  '--color-neutral': '#5E6E65',
  '--color-neutral-bg': '#F0F3F1',
};

for (const [name, value] of Object.entries(expectedTokens)) {
  requireText(tokens, `${name}: ${value};`, 'Palette');
}
requireText(tokens, '--font-sans: "Inter"', 'Typographie Inter');
requireText(tokens, '--font-display: "Fraunces"', 'Typographie Fraunces');
requireText(tokens, '--radius-card: 0.75rem;', 'Rayon carte');
requireText(tokens, '--radius-control: 0.625rem;', 'Rayon controle');
requireText(tokens, '--radius-chip: 999px;', 'Rayon puce');
requireText(tokens, '--shadow-card: 0 1px 3px rgba(20, 64, 46, 0.06), 0 4px 12px rgba(20, 64, 46, 0.04);', 'Ombre carte');

const indexCss = read('src/index.css');
requireText(indexCss, 'family=Fraunces:opsz,wght@9..144,600&family=Inter:wght@400;500;600', 'Chargement des polices');
requireText(indexCss, '@media (prefers-reduced-motion: reduce)', 'Mouvement reduit');
requireText(indexCss, 'letter-spacing: 0;', 'Espacement des lettres');

const forbidden = [
  ['couleur hex locale', /#[0-9a-f]{3,8}\b/i],
  ['couleur rgb locale', /\brgba?\s*\(/i],
  ['gradient', /\b(?:bg-)?gradient-|\b(?:linear|radial)-gradient\s*\(/i],
  ['palette Tailwind hors charte', /\b(?:bg|text|border|ring|outline|fill|stroke)-(?:red|rose|amber|yellow|orange|emerald|green|lime|sky|blue|indigo|violet|purple|zinc|gray|slate)-\d+\b/],
  ['police tierce', /\bfont-(?:mono|thin|extralight|light)\b/],
  ['graisse superieure a 600', /\bfont-(?:bold|extrabold|black)\b/],
  ['ombre locale', /\bshadow-(?:sm|md|lg|xl|2xl|inner|\[[^\]]+\])\b/],
  ['rayon local', /\brounded-\[[^\]]+\]/],
  ['taille de texte locale', /\btext-\[[^\]]+\]/],
  ['espacement de lettres non nul', /\btracking-(?!normal\b)[^\s'"`]+/],
];
const allowedSpacing = new Set(['0', '1', '2', '3', '4', '6', '8', '12']);
const spacingPattern = /\b(?:[mp][trblxy]?|gap|space-[xy])-(\d+(?:\.5)?)\b/g;

for (const file of sourceFiles('src')) {
  const lines = read(file).split('\n');
  lines.forEach((line, index) => {
    for (const [label, pattern] of forbidden) {
      if (pattern.test(line)) fail(`${file}:${index + 1}: ${label}`);
    }
    spacingPattern.lastIndex = 0;
    for (const match of line.matchAll(spacingPattern)) {
      if (!allowedSpacing.has(match[1])) fail(`${file}:${index + 1}: espacement hors echelle (${match[0]})`);
    }
  });
}

const appLayout = read('src/layouts/AppLayout.jsx');
const navBlock = appLayout.match(/const NAV_GROUPS = Object\.freeze\(\[([\s\S]*?)\]\);/)?.[1] || '';
const navGroups = [...navBlock.matchAll(/\{ key: '([^']+)'[^\n]+ids: \[([^\]]+)\]/g)];
if (navGroups.length !== 7) fail(`Navigation: ${navGroups.length} sections au lieu de 7`);

const navModuleIds = navGroups.flatMap((match) => [...match[2].matchAll(/'([^']+)'/g)].map((item) => item[1]));
for (const moduleId of navModuleIds.filter((id) => id !== 'dashboard')) {
  if (!MODULE_OVERVIEW_KPIS[moduleId]) fail(`KPI d'ouverture absents pour ${moduleId}`);
}

const expectedQuickEntries = ['distribution', 'ponte', 'mortalite', 'pesee', 'irrigation', 'recolte', 'vente'];
const quickEntryIds = SAISIES_QUOTIDIENNES.map((entry) => entry.id);
if (JSON.stringify(quickEntryIds) !== JSON.stringify(expectedQuickEntries)) {
  fail(`Saisies rapides: ${quickEntryIds.join(', ')}`);
}
if (SAISIES_QUOTIDIENNES.some((entry) => entry.champsRequis.length > 5)) {
  fail('Saisies rapides: un formulaire depasse cinq champs requis');
}

const kpiComponent = read('src/components/uniques/CarteKPI.jsx');
for (const marker of ['hf-trend-pill', 'HorizonLine', 'favorableDirection', 'LoadingCard', 'Pas encore de données', 'hf-kpi-card-clickable']) {
  requireText(kpiComponent, marker, 'CarteKPI');
}

const moduleTabs = read('src/components/module/ModuleTabsBar.jsx');
requireText(moduleTabs, '<ModuleOverviewStrip moduleId={moduleId}', 'Gabarit KPI des modules');
requireText(appLayout, '<GlobalQuickEntryMenu', 'Saisie rapide globale');

const runtimeText = [
  ...sourceFiles('src'),
  ...sourceFiles('sites/horizon-farm-web/src'),
].map((file) => `${file}\n${read(file)}`).join('\n');
const retiredProduct = ['BOV', 'INIA'].join('');
const retiredBrand = ['Tal', 'low'].join('');
const retiredBrandPattern = new RegExp(`\\b(?:${retiredProduct}|${retiredBrand}(?:\\s*&\\s*Go)?)\\b`, 'i');
if (retiredBrandPattern.test(runtimeText)) {
  fail('Reliquat de marque historique dans une source executable');
}

if (failures.length) {
  console.error(`Audit design en echec (${failures.length})`);
  failures.forEach((message) => console.error(`- ${message}`));
  process.exitCode = 1;
} else {
  console.log(`Audit design valide: ${Object.keys(expectedTokens).length} couleurs, 7 sections, 7 saisies rapides, ${navModuleIds.length - 1} modules avec KPI.`);
}
