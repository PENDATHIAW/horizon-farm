import { createContext, useContext } from 'react';

export const ChartPeriodContext = createContext({ lockControls: false });

export function useChartPeriodContext() {
  return useContext(ChartPeriodContext);
}
