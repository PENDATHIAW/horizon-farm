import { useMemo } from 'react';
import { useAppData } from '../context/AppContext';
import { withDemoRows } from '../utils/demoCoreData';

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
      const rows = withDemoRows(moduleKey, rawRows);
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


