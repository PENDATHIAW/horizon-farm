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
  equipmentMaintenance: (equipmentId, date = '') => `TRX-EQP-maint-${clean(equipmentId)}${date ? `-${clean(date)}` : ''}`,
  supplierDebt: (supplierId, stockId) => `TRX-DETTE-FOUR-${clean(supplierId)}-${clean(stockId)}`,
  supplierPayment: (supplierId, ref = '') => `TRX-PAY-FOUR-${clean(supplierId)}${ref ? `-${clean(ref)}` : ''}`,
  stockLoss: (stockId, ref = '') => `TRX-PERTE-${clean(stockId)}${ref ? `-${clean(ref)}` : ''}`,
  cultureHarvest: (cultureId) => `TRX-RECOLTE-${clean(cultureId)}`,
  cultureExpense: (cultureId, expenseId = '') => `TRX-CULT-DEP-${clean(cultureId)}${expenseId ? `-${clean(expenseId)}` : ''}`,
  investment: (investmentId) => `TRX-INV-${clean(investmentId)}`,
  payroll: (personId, period = '') => `TRX-RH-${clean(personId)}-${clean(period)}`,
  rhPayroll: (personId, period = '') => `TRX-RH-${clean(personId)}-${clean(period)}`,
};

export const eventIds = {
  stockMovement: (stockId, ref = '') => `EVT-STK-${clean(stockId)}${ref ? `-${clean(ref)}` : ''}`,
  mortality: (lotId, date, delta = '') => `EVT-MORT-${clean(lotId)}-${clean(date)}${delta !== '' && delta !== undefined ? `-${clean(delta)}` : ''}`,
  eggProduction: (lotId, date) => `PROD-${clean(lotId)}-${clean(date)}`,
  businessEvent: (type, sourceModule, sourceRecordId, ref = '') => `EVT-${clean(type)}-${clean(sourceModule)}-${clean(sourceRecordId)}${ref ? `-${clean(ref)}` : ''}`,
};

export const documentIds = {
  purchase: (stockId, ref = '') => `DOC-ACHAT-${clean(stockId)}${ref ? `-${clean(ref)}` : ''}`,
  supplierDebt: (supplierId, stockId) => `DOC-DETTE-FOUR-${clean(supplierId)}-${clean(stockId)}`,
  supplierPayment: (supplierId, ref = '') => `DOC-PAY-FOUR-${clean(supplierId)}${ref ? `-${clean(ref)}` : ''}`,
  equipmentRepair: (equipmentId) => `DOC-EQP-${clean(equipmentId)}`,
  equipmentMaintenance: (equipmentId, date = '') => `DOC-EQP-maint-${clean(equipmentId)}${date ? `-${clean(date)}` : ''}`,
  healthProof: (healthId) => `DOC-SANTE-${clean(healthId)}`,
  cultureExpense: (cultureId, expenseId = '') => `DOC-CULT-DEP-${clean(cultureId)}${expenseId ? `-${clean(expenseId)}` : ''}`,
  transactionLink: (transactionId) => `DOC-LINK-${clean(transactionId)}`,
  rhPayroll: (personId, period = '') => `DOC-RH-${clean(personId)}-${clean(period)}`,
};

export const alertIds = {
  stockCritical: (stockId) => `ALT-STOCK-${clean(stockId)}`,
  supplierDebt: (supplierId) => `ALT-DETTE-FOUR-${clean(supplierId)}`,
  equipmentBreakdown: (equipmentId) => `ALT-EQP-PANNE-${clean(equipmentId)}`,
};
