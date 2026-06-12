import test from 'node:test';
import assert from 'node:assert/strict';
import { routeFarmTool, executeFarmTool, FARM_TOOL_IDS } from '../../src/services/assistantFarmTools.js';
import { queryFarmToolAgent } from '../../src/services/assistantFarmToolAgent.js';
import { routeNaturalLanguageQuery } from '../../src/services/assistantLanguageRouter.js';

const dm = {
  finances: [{ type: 'recette', montant: 500000 }, { type: 'depense', montant: 200000 }],
  salesOrders: [{ id: 'CMD-1', total: 300000, client_name: 'Client A', reste_a_payer: 150000 }],
  payments: [{ order_id: 'CMD-1', montant: 150000 }],
  clients: [{ id: 'C1', nom: 'Client A' }],
  stock: [
    { produit: 'Aliment pondeuses', quantite: 5, seuil: 20 },
    { produit: 'Maïs', quantite: 100, seuil: 50 },
  ],
  animaux: [{ id: 'BOV-1', type: 'bovin', statut: 'actif' }],
  lots: [{ id: 'LOT-1', nom: 'Pondeuses A', statut: 'actif', effectif: 500 }],
  avicole: [{ id: 'LOT-1', nom: 'Pondeuses A', statut: 'actif' }],
  sante: [],
  meteo: { temp: 28, condition: 'Ensoleillé' },
};

test('route créances vers get_receivables', () => {
  const route = routeFarmTool('qui me doit de l argent', dm);
  assert.equal(route?.toolId, FARM_TOOL_IDS.RECEIVABLES);
  assert.ok(route.confidence >= 0.5);
});

test('route stock vers get_stock_status', () => {
  const route = routeFarmTool('quels stocks sont en rupture', dm);
  assert.equal(route?.toolId, FARM_TOOL_IDS.STOCK);
});

test('route élevage vers get_elevage_status', () => {
  const route = routeFarmTool('combien de lots actifs', dm);
  assert.equal(route?.toolId, FARM_TOOL_IDS.ELEVAGE);
});

test('route trésorerie vers get_treasury', () => {
  const route = routeFarmTool('ma trésorerie', dm);
  assert.equal(route?.toolId, FARM_TOOL_IDS.TREASURY);
});

test('route priorités vers get_daily_priorities', () => {
  const route = routeFarmTool('que dois je faire aujourd hui', dm);
  assert.equal(route?.toolId, FARM_TOOL_IDS.PRIORITIES);
});

test('route commercial vers get_commercial_status', () => {
  const route = routeFarmTool('mes commandes en cours', dm);
  assert.equal(route?.toolId, FARM_TOOL_IDS.COMMERCIAL);
});

test('route cultures vers get_cultures_status', () => {
  const route = routeFarmTool('etat des parcelles', dm);
  assert.equal(route?.toolId, FARM_TOOL_IDS.CULTURES);
});

test('route météo vers get_meteo_status', () => {
  const route = routeFarmTool('meteo demain', dm);
  assert.equal(route?.toolId, FARM_TOOL_IDS.METEO);
});

test('executeFarmTool retourne une réponse structurée', () => {
  const result = executeFarmTool(FARM_TOOL_IDS.TREASURY, dm, { query: 'trésorerie' });
  assert.ok(result?.answer?.situation);
  assert.match(result.summary || '', /FCFA/i);
});

test('queryFarmToolAgent gère question libre stock', () => {
  const out = queryFarmToolAgent('il me reste quoi en aliment', { dataMap: dm });
  assert.equal(out.handled, true);
  assert.ok(out.assistantText?.length > 10);
});

test('routeur langage utilise agent si intention non classée', () => {
  const out = routeNaturalLanguageQuery('montre moi les ruptures de stock', { dataMap: dm });
  assert.equal(out?.handled, true);
  assert.ok(out.source === 'farm_tool_agent_v9' || out.source === 'universal_language_v7');
});
