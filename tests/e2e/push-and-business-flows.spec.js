import { expect, test } from '@playwright/test';
import { readFileSync } from 'fs';
import { buildNotificationPayloadFromAlert, resolveAlertTag, resolveDeepLinkUrl } from '../../src/services/notificationPayloads.js';
import { auditFinanceReconciliation } from '../../src/services/financeReconciliationService.js';
import { buildStockMovementPayload } from '../../src/services/stockMovementHelpers.js';
import { recordSalePayment } from '../../src/utils/recordSalePayment.js';
import { applyStockMovement } from '../../src/utils/stockWorkflows.js';
import { computeFinanceCash } from '../../src/utils/financeCash.js';

test.describe('Push notifications (logique métier)', () => {
  test('payload alerte critique contient tag, deep-link et corps actionnable', () => {
    const alert = {
      id: 'AL-PUSH-1',
      title: 'Stock critique aliment',
      message: '2 sacs restants',
      action_recommandee: 'Commander réapprovisionnement',
      module_source: 'stock',
      entity_id: 'STK-1',
      severity: 'critique',
      alert_dedupe_key: 'stock:stock:STK-1:critique',
    };
    const payload = buildNotificationPayloadFromAlert(alert);
    expect(payload.title).toContain('Critique');
    expect(payload.body).toContain('Action : Commander réapprovisionnement');
    expect(payload.tag).toBe(resolveAlertTag(alert));
    expect(payload.url).toBe(resolveDeepLinkUrl(alert));
    expect(payload.url).toContain('module=alertes');
    expect(payload.requireInteraction).toBe(true);
  });

  test('service worker et routes push API sont présents', () => {
    expect(readFileSync('public/sw.js', 'utf8')).toContain('push');
    expect(readFileSync('api/push/[action].js', 'utf8')).toContain('send');
    expect(readFileSync('lib/server/push/latest-alert.js', 'utf8')).toContain('normalizeAlert');
  });
});

test.describe('Flux commerciaux / stock / finance (simulés)', () => {
  test('encaissement vente met à jour paiement et reste à encaisser', async () => {
    const sale = { id: 'CMD-1', montant_total: 50000, montant_paye: 0 };
    const payments = [];
    const result = await recordSalePayment({
      sale,
      requestedAmount: 20000,
      payments,
      handlers: {
        onCreatePayment: async (row) => { payments.push(row); return row; },
        onCreateFinanceTransaction: async () => ({}),
      },
    });
    expect(result.skipped).toBe(false);
    expect(result.amount).toBe(20000);
    expect(result.remaining).toBe(30000);
    expect(payments).toHaveLength(1);
    expect(payments[0].montant).toBe(20000);
  });

  test('mouvement stock sortie décrémente quantité', () => {
    const stock = { id: 'STK-1', quantite: 20, nom: 'Aliment' };
    const movement = applyStockMovement(stock, { type: 'sortie', qty: 5, label: 'Distribution lot' });
    expect(movement.stock.quantite).toBe(15);
    expect(movement.event.quantity).toBe(5);
  });

  test('historique stock_movements enregistre entrée positive', () => {
    const row = buildStockMovementPayload({
      before: { id: 'STK-2', quantite: 10 },
      after: { id: 'STK-2', quantite: 25 },
    });
    expect(row.movement_type).toBe('entree');
    expect(row.quantity).toBe(15);
    expect(row.stock_id).toBe('STK-2');
  });

  test('rapprochement finance détecte encaissement sans écriture', () => {
    const audit = auditFinanceReconciliation({
      payments: [{ id: 'PAI-9', order_id: 'CMD-9', montant: 45000 }],
      finances: [],
      sales_orders: [{ id: 'CMD-9', montant_total: 45000 }],
    });
    expect(audit.paymentGaps.length).toBeGreaterThan(0);
  });

  test('trésorerie finance exclut créances non encaissées', () => {
    const cash = computeFinanceCash({
      transactions: [
        { id: 'T1', type: 'entree', montant: 10000, statut: 'paye' },
        { id: 'T2', type: 'entree', montant: 50000, statut: 'impaye' },
      ],
    });
    expect(cash.cashIn).toBe(10000);
    expect(cash.receivables).toBe(50000);
  });
});
