import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isActiveProfile,
  MINIMAL_ACCESS_MODULES,
  resolveAllowedModules,
} from '../../src/utils/moduleAccessPolicy.js';

const PERMS = {
  admin_support: ['*'],
  terrain: ['elevage', 'cultures'],
  visiteur: ['dashboard', 'assistant_erp'],
};

test('profil actif : les permissions du rôle s’appliquent', () => {
  const allowed = resolveAllowedModules({ role: 'admin_support', status: 'active' }, PERMS);
  assert.deepEqual(allowed, ['*']);
});

test('HF-P0-004 : profils imposés, un compte pending n’accède qu’au minimum même admin', () => {
  const allowed = resolveAllowedModules({ role: 'admin_support', status: 'pending' }, PERMS, { profilesRequired: true });
  assert.deepEqual(allowed, [...MINIMAL_ACCESS_MODULES]);
  assert.ok(!allowed.includes('*'), 'aucun accès métier pour un compte non actif');
});

test('HF-P0-004 : sans profil serveur, accès minimal (fail-closed)', () => {
  assert.deepEqual(resolveAllowedModules(null, PERMS), [...MINIMAL_ACCESS_MODULES]);
  assert.deepEqual(resolveAllowedModules(undefined, PERMS), [...MINIMAL_ACCESS_MODULES]);
});

test('HF-P0-004 : profils imposés, un profil de secours (métadonnées) = accès minimal', () => {
  const fallback = { role: 'admin_support', status: 'active', source: 'auth_fallback' };
  assert.deepEqual(resolveAllowedModules(fallback, PERMS, { profilesRequired: true }), [...MINIMAL_ACCESS_MODULES]);
  // Mode démo/preview (profiles non imposée) : le profil de secours reste toléré.
  assert.deepEqual(resolveAllowedModules(fallback, PERMS, { profilesRequired: false }), ['*']);
});

test('mode démo/preview : un profil actif garde l’accès de son rôle sans exiger profiles', () => {
  const allowed = resolveAllowedModules({ role: 'terrain', status: 'active' }, PERMS, { profilesRequired: false });
  assert.deepEqual(allowed, ['elevage', 'cultures']);
});

test('l’autorisation ne lit que le rôle du profil (les métadonnées sont ignorées)', () => {
  // La fonction ne reçoit que le profil : un rôle forgé dans user_metadata n’a
  // aucun effet puisqu’il n’entre jamais ici.
  const allowed = resolveAllowedModules({ role: 'visiteur', status: 'active' }, PERMS);
  assert.deepEqual(allowed, ['dashboard', 'assistant_erp']);
});

test('statuts actifs reconnus (active/actif/enabled), le reste = inactif', () => {
  assert.equal(isActiveProfile({ status: 'active' }), true);
  assert.equal(isActiveProfile({ status: 'actif' }), true);
  assert.equal(isActiveProfile({ status: 'enabled' }), true);
  assert.equal(isActiveProfile({ status: 'pending' }), false);
  assert.equal(isActiveProfile({ status: 'suspended' }), false);
  assert.equal(isActiveProfile({}), false);
});
