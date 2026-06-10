import test from 'node:test';
import assert from 'node:assert/strict';
import { ROUTE_TO_MODULE } from '../../src/config/modules.config.js';
import { ERP_MODULE_PERMISSIONS, ROLE_PERMISSIONS } from '../../src/context/AuthContext.jsx';

const LEGACY_KEYS_BY_GRAND_MODULE = Object.entries(ROUTE_TO_MODULE).reduce((acc, [legacy, grand]) => {
  if (!acc[grand]) acc[grand] = [];
  acc[grand].push(legacy);
  return acc;
}, {});

function canAccess(role, moduleKey) {
  const permissions = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.visiteur;
  if (permissions.includes('*') || permissions.includes(moduleKey)) return true;
  const legacyKeys = LEGACY_KEYS_BY_GRAND_MODULE[moduleKey] || [];
  return legacyKeys.some((key) => permissions.includes(key));
}

test('App — ERP permissions incluent les grands modules', () => {
  ['centre_ia', 'objectifs_croissance', 'elevage', 'commercial', 'achats_stock', 'finance_pilotage'].forEach((id) => {
    assert.ok(ERP_MODULE_PERMISSIONS.includes(id), `manager doit voir ${id}`);
  });
});

test('App — manager accède aux grands modules via permissions directes', () => {
  assert.equal(canAccess('manager', 'elevage'), true);
  assert.equal(canAccess('manager', 'commercial'), true);
  assert.equal(canAccess('manager', 'centre_ia'), true);
});

test('App — employé accède à Élevage via legacy animaux/avicole/santé', () => {
  assert.equal(canAccess('employe', 'elevage'), true);
  assert.equal(canAccess('employe', 'achats_stock'), true);
});

test('App — comptable accède à Commercial et Finance via legacy', () => {
  assert.equal(canAccess('comptable', 'commercial'), true);
  assert.equal(canAccess('comptable', 'finance_pilotage'), true);
});

test('App — visiteur limité à accueil et assistant', () => {
  assert.equal(canAccess('visiteur', 'dashboard'), true);
  assert.equal(canAccess('visiteur', 'elevage'), false);
});
