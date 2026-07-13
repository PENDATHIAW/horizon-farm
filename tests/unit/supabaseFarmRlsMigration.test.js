import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const migration = read('supabase/migrations/20260713120000_farm_id_rls_all_business_tables.sql');
const verifier = read('supabase/verify_farm_id_rls.sql');
const profiles = read('supabase/migrations/20260713110000_backfill_existing_auth_profiles.sql');
const smartfarm = read('supabase/migrations/20260713111000_create_smartfarm_events.sql');
const manager = read('scripts/supabase-management.mjs');

const quotedNames = (source) => [...source.matchAll(/'([a-z][a-z0-9_]*)'/g)].map((match) => match[1]);

test('migration et verification couvrent les memes tables metier', () => {
  const migrationBlock = migration.match(/metier text\[\] := array\[([\s\S]*?)\n\s*\];/)?.[1] || '';
  const verifierBlock = verifier.match(/with tables_metier\(nom\) as \(([\s\S]*?)\n\),\netat/)?.[1] || '';
  const migrationTables = quotedNames(migrationBlock).sort();
  const verifierTables = quotedNames(verifierBlock).sort();

  assert.deepEqual(verifierTables, migrationTables);
  assert.equal(new Set(migrationTables).size, migrationTables.length);
  assert.ok(migrationTables.includes('feed_phase1_comparisons'));
  assert.ok(migrationTables.includes('planning_simulations'));
  assert.equal(migrationTables.includes('feed_phase'), false);
});

test('migration globale impose portée ferme, suppression logique et politiques', () => {
  assert.match(migration, /alter column farm_id type uuid/);
  assert.match(migration, /foreign key \(farm_id\) references public\.farms\(id\) on delete restrict/i);
  assert.match(migration, /create index if not exists/);
  assert.match(migration, /alter column farm_id set not null/);
  assert.match(migration, /add column if not exists is_deleted boolean not null default false/);
  assert.match(migration, /add column if not exists deleted_at timestamptz/);
  assert.match(migration, /add column if not exists deleted_by text/);
  assert.match(migration, /is_deleted is false and public\.can_read_farm_table/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /force row level security/);
  assert.match(migration, /grant select, insert, update, delete on table public\.%I to authenticated, service_role/);
  assert.match(migration, /can_read_farm_table\(farm_id/);
  assert.match(migration, /can_insert_farm_table\(farm_id/);
  assert.match(migration, /can_update_farm_table\(farm_id/);
  assert.match(migration, /can_delete_farm_table\(farm_id/);
  assert.match(verifier, /farm_id_uuid/);
  assert.match(verifier, /farm_id_non_nul/);
  assert.match(verifier, /index_ferme/);
  assert.match(verifier, /pg_index index_meta/);
  assert.doesNotMatch(verifier, /indexdef ~\*/);
  assert.match(verifier, /suppression_logique/);
  assert.match(verifier, /droits_authenticated/);
  assert.match(verifier, /politique_lecture/);
  assert.match(verifier, /politique_insertion/);
  assert.match(verifier, /politique_modification/);
  assert.match(verifier, /politique_suppression/);
  assert.match(verifier, /aucune_politique_historique/);
});

test('les huit roles officiels sont normalises et le financeur reste en lecture seule', () => {
  for (const role of [
    'promotrice_direction', 'responsable_filiere', 'terrain', 'finance',
    'veterinaire', 'maintenance', 'financeur_externe', 'admin_support',
  ]) assert.match(migration, new RegExp(`'${role}'`));
  assert.match(migration, /current_erp_role/);
  assert.match(migration, /role_name = 'terrain'/);
  assert.match(migration, /role_name = 'veterinaire'/);
  assert.match(migration, /role_name = 'maintenance'/);
  assert.match(migration, /current_erp_role\(target_farm_id\) <> 'financeur_externe'/);
  assert.match(migration, /can_read_funder_record/);
});

test('les politiques historiques sont remplacees avant les quatre gardes strictes', () => {
  assert.match(migration, /from pg_policies policy/);
  assert.match(migration, /drop policy %I on public\.%I/);
  assert.match(migration, /_farm_read/);
  assert.match(migration, /_farm_insert/);
  assert.match(migration, /_farm_update/);
  assert.match(migration, /_farm_delete/);
});

test('backfill Auth ne donne pas d acces metier aux visiteurs pending', () => {
  assert.match(profiles, /from auth\.users/);
  assert.match(profiles, /then 'active'/);
  assert.match(profiles, /else 'pending'/);
  assert.match(profiles, /role in \('admin','manager','employe','veterinaire','comptable'\)/);
  assert.match(profiles, /on conflict \(user_id, farm_id\) do update/);
});

test('Smart Farm dispose de sa table, de Realtime et des politiques par ferme', () => {
  assert.match(smartfarm, /create table if not exists public\.smartfarm_events/);
  assert.match(smartfarm, /alter publication supabase_realtime add table public\.smartfarm_events/);
  assert.match(smartfarm, /can_read_farm\(farm_id\)/);
  assert.match(smartfarm, /can_write_farm\(farm_id\)/);
});

test('gestionnaire distant verrouille projet et fichiers SQL du depot', () => {
  assert.match(manager, /expectedProjectName/);
  assert.match(manager, /Projet refuse/);
  assert.match(manager, /Migration hors supabase\/migrations refusee/);
  assert.match(manager, /Matrice farm_id\/RLS/);
  assert.match(manager, /suppression_logique_locale/);
});
