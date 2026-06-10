import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildConsolidatedCommercialKpis } from '../../src/utils/commercialKpiConsolidated.js';
import { buildCommercialSaleGapRows } from '../../src/utils/commercialSaleIntegrity.js';
import { buildCommercialReconciliationRows } from '../../src/utils/commercialReconciliation.js';
import { mergeCommercialOpportunities } from '../../src/utils/commercialAutoOpportunities.js';
import { buildCommercialPilotageBundle } from '../../src/utils/commercialPilotageMetrics.js';

describe('Commercial audit V1 — cohérence métier', () => {
  it('KPI consolidés : une seule source CA / créances', () => {
    const orders = [
      { id: 'CMD-1', client_id: 'C1', montant_total: 100000, statut_commande: 'ouverte' },
      { id: 'CMD-2', client_id: 'C2', montant_total: 50000, statut_commande: 'ouverte' },
    ];
    const payments = [{ id: 'P1', order_id: 'CMD-1', montant: 40000 }];
    const kpis = buildConsolidatedCommercialKpis({ orders, payments, clients: [{ id: 'C1' }, { id: 'C2' }] });
    assert.equal(kpis.ca, 150000);
    assert.equal(kpis.collected, 40000);
    assert.equal(kpis.receivable, 110000);
  });

  it('réconciliation détecte paiement sans finance', () => {
    const rows = buildCommercialReconciliationRows({
      orders: [{ id: 'CMD-1', montant_total: 10000, client_id: 'C1' }],
      items: [{ order_id: 'CMD-1', quantity: 1 }],
      payments: [{ id: 'PAY-1', order_id: 'CMD-1', montant: 10000 }],
      transactions: [],
    });
    assert.ok(rows.some((r) => r.kind === 'payment_without_finance'));
  });

  it('opportunités auto fusionnées sans doublon source', () => {
    const manual = [{ id: 'opp-1', source_type: 'stock', source_id: 'STK-1', title: 'Manuel' }];
    const auto = [{ id: 'auto-opp-stock-STK-1', source_type: 'stock', source_id: 'STK-1', title: 'Auto' }];
    const merged = mergeCommercialOpportunities(manual, auto);
    assert.equal(merged.length, 1);
    assert.equal(merged[0].title, 'Manuel');
  });

  it('pilotage marge produit cite summarizeSalesMargins', () => {
    const bundle = buildCommercialPilotageBundle({
      orders: [{ id: 'O1', product_name: 'Poulet', montant_total: 20000, quantity: 10, marge_directe: 5000, margin_reliable: true, chiffre_affaires: 20000, cout_revient: 15000 }],
      payments: [],
      clients: [],
      marginContext: {},
    });
    assert.ok(Array.isArray(bundle.topProducts));
    assert.ok(bundle.objectives.source === 'buildMonthlyTargetAttainment');
  });

  it('écarts vente sans lignes détectés', () => {
    const gaps = buildCommercialSaleGapRows({
      orders: [{ id: 'CMD-X', montant_total: 5000 }],
      items: [],
      payments: [],
      transactions: [],
    });
    assert.ok(gaps.some((g) => g.kind === 'sale_without_lines'));
  });
});
