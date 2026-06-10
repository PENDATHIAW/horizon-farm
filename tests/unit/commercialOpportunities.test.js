import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAutoCommercialOpportunities,
  mergeCommercialOpportunities,
  formatOpportunityUrgencyLabel,
} from '../../src/utils/commercialAutoOpportunities.js';
import { scoreClientForOpportunity } from '../../src/modules/commercial/commercialOpportunityMatching.js';

describe('Commercial opportunités auto V1', () => {
  it('génère opportunité depuis stock vendable', () => {
    const opps = buildAutoCommercialOpportunities({
      stocks: [{
        id: 'STK-EGG',
        produit: 'Plateaux oeufs',
        quantite: 50,
        categorie: 'produit_fini',
        vendable: true,
        prix_vente_unitaire: 2000,
        date_peremption: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      }],
    });
    assert.ok(opps.length >= 1);
    assert.equal(opps[0].source_type, 'stock');
    assert.ok(opps[0].recommendation);
  });

  it('urgence critique si DLC J-2', () => {
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const opps = buildAutoCommercialOpportunities({
      stocks: [{
        id: 'STK-FR',
        produit: 'Poulet frais',
        quantite: 10,
        categorie: 'produit_fini',
        vendable: true,
        date_peremption: tomorrow,
      }],
    });
    assert.ok(opps.some((o) => o.urgency === 'critique' || o.urgency === 'haute'));
  });

  it('lot prêt génère opportunité', () => {
    const opps = buildAutoCommercialOpportunities({
      lots: [{ id: 'LOT-1', nom: 'Bande chair', pret_vente: true, quantite_disponible: 100 }],
    });
    assert.ok(opps.some((o) => o.source_type === 'lot_avicole'));
  });

  it('merge sans doublon manuel/auto', () => {
    const merged = mergeCommercialOpportunities(
      [{ id: 'M1', title: 'Manuel', source_type: 'stock', source_id: 'A' }],
      [{ id: 'auto-A', title: 'Auto', source_type: 'stock', source_id: 'A' }],
    );
    assert.equal(merged.length, 1);
  });

  it('score client opportunité cohérent', () => {
    const client = { id: 'C1', type: 'restaurant', nom: 'Resto' };
    const opp = { product_name: 'Poulet chair', title: 'Poulets disponibles' };
    const orders = [
      { client_id: 'C1', date: '2026-05-01', product_name: 'Poulet' },
      { client_id: 'C1', date: '2026-05-15', product_name: 'Poulet chair' },
    ];
    const score = scoreClientForOpportunity(client, opp, orders);
    assert.ok(score >= 40);
  });

  it('format urgence lisible', () => {
    assert.equal(formatOpportunityUrgencyLabel('critique'), 'Critique');
  });
});
