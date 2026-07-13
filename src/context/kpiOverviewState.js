import { createContext, useContext } from 'react';

export const KpiOverviewContext = createContext(null);

export function useKpiOverview() {
  return useContext(KpiOverviewContext);
}
