import { useMemo } from 'react';
import { AppProvider, useAppData as useRawAppData } from './AppContext.jsx';
import { filterDataMapDeleted } from '../utils/deletedRecords';

export { AppProvider };

export function useAppData() {
  const ctx = useRawAppData();
  const filteredDataMap = useMemo(() => filterDataMapDeleted(ctx?.dataMap || {}), [ctx?.dataMap]);
  return useMemo(() => ({ ...ctx, rawDataMap: ctx?.dataMap || {}, dataMap: filteredDataMap }), [ctx, filteredDataMap]);
}
