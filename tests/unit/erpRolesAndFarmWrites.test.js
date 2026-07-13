import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { ERP_ROLES, normalizeErpRole } from '../../src/config/erpRoles.js';
import { FARM_SCOPED_TABLES, isFarmScopedTable } from '../../src/config/farmScopedTables.js';
import { DEFAULT_FARM_ID } from '../../src/utils/farmScope.js';
import { withFarmId } from '../../src/utils/farmScopePayload.js';

test('les huit roles officiels sont uniques et les anciens roles sont normalises', () => {
  assert.equal(ERP_ROLES.length, 8);
  assert.equal(new Set(ERP_ROLES).size, 8);
  assert.equal(normalizeErpRole('admin'), 'admin_support');
  assert.equal(normalizeErpRole('manager'), 'promotrice_direction');
  assert.equal(normalizeErpRole('employe'), 'terrain');
  assert.equal(normalizeErpRole('comptable'), 'finance');
  assert.equal(normalizeErpRole('lecteur_financeur'), 'financeur_externe');
});

test('la migration stricte et le registre applicatif couvrent les memes tables', () => {
  const migration = readFileSync('supabase/migrations/20260713120000_farm_id_rls_all_business_tables.sql', 'utf8');
  const block = migration.match(/metier text\[\] := array\[([\s\S]*?)\n\s*\];/)?.[1] || '';
  const migrationTables = [...block.matchAll(/'([a-z][a-z0-9_]*)'/g)].map((match) => match[1]).sort();
  assert.deepEqual([...FARM_SCOPED_TABLES].sort(), migrationTables);
});

test('une creation metier sans ferme recoit la ferme active par defaut', () => {
  const payload = withFarmId('documents', { id: 'DOC-1', title: 'Preuve' });
  assert.equal(payload.farm_id, DEFAULT_FARM_ID);
  assert.equal(isFarmScopedTable('documents'), true);
  assert.equal(withFarmId('audit_logs', { id: 'LOG-1' }).farm_id, undefined);
});

test('l assistant serveur traduit les anciens noms de tables et exige farm_id', () => {
  const executor = readFileSync('lib/server/assistant/_executor.js', 'utf8');
  const client = readFileSync('src/services/heyHorizonAssistantService.js', 'utf8');
  assert.match(executor, /stock: 'stocks'/);
  assert.match(executor, /finances: 'transactions'/);
  assert.match(executor, /animaux: 'animals'/);
  assert.match(executor, /farm_id: payload\.farm_id \|\| context\.farmId/);
  assert.match(client, /farm_id: resolveFarmIdForWrite/);
});
