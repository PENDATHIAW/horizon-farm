import { useMemo } from 'react';
import { useAppData } from '../context/AppContext';

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
    () => ({
      rows: dataMap[moduleKey] || [],
      loading: Boolean(loadingMap[moduleKey]),
      error: errorMap[moduleKey] || null,
      create: (payload) => createRecord(moduleKey, payload),
      update: (id, payload) => updateRecord(moduleKey, id, payload),
      remove: (id) => deleteRecord(moduleKey, id),
      refresh: () => refreshModule(moduleKey),
    }),
    [moduleKey, dataMap, loadingMap, errorMap, createRecord, updateRecord, deleteRecord, refreshModule]
  );
}


