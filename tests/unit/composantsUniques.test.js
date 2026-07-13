/**
 * Chantier 4 : composants uniques (JournalEvenements, ListeTaches,
 * ListeAlertes, CarteKPI) et catalogues centraux (KPI, 15 alertes).
 * Exécution : npx vite-node tests/unit/composantsUniques.test.js
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import JournalEvenements, { filtrerEvenements } from '../../src/components/uniques/JournalEvenements.jsx';
import ListeTaches, { filtrerTaches } from '../../src/components/uniques/ListeTaches.jsx';
import ListeAlertes, { filtrerAlertes } from '../../src/components/uniques/ListeAlertes.jsx';
import CarteKPI from '../../src/components/uniques/CarteKPI.jsx';
import { CATALOGUE_KPI, valeurKpi } from '../../src/config/catalogueKpi.js';
import { CATALOGUE_ALERTES, graviteAlerte, libelleAlerte } from '../../src/config/catalogueAlertes.js';
import { violationsCharte } from '../../src/i18n/charte.js';

const evenements = [
  { id: 'E1', event_type: 'vente', title: 'Vente 12 tablettes', module_source: 'commercial', event_date: '2026-07-10', entity_id: 'V1' },
  { id: 'E2', event_type: 'ponte', title: 'Ponte lot A', module_source: 'elevage', event_date: '2026-07-12', entity_id: 'LOT-A' },
  { id: 'E3', event_type: 'mortalite', title: 'Mortalité lot A', module_source: 'elevage', event_date: '2026-07-11', entity_id: 'LOT-A' },
];

const taches = [
  { id: 'T1', title: 'Nettoyer le bâtiment 2', status: 'a_faire', due_date: '2026-07-01', assigned_to: 'Awa', priority: 'critique' },
  { id: 'T2', title: 'Relancer le client Diop', status: 'a_faire', due_date: '2026-08-01', assigned_to: 'Moussa', alert_id: 'AL2' },
  { id: 'T3', title: 'Tâche terminée', status: 'terminee', due_date: '2026-06-01', assigned_to: 'Awa' },
];

const alertes = [
  { id: 'AL1', code: 'tresorerie_faible', title: 'Trésorerie faible', severity: 'critique', status: 'nouvelle', module_source: 'finance_pilotage' },
  { id: 'AL2', code: 'creance_echue', title: 'Créance échue Diop', severity: 'warning', status: 'nouvelle', module_source: 'commercial', assigned_to: 'Moussa' },
  { id: 'AL3', code: 'stock_sous_seuil', title: 'Aliment ponte bas', severity: 'warning', status: 'resolue', module_source: 'achats_stock' },
];

test('filtrerEvenements : module, entité, tri décroissant', () => {
  const parModule = filtrerEvenements(evenements, { module: 'elevage' });
  assert.deepEqual(parModule.map((e) => e.id), ['E2', 'E3']);
  const parEntite = filtrerEvenements(evenements, { entiteId: 'LOT-A', limite: 1 });
  assert.deepEqual(parEntite.map((e) => e.id), ['E2']);
});

test('filtrerTaches : ouvertes par défaut, actions correctives = alert_id', () => {
  assert.deepEqual(filtrerTaches(taches).map((t) => t.id), ['T1', 'T2']);
  assert.deepEqual(filtrerTaches(taches, { actionsCorrectives: true }).map((t) => t.id), ['T2']);
  assert.deepEqual(filtrerTaches(taches, { assigne: 'Awa' }).map((t) => t.id), ['T1']);
});

test('filtrerAlertes : actives par défaut, critiques en premier', () => {
  const actives = filtrerAlertes(alertes);
  assert.deepEqual(actives.map((a) => a.id), ['AL1', 'AL2']);
  assert.deepEqual(filtrerAlertes(alertes, { sansResponsable: true }).map((a) => a.id), ['AL1']);
});

test('les quatre composants rendent sans erreur, avec et sans données', () => {
  for (const element of [
    React.createElement(JournalEvenements, { evenements, filtres: { module: 'elevage' }, onNavigate: () => {} }),
    React.createElement(JournalEvenements, { evenements: [] }),
    React.createElement(ListeTaches, { taches, filtres: { actionsCorrectives: true }, onOuvrirTache: () => {} }),
    React.createElement(ListeTaches, { taches: [] }),
    React.createElement(ListeAlertes, { alertes, onCreerTache: () => {}, onNavigate: () => {} }),
    React.createElement(ListeAlertes, { alertes: [] }),
    React.createElement(CarteKPI, { code: 'ca', periode: 'mois en cours', donnees: {}, onNavigate: () => {} }),
    React.createElement(CarteKPI, { code: 'valeur_stock', donnees: {} }),
  ]) {
    const html = renderToString(element);
    assert.ok(html.length > 50);
    assert.doesNotMatch(html, /undefined|NaN/);
  }
});

test('CarteKPI affiche la période et expose une action vers le module propriétaire', () => {
  const html = renderToString(React.createElement(CarteKPI, {
    code: 'creances',
    periode: 'Mois en cours',
    value: 125000,
    donnees: {},
    onNavigate: () => {},
  }));
  assert.match(html, /Mois en cours/);
  assert.match(html, /<button/);
  assert.match(html, /aria-label="Créances clients : 125[\s\u202f]000 FCFA"/);
});

test('catalogue KPI : formule versionnée, source, unité, propriétaire partout', () => {
  for (const [code, entree] of Object.entries(CATALOGUE_KPI)) {
    assert.equal(entree.code, code);
    assert.ok(entree.libelle && entree.unite && entree.source && entree.proprietaire, code);
    assert.ok(Number.isInteger(entree.formule?.version), `formule non versionnée : ${code}`);
    assert.equal(typeof entree.formule.calcul, 'function', code);
    assert.deepEqual(violationsCharte(entree.libelle), [], `libellé non conforme : ${code}`);
  }
  const resultat = valeurKpi('ca', { sales_orders: [], payments: [] });
  assert.equal(resultat.versionFormule, 2);
});

test('catalogue des 15 alertes : complet et conforme à la charte', () => {
  assert.equal(CATALOGUE_ALERTES.length, 15);
  const codes = new Set(CATALOGUE_ALERTES.map((a) => a.code));
  for (const attendu of [
    'stock_sous_seuil', 'stock_negatif_tente', 'lot_expire', 'mortalite_anormale',
    'ponte_en_baisse', 'aliment_hors_courbe', 'vaccination_en_retard', 'creance_echue',
    'facture_livraison_manquante', 'depense_sans_justificatif', 'budget_depasse',
    'tresorerie_faible', 'tache_critique_en_retard', 'panne_equipement_critique',
    'non_synchronise_24h',
  ]) assert.ok(codes.has(attendu), `alerte manquante : ${attendu}`);
  for (const alerte of CATALOGUE_ALERTES) {
    assert.ok(['critique', 'warning'].includes(alerte.gravite), alerte.code);
    assert.deepEqual(violationsCharte(alerte.libelle), [], alerte.code);
    assert.deepEqual(violationsCharte(alerte.condition), [], alerte.code);
  }
  assert.equal(libelleAlerte('tresorerie_faible'), 'Trésorerie faible');
  assert.equal(graviteAlerte('stock_sous_seuil'), 'warning');
});
