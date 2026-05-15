import { useMemo } from 'react';
import { useAppData } from '../context/AppContext';
import { DEMO_CORE_DATA } from '../utils/demoCoreData';
import { filterDeletedRows, forgetDeletedId, rememberDeletedId } from '../utils/deletedRecords';

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
  const current = filterDeletedRows(moduleKey, Array.isArray(rows) ? rows : []);
  if (!demoModeEnabled()) return current;
  const demo = filterDeletedRows(moduleKey, DEMO_CORE_DATA[moduleKey] || []);
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
      const sourceRows = Array.isArray(dataMap[moduleKey]) ? dataMap[moduleKey] : [];
      const rawRows = filterDeletedRows(moduleKey, sourceRows);
      const rows = mergeDemoRows(moduleKey, rawRows);
      const findExistingRow = (id) => [...sourceRows, ...rows].find((row) => String(row?.id) === String(id));
      return {
        rows,
        rawRows,
        usingDemoRows: rows !== rawRows,
        loading: Boolean(loadingMap[moduleKey]),
        error: errorMap[moduleKey] || null,
        create: async (payload) => {
          if (payload?.__restoreDeleted && payload?.id) forgetDeletedId(moduleKey, payload.id);
          const { __restoreDeleted, ...safePayload } = payload || {};
          return createRecord(moduleKey, safePayload);
        },
        update: (id, payload) => updateRecord(moduleKey, id, payload),
        remove: async (id) => {
          rememberDeletedId(moduleKey, id, findExistingRow(id));
          return deleteRecord(moduleKey, id);
        },
        refresh: () => refreshModule(moduleKey),
      };
    },
    [moduleKey, dataMap, loadingMap, errorMap, createRecord, updateRecord, deleteRecord, refreshModule]
  );
}
