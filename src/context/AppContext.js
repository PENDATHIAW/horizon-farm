import { useEffect, useMemo, useState } from 'react';
import { AppProvider, useAppData as useRawAppData } from './AppContext.jsx';
import { filterDataMapDeleted } from '../utils/deletedRecords';
import { horizonFarmSimulationSeed } from '../utils/horizonFarmSimulationSeed';
import { isSimulatedDataModeEnabled } from '../utils/uiPreferences';

export { AppProvider };

const seedIdsByModule = Object.fromEntries(
  Object.entries(horizonFarmSimulationSeed || {}).map(([moduleKey, rows]) => [
    moduleKey,
    new Set((Array.isArray(rows) ? rows : []).map((row) => String(row?.id || '')).filter(Boolean)),
  ]),
);

// Une ligne est « simulée » si sa provenance le marque (source commençant par
// « simulation »). Robuste aux identifiants qui changent d'une instance à l'autre.
export function isSimulatedRow(row = {}) {
  return String(row?.source || '').toLowerCase().startsWith('simulation');
}

/**
 * Retire du dataMap toute ligne du jeu simulé, par marqueur de provenance ET par
 * identifiant de seed. Pur (sans lecture du mode) : sert de cœur testable.
 */
export function stripSimulatedRows(dataMap = {}) {
  return Object.fromEntries(Object.entries(dataMap || {}).map(([moduleKey, rows]) => {
    if (!Array.isArray(rows)) return [moduleKey, rows];
    const seedIds = seedIdsByModule[moduleKey];
    return [moduleKey, rows.filter((row) => !isSimulatedRow(row) && !(seedIds?.has(String(row?.id || ''))))];
  }));
}

function filterSeedRows(dataMap = {}) {
  if (isSimulatedDataModeEnabled()) return dataMap;
  // Mode « données réelles » : sans saisie réelle, chaque module reste vide.
  return stripSimulatedRows(dataMap);
}

export function useAppData() {
  const ctx = useRawAppData();
  const [dataModeTick, setDataModeTick] = useState(0);
  useEffect(() => {
    const handler = () => setDataModeTick((tick) => tick + 1);
    window.addEventListener('horizon-farm-data-mode-changed', handler);
    return () => window.removeEventListener('horizon-farm-data-mode-changed', handler);
  }, []);
  const filteredDataMap = useMemo(
    () => {
      void dataModeTick;
      return filterSeedRows(filterDataMapDeleted(ctx?.dataMap || {}));
    },
    [ctx?.dataMap, dataModeTick],
  );
  return useMemo(() => ({ ...ctx, rawDataMap: ctx?.dataMap || {}, dataMap: filteredDataMap }), [ctx, filteredDataMap]);
}
