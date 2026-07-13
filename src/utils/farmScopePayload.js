import { isFarmScopedTable } from '../config/farmScopedTables.js';
import {
  DEFAULT_FARM_ID,
  readCachedAccessibleFarms,
  readFarmScope,
  selectedFarmId,
} from './farmScope.js';

export const FARM_WRITE_REQUIRES_SELECTION = 'FARM_WRITE_REQUIRES_SELECTION';

export function resolveFarmIdForWrite(payload = {}) {
  const explicit = payload?.farm_id || payload?.farmId || null;
  if (explicit) return explicit;

  const farms = readCachedAccessibleFarms();
  const scope = readFarmScope(farms);
  if (scope.mode === 'all') {
    const error = new Error('Choisissez une ferme active avant d’enregistrer cette donnée.');
    error.code = FARM_WRITE_REQUIRES_SELECTION;
    throw error;
  }
  return selectedFarmId(scope, farms) || farms.find((farm) => farm.is_default)?.id || DEFAULT_FARM_ID;
}

export function withFarmId(table, payload = {}) {
  if (!isFarmScopedTable(table)) return payload;
  if (Array.isArray(payload)) return payload.map((row) => withFarmId(table, row));
  return { ...payload, farm_id: resolveFarmIdForWrite(payload) };
}
