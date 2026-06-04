import test from 'node:test';
import assert from 'node:assert/strict';

import { composeDecisionDataMap } from '../../src/services/moduleDataComposer.js';
import { evaluateAdvisorRules } from '../../src/services/horizonAdvisor/advisorRules.js';
import {
  ADVISOR_URGENCY,
  buildDailyAdvisorRecommendations,
  mapSeverityToUrgency,
} from '../../src/services/horizonAdvisor/advisorService.js';
import {
  createAdvisorActionDraft,
  validateAdvisorDraft,
} from '../../src/services/horizonAdvisor/advisorDraftService.js';
import { AI_DRAFT_SOURCES } from '../../src/services/aiGateway/aiActionDrafts.js';

const emptyMap = composeDecisionDataMap({ crud: {}, dataMap: {} });

test('evaluateAdvisorRules détecte DLC viande et chaleur', () => {
  const rules = evaluateAdvisorRules({
    ...emptyMap,
    stock: [{
      id: 'MEAT-1',
      produit: 'Viande poulet',
      categorie: 'produit_fini_viande_frais',
      quantite: 10,
      date_peremption: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
    }],
    meteo: { temperature: 36, condition: 'Canicule' },
  });
  assert.ok(rules.some((r) => /DLC viande/i.test(r.title)));
  assert.ok(rules.some((r) => /Chaleur prévue/i.test(r.title)));
});

test('evaluateAdvisorRules détecte stock aliment faible', () => {
  const rules = evaluateAdvisorRules({
    ...emptyMap,
    stock: [{ id: 'ALI-1', produit: 'Aliment chair', categorie: 'aliment_avicole', quantite: 6, seuil: 10 }],
    alimentation_logs: [
      { id: 'L1', quantite: 2, produit: 'Aliment chair' },
      { id: 'L2', quantite: 2, produit: 'Aliment chair' },
    ],
  });
  assert.ok(rules.some((r) => /Stock aliment faible/i.test(r.title)));
});

test('buildDailyAdvisorRecommendations priorise et mappe urgence', () => {
  const report = buildDailyAdvisorRecommendations({
    ...emptyMap,
    avicole: [{ id: 'L1', nom: 'Lot A', initial_count: 1000, mortality: 50, statut: 'actif' }],
    stock: [{ id: 'S1', produit: 'Aliment', quantite: 1, seuil: 10, prix_unitaire: 20000 }],
  }, { limit: 5 });
  assert.ok(report.recommendations.length > 0);
  assert.ok(report.recommendations.every((r) => r.title && r.urgency));
  assert.equal(mapSeverityToUrgency('critique'), ADVISOR_URGENCY.ELEVEE);
  assert.equal(report.readOnly, true);
});

test('createAdvisorActionDraft exige validation utilisateur', () => {
  const report = buildDailyAdvisorRecommendations({
    ...emptyMap,
    stock: [{ id: 'S1', produit: 'Aliment', quantite: 1, seuil: 10 }],
  }, { limit: 1 });
  const rec = report.recommendations[0];
  const draft = createAdvisorActionDraft(rec, { actionType: 'task' });
  assert.equal(draft.required_validation, true);
  assert.equal(draft.source, AI_DRAFT_SOURCES.HEALTH_ENGINE);
  assert.equal(draft.user_validated, false);
  const validated = validateAdvisorDraft(draft);
  assert.equal(validated.user_validated, true);
});

test('buildDailyAdvisorRecommendations réutilise erpHealthEngine', () => {
  const report = buildDailyAdvisorRecommendations(emptyMap);
  assert.ok(typeof report.health_score === 'number');
  assert.ok(report.sources.engine_findings >= 0);
});
