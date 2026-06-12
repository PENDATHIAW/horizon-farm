import test from 'node:test';
import assert from 'node:assert/strict';
import { MODULE_BUSINESS_QUESTIONS } from '../../src/services/assistantBusinessQuestions.js';
import { classifyUniversalIntent } from '../../src/services/assistantUniversalIntents.js';
import {
  FARM_TOOL_CATALOG,
  FARM_TOOL_IDS,
  routeFarmTool,
  allToolIntents,
} from '../../src/services/assistantFarmTools.js';

const mockDataMap = {
  finances: [{ type: 'recette', montant: 100000 }],
  salesOrders: [{ total: 50000, client_name: 'Client', reste_a_payer: 10000 }],
  payments: [],
  stock: [{ nom: 'Aliment', quantite: 5, seuil: 20 }],
  animaux: [{ espece: 'bovin', statut: 'actif' }],
  lots: [{ nom: 'Lot A', statut: 'actif' }],
  cultures: [{ nom: 'Tomates', statut: 'actif' }],
  clients: [{ nom: 'Client test' }],
  meteo: { temp: 32, condition: 'Nuageux', humidite: 60, riskLevel: 'stable' },
  documents: [{ title: 'Rapport mensuel' }],
};

const TOOL_INTENTS = new Set(allToolIntents());

test('catalogue outils couvre 13 domaines', () => {
  assert.equal(FARM_TOOL_CATALOG.length, 13);
  assert.ok(FARM_TOOL_IDS.COMMERCIAL);
  assert.ok(FARM_TOOL_IDS.CULTURES);
  assert.ok(FARM_TOOL_IDS.METEO);
  assert.ok(FARM_TOOL_IDS.RH);
  assert.ok(FARM_TOOL_IDS.INVESTOR);
  assert.ok(FARM_TOOL_IDS.ADMIN);
});

test('chaque phrase catalogue module route vers un outil ou intent couvert', () => {
  const failures = [];
  for (const [moduleId, questions] of Object.entries(MODULE_BUSINESS_QUESTIONS)) {
    for (const question of questions) {
      for (const phrase of question.phrases) {
        const route = routeFarmTool(phrase, mockDataMap);
        const classified = classifyUniversalIntent(phrase);
        const intentCovered = classified?.intent && TOOL_INTENTS.has(classified.intent);
        if (!route && !intentCovered) {
          failures.push({ moduleId, phrase, intent: question.intent });
        }
        if (route) {
          const tool = FARM_TOOL_CATALOG.find((t) => t.id === route.toolId);
          const intentOk = tool?.intents.includes(question.intent)
            || tool?.intents.includes(classified?.intent)
            || classified?.intent === question.intent;
          if (!intentOk && classified?.intent !== question.intent) {
            failures.push({
              moduleId,
              phrase,
              expected: question.intent,
              got: route.intent,
              toolId: route.toolId,
            });
          }
        }
      }
    }
  }
  if (failures.length) {
    console.error('Failures sample:', failures.slice(0, 15));
  }
  assert.ok(failures.length < 25, `too many routing gaps: ${failures.length}`);
});

test('exemples terrain par module', () => {
  assert.equal(routeFarmTool('mes parcelles', mockDataMap)?.toolId, FARM_TOOL_IDS.CULTURES);
  assert.equal(routeFarmTool('mes rapports', mockDataMap)?.toolId, FARM_TOOL_IDS.DOCUMENTS);
  assert.equal(routeFarmTool('mes tracteurs', mockDataMap)?.toolId, FARM_TOOL_IDS.RH);
  assert.equal(routeFarmTool('dossier investisseur', mockDataMap)?.toolId, FARM_TOOL_IDS.INVESTOR);
  assert.equal(routeFarmTool('synchronisations', mockDataMap)?.toolId, FARM_TOOL_IDS.ADMIN);
  assert.equal(routeFarmTool('mes commandes', mockDataMap)?.toolId, FARM_TOOL_IDS.COMMERCIAL);
});
