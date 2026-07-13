/**
 * Chantier 1 · test 2 : chaînes visibles en dur dans les composants.
 *
 * Deux niveaux de contrôle :
 *
 * 1. Charte partout : aucun fichier de src/ ne peut contenir, dans une chaîne
 *    destinée à l'écran, un terme de spécification interdit ou une formulation
 *    interdite (voir src/i18n/charte.js).
 *
 * 2. Migration i18n (cliquet) : dans les chemins déjà migrés (CHEMINS_MIGRES),
 *    aucune chaîne d'interface française en dur n'est tolérée hors du
 *    dictionnaire, et la charte complète s'applique (tiret long, mot « IA »,
 *    versions V1/V2/V3 compris). Chaque répertoire migré vers src/i18n/fr/
 *    doit être ajouté à CHEMINS_MIGRES pour verrouiller son état.
 *
 * Exclusions documentées (éviter les faux positifs, voir charte.js) :
 *  - fichiers de tests et jeux de données de test (le scan ne couvre que src/) ;
 *  - commentaires de code (retirés avant analyse) ;
 *  - identifiants techniques : un terme à double usage (payload, farm_id,
 *    event_key, business_events, RLS) n'est signalé que dans une phrase
 *    française ;
 *  - interpolations ${...} des gabarits (code, pas texte affiché) ;
 *  - fragments JSX contenant du code (présence de ; = ou =>) : artefacts
 *    d'extraction, pas du texte affiché ;
 *  - FICHIERS_EXCLUS ci-dessous, chacun avec sa raison.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  TERMES_SPEC_INTERDITS,
  FORMULATIONS_INTERDITES,
  TIRET_LONG,
  MOTIF_IA_VISIBLE,
  estProseFrancaise,
} from '../../src/i18n/charte.js';

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../src');

const FICHIERS_EXCLUS = {
  'i18n/charte.js': 'définit les termes interdits, les contient donc par nature',
  'services/heyHorizonCommercialPrompt.js': 'instructions internes du moteur de réponses, jamais affichées',
  'services/heyHorizonFinancePrompt.js': 'instructions internes du moteur de réponses, jamais affichées',
};

/** Chemins dont les chaînes visibles sont migrées vers src/i18n/fr/. */
const CHEMINS_MIGRES = [
  'i18n/',
  'components/shared/',
  'modules/commercial/DailySaleModal.jsx',
  'modules/cultures/CulturesHarvestPanel.jsx',
  'modules/cultures/CulturesIrrigationQuickForm.jsx',
  'modules/elevage/ElevageWorkflowPanels.jsx',
  'utils/dailyQuickEntryContract.js',
];

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
  const litteraux = litterauxDeChaine(nettoye);
  const jsx = fichier.endsWith('.jsx') ? textesJsx(nettoye) : [];
  return [...litteraux, ...jsx].map((s) => s.replace(/\$\{[^}]*\}/g, ' '));
};

const violationsChartePartout = (texte) => {
  const bas = texte.toLowerCase();
  const violations = [];
  for (const { terme, prose } of TERMES_SPEC_INTERDITS) {
    if (!bas.includes(terme.toLowerCase())) continue;
    if (prose && !estProseFrancaise(texte)) continue;
    if (!estProseFrancaise(texte)) continue;
    violations.push(`terme interdit « ${terme} »`);
  }
  for (const formulation of FORMULATIONS_INTERDITES) {
    if (bas.includes(formulation)) violations.push(`formulation interdite « ${formulation} »`);
  }
  return violations;
};

test('aucun terme interdit par la charte dans les chaînes visibles de src/', () => {
  const fautes = [];
  for (const fichier of listerFichiers(SRC)) {
    const relatif = path.relative(SRC, fichier);
    if (FICHIERS_EXCLUS[relatif]) continue;
    const code = fs.readFileSync(fichier, 'utf8');
    for (const texte of textesVisibles(code, fichier)) {
      for (const violation of violationsChartePartout(texte)) {
        fautes.push(`${relatif} : ${violation} dans « ${texte.trim().slice(0, 80)} »`);
      }
    }
  }
  assert.deepEqual(fautes, [], `Chaînes non conformes :\n${fautes.join('\n')}`);
});

test('chemins migrés : charte complète, aucune chaîne française hors dictionnaire', () => {
  const fautes = [];
  for (const fichier of listerFichiers(SRC)) {
    const relatif = path.relative(SRC, fichier);
    if (!CHEMINS_MIGRES.some((prefixe) => relatif.startsWith(prefixe))) continue;
    if (FICHIERS_EXCLUS[relatif]) continue;
    const dansDictionnaire = relatif.startsWith('i18n/fr/');
    const code = fs.readFileSync(fichier, 'utf8');
    for (const texte of textesVisibles(code, fichier)) {
      if (texte.includes(TIRET_LONG)) fautes.push(`${relatif} : tiret long dans « ${texte.trim().slice(0, 60)} »`);
      if (estProseFrancaise(texte)) {
        if (MOTIF_IA_VISIBLE.test(texte)) fautes.push(`${relatif} : mot « IA » dans « ${texte.trim().slice(0, 60)} »`);
        if (!dansDictionnaire) fautes.push(`${relatif} : chaîne française en dur « ${texte.trim().slice(0, 60)} »`);
      }
    }
  }
  assert.deepEqual(fautes, [], `Chemins migrés non conformes :\n${fautes.join('\n')}`);
});
