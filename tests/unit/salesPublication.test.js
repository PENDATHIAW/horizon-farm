import test from 'node:test';
import assert from 'node:assert/strict';

import {
  generateSalesPublication,
  proposeSalesPublicationDraft,
  DEFAULT_MIN_MARGIN_PCT,
} from '../../src/services/aiGateway/salesPublicationGenerator.js';
import { TARGET_WORKFLOWS } from '../../src/services/aiGateway/aiActionDrafts.js';

test('génère les 4 sorties sans envoi auto', () => {
  const pub = generateSalesPublication({
    productName: 'Tomates bio',
    quantity: 120,
    unit: 'kg',
    unitPrice: 500,
    unitCost: 400,
    dlc: '2026-06-02',
    clientType: 'restaurant',
    channel: 'whatsapp',
    stockRow: {
      date_peremption: '2026-06-02',
      categorie: 'recolte',
    },
  });

  assert.ok(pub.short_message);
  assert.ok(pub.b2b_message);
  assert.ok(pub.social_post);
  assert.equal(pub.auto_send, false);
  assert.equal(pub.auto_apply_price, false);
  assert.match(pub.b2b_message, /Tomates bio/i);
});

test('promo seulement si marge minimale respectée', () => {
  const urgent = generateSalesPublication({
    productName: 'Œufs',
    quantity: 40,
    unit: 'tablette',
    unitPrice: 1000,
    unitCost: 900,
    dlc: '2026-05-30',
    stockRow: { date_peremption: '2026-05-30', categorie: 'produit_fini_oeufs' },
  });

  if (urgent.promotional_offer?.available) {
    const suggested = urgent.promotional_offer.suggested_unit_price;
    const margin = ((suggested - 900) / suggested) * 100;
    assert.ok(margin >= DEFAULT_MIN_MARGIN_PCT - 0.5);
    assert.equal(urgent.promotional_offer.auto_apply_price, false);
  }

  const blocked = generateSalesPublication({
    productName: 'Lait',
    quantity: 10,
    unit: 'L',
    unitPrice: 1000,
    unitCost: 980,
    dlc: '2026-05-29',
    stockRow: { date_peremption: '2026-05-29', categorie: 'produit_fini_laitier' },
  });
  assert.equal(blocked.promotional_offer?.available, false);
});

test('proposeSalesPublicationDraft insight only', () => {
  const draft = proposeSalesPublicationDraft({
    productName: 'Maïs',
    quantity: 5,
    unitPrice: 15000,
    unit: 'sac',
  });
  assert.equal(draft.target_workflow, TARGET_WORKFLOWS.INSIGHT_ONLY);
  assert.equal(draft.intent, 'sales_publication');
  assert.ok(draft.warnings.some((w) => /envoi automatique/i.test(w)));
});
