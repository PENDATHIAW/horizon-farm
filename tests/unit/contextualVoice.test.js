import test from 'node:test';
import assert from 'node:assert/strict';

import { parseContextualVoicePhrase } from '../../src/services/aiGateway/contextualVoiceParser.js';
import { TARGET_WORKFLOWS } from '../../src/services/aiGateway/aiActionDrafts.js';

const lots = [
  { id: 'LOT-CHAIR-3', nom: 'lot chair 3', type: 'poulets_de_chair' },
  { id: 'LOT-2', nom: 'lot 2' },
];

test('œufs : production + chaîne entrée stock', () => {
  const result = parseContextualVoicePhrase("J'ai ramassé 15 tablettes d'œufs", { lots });
  assert.ok(result.drafts.length >= 2);
  assert.equal(result.drafts[0].intent, 'egg_production');
  assert.ok(result.drafts.some((d) => d.status === 'chain_info' || d.meta?.role === 'chain'));
});

test('isolement : santé + tâche suivi', () => {
  const result = parseContextualVoicePhrase("J'ai isolé 3 poulets malades dans le lot 2", { lots });
  assert.ok(result.drafts.length >= 2);
  assert.equal(result.drafts[0].intent, 'health_action');
  assert.ok(result.drafts.some((d) => d.intent === 'task_creation'));
});

test('vente cash : vente + chaîne paiement/finance/stock', () => {
  const result = parseContextualVoicePhrase("J'ai vendu 10 poulets à 4500 FCFA chacun, payé cash", { lots });
  assert.equal(result.drafts[0].intent, 'sale_record');
  assert.ok(result.drafts.length >= 3);
  const chainTitles = result.drafts.map((d) => d.draft?.title).filter(Boolean);
  assert.ok(chainTitles.some((t) => /Encaissement|Finance|stock/i.test(t)));
});

test('alimentation : distribution + chaîne stock', () => {
  const result = parseContextualVoicePhrase("J'ai distribué 2 sacs d'aliment au lot chair 3", {
    lots,
    stock: [{ id: 'STK-ALI', produit: 'aliment chair', quantite: 100 }],
  });
  assert.equal(result.drafts[0].intent, 'feeding_distribution');
  assert.equal(result.drafts[0].target_workflow, TARGET_WORKFLOWS.FEEDING);
  assert.ok(result.drafts.length >= 2);
});

test('phrase ambiguë lot → demande précision', () => {
  const ambiguousLots = [
    { id: 'LOT-2-A', nom: 'lot 2 chair' },
    { id: 'LOT-2-B', nom: 'lot 2 pondeuse' },
  ];
  const result = parseContextualVoicePhrase("J'ai isolé 3 poulets malades dans le lot 2", { lots: ambiguousLots });
  assert.ok(result.clarify || result.drafts[0]?.missing_fields?.length);
});

test('aucune exécution : brouillon principal requiert validation', () => {
  const result = parseContextualVoicePhrase("J'ai ramassé 15 tablettes d'œufs", { lots });
  const primary = result.drafts[0];
  assert.equal(primary.required_validation, true);
  assert.notEqual(primary.user_validated, true);
});

test('naissance / mise bas — draft animal_birth sans exécution auto', () => {
  const result = parseContextualVoicePhrase('Mise bas ce matin — agneau né', { animaux: [], lots });
  assert.ok(result.drafts.some((d) => d.intent === 'animal_birth' || d.draft?.intent === 'animal_birth'));
  const birth = result.drafts.find((d) => d.intent === 'animal_birth' || d.draft?.intent === 'animal_birth');
  assert.equal(birth.required_validation, true);
});

test('pesée animal — draft animal_weighing', () => {
  const result = parseContextualVoicePhrase('J\'ai pesé le bovin BOV002 à 420 kg', {
    animaux: [{ id: 'BOV002', nom: 'Bovin' }],
    lots,
  });
  assert.ok(result.drafts.some((d) => d.intent === 'animal_weighing' || d.draft?.intent === 'animal_weighing'));
});

test('mortalité animal — draft animal_loss', () => {
  const result = parseContextualVoicePhrase('Le bovin BOV002 est mort', {
    animaux: [{ id: 'BOV002', nom: 'Bovin' }],
    lots,
  });
  assert.ok(result.drafts.some((d) => d.intent === 'animal_loss' || d.draft?.intent === 'animal_loss'));
});
