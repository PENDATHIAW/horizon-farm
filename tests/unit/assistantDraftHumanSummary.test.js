import test from 'node:test';
import assert from 'node:assert/strict';
import { buildHumanDraftConfirmation } from '../../src/services/assistantDraftHumanSummary.js';

test('buildHumanDraftConfirmation uses farmer language for sale', () => {
  const result = buildHumanDraftConfirmation({
    intent: 'sale_record',
    form_type: 'sale_record',
    draft_fields: {
      product_name: 'œufs',
      quantity: 120,
      unit: '',
      client_name: 'Hôtel Terminus',
      payment_amount: 36000,
      payment_status: 'credit',
    },
  });
  assert.ok(result.recordLines.some((line) => /Vente : 120/.test(line)));
  assert.ok(result.recordLines.some((line) => /Hôtel Terminus/.test(line)));
  assert.ok(result.recordLines.some((line) => /36\s?000/.test(line)));
  assert.ok(result.consequenceLines.includes('Stock diminué'));
  assert.ok(result.consequenceLines.includes('Facture créée'));
  assert.ok(result.consequenceLines.includes('Créance créée'));
  assert.equal(result.consequenceLines.some((line) => /Commercial|Traçabilité|ERP/.test(line)), false);
});
