/**
 * Charte (cliquet global) : le tiret long « — » est interdit dans toute chaîne
 * visible de src/ (voir src/i18n/charte.js, TIRET_LONG). Utiliser « - », « : »
 * ou reformuler.
 *
 * Ce test verrouille tout le périmètre src/ (pas seulement les chemins migrés)
 * pour empêcher toute réintroduction du tiret long dans les textes affichés.
 * Les commentaires de code sont retirés avant analyse (non affichés).
 *
 * Exécution : npx vite-node tests/unit/tiretLongAbsent.test.js
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TIRET_LONG } from '../../src/i18n/charte.js';

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../src');

const FICHIERS_EXCLUS = new Set([
  'i18n/charte.js',
  // Le tiret long y est un délimiteur de parsing sur du texte collé par
  // l'utilisateur (jamais affiché), pas un libellé produit.
  'services/investorForums/mergeInvestorForumProfile.js',
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
  return [...litterauxDeChaine(nettoye), ...jsx];
};

test('aucun tiret long « — » dans les chaînes visibles de src/', () => {
  const fautes = [];
  for (const fichier of listerFichiers(SRC)) {
    const relatif = path.relative(SRC, fichier);
    if (FICHIERS_EXCLUS.has(relatif)) continue;
    const code = fs.readFileSync(fichier, 'utf8');
    for (const texte of textesVisibles(code, fichier)) {
      if (texte.includes(TIRET_LONG)) fautes.push(`${relatif} : « ${texte.trim().slice(0, 70)} »`);
    }
  }
  assert.deepEqual(fautes, [], `Tiret long interdit à l'écran :\n${fautes.join('\n')}`);
});
