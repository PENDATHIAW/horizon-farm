import test from 'node:test';
import assert from 'node:assert/strict';
import seed from '../../src/utils/horizonFarmSimulationSeed.js';
import { buildOrderMargin, unitCostOfRevient } from '../../src/utils/commercialMargin.js';

const context = {
  animaux: seed.animaux,
  lots: seed.avicole,
  cultures: seed.cultures,
  stocks: seed.stock,
  alimentationLogs: seed.alimentation_logs,
  productionLogs: seed.production_oeufs_logs,
  healthEvents: seed.sante,
  businessEvents: seed.business_events,
};

test('COGS : vendre des plateaux d\'œufs ne coûte pas le prix du troupeau entier', () => {
  // Régression du bug 2,4 Md : coût = coût_achat_lot (3,6 M) x 680 plateaux.
  const line = { source_type: 'lot_avicole', source_id: 'HF-PO-001', product_name: 'Œufs plateaux', quantity: 680, unit_price: 2800 };
  const perUnit = unitCostOfRevient(line, seed.avicole.find((l) => l.id === 'HF-PO-001'), context);
  assert.ok(perUnit > 100 && perUnit < 2500, `coût par plateau réaliste (${Math.round(perUnit)})`);
});

test('COGS : marge par commande cohérente sur tout le seed (aucune marge aberrante)', () => {
  for (const order of seed.sales_orders) {
    const items = (seed.sales_order_items || []).filter((i) => String(i.order_id) === String(order.id));
    if (!items.length) continue;
    const m = buildOrderMargin(order, { orderItems: items, ...context });
    if (m.cost != null) {
      assert.ok(Number.isFinite(m.cost) && m.cost >= 0, `${order.id} coût fini et positif (${m.cost})`);
      // Le coût des marchandises vendues ne peut pas dépasser 5x le chiffre d'affaires.
      assert.ok(m.cost <= m.revenue * 5, `${order.id} COGS plausible vs CA (coût ${Math.round(m.cost)} / CA ${Math.round(m.revenue)})`);
      assert.ok(m.marginPct == null || (m.marginPct > -200 && m.marginPct <= 100), `${order.id} taux de marge plausible (${m.marginPct}%)`);
    }
  }
});

test('COGS : coût par unité correct selon la source (animal / chair / œufs / culture)', () => {
  const bovin = unitCostOfRevient({ source_type: 'animal', product_name: 'Bovin' }, seed.animaux.find((a) => a.id === 'HF-BOV-001'), context);
  assert.ok(bovin > 200000 && bovin < 600000, `coût bovin entier (${Math.round(bovin)})`);

  const chair = unitCostOfRevient({ source_type: 'lot_avicole', product_name: 'Poulet' }, seed.avicole.find((l) => l.id === 'HF-CH-001'), context);
  assert.ok(chair > 500 && chair < 5000, `coût par poulet (${Math.round(chair)})`);

  const culture = unitCostOfRevient({ source_type: 'culture', product_name: 'Tomates' }, seed.cultures.find((c) => c.id === 'HF-CULT-002'), context);
  assert.ok(culture > 50 && culture < 2000, `coût par kg culture (${Math.round(culture)})`);
});
