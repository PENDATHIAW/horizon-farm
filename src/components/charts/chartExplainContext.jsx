import { createContext, useContext } from 'react';

const defaultValue = {
  enabled: false,
  moduleId: '',
  onNavigate: null,
  stocks: [],
  salesOrders: [],
  payments: [],
  transactions: [],
  sante: [],
  vaccins: [],
  businessEvents: [],
  taches: [],
  alertes: [],
  productionLogs: [],
  alimentationLogs: [],
};

export const ChartExplainContext = createContext(defaultValue);

export function useChartExplainContext() {
  return useContext(ChartExplainContext);
}
