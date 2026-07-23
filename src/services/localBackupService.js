/**
 * Sauvegarde et restauration locales (feuille de route HF-P0-006).
 *
 * Les données métier vivent dans Supabase (sauvegarde serveur : PITR / pg_dump,
 * cf. docs/audits/BACKUP_RESTORE_RUNBOOK.md). Mais le **travail non encore
 * synchronisé** ne vit que dans le navigateur : file hors ligne, formulaires en
 * attente, journaux locaux. Si le stockage est vidé ou l'appareil changé avant
 * synchronisation, ce travail est perdu.
 *
 * Ce service exporte tout l'état local `horizon_*` dans un instantané versionné
 * et le restaure de façon sûre (échec fermé sur version inconnue ou instantané
 * corrompu). Fonctions pures : le stockage est injectable pour les tests.
 */

export const BACKUP_VERSION = 1;
export const BACKUP_KEY_PREFIX = 'horizon_';
export const OFFLINE_QUEUE_KEY = 'horizon_farm_offline_queue';

function resolveStorage(storage) {
  if (storage) return storage;
  if (typeof localStorage !== 'undefined') return localStorage;
  return null;
}

/** Clés `horizon_*` présentes dans le stockage (l'ordre est stable/trié). */
export function listBackupKeys(storage) {
  const store = resolveStorage(storage);
  if (!store) return [];
  const keys = [];
  const total = Number(store.length || 0);
  for (let index = 0; index < total; index += 1) {
    const key = store.key(index);
    if (typeof key === 'string' && key.startsWith(BACKUP_KEY_PREFIX)) keys.push(key);
  }
  return keys.sort();
}

/**
 * Construit un instantané de tout l'état local `horizon_*`.
 * @returns {{version:number, exportedAt:string, appVersion:string, entries:Record<string,string>}}
 */
export function exportLocalBackup({ storage = null, appVersion = '', now = Date.now() } = {}) {
  const store = resolveStorage(storage);
  const entries = {};
  for (const key of listBackupKeys(store)) {
    const value = store.getItem(key);
    if (value != null) entries[key] = value;
  }
  return {
    version: BACKUP_VERSION,
    exportedAt: new Date(now).toISOString(),
    appVersion: String(appVersion || ''),
    entries,
  };
}

/** Vrai si l'objet a la forme attendue d'un instantané pris en charge. */
export function isValidBackup(backup) {
  return Boolean(
    backup
    && typeof backup === 'object'
    && backup.version === BACKUP_VERSION
    && backup.entries
    && typeof backup.entries === 'object'
    && !Array.isArray(backup.entries),
  );
}

/** Résumé lisible d'un instantané (pour l'écran de restauration). */
export function summarizeBackup(backup) {
  if (!isValidBackup(backup)) return { valid: false, keys: 0, offlineMutations: 0, exportedAt: null };
  const keys = Object.keys(backup.entries);
  let offlineMutations = 0;
  try {
    const raw = backup.entries[OFFLINE_QUEUE_KEY];
    if (raw) {
      const parsed = JSON.parse(raw);
      offlineMutations = Array.isArray(parsed) ? parsed.length : 0;
    }
  } catch {
    offlineMutations = 0;
  }
  return { valid: true, keys: keys.length, offlineMutations, exportedAt: backup.exportedAt || null };
}

/**
 * Restaure un instantané dans le stockage.
 * @param {object} backup   instantané issu d'exportLocalBackup
 * @param {object} opts
 * @param {Storage} opts.storage  stockage cible (défaut localStorage)
 * @param {boolean} opts.replace  si vrai, purge d'abord les clés `horizon_*`
 *        absentes de l'instantané (remise à l'état exact). Sinon fusion.
 * @returns {{restored:number, removed:number}}
 * @throws si l'instantané est invalide (échec fermé, aucune écriture).
 */
export function importLocalBackup(backup, { storage = null, replace = false } = {}) {
  if (!isValidBackup(backup)) {
    throw new Error('Sauvegarde invalide ou version non prise en charge : restauration refusée.');
  }
  const store = resolveStorage(storage);
  if (!store) throw new Error('Stockage local indisponible : restauration impossible.');

  let removed = 0;
  if (replace) {
    const incoming = new Set(Object.keys(backup.entries));
    for (const key of listBackupKeys(store)) {
      if (!incoming.has(key)) {
        store.removeItem(key);
        removed += 1;
      }
    }
  }

  let restored = 0;
  for (const [key, value] of Object.entries(backup.entries)) {
    if (typeof key === 'string' && key.startsWith(BACKUP_KEY_PREFIX) && typeof value === 'string') {
      store.setItem(key, value);
      restored += 1;
    }
  }
  return { restored, removed };
}

/** Sérialise un instantané en JSON indenté (fichier téléchargeable). */
export function serializeBackup(backup) {
  return JSON.stringify(backup, null, 2);
}

/** Analyse un JSON d'instantané ; renvoie null si illisible. */
export function parseBackup(text) {
  try {
    const parsed = JSON.parse(String(text || ''));
    return isValidBackup(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
