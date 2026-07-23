import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const paymentsMigration = readFileSync(
  new URL('../../supabase/migrations/20260719120000_secure_mobile_money_payments.sql', import.meta.url),
  'utf8',
);
const workflowMigration = readFileSync(
  new URL('../../supabase/migrations/20260719110000_workflow_foundation.sql', import.meta.url),
  'utf8',
);
const pushMigration = readFileSync(
  new URL('../../supabase/migrations/20260719122000_secure_push_dispatch.sql', import.meta.url),
  'utf8',
);

test('un lien en attente n’est plus conservé comme encaissement', () => {
  assert.match(paymentsMigration, /delete from public\.payments[\s\S]+mobile_money_status[\s\S]+pending/i);
  assert.match(paymentsMigration, /create table if not exists public\.payment_intents/i);
  assert.match(paymentsMigration, /status in \('created', 'pending', 'confirmed', 'posted'/i);
  assert.match(paymentsMigration, /idx_payment_intents_one_open_order/i);
});

test('la confirmation regroupe paiement, vente, transaction et compte', () => {
  assert.match(paymentsMigration, /finalize_mobile_money_payment/i);
  assert.match(paymentsMigration, /insert into public\.payments/i);
  assert.match(paymentsMigration, /insert into public\.transactions/i);
  assert.match(paymentsMigration, /insert into public\.treasury_movements/i);
  assert.match(paymentsMigration, /update public\.sales_orders/i);
  assert.match(paymentsMigration, /update public\.clients/i);
  assert.match(paymentsMigration, /update public\.alertes_center/i);
  assert.match(paymentsMigration, /insert into public\.business_events/i);
  assert.match(paymentsMigration, /insert into public\.workflow_steps/i);
  assert.match(paymentsMigration, /grant execute[\s\S]+to service_role/i);
  assert.doesNotMatch(paymentsMigration, /grant execute[\s\S]+to authenticated/i);
});

test('les 26 parcours sont acceptés par le journal commun', () => {
  const eventTypes = [
    'feed_reception', 'feed_distribution', 'broiler_lot_start', 'mortality_record',
    'health_treatment', 'biosecurity_cleaning', 'egg_production', 'egg_sale',
    'broiler_sale', 'bovine_weighing', 'bovine_sale', 'crop_campaign_start',
    'irrigation_event', 'organic_transfer', 'crop_harvest', 'crop_sale',
    'customer_payment', 'supplier_payment', 'equipment_purchase',
    'equipment_maintenance', 'task_lifecycle', 'support_document',
    'monthly_financier_report', 'funding_usage', 'growth_objective', 'smartfarm_signal',
  ];

  assert.match(workflowMigration, /create table if not exists public\.workflow_commands/i);
  assert.match(workflowMigration, /create table if not exists public\.workflow_runs/i);
  assert.match(workflowMigration, /create table if not exists public\.workflow_steps/i);
  assert.match(workflowMigration, /create table if not exists public\.outbox_events/i);
  assert.match(workflowMigration, /force row level security/gi);
  eventTypes.forEach((eventType) => assert.ok(workflowMigration.includes(`'${eventType}'`), eventType));
});

test('aucune notification distante ne part sans adresse et protection', () => {
  assert.match(pushMigration, /nullif\(trim\(app_url\)/i);
  assert.match(pushMigration, /nullif\(trim\(cron_secret\)/i);
  assert.match(pushMigration, /Authorization.*Bearer/is);
});
