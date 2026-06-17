import { useMemo } from 'react';
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

function filterSeedRows(dataMap = {}) {
  if (isSimulatedDataModeEnabled()) return dataMap;
  return Object.fromEntries(Object.entries(dataMap || {}).map(([moduleKey, rows]) => {
    if (!Array.isArray(rows)) return [moduleKey, rows];
    const seedIds = seedIdsByModule[moduleKey];
    if (!seedIds?.size) return [moduleKey, rows];
    return [moduleKey, rows.filter((row) => !seedIds.has(String(row?.id || '')))];
  }));
}

export function useAppData() {
  const ctx = useRawAppData();
  const filteredDataMap = useMemo(
    () => filterSeedRows(filterDataMapDeleted(ctx?.dataMap || {})),
    [ctx?.dataMap],
  );
  return useMemo(() => ({ ...ctx, rawDataMap: ctx?.dataMap || {}, dataMap: filteredDataMap }), [ctx, filteredDataMap]);
}
