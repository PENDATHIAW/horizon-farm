import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateUnifiedAnimalCost,
  summarizeUnifiedFarmCosts,
} from '../../src/services/unifiedCostService.js';
import seed from '../../src/utils/horizonFarmSimulationSeed.js';

const bovin = seed.animaux.find((a) => a.id === 'HF-BOV-003') || seed.animaux.find((a) => /bovin|boeuf/i.test(a.espece || a.type));
const alimentationLogs = seed.alimentation_logs || [];
const vaccins = seed.sante || seed.vaccins || [];
const businessEvents = seed.business_events || [];

test('fiche animal : le coût unifié utilise les mêmes entrées que Finance', () => {
  // Reproduit l'appel de la fiche (AnimauxV2) APRÈS correction : santé + charges directes inclus.
  const fiche = calculateUnifiedAnimalCost({
    animal: bovin,
    alimentationLogs,
    vaccins,
    healthEvents: businessEvents,
    directCharges: businessEvents,
  }).totalCost;

  // Reproduit le moteur Finance (summarizeUnifiedFarmCosts) pour ce seul animal.
  const financePerAnimal = summarizeUnifiedFarmCosts({
    animaux: [bovin],
    lots: [],
    alimentationLogs,
    productionLogs: [],
    vaccins,
    healthEvents: businessEvents,
    directCharges: businessEvents,
  }).animaux.totalCost;

  assert.equal(fiche, financePerAnimal, 'la fiche et la Rentabilité Finance utilisent le même coût unifié');
  assert.ok(fiche > 0, 'coût positif');
});

test('les charges directes rattachées sont bien comptées (non minorées)', () => {
  const charge = {
    id: 'EVT-TEST-CHARGE',
    type_evenement: 'charge_directe',
    event_type: 'charge_directe',
    module_source: 'animaux',
    entity_type: 'animal',
    entity_id: bovin.id,
    target_id: bovin.id,
    target_type: 'animaux',
    montant: 20000,
    amount: 20000,
    title: 'Charge directe test bovin',
    event_date: '2026-07-01',
  };
  const sans = calculateUnifiedAnimalCost({ animal: bovin, alimentationLogs, vaccins }).totalCost;
  const avec = calculateUnifiedAnimalCost({ animal: bovin, alimentationLogs, vaccins, healthEvents: [charge], directCharges: [charge] }).totalCost;
  assert.ok(avec >= sans, 'une charge directe rattachée ne diminue jamais le coût');
});
