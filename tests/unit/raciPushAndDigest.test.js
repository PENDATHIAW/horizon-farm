import test from 'node:test';
import assert from 'node:assert/strict';
import { selectRaciAudience, targetRolesForRecord } from '../../lib/server/push/raciAudience.js';
import { buildDigestNotification } from '../../lib/server/push/digestBuild.js';
import seed from '../../src/utils/horizonFarmSimulationSeed.js';

const SUBS = [
  { endpoint: 'a', role: 'finance', subscription: { endpoint: 'a' } },
  { endpoint: 'b', role: 'terrain', subscription: { endpoint: 'b' } },
  { endpoint: 'c', role: 'responsable_filiere', subscription: { endpoint: 'c' } },
  { endpoint: 'd', role: '', subscription: { endpoint: 'd' } },
];

test('targetRolesForRecord : responsable + rôles à notifier, ou inférés', () => {
  const roles = targetRolesForRecord({ raci_owner_role: 'finance', raci_notify_roles: ['responsable_filiere'] });
  assert.ok(roles.includes('finance') && roles.includes('responsable_filiere'));
  // inféré depuis le vocabulaire si non fourni
  const inferred = targetRolesForRecord({ title: 'Relance créance' });
  assert.ok(inferred.includes('finance'));
});

test('selectRaciAudience : cible les appareils du/des rôle(s) concerné(s)', () => {
  const res = selectRaciAudience({ raci_owner_role: 'finance', raci_notify_roles: [] }, SUBS);
  assert.equal(res.matched, true);
  assert.deepEqual(res.subscriptions.map((s) => s.endpoint), ['a']);
});

test('selectRaciAudience : plusieurs rôles ciblés', () => {
  const res = selectRaciAudience({ raci_owner_role: 'finance', raci_notify_roles: ['responsable_filiere'] }, SUBS);
  assert.deepEqual(res.subscriptions.map((s) => s.endpoint).sort(), ['a', 'c']);
});

test('selectRaciAudience : aucune correspondance → repli sur tous', () => {
  const res = selectRaciAudience({ raci_owner_role: 'veterinaire', raci_notify_roles: [] }, SUBS);
  assert.equal(res.matched, false);
  assert.equal(res.fallback, true);
  assert.equal(res.subscriptions.length, SUBS.length);
});

test('selectRaciAudience : sans rôle déductible → repli sur tous', () => {
  const res = selectRaciAudience({ title: 'note vague' }, SUBS);
  assert.equal(res.subscriptions.length, SUBS.length);
});

test('selectRaciAudience : fallbackToAll=false → liste vide si pas de match', () => {
  const res = selectRaciAudience({ raci_owner_role: 'veterinaire' }, SUBS, { fallbackToAll: false });
  assert.equal(res.subscriptions.length, 0);
});

test('buildDigestNotification : payload et ciblage direction/finance', () => {
  const data = {
    animaux: seed.animaux, avicole: seed.avicole, stock: seed.stock,
    sales_orders: seed.sales_orders, payments: seed.payments, finances: seed.finances,
    clients: seed.clients, production_oeufs_logs: seed.production_oeufs_logs || [],
  };
  const { payload, audienceRecord, digest } = buildDigestNotification(data, { period: 'hebdo' });
  assert.match(payload.title, /Rapport Cette semaine/);
  assert.ok(payload.body.length > 0);
  assert.equal(payload.url, '/?module=dashboard&tab=Pilotage');
  assert.deepEqual(audienceRecord.raci_notify_roles, ['promotrice_direction', 'finance']);
  assert.ok(digest.summary.indicators > 0);
  // le ciblage résout bien vers les rôles direction/finance
  const roles = targetRolesForRecord(audienceRecord);
  assert.ok(roles.includes('finance') && roles.includes('promotrice_direction'));
});
