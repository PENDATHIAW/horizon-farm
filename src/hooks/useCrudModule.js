import { useMemo } from 'react';
import { useAppData } from '../context/AppContext';
import { DEMO_CORE_DATA, withDemoRows } from '../utils/demoCoreData';

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

function mergeDemoRows(moduleKey, rows) {
  const current = Array.isArray(rows) ? rows : [];
  if (!current.length) return withDemoRows(moduleKey, current);
  if (!demoModeEnabled()) return current;
  const demo = DEMO_CORE_DATA[moduleKey] || [];
  const ids = new Set(current.map((row) => String(row.id)));
  return [...current, ...demo.filter((row) => !ids.has(String(row.id)))];
}

export default function useCrudModule(moduleKey) {
  const {
    dataMap,
    loadingMap,
    errorMap,
    createRecord,
    updateRecord,
    deleteRecord,
    refreshModule,
  } = useAppData();

  return useMemo(
    () => {
      const rawRows = dataMap[moduleKey] || [];
      const rows = mergeDemoRows(moduleKey, rawRows);
      return {
        rows,
        rawRows,
        usingDemoRows: rows !== rawRows,
        loading: Boolean(loadingMap[moduleKey]),
        error: errorMap[moduleKey] || null,
        create: (payload) => createRecord(moduleKey, payload),
        update: (id, payload) => updateRecord(moduleKey, id, payload),
        remove: (id) => deleteRecord(moduleKey, id),
        refresh: () => refreshModule(moduleKey),
      };
    },
    [moduleKey, dataMap, loadingMap, errorMap, createRecord, updateRecord, deleteRecord, refreshModule]
  );
}


