import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatCommercialSCA, CANONICAL_COMMERCIAL_SOURCES } from '../../src/services/heyHorizonCommercialPrompt.js';
import {
  detectCommercialPilotageQuery,
  buildCommercialPilotageAnswer,
} from '../../src/services/heyHorizonCommercialAnswers.js';

const dataMap = {
  salesOrders: [
    { id: 'CMD-1', client_id: 'C1', client_nom: 'Hotel', montant_total: 100000, date: '2026-06-01' },
    { id: 'CMD-2', client_id: 'C2', client_nom: 'Resto', montant_total: 50000, date: '2026-06-02', product_name: 'Poulet' },
  ],
  payments: [{ id: 'P1', order_id: 'CMD-1', montant: 30000 }],
  clients: [{ id: 'C1', nom: 'Hotel' }, { id: 'C2', nom: 'Resto', type: 'restaurant' }],
  stocks: [{ id: 'STK-1', produit: 'Oeufs', quantite: 40, categorie: 'produit_fini', vendable: true, prix_vente_unitaire: 1500 }],
};

describe('Hey Horizon Commercial V1', () => {
  it('format SCA officiel', () => {
    const text = formatCommercialSCA({
      situation: 'CA stable',
      cause: 'Encaissements réguliers',
      action: 'Relancer créances',
      sources: [CANONICAL_COMMERCIAL_SOURCES.ca],
    });
    assert.match(text, /SITUATION/);
    assert.match(text, /CAUSE/);
    assert.match(text, /ACTION/);
    assert.match(text, /Source ERP/);
  });

  it('détecte questions commerciales', () => {
    assert.equal(detectCommercialPilotageQuery('Résume ma situation commerciale'), 'summary');
    assert.equal(detectCommercialPilotageQuery('Quels sont mes meilleurs produits ?'), 'top_products');
    assert.equal(detectCommercialPilotageQuery('Quelles créances dois-je relancer ?'), 'receivables');
    assert.equal(detectCommercialPilotageQuery('Que dois-je vendre aujourd\'hui ?'), 'sell_today');
    assert.equal(detectCommercialPilotageQuery('Que dois-je faire aujourd\'hui ?'), 'today_actions');
  });

  it('réponse summary avec KPI canoniques', () => {
    const answer = buildCommercialPilotageAnswer('summary', dataMap);
    assert.match(answer.situation, /CA/);
    assert.match(answer.summary, /SITUATION/);
    assert.ok(answer.sources.length >= 2);
  });

  it('réponse top clients', () => {
    const answer = buildCommercialPilotageAnswer('top_clients', dataMap);
    assert.equal(answer.type, 'commercial_clients');
    assert.ok(answer.rows.length >= 1);
  });

  it('detectCommercialPilotageQuery prioritaire sur questions génériques', () => {
    assert.equal(detectCommercialPilotageQuery('Que dois-je faire aujourd\'hui ?'), 'today_actions');
    const answer = buildCommercialPilotageAnswer('today_actions', dataMap);
    assert.match(answer.summary, /SITUATION/);
    assert.ok(answer.rows.length >= 1);
  });
});
