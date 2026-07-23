import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EXPECTED_COLLECTIONS,
  evaluateErpHealth,
  HEALTH_STATUS,
  worstStatus,
} from '../../src/services/erpHealthCheck.js';

const fullDataMap = Object.fromEntries(EXPECTED_COLLECTIONS.map((k) => [k, []]));

test('worstStatus retourne le statut le plus grave', () => {
  assert.equal(worstStatus([{ status: 'ok' }, { status: 'warn' }, { status: 'degraded' }]), 'degraded');
  assert.equal(worstStatus([{ status: 'ok' }, { status: 'ok' }]), 'ok');
  assert.equal(worstStatus([]), 'ok');
});

test('système sain : tout ok en mode réel en ligne, file vide', () => {
  const report = evaluateErpHealth({
    dataMap: fullDataMap,
    offlineQueue: [],
    lastSyncAt: Date.now(),
    online: true,
    storageAvailable: true,
    simulatedMode: false,
  });
  assert.equal(report.status, HEALTH_STATUS.ok);
  assert.ok(report.summary.total >= 6);
  assert.equal(report.summary.degraded, 0);
  assert.equal(report.summary.down, 0);
});

test('collection non chargée = dégradé, avec action de remédiation', () => {
  const partial = { ...fullDataMap };
  delete partial.finances; // table absente / non chargée
  const report = evaluateErpHealth({ dataMap: partial, online: true, storageAvailable: true });
  const check = report.checks.find((c) => c.id === 'collections');
  assert.equal(check.status, HEALTH_STATUS.degraded);
  assert.match(check.message, /finances/);
  assert.ok(check.action, 'une action de remédiation est proposée');
  assert.equal(report.status, HEALTH_STATUS.degraded);
});

test('stockage indisponible = panne (down)', () => {
  const report = evaluateErpHealth({ dataMap: fullDataMap, storageAvailable: false });
  assert.equal(report.checks.find((c) => c.id === 'storage').status, HEALTH_STATUS.down);
  assert.equal(report.status, HEALTH_STATUS.down);
});

test('file volumineuse = synchronisation bloquée (dégradé)', () => {
  const report = evaluateErpHealth({ dataMap: fullDataMap, offlineQueue: new Array(30).fill({}) });
  const check = report.checks.find((c) => c.id === 'sync_queue');
  assert.equal(check.status, HEALTH_STATUS.degraded);
  assert.match(check.message, /bloqu/i);
});

test('hors ligne = avertissement, pas panne', () => {
  const report = evaluateErpHealth({ dataMap: fullDataMap, online: false });
  assert.equal(report.checks.find((c) => c.id === 'network').status, HEALTH_STATUS.warn);
});

test('mode démonstration signalé (info) sans dégrader la santé', () => {
  const report = evaluateErpHealth({ dataMap: fullDataMap, simulatedMode: true, lastSyncAt: Date.now() });
  const check = report.checks.find((c) => c.id === 'data_mode');
  assert.equal(check.status, HEALTH_STATUS.info);
  assert.match(check.message, /démonstration/i);
  assert.equal(report.status, HEALTH_STATUS.info); // info seulement, jamais dégradé
});

test('service externe dégradé remonté dans le rapport', () => {
  const report = evaluateErpHealth({ dataMap: fullDataMap, services: { assistant: HEALTH_STATUS.down }, lastSyncAt: Date.now() });
  const svc = report.checks.find((c) => c.id === 'service_assistant');
  assert.equal(svc.status, HEALTH_STATUS.down);
  assert.equal(report.status, HEALTH_STATUS.down);
});

test('synchronisation périmée (>24h) = avertissement', () => {
  const now = Date.now();
  const report = evaluateErpHealth({ dataMap: fullDataMap, lastSyncAt: now - 26 * 60 * 60 * 1000, now });
  assert.equal(report.checks.find((c) => c.id === 'sync_freshness').status, HEALTH_STATUS.warn);
});

test('le centre de santé est monté dans Gestion système (onglet Synchronisation)', async () => {
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const { dirname, join } = await import('node:path');
  const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
  const src = readFileSync(join(root, 'src/modules/GestionSystemeV1Module.jsx'), 'utf8');
  assert.match(src, /import ErpHealthPanel from '\.\/ErpHealthPanel\.jsx'/);
  assert.match(src, /<ErpHealthPanel dataMap=\{dataMap\} \/>/);
});
