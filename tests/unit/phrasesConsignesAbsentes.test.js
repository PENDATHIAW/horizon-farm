/**
 * Charte (cliquet) : pas de phrase « consigne » à l'écran.
 *
 * Les descriptions de panneaux ne doivent pas se lire comme des consignes internes
 * ou des auto-garanties (« jamais un chiffre inventé », « à valider - jamais
 * auto-enregistré », « Ici, on génère… »). On parle à l'exploitant, pas au système.
 * Ce test empêche la réintroduction de ce ton.
 *
 * Exécution : npx vite-node tests/unit/phrasesConsignesAbsentes.test.js
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../src');

/** Motifs interdits dans les chaînes visibles (insensibles à la casse). */
const MOTIFS_CONSIGNE = [
  /jamais un chiffre invent/i,
  /aucun(e)?( chiffre)? invent/i,
  /jamais auto[- ]enregistr/i,
  /\bici,? on (génère|affiche|contrôle|calcule)/i,
  /, pas analyser l/i,
];

const listerFichiers = (dossier) => {
  const resultat = [];
  for (const entree of fs.readdirSync(dossier, { withFileTypes: true })) {
    const chemin = path.join(dossier, entree.name);
    if (entree.isDirectory()) resultat.push(...listerFichiers(chemin));
    else if (/\.jsx$/.test(entree.name)) resultat.push(chemin);
  }
  return resultat;
};

const sansCommentaires = (code) => code
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:\\])\/\/[^\n]*/g, '$1');

const textesJsx = (code) => (code.match(/>([^<>{}]+)</g) || [])
  .map((s) => s.slice(1, -1))
  .filter((s) => !/[;=]|=>/.test(s));

test('aucune phrase « consigne » dans les chaînes visibles (.jsx)', () => {
  const fautes = [];
  for (const fichier of listerFichiers(SRC)) {
    const code = sansCommentaires(fs.readFileSync(fichier, 'utf8'));
    for (const texte of textesJsx(code)) {
      if (MOTIFS_CONSIGNE.some((motif) => motif.test(texte))) {
        fautes.push(`${path.relative(SRC, fichier)} : « ${texte.trim().slice(0, 70)} »`);
      }
    }
  }
  assert.deepEqual(fautes, [], `Ton « consigne » interdit à l'écran (parlez à l'exploitant) :\n${fautes.join('\n')}`);
});
