import { useMemo } from 'react';
import { AppProvider, useAppData as useRawAppData } from './AppContext.jsx';
import { filterDataMapDeleted } from '../utils/deletedRecords';
import { moduleSeedMap } from '../utils/mockData';

export { AppProvider };

const seedIdsByModule = Object.fromEntries(Object.entries(moduleSeedMap || {}).map(([moduleKey, rows]) => [
  moduleKey,
  new Set((Array.isArray(rows) ? rows : []).map((row) => String(row?.id || '')).filter(Boolean)),
]));

function demoModeEnabled() {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search || '');
  if (params.get('demo') === '1') {
    window.localStorage.setItem('horizon_farm_show_demo_data', '1');
    return true;
  }
  if (params.get('demo') === '0') {
    window.localStorage.removeItem('horizon_farm_show_demo_data');
    return false;
  }
  return window.localStorage.getItem('horizon_farm_show_demo_data') === '1';
}

function filterSeedRows(dataMap = {}) {
  if (demoModeEnabled()) return dataMap;
  return Object.fromEntries(Object.entries(dataMap || {}).map(([moduleKey, rows]) => {
    if (!Array.isArray(rows)) return [moduleKey, rows];
    const seedIds = seedIdsByModule[moduleKey];
    if (!seedIds?.size) return [moduleKey, rows];
    return [moduleKey, rows.filter((row) => !seedIds.has(String(row?.id || '')))];
  }));
}

export function useAppData() {
  const ctx = useRawAppData();
  const filteredDataMap = useMemo(() => filterSeedRows(filterDataMapDeleted(ctx?.dataMap || {})), [ctx?.dataMap]);
  return useMemo(() => ({ ...ctx, rawDataMap: ctx?.dataMap || {}, dataMap: filteredDataMap }), [ctx, filteredDataMap]);
}
