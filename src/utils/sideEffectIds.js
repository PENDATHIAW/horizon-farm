const clean = (value) => String(value || '').trim();

/** IDs déterministes pour éviter les doublons finance/document/alerte entre pipelines. */
export const financeIds = {
  paid: (orderId, paymentId = '') => (paymentId ? `TRX-PAY-${paymentId}` : `TRX-SALE-${orderId}`),
  receivable: (orderId) => `TRX-CREANCE-${orderId}`,
  saleAlert: (orderId) => `ALT-CREANCE-${orderId}`,
  alert: (orderId) => `ALT-CREANCE-${orderId}`,
  purchase: (stockId, ref = '') => `TRX-ACHAT-${clean(stockId)}${ref ? `-${clean(ref)}` : ''}`,
  feeding: (logId) => `TRX-ALIM-${clean(logId)}`,
  health: (healthId) => `TRX-SANTE-${clean(healthId)}`,
  equipment: (equipmentId, kind = 'repair') => `TRX-EQP-${kind}-${clean(equipmentId)}`,
  supplierDebt: (supplierId, stockId) => `TRX-DETTE-FOUR-${clean(supplierId)}-${clean(stockId)}`,
  supplierPayment: (supplierId, ref = '') => `TRX-PAY-FOUR-${clean(supplierId)}${ref ? `-${clean(ref)}` : ''}`,
  stockLoss: (stockId, ref = '') => `TRX-PERTE-${clean(stockId)}${ref ? `-${clean(ref)}` : ''}`,
  cultureHarvest: (cultureId) => `TRX-RECOLTE-${clean(cultureId)}`,
  rhPayroll: (personId, period = '') => `TRX-PAIE-${clean(personId)}${period ? `-${clean(period)}` : ''}`,
  investment: (investmentId) => `TRX-INV-${clean(investmentId)}`,
};

export const documentIds = {
  purchase: (stockId, ref = '') => `DOC-ACHAT-${clean(stockId)}${ref ? `-${clean(ref)}` : ''}`,
  supplierDebt: (supplierId, stockId) => `DOC-DETTE-FOUR-${clean(supplierId)}-${clean(stockId)}`,
  supplierPayment: (supplierId, ref = '') => `DOC-PAY-FOUR-${clean(supplierId)}${ref ? `-${clean(ref)}` : ''}`,
  equipmentRepair: (equipmentId) => `DOC-EQP-${clean(equipmentId)}`,
  healthProof: (healthId) => `DOC-SANTE-${clean(healthId)}`,
  rhPayroll: (personId, period = '') => `DOC-PAIE-${clean(personId)}${period ? `-${clean(period)}` : ''}`,
};

export const alertIds = {
  stockCritical: (stockId) => `ALT-STOCK-${clean(stockId)}`,
  supplierDebt: (supplierId) => `ALT-DETTE-FOUR-${clean(supplierId)}`,
  equipmentBreakdown: (equipmentId) => `ALT-EQP-PANNE-${clean(equipmentId)}`,
};
