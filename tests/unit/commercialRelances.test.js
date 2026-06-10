import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildRelanceMessageForChannel,
  buildScheduledRelancePlan,
  enrichRelanceRowsWithSchedules,
  RELANCE_LEVELS,
} from '../../src/utils/commercialRelanceSchedules.js';
import { buildCommercialRelanceRows } from '../../src/utils/commercialRelances.js';

describe('Commercial relances IA V1', () => {
  it('plan J+2 J+7 J+15 avec 3 canaux', () => {
    const plan = buildScheduledRelancePlan({
      client: { id: 'C1', nom: 'Client Test' },
      amount: 25000,
      orderId: 'CMD-1',
      overdueDays: 10,
      dueDate: '2026-06-01',
    });
    assert.equal(plan.length, RELANCE_LEVELS.length * 3);
    assert.ok(plan.some((p) => p.level === 'j2' && p.channel === 'whatsapp'));
    assert.ok(plan.some((p) => p.level === 'j15' && p.channel === 'email'));
  });

  it('messages courtois J+2 vs formel J+15', () => {
    const j2 = buildRelanceMessageForChannel({ level: 'j2', clientName: 'Alice', amount: 10000, orderId: 'CMD-1' });
    const j15 = buildRelanceMessageForChannel({ level: 'j15', channel: 'email', clientName: 'Alice', amount: 10000, orderId: 'CMD-1', overdueDays: 20 });
    assert.match(j2, /courtois|rappel|Alice/i);
    assert.match(j15, /Objet|Dernier rappel|solde/i);
  });

  it('relances créance depuis buildCommercialRelanceRows', () => {
    const rows = buildCommercialRelanceRows({
      clients: [{ id: 'C1', nom: 'Client', whatsapp: '+221' }],
      orders: [{ id: 'CMD-1', client_id: 'C1', montant_total: 50000, date_echeance: '2020-01-01' }],
      payments: [],
    });
    assert.ok(rows.some((r) => r.type === 'creance'));
    assert.ok(rows[0].message);
  });

  it('enrichRelanceRowsWithSchedules étend les lignes', () => {
    const base = [{
      id: 'rel-1',
      clientId: 'C1',
      clientName: 'Client',
      orderId: 'CMD-1',
      amount: 10000,
      type: 'creance',
    }];
    const enriched = enrichRelanceRowsWithSchedules(base, [{ id: 'C1', nom: 'Client' }]);
    assert.ok(enriched.length > base.length);
  });
});
