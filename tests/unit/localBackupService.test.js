import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BACKUP_VERSION,
  exportLocalBackup,
  importLocalBackup,
  isValidBackup,
  listBackupKeys,
  OFFLINE_QUEUE_KEY,
  parseBackup,
  serializeBackup,
  summarizeBackup,
} from '../../src/services/localBackupService.js';

// Faux stockage conforme à l'API Storage (key/length/getItem/setItem/removeItem).
function createMemoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    get length() { return map.size; },
    key(index) { return [...map.keys()][index] ?? null; },
    getItem(key) { return map.has(key) ? map.get(key) : null; },
    setItem(key, value) { map.set(key, String(value)); },
    removeItem(key) { map.delete(key); },
    _dump() { return Object.fromEntries(map); },
  };
}

const seedStore = () => createMemoryStorage({
  horizon_farm_offline_queue: JSON.stringify([{ id: 'OFF-1' }, { id: 'OFF-2' }]),
  horizon_stock_pending_form: JSON.stringify({ produit: 'Maïs' }),
  horizon_farm_ui_settings: JSON.stringify({ theme: 'clair' }),
  autre_cle_hors_perimetre: 'ignore-moi',
});

test('n’exporte que les clés horizon_ et ignore le reste', () => {
  assert.deepEqual(listBackupKeys(seedStore()), [
    'horizon_farm_offline_queue', 'horizon_farm_ui_settings', 'horizon_stock_pending_form',
  ]);
});

test('l’instantané est versionné et capture les valeurs horizon_', () => {
  const backup = exportLocalBackup({ storage: seedStore(), appVersion: '1.2.3', now: 0 });
  assert.equal(backup.version, BACKUP_VERSION);
  assert.equal(backup.appVersion, '1.2.3');
  assert.equal(backup.exportedAt, '1970-01-01T00:00:00.000Z');
  assert.equal(Object.keys(backup.entries).length, 3);
  assert.equal(backup.entries.autre_cle_hors_perimetre, undefined);
});

test('aller-retour : restaurer dans un stockage vide reproduit l’état sauvegardé', () => {
  const backup = exportLocalBackup({ storage: seedStore() });
  const target = createMemoryStorage();
  const result = importLocalBackup(backup, { storage: target });
  assert.equal(result.restored, 3);
  assert.deepEqual(JSON.parse(target.getItem(OFFLINE_QUEUE_KEY)), [{ id: 'OFF-1' }, { id: 'OFF-2' }]);
  assert.deepEqual(exportLocalBackup({ storage: target }).entries, backup.entries);
});

test('restauration par fusion : conserve les clés hors instantané', () => {
  const backup = exportLocalBackup({ storage: seedStore() });
  const target = createMemoryStorage({ horizon_farm_scope: 'ferme-b', horizon_stock_pending_form: 'ancien' });
  importLocalBackup(backup, { storage: target, replace: false });
  assert.equal(target.getItem('horizon_farm_scope'), 'ferme-b');
  assert.deepEqual(JSON.parse(target.getItem('horizon_stock_pending_form')), { produit: 'Maïs' });
});

test('restauration en remplacement : purge les clés horizon_ absentes de l’instantané', () => {
  const backup = exportLocalBackup({ storage: seedStore() });
  const target = createMemoryStorage({ horizon_farm_scope: 'ferme-b', autre: 'garde' });
  const result = importLocalBackup(backup, { storage: target, replace: true });
  assert.equal(result.removed, 1); // horizon_farm_scope retirée
  assert.equal(target.getItem('horizon_farm_scope'), null);
  assert.equal(target.getItem('autre'), 'garde'); // clé hors périmètre intacte
});

test('échec fermé : un instantané invalide ou d’une autre version est refusé', () => {
  const target = createMemoryStorage({ horizon_farm_scope: 'ferme-a' });
  assert.throws(() => importLocalBackup(null, { storage: target }));
  assert.throws(() => importLocalBackup({ version: 999, entries: {} }, { storage: target }));
  assert.throws(() => importLocalBackup({ version: BACKUP_VERSION, entries: [] }, { storage: target }));
  // Aucune écriture parasite : l’état cible est inchangé.
  assert.equal(target.getItem('horizon_farm_scope'), 'ferme-a');
});

test('le résumé compte les clés et les mutations hors ligne', () => {
  const backup = exportLocalBackup({ storage: seedStore() });
  const summary = summarizeBackup(backup);
  assert.equal(summary.valid, true);
  assert.equal(summary.keys, 3);
  assert.equal(summary.offlineMutations, 2);
  assert.equal(summarizeBackup({ version: 999 }).valid, false);
});

test('sérialisation puis analyse redonnent un instantané valide', () => {
  const backup = exportLocalBackup({ storage: seedStore() });
  const roundTrip = parseBackup(serializeBackup(backup));
  assert.ok(isValidBackup(roundTrip));
  assert.deepEqual(roundTrip.entries, backup.entries);
  assert.equal(parseBackup('pas du json'), null);
  assert.equal(parseBackup(JSON.stringify({ version: 2 })), null);
});
