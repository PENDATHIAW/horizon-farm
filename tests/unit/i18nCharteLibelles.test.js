/**
 * Chantier 1 · test 1 : parcourt le dictionnaire de libellés et échoue si un
 * terme interdit par la charte ou un tiret long y figure.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { toutesLesChaines } from '../../src/i18n/fr/index.js';
import { violationsCharte } from '../../src/i18n/charte.js';

test('le dictionnaire ne contient aucun terme interdit ni tiret long', () => {
  const fautes = [];
  for (const { cle, texte } of toutesLesChaines()) {
    for (const violation of violationsCharte(texte)) {
      fautes.push(`${cle} : ${violation} (« ${texte} »)`);
    }
  }
  assert.deepEqual(fautes, [], `Libellés non conformes à la charte :\n${fautes.join('\n')}`);
});

test('le dictionnaire fournit les remplacements de référence', () => {
  const chaines = toutesLesChaines().map((c) => c.texte);
  assert.ok(chaines.includes('Suggestion à confirmer'));
  assert.ok(chaines.some((c) => c.startsWith("Je n'ai pas assez de données pour répondre")));
  assert.ok(chaines.includes("Rien à afficher pour l'instant."));
  assert.ok(chaines.includes('Coût moyen'));
  assert.ok(chaines.includes('Urgent : {objet} attend un responsable'));
});
