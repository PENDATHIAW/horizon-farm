import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { ERP_ROLES } from '../../src/config/erpRoles.js';
import { FARM_SCOPED_TABLE_SET, FARM_SCOPED_TABLES } from '../../src/config/farmScopedTables.js';
import {
  DOMAIN_CHECKS,
  READ_ONLY_ROLES,
  SMARTFARM_EXPECTATIONS,
} from '../../scripts/rls/rlsRoleMatrix.mjs';

/**
 * HF-P0-005 · La matrice de tests RLS doit rester complète et cohérente.
 *
 * Le contrôle comportemental (`npm run db:migrate:isolation`) tourne contre un
 * projet Supabase réel et n'est donc pas rejouable en CI. Ces gardes pures
 * empêchent la matrice de dériver silencieusement : un nouveau rôle officiel ou
 * une table cloisonnée par ferme ne peut pas rejoindre l'ERP sans que la
 * couverture de test RLS soit mise à jour en conséquence.
 */

const roles = [...ERP_ROLES].sort();

test('la matrice Smart Farm couvre exactement les huit rôles officiels', () => {
  assert.deepEqual(Object.keys(SMARTFARM_EXPECTATIONS).sort(), roles);
});

test('la matrice métier couvre exactement les huit rôles officiels', () => {
  assert.deepEqual(Object.keys(DOMAIN_CHECKS).sort(), roles);
});

test('chaque rôle vérifie au moins une table métier', () => {
  for (const role of ERP_ROLES) {
    assert.ok(Array.isArray(DOMAIN_CHECKS[role]) && DOMAIN_CHECKS[role].length >= 1, `rôle sans contrôle métier: ${role}`);
  }
});

test('la matrice ne référence que des tables réellement cloisonnées par ferme', () => {
  for (const [role, checks] of Object.entries(DOMAIN_CHECKS)) {
    for (const [table, read, write] of checks) {
      assert.ok(FARM_SCOPED_TABLE_SET.has(table), `table hors périmètre farm_id dans la matrice (${role}): ${table}`);
      assert.equal(typeof read, 'boolean', `lecture attendue non booléenne (${role}/${table})`);
      assert.equal(typeof write, 'boolean', `écriture attendue non booléenne (${role}/${table})`);
    }
  }
});

test('un rôle en lecture seule n’obtient jamais d’écriture dans la matrice', () => {
  for (const role of READ_ONLY_ROLES) {
    assert.ok(ERP_ROLES.includes(role), `rôle en lecture seule inconnu: ${role}`);
    assert.equal(SMARTFARM_EXPECTATIONS[role].smartWrite, false, `${role} ne doit pas écrire Smart Farm`);
    for (const [table, , write] of DOMAIN_CHECKS[role]) {
      assert.equal(write, false, `${role} ne doit pas écrire ${table}`);
    }
  }
});

test('au moins un rôle exerce chaque opération (lecture accordée et refusée)', () => {
  const flat = Object.values(DOMAIN_CHECKS).flat();
  assert.ok(flat.some(([, read]) => read === true), 'aucune lecture accordée dans la matrice');
  assert.ok(flat.some(([, read]) => read === false), 'aucune lecture refusée dans la matrice');
  assert.ok(flat.some(([, , write]) => write === true), 'aucune écriture accordée dans la matrice');
  assert.ok(flat.some(([, , write]) => write === false), 'aucune écriture refusée dans la matrice');
});

test('le registre applicatif, la migration et le vérificateur couvrent les mêmes 99 tables', () => {
  const migration = readFileSync('supabase/migrations/20260713120000_farm_id_rls_all_business_tables.sql', 'utf8');
  const verifier = readFileSync('supabase/verify_farm_id_rls.sql', 'utf8');
  const migBlock = migration.match(/metier text\[\] := array\[([\s\S]*?)\n\s*\];/)?.[1] || '';
  const vfBlock = verifier.match(/with tables_metier\(nom\) as \(([\s\S]*?)\n\),\netat/)?.[1] || '';
  const names = (block) => [...block.matchAll(/'([a-z][a-z0-9_]*)'/g)].map((match) => match[1]).sort();
  const registry = [...FARM_SCOPED_TABLES].sort();
  assert.deepEqual(names(migBlock), registry);
  assert.deepEqual(names(vfBlock), registry);
});
