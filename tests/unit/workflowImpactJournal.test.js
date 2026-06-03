import assert from 'node:assert/strict';
import {
  IMPACT_KEYS,
  IMPACT_STATUS,
  OPERATION_EXPECTATIONS,
  OPERATION_TYPES,
  createImpactJournal,
  finalizeImpactJournal,
  instrumentHandlers,
  markImpactCreated,
  markImpactNa,
} from '../../src/utils/workflowImpactJournal.js';

const journal = createImpactJournal(OPERATION_TYPES.ACHAT_STOCK, 'WF-TEST');
assert.equal(journal.operationLabel, 'Achat stock');
assert.equal(journal.title, 'Opération enregistrée');

markImpactCreated(journal, IMPACT_KEYS.STOCK_UPDATED, 'STK-1');
markImpactNa(journal, IMPACT_KEYS.FINANCE, 'Réception sans montant');

const finalized = finalizeImpactJournal(journal, OPERATION_EXPECTATIONS[OPERATION_TYPES.ACHAT_STOCK]);
assert.equal(finalized.rows.length, 7);
assert.equal(finalized.impacts[IMPACT_KEYS.STOCK_UPDATED].status, IMPACT_STATUS.CREATED);
assert.equal(finalized.impacts[IMPACT_KEYS.FINANCE].status, IMPACT_STATUS.NA);
assert.equal(finalized.impacts[IMPACT_KEYS.ISSUE_KEY].status, IMPACT_STATUS.CREATED);

let financeCalled = false;
const tracked = instrumentHandlers({
  onCreateFinanceTransaction: async () => { financeCalled = true; return { id: 'TRX-1' }; },
}, createImpactJournal(OPERATION_TYPES.PAIEMENT, 'PAY-1'));

await tracked.onCreateFinanceTransaction?.({ id: 'TRX-1', montant: 1000 });
assert.equal(financeCalled, true);

console.log('workflowImpactJournal tests OK');
