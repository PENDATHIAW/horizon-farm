/**
 * Test — Note descriptive DER/FJ Greenpreneurs
 *
 * Vérifie que le générateur produit toutes les sections requises par le
 * template DER/FJ et que le score de complétude fonctionne.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDerfjNoteDescriptive,
  computeDerfjNoteCompleteness,
  renderDerfjNoteSections,
  DERFJ_NOTE_SECTION_IDS,
} from '../../src/services/investorForums/derfjNoteDescriptive.js';

const baseData = {
  sales_orders: [
    { id: 'CMD1', montant_total: 100000, montant_paye: 100000, client_id: 'CLI-A' },
  ],
  payments: [{ id: 'PAY1', order_id: 'CMD1', montant: 100000, montant_paye: 100000 }],
  clients: [{ id: 'CLI-A', nom: 'Marché Tilène' }],
  stocks: [{ id: 'STK1', produit: 'Aliment', quantite: 100, prix_unitaire: 500 }],
  finances: [{ id: 'TX1', type: 'entree', montant: 100000 }],
  animaux: [{ id: 'BOV1', species: 'bovin', status: 'actif' }],
  lots: [{ id: 'LOT1', type: 'pondeuse', initial_count: 100, current_count: 100, statut: 'actif' }],
  cultures: [],
};

test('buildDerfjNoteDescriptive produit toutes les sections requises', () => {
  const note = buildDerfjNoteDescriptive(baseData);

  assert.ok(note.meta?.program?.includes('DER/FJ'));
  assert.ok(note.identificationPromoteur?.nom);
  assert.ok(note.identificationProjet?.nom);
  assert.ok(note.genese && note.genese.length > 100);
  assert.ok(note.objectifs?.general);
  assert.ok(Array.isArray(note.objectifs?.specifiques) && note.objectifs.specifiques.length >= 3);
  assert.ok(Array.isArray(note.produits) && note.produits.length > 0);
  assert.ok(note.marche?.clientele_cible);
  assert.ok(note.marketing?.produit);
  assert.ok(Array.isArray(note.techniques?.processus));
  assert.ok(note.organisation?.effectif?.total > 0);
  assert.ok(note.impact?.emplois_directs > 0);
  assert.ok(note.financiers?.cout_total_projet > 0);
  assert.ok(note.financiers?.ca_annuel_projete > 0);
  assert.ok(Array.isArray(note.swot?.forces));
  assert.ok(Array.isArray(note.risques) && note.risques.length >= 5);
  assert.ok(Array.isArray(note.calendrier) && note.calendrier.length >= 5);
  assert.ok(note.conclusion && note.conclusion.length > 100);
  assert.ok(Array.isArray(note.annexes) && note.annexes.length >= 5);
});

test('renderDerfjNoteSections retourne 16 sections narratives', () => {
  const note = buildDerfjNoteDescriptive(baseData);
  const sections = renderDerfjNoteSections(note);

  assert.equal(sections.length, DERFJ_NOTE_SECTION_IDS.length);
  const ids = sections.map((section) => section.id);
  DERFJ_NOTE_SECTION_IDS.forEach((expected) => {
    assert.ok(ids.includes(expected), `Section ${expected} manquante`);
  });
});

test('computeDerfjNoteCompleteness — sections auto OK, sections personnelles manquantes', () => {
  const note = buildDerfjNoteDescriptive(baseData);
  const completeness = computeDerfjNoteCompleteness(note, {});
  // L'ERP + BP officiel remplissent déjà beaucoup ; les données personnelles obligatoires
  // (CIN, téléphone, email, date naissance, niveau étude) restent à saisir.
  assert.ok(completeness.score >= 60 && completeness.score < 90, `Score sans données personnelles doit être 60-89, obtenu ${completeness.score}`);
  assert.ok(completeness.missing.includes('CIN promotrice'));
  assert.ok(completeness.missing.includes('Téléphone promotrice'));
  assert.ok(completeness.missing.includes('Email promotrice'));
});

test('computeDerfjNoteCompleteness — score complet avec toutes les infos', () => {
  const manual = {
    promoteur: {
      cin: '1 234 5678',
      telephone: '+221 77 000 00 00',
      email: 'penda@horizon.farm',
      date_naissance: '1990-01-01',
      niveau_etude: 'Master',
    },
    projet: {
      adresse_siege: 'Thiès, quartier X',
    },
    genese: 'Genèse personnalisée détaillée par la promotrice avec plus de 100 caractères pour valider le check du score complétude complet.',
  };
  const note = buildDerfjNoteDescriptive(baseData, manual);
  const completeness = computeDerfjNoteCompleteness(note, manual);
  assert.ok(completeness.score >= 85, `Score complétude devrait être >= 85, obtenu ${completeness.score}`);
  assert.ok(completeness.ready, 'Complétude doit être marquée prête');
});

test('BP officiel intégré : coût total, plan financement, produits, calendrier', () => {
  const note = buildDerfjNoteDescriptive(baseData);
  // Le BP officiel Horizon Farm doit fournir les montants clés
  assert.ok(note.financiers.cout_total_projet >= 26064000, 'Coût total doit refléter le BP officiel');
  assert.ok(note.financiers.ca_annuel_projete >= 121820000, 'CA doit refléter le BP officiel (121M FCFA)');
  assert.ok(note.produits.some((p) => p.activity === 'oeufs'));
  assert.ok(note.produits.some((p) => p.activity === 'poulets_chair'));
  assert.ok(note.produits.some((p) => p.activity === 'bovins'));
});

test('Impact intègre le score Greenpreneurs si fourni', () => {
  const note = buildDerfjNoteDescriptive({
    ...baseData,
    greenpreneurs: {
      readiness: { total: 78, statusLabel: 'Prêt dossier' },
      circular: { engraisSavingsFcfa: 100000, orgaloop: { platformName: 'Orgaloop', soldKg: 500 } },
    },
  });
  assert.equal(note.impact.greenpreneurs_score, 78);
  assert.equal(note.impact.greenpreneurs_status, 'Prêt dossier');
});

test('Surcharge manuelle prioritaire sur les défauts', () => {
  const note = buildDerfjNoteDescriptive(baseData, {
    genese: 'Ma genèse personnalisée courte',
    objectifs: { general: 'Mon objectif' },
    conclusion: 'Ma conclusion',
  });
  assert.equal(note.genese, 'Ma genèse personnalisée courte');
  assert.equal(note.objectifs.general, 'Mon objectif');
  assert.equal(note.conclusion, 'Ma conclusion');
});

test('KPI ERP réels intégrés dans les aspects financiers', () => {
  const note = buildDerfjNoteDescriptive(baseData);
  assert.equal(note.financiers.kpis_erp.ca_realise, 100000);
  assert.equal(note.financiers.kpis_erp.encaisse_realise, 100000);
  assert.equal(note.financiers.kpis_erp.creances_ouvertes, 0);
});
