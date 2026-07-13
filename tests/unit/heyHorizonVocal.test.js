import test from 'node:test';
import assert from 'node:assert/strict';

import { composeDecisionDataMap } from '../../src/services/moduleDataComposer.js';
import {
  BRIEF_QUERY_TYPES,
  buildFarmBriefData,
  detectBriefQueryType,
  isFarmBriefQuery,
  processHeyHorizonVoiceBrief,
} from '../../src/services/heyHorizonVoice/farmBriefService.js';
import { formatVoiceBrief } from '../../src/services/heyHorizonVoice/voiceBriefFormatter.js';

const emptyMap = composeDecisionDataMap({ crud: {}, dataMap: {} });

test('detectBriefQueryType reconnaît les questions brief', () => {
  assert.equal(detectBriefQueryType('Hey Horizon, fais-moi le brief de la semaine.'), BRIEF_QUERY_TYPES.WEEKLY);
  assert.equal(detectBriefQueryType('Combien ai-je encaissé ce mois-ci ?'), BRIEF_QUERY_TYPES.ENCAISSEMENTS);
  assert.equal(detectBriefQueryType('Quel lot est le plus rentable ?'), BRIEF_QUERY_TYPES.LOT_RENTABLE);
  assert.equal(detectBriefQueryType('Quels stocks sont faibles ?'), BRIEF_QUERY_TYPES.STOCKS);
});

test('isFarmBriefQuery exclut les actions terrain', () => {
  assert.equal(isFarmBriefQuery("J'ai vendu 10 poulets à 4500 FCFA chacun, payé cash"), false);
  assert.equal(isFarmBriefQuery('Quels sont mes risques actuels ?'), true);
});

test('buildFarmBriefData inclut Non renseigné si données absentes', () => {
  const brief = buildFarmBriefData(emptyMap);
  assert.ok(brief.sections.length >= 10);
  brief.sections.forEach((section) => {
    assert.ok(section.label);
    assert.ok(section.value);
  });
  const missingSections = brief.sections.filter((s) => s.value === 'Non renseigné');
  assert.ok(missingSections.length >= 5);
});

test('formatVoiceBrief produit texte et payload TTS', () => {
  const brief = buildFarmBriefData({
    ...emptyMap,
    stock: [{ id: 'S1', produit: 'Aliment', quantite: 1, seuil: 10, prix_unitaire: 18000 }],
    avicole: [{ id: 'L1', type: 'Poulets chair', initial_count: 500, mortality: 5, statut: 'actif' }],
    finances: [{ id: 'F1', type: 'sortie', montant: 50000 }],
    sales_orders: [{ id: 'V1', montant_total: 120000, statut: 'livree' }],
    payments: [{ id: 'P1', montant: 80000, order_id: 'V1' }],
  });
  const formatted = formatVoiceBrief({
    ...brief,
    queryType: BRIEF_QUERY_TYPES.WEEKLY,
    phrase: 'Brief de la semaine',
  });
  assert.ok(formatted.text.includes('Brief de la semaine'));
  assert.ok(formatted.tts.text);
  assert.equal(formatted.readOnly, true);
  assert.ok(formatted.text.includes('Stock critique'));
});

test('processHeyHorizonVoiceBrief ne retourne pas action_command pour une question brief', async () => {
  const result = await processHeyHorizonVoiceBrief({
    phrase: 'Quelles actions urgentes aujourd’hui ?',
    dataMap: emptyMap,
  });
  assert.equal(result.ok, true);
  assert.equal(result.readOnly, true);
  assert.equal(result.queryType, BRIEF_QUERY_TYPES.URGENT);
  assert.ok(result.text);
});

test('processHeyHorizonVoiceBrief refuse les actions terrain', async () => {
  const result = await processHeyHorizonVoiceBrief({
    phrase: "J'ai acheté 10 sacs d'aliments à 18500 le sac",
    dataMap: emptyMap,
  });
  assert.equal(result.ok, false);
  assert.equal(result.error, 'action_command');
});
