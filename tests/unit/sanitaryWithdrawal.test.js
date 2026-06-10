import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  blockSanitaryAction,
  findActiveWithdrawals,
  isWithdrawalActive,
  resolveHealthWithdrawalTargets,
  SANITARY_ACTIONS,
  withdrawalAffectsTarget,
} from '../../src/utils/sanitaryWithdrawal.js';

describe('sanitaryWithdrawal — délai actif', () => {
  it('détecte un délai sanitaire encore actif', () => {
    const future = new Date();
    future.setDate(future.getDate() + 5);
    const until = future.toISOString().slice(0, 10);
    assert.equal(isWithdrawalActive(until), true);
    assert.equal(isWithdrawalActive('2020-01-01'), false);
  });

  it('liste les interventions avec délai actif', () => {
    const future = new Date();
    future.setDate(future.getDate() + 3);
    const until = future.toISOString().slice(0, 10);
    const rows = [
      { id: 'H1', delai_sanitaire_fin: until, animal_id: 'A1' },
      { id: 'H2', delai_sanitaire_fin: '2020-01-01', animal_id: 'A2' },
    ];
    const active = findActiveWithdrawals(rows);
    assert.equal(active.length, 1);
    assert.equal(active[0].id, 'H1');
  });

  it('résout cibles animal et lot depuis related_id', () => {
    const targets = resolveHealthWithdrawalTargets({
      module_lie: 'avicole',
      related_id: 'LOT-9',
      delai_sanitaire_fin: '2099-01-01',
    });
    assert.deepEqual(targets.lotIds, ['LOT-9']);
  });
});

describe('sanitaryWithdrawal — blocage vente / transformation', () => {
  it('bloque la vente si délai actif sur le cheptel', () => {
    const future = new Date();
    future.setDate(future.getDate() + 7);
    const until = future.toISOString().slice(0, 10);
    const block = blockSanitaryAction({
      healthRows: [{ id: 'H1', nom: 'Antibio', animal_id: 'A1', delai_sanitaire_fin: until }],
      action: SANITARY_ACTIONS.SALE,
    });
    assert.equal(block.blocked, true);
    assert.match(block.message, /Délai sanitaire actif/);
  });

  it('ne bloque pas si délai expiré', () => {
    const block = blockSanitaryAction({
      healthRows: [{ id: 'H1', animal_id: 'A1', delai_sanitaire_fin: '2020-01-01' }],
      action: SANITARY_ACTIONS.TRANSFORM,
      lotId: 'LOT-1',
    });
    assert.equal(block.blocked, false);
  });

  it('cible un lot précis pour la transformation', () => {
    const future = new Date();
    future.setDate(future.getDate() + 2);
    const until = future.toISOString().slice(0, 10);
    const rows = [
      { id: 'H1', lot_id: 'LOT-A', delai_sanitaire_fin: until },
      { id: 'H2', lot_id: 'LOT-B', delai_sanitaire_fin: until },
    ];
    assert.equal(withdrawalAffectsTarget(rows[0], { lotId: 'LOT-A' }), true);
    assert.equal(withdrawalAffectsTarget(rows[1], { lotId: 'LOT-A' }), false);
    const block = blockSanitaryAction({
      healthRows: rows,
      action: SANITARY_ACTIONS.TRANSFORM,
      lotId: 'LOT-B',
    });
    assert.equal(block.blocked, true);
    assert.equal(block.withdrawals.length, 1);
  });
});
