import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BUSINESS_EVENT_ALIASES,
  BUSINESS_EVENT_IDS,
  BUSINESS_EVENT_REFRESH_CLUSTERS,
  BUSINESS_EVENT_WORKFLOWS,
  getBusinessEventWorkflow,
  requiredFieldsForEvent,
} from '../../src/config/businessInterconnections.config.js';

const PROMPT_EVENT_ALIASES = {
  client_payment: 'customer_payment',
  supplier_debt_payment: 'supplier_payment',
  operational_task: 'task_lifecycle',
  supporting_document: 'support_document',
  monthly_funder_report: 'monthly_financier_report',
  funding_tracking: 'funding_usage',
  smart_farm_signal: 'smartfarm_signal',
};

const EXPECTED_EVENT_IDS = [
  'feed_reception',
  'feed_distribution',
  'broiler_lot_start',
  'mortality_record',
  'health_treatment',
  'biosecurity_cleaning',
  'egg_production',
  'egg_sale',
  'broiler_sale',
  'bovine_weighing',
  'bovine_sale',
  'crop_campaign_start',
  'irrigation_event',
  'organic_transfer',
  'crop_harvest',
  'crop_sale',
  'customer_payment',
  'supplier_payment',
  'equipment_purchase',
  'equipment_maintenance',
  'task_lifecycle',
  'support_document',
  'monthly_financier_report',
  'funding_usage',
  'growth_objective',
  'smartfarm_signal',
];

test('business interconnections — exactly 26 canonical workflows without duplicates', () => {
  assert.equal(BUSINESS_EVENT_WORKFLOWS.length, 26);
  assert.equal(new Set(BUSINESS_EVENT_IDS).size, BUSINESS_EVENT_IDS.length);
  assert.deepEqual(BUSINESS_EVENT_IDS, EXPECTED_EVENT_IDS);
});

test('business interconnections — each workflow declares form, impact, alert, reporting and refresh scope', () => {
  BUSINESS_EVENT_WORKFLOWS.forEach((workflow) => {
    assert.ok(workflow.id, 'workflow id required');
    assert.ok(workflow.label, `${workflow.id}: label required`);
    assert.ok(workflow.sourceModule, `${workflow.id}: source module required`);
    assert.ok(workflow.sourceTables.length, `${workflow.id}: source tables required`);
    assert.ok(workflow.impactedModules.length, `${workflow.id}: impacted modules required`);
    assert.ok(workflow.requiredFields.length, `${workflow.id}: form fields required`);
    assert.ok(workflow.automaticEffects.length, `${workflow.id}: automatic effects required`);
    assert.ok(workflow.metricsImpacted.length, `${workflow.id}: reporting metrics required`);
    assert.ok(workflow.coherenceRules.length, `${workflow.id}: coherence alerts required`);
    assert.ok(workflow.nextSteps.length, `${workflow.id}: workflow next steps required`);

    const refreshCluster = BUSINESS_EVENT_REFRESH_CLUSTERS[workflow.id] || [];
    assert.ok(refreshCluster.includes('business_events'), `${workflow.id}: refresh business_events`);
    assert.ok(refreshCluster.includes('alertes_center'), `${workflow.id}: refresh alertes_center`);
    assert.ok(refreshCluster.includes('taches'), `${workflow.id}: refresh taches`);
    workflow.sourceTables.forEach((table) => {
      assert.ok(refreshCluster.includes(table), `${workflow.id}: refresh source table ${table}`);
    });
    assert.equal(workflow.impactedModules.includes('centre_ia'), false, `${workflow.id}: legacy decision-centre route`);
    assert.equal(workflow.sourceTables.includes('camera_devices'), false, `${workflow.id}: cameras are outside the V1 scope`);
  });
});

test('business interconnections — prompt aliases resolve to canonical workflow ids', () => {
  assert.deepEqual(BUSINESS_EVENT_ALIASES, PROMPT_EVENT_ALIASES);
  Object.entries(PROMPT_EVENT_ALIASES).forEach(([alias, canonical]) => {
    assert.equal(getBusinessEventWorkflow(alias)?.id, canonical);
    assert.deepEqual(requiredFieldsForEvent(alias), requiredFieldsForEvent(canonical));
  });
});
