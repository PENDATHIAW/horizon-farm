/**
 * Chantier 5 : contrat des 20 secondes.
 *
 * Vérifie au niveau du registre unique (src/config/formulaires20s.config.js) que
 * chaque saisie respecte le contrat : cinq champs requis au maximum, des
 * préremplissages présents, une clé d'idempotence déclarée (rejeu = un seul
 * effet), un gabarit de confirmation à effets, et un libellé de bouton
 * verbe + objet conforme à la charte de langage. Le chronométrage réel (moins de
 * 20 secondes) et le test humain sur téléphone sont couverts par le harnais
 * Playwright tests/e2e/contrat-20-secondes.spec.js et le modèle de test humain
 * docs/test-humain-20-secondes.md.
 *
 * Exécution : npx vite-node tests/unit/contrat20Secondes.test.js
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SAISIES_QUOTIDIENNES,
  SAISIES_PERIODIQUES,
  REGISTRE_FORMULAIRES,
  CONTRAT_20S,
  respecteContrat,
} from '../../src/config/formulaires20s.config.js';
import { confirmationAEffets } from '../../src/utils/confirmationAEffets.js';
import { violationsCharte } from '../../src/i18n/charte.js';
import { ACTIONS_RAPIDES_QUOTIDIENNES } from '../../src/modules/dashboard/AccueilConforme.jsx';

const VERBES = /^(Enregistrer|Distribuer|Déclarer|Noter|Préparer|Créer|Ajouter|Transférer)\b/;

test('les 7 saisies quotidiennes sont déclarées', () => {
  assert.equal(SAISIES_QUOTIDIENNES.length, 7);
  const ids = SAISIES_QUOTIDIENNES.map((f) => f.id);
  for (const attendu of ['distribution', 'ponte', 'mortalite', 'pesee', 'irrigation', 'recolte', 'vente']) {
    assert.ok(ids.includes(attendu), `saisie quotidienne manquante : ${attendu}`);
  }
});

test('les saisies périodiques exigées sont déclarées', () => {
  const ids = SAISIES_PERIODIQUES.map((f) => f.id);
  for (const attendu of ['reception', 'depense', 'encaissement_client', 'paiement_fournisseur', 'vaccination', 'nettoyage', 'transfert_organique', 'semis', 'panne', 'absence']) {
    assert.ok(ids.includes(attendu), `saisie périodique manquante : ${attendu}`);
  }
});

test('chaque saisie respecte le contrat : 5 champs requis max, préremplissages, idempotence, confirmation', () => {
  for (const f of REGISTRE_FORMULAIRES) {
    assert.ok(f.champsRequis.length <= CONTRAT_20S.champsRequisMax, `${f.id} : ${f.champsRequis.length} champs requis`);
    assert.ok(f.preremplissages.length > 0, `${f.id} : aucun préremplissage`);
    assert.ok(f.cleIdempotence?.domaine, `${f.id} : pas de clé d'idempotence`);
    assert.ok(f.confirmation?.effetStock && f.confirmation?.effetCout, `${f.id} : confirmation à effets incomplète`);
    assert.ok(respecteContrat(f), `${f.id} : contrat non respecté`);
  }
});

test('date du jour, utilisateur et unités de la ferme sont préremplis partout', () => {
  for (const f of REGISTRE_FORMULAIRES) {
    for (const attendu of ['date_du_jour', 'utilisateur_connecte', 'unites_de_la_ferme']) {
      assert.ok(f.preremplissages.includes(attendu), `${f.id} : préremplissage ${attendu} manquant`);
    }
  }
});

test('les libellés de boutons suivent verbe + objet et respectent la charte', () => {
  for (const f of REGISTRE_FORMULAIRES) {
    assert.match(f.libelleBouton, VERBES, `${f.id} : libellé sans verbe d'action « ${f.libelleBouton} »`);
    assert.doesNotMatch(f.libelleBouton, /Soumettre/i, `${f.id} : « Soumettre » interdit`);
    assert.deepEqual(violationsCharte(f.libelleBouton), [], `${f.id} : libellé non conforme à la charte`);
  }
});

test('la confirmation à effets suit le gabarit « {Saisie} enregistrée · {effet} · {effet} »', () => {
  const message = confirmationAEffets('ponte', { saisie: 'ponte', effetStock: '12 tablettes', effetCout: 'production du jour' });
  assert.match(message, /Ponte enregistrée · 12 tablettes · production du jour/);
  // valeurs par défaut depuis le registre si non fournies
  const parDefaut = confirmationAEffets('distribution');
  assert.match(parDefaut, /enregistrée · .+ · .+/);
  assert.deepEqual(violationsCharte(parDefaut), []);
});

test('les boutons d\'action rapide de l\'Accueil correspondent aux 7 saisies quotidiennes', () => {
  assert.equal(ACTIONS_RAPIDES_QUOTIDIENNES.length, 7);
  const idsAccueil = ACTIONS_RAPIDES_QUOTIDIENNES.map((a) => a.id).sort();
  const idsRegistre = SAISIES_QUOTIDIENNES.map((f) => f.id).sort();
  assert.deepEqual(idsAccueil, idsRegistre);
  for (const action of ACTIONS_RAPIDES_QUOTIDIENNES) {
    assert.ok(action.module && action.tab, `${action.id} : module ou onglet manquant`);
  }
});
