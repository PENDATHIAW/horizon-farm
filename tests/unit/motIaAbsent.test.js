/**
 * Charte (cliquet global) : le mot « IA » ne doit apparaître dans aucune chaîne
 * visible de src/. La charte impose « Suggestions », « Analyse » ou
 * « Explication » à la place (voir src/i18n/charte.js, MOTIF_IA_VISIBLE).
 *
 * Ce test verrouille tout le périmètre src/ (pas seulement les chemins migrés),
 * pour empêcher toute réintroduction du terme.
 *
 * Exécution : npx vite-node tests/unit/motIaAbsent.test.js
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MOTIF_IA_VISIBLE } from '../../src/i18n/charte.js';

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../src');

/** Instructions internes des moteurs de réponses, jamais affichées à l'écran. */
const FICHIERS_EXCLUS = new Set([
  'i18n/charte.js',
  'services/heyHorizonCommercialPrompt.js',
  'services/heyHorizonFinancePrompt.js',
]);

const listerFichiers = (dossier) => {
  const resultat = [];
  for (const entree of fs.readdirSync(dossier, { withFileTypes: true })) {
    const chemin = path.join(dossier, entree.name);
    if (entree.isDirectory()) resultat.push(...listerFichiers(chemin));
    else if (/\.(jsx|js)$/.test(entree.name)) resultat.push(chemin);
  }
  return resultat;
};

const sansCommentaires = (code) => code
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:\\])\/\/[^\n]*/g, '$1');

const litterauxDeChaine = (code) => {
  const resultat = [];
  const motif = /'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g;
  let m;
  while ((m = motif.exec(code))) resultat.push(m[1] ?? m[2] ?? m[3] ?? '');
  return resultat;
};

const textesJsx = (code) => (code.match(/>([^<>{}]+)</g) || [])
  .map((s) => s.slice(1, -1))
  .filter((s) => !/[;=]|=>/.test(s));

const textesVisibles = (code, fichier) => {
  const nettoye = sansCommentaires(code);
  const jsx = fichier.endsWith('.jsx') ? textesJsx(nettoye) : [];
  return [...litterauxDeChaine(nettoye), ...jsx].map((s) => s.replace(/\$\{[^}]*\}/g, ' '));
};

test('aucun mot « IA » dans les chaînes visibles de src/', () => {
  const fautes = [];
  for (const fichier of listerFichiers(SRC)) {
    const relatif = path.relative(SRC, fichier);
    if (FICHIERS_EXCLUS.has(relatif)) continue;
    const code = fs.readFileSync(fichier, 'utf8');
    for (const texte of textesVisibles(code, fichier)) {
      if (MOTIF_IA_VISIBLE.test(texte)) fautes.push(`${relatif} : « ${texte.trim().slice(0, 70)} »`);
    }
  }
  assert.deepEqual(fautes, [], `Le mot « IA » est interdit à l'écran :\n${fautes.join('\n')}`);
});
