import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

/**
 * Garde-fou anti-doublons de navigabilité (feuille de route HF-P0-002 :
 * « une fonction = un emplacement principal », « aucun onglet, panneau ou
 * KPI en double »).
 *
 * Chaque entrée fige le nombre maximal de rendus JSX d'un hub/panneau dans le
 * fichier d'un module. Ces invariants sont le résultat de la revue onglet par
 * onglet (Élevage, Cultures, Achats & Stock, Commercial, Finance) : ils
 * empêchent la réintroduction centralisée d'un panneau dupliqué entre deux
 * onglets, en complément des tests propres à chaque module.
 *
 * Ajouter une entrée ici quand une revue établit qu'un composant ne doit
 * apparaître qu'à un seul endroit.
 */
const SINGLETON_RENDERS = [
  // Commercial : devis/réconciliation vivent dans « Factures & paiements »,
  // plus dans un <details> du Tableau de bord.
  { file: 'src/modules/CommercialRecoveredModule.jsx', component: 'CommercialQuotesPanel', max: 1 },
  { file: 'src/modules/CommercialRecoveredModule.jsx', component: 'CommercialReconciliationPanel', max: 1 },
  // Finance : le glossaire de marge n'est rendu qu'une fois dans « Coûts & marges ».
  { file: 'src/modules/FinancePilotageRecoveredModule.jsx', component: 'MarginGlossaryPanel', max: 1 },
  // Achats & Stock : l'historique des mouvements vit dans l'onglet « Mouvements »,
  // il ne doit plus figurer dans le tableau partagé StocksV5 (rendu dans 3 onglets).
  { file: 'src/modules/StocksV5.jsx', component: 'StockMovementsPanel', max: 0 },
  // Cultures : le hub « Intrants & météo » n'est rendu que dans l'onglet Intrants ;
  // le hub transformation redondant a été supprimé (rendu via l'onglet Récoltes).
  { file: 'src/modules/CulturesRecoveredModule.jsx', component: 'CulturesIntrantsHub', max: 1 },
  { file: 'src/modules/CulturesRecoveredModule.jsx', component: 'CulturesTransformationHub', max: 0 },
];

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const sourceCache = new Map();
function sourceOf(file) {
  if (!sourceCache.has(file)) sourceCache.set(file, readFileSync(join(root, file), 'utf8'));
  return sourceCache.get(file);
}
function renderCount(src, component) {
  return (src.match(new RegExp(`<${component}\\b`, 'g')) || []).length;
}

test('aucun panneau audité n’est rendu dans plus d’un onglet (HF-P0-002)', () => {
  const violations = [];
  for (const { file, component, max } of SINGLETON_RENDERS) {
    const count = renderCount(sourceOf(file), component);
    if (count > max) violations.push(`${component} rendu ${count} fois (max ${max}) dans ${file}`);
  }
  assert.deepEqual(violations, [], `Doublons de navigabilité réintroduits :\n${violations.join('\n')}`);
});

test('le registre reste non vide et bien formé', () => {
  assert.ok(SINGLETON_RENDERS.length >= 6);
  for (const rule of SINGLETON_RENDERS) {
    assert.ok(rule.file && rule.component, 'chaque règle cible un fichier et un composant');
    assert.ok(Number.isInteger(rule.max) && rule.max >= 0, 'max entier positif');
    // Le fichier référencé existe (sauf composant attendu à 0 dans un fichier gardé).
    assert.doesNotThrow(() => sourceOf(rule.file), `fichier introuvable : ${rule.file}`);
  }
});
