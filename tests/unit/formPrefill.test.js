import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildFormPrefill,
  mergePrefillIntoForm,
  getPath,
  provenanceLabel,
} from '../../src/utils/formPrefill.js';
import seed from '../../src/utils/horizonFarmSimulationSeed.js';

test('getPath lit un chemin imbriqué et tolère l\'absence', () => {
  assert.equal(getPath({ a: { b: 3 } }, 'a.b'), 3);
  assert.equal(getPath({ a: {} }, 'a.b.c'), undefined);
  assert.equal(getPath(null, 'a'), undefined);
});

test('santé : le formulaire hérite de la fiche animal (rien à resaisir)', () => {
  const bovin = seed.animaux.find((a) => a.id === 'HF-BOV-003');
  const pf = buildFormPrefill({
    formType: 'sante_intervention',
    subject: bovin,
    context: { typeIntervention: 'soin', farmId: 'HF' },
  });
  assert.equal(pf.values.animal_id, 'HF-BOV-003');
  assert.equal(pf.values.espece, bovin.espece || bovin.type);
  assert.equal(pf.values.poids, bovin.poids);
  assert.equal(pf.values.type_intervention, 'soin'); // contexte gagne sur le défaut
  assert.ok(pf.values.date, 'date préremplie (aujourd\'hui)');
  assert.equal(pf.provenance.animal_id, 'subject');
  assert.equal(pf.provenance.type_intervention, 'context');
  assert.ok(pf.filledCount >= 5, `plusieurs champs préremplis (${pf.summary})`);
});

test('priorité : le contexte explicite gagne sur la fiche', () => {
  const pf = buildFormPrefill({
    formType: 'sante_intervention',
    subject: { id: 'A1', type: 'Bovin' },
    context: { typeIntervention: 'vaccination' },
    defaults: {},
  });
  assert.equal(pf.values.type_intervention, 'vaccination');
  // Sans contexte, le défaut s'applique.
  const pf2 = buildFormPrefill({ formType: 'sante_intervention', subject: { id: 'A1', type: 'Bovin' } });
  assert.equal(pf2.values.type_intervention, 'vaccination'); // valeur par défaut de la règle
  assert.equal(pf2.provenance.type_intervention, 'default');
});

test('vente : hérite du sujet et d\'un prix recommandé lié', () => {
  const pf = buildFormPrefill({
    formType: 'sale_record',
    subject: { id: 'HF-BOV-003', name: 'Bovin embouche 3', unite: 'tête', farm_id: 'HF' },
    context: { clientId: 'HF-CLI-004', sourceType: 'animal' },
    related: { recommendedPrice: 434200 },
  });
  assert.equal(pf.values.source_id, 'HF-BOV-003');
  assert.equal(pf.values.client_id, 'HF-CLI-004');
  assert.equal(pf.values.unit_price, 434200);
  assert.equal(pf.provenance.unit_price, 'related');
});

test('champ inconnu = non prérempli (on n\'invente pas)', () => {
  const pf = buildFormPrefill({ formType: 'sante_intervention', subject: { id: 'A1' } });
  assert.equal('poids' in pf.values, false, 'poids absent si la fiche ne le porte pas');
});

test('fusion : ne jamais écraser une saisie utilisateur existante', () => {
  const prefill = { espece: 'Bovin', poids: 310, type_intervention: 'vaccination' };
  const current = { poids: 305, notes: 'déjà tapé' }; // l'utilisateur a mis 305
  const { form, applied } = mergePrefillIntoForm(prefill, current);
  assert.equal(form.poids, 305, 'la saisie utilisateur est préservée');
  assert.equal(form.espece, 'Bovin', 'les champs vides sont complétés');
  assert.equal(form.notes, 'déjà tapé');
  assert.ok(applied.includes('espece') && !applied.includes('poids'));
});

test('provenanceLabel : lisible pour l\'affichage', () => {
  assert.match(provenanceLabel('subject'), /fiche/);
  assert.match(provenanceLabel('lastValue'), /derni/i);
});

// --- Pilote : le formulaire santé hérite réellement de la fiche animal ---
import { buildHealthInterventionDraft } from '../../src/utils/elevageHealthNavigation.js';

test('pilote santé : le brouillon reprend l\'espèce/poids/boucle de l\'animal', () => {
  const bovin = seed.animaux.find((a) => a.id === 'HF-BOV-003');
  const draft = buildHealthInterventionDraft({ animalId: bovin.id, typeIntervention: 'soin', subject: bovin });
  assert.equal(draft.espece, bovin.espece || bovin.type);
  assert.equal(draft.poids, bovin.poids);
  assert.equal(draft.boucle_numero, bovin.boucle_numero);
  assert.equal(draft.type_intervention, 'soin');
  assert.ok(Array.isArray(draft.prefill_applied) && draft.prefill_applied.length > 0);
});

test('pilote santé : rétrocompatible sans sujet (aucun héritage forcé)', () => {
  const draft = buildHealthInterventionDraft({ animalId: 'A1', typeIntervention: 'vaccination' });
  assert.equal(draft.type_intervention, 'vaccination');
  assert.equal('espece' in draft, false);
  assert.equal('prefill_applied' in draft, false);
});

// --- 2e pilote : la transformation hérite de la fiche animal/lot ---
import { buildTransformationDraft } from '../../src/utils/elevageTransformationNavigation.js';

test('pilote transformation : le brouillon reprend l\'espèce/poids/boucle de l\'animal', () => {
  const bovin = seed.animaux.find((a) => a.id === 'HF-BOV-010');
  const draft = buildTransformationDraft({ animalId: bovin.id, transformType: 'abattage', subject: bovin });
  assert.equal(draft.animal_id, bovin.id);
  assert.equal(draft.espece, bovin.espece || bovin.type);
  assert.equal(draft.poids, bovin.poids);
  assert.equal(draft.source_type, 'animal');
  assert.ok(draft.prefill_applied.includes('espece'));
});

test('pilote transformation : lot chair hérite de l\'effectif', () => {
  const lot = seed.avicole.find((l) => l.id === 'HF-CH-003');
  const draft = buildTransformationDraft({ lotId: lot.id, subject: lot });
  assert.equal(draft.lot_id, lot.id);
  assert.equal(draft.effectif, lot.current_count);
  assert.equal(draft.source_type, 'lot_avicole');
});

test('pilote transformation : rétrocompatible sans sujet', () => {
  const draft = buildTransformationDraft({ animalId: 'A1' });
  assert.equal(draft.animal_id, 'A1');
  assert.equal('espece' in draft, false);
  assert.equal('prefill_applied' in draft, false);
});
