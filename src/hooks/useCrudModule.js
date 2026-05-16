import { useMemo } from 'react';
import { useAppData } from '../context/AppContext';
import { filterDeletedRows, forgetDeletedId, rememberDeletedId } from '../utils/deletedRecords';

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
      const rows = filterDeletedRows(moduleKey, sourceRows);
      const findExistingRow = (id) => rows.find((row) => String(row?.id) === String(id));
      return {
        rows,
        rawRows: rows,
        usingDemoRows: false,
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
