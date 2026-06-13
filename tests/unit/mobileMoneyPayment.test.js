import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isMobileMoneyProvider } from '../../src/services/mobileMoneyPaymentService.js';

describe('mobileMoneyPaymentService', () => {
  it('détecte Wave et Orange Money', () => {
    assert.equal(isMobileMoneyProvider('wave'), true);
    assert.equal(isMobileMoneyProvider('orange_money'), true);
    assert.equal(isMobileMoneyProvider('Orange Money'), true);
    assert.equal(isMobileMoneyProvider('especes'), false);
  });
});
