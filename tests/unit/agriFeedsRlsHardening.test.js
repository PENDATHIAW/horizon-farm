import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync('supabase/migrations/20260711120000_agri_feeds_rls_hardening.sql', 'utf8');

test('AGRI FEEDS RLS — migration corrective remplace les politiques ouvertes', () => {
  [
    'feed_facility_zones',
    'feed_raw_materials',
    'feed_raw_batches',
    'feed_formulas',
    'feed_formula_versions',
    'feed_formula_ingredients',
    'feed_production_orders',
    'feed_finished_batches',
    'feed_quality_checks',
    'feed_trials',
    'feed_phase1_comparisons',
  ].forEach((table) => assert.match(migration, new RegExp(table), `${table} doit être couvert`));

  assert.match(migration, /can_read_agri_feeds\(farm_id\)/);
  assert.match(migration, /can_write_agri_feeds\(farm_id\)/);
  assert.match(migration, /can_delete_agri_feeds\(farm_id\)/);
  assert.match(migration, /not public\.profile_permission_enabled\('lecteur_financeur'\)/);
  assert.match(migration, /drop policy if exists %I_select/);
  assert.doesNotMatch(migration, /using\s*\(\s*true\s*\)/i);
  assert.doesNotMatch(migration, /with check\s*\(\s*true\s*\)/i);
});
