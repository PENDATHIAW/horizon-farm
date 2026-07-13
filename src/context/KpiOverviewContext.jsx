import { useMemo } from 'react';
import { KpiOverviewContext } from './kpiOverviewState.js';

export function KpiOverviewProvider({ dataMap = {}, periodScope = {}, periodLabel = '', onNavigate, children }) {
  const value = useMemo(
    () => ({ dataMap, periodScope, periodLabel, onNavigate }),
    [dataMap, periodScope, periodLabel, onNavigate],
  );

  return <KpiOverviewContext.Provider value={value}>{children}</KpiOverviewContext.Provider>;
}
