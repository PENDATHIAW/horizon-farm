import { expect, test } from '@playwright/test';
import { readFileSync } from 'fs';
import { auditFinanceReconciliation } from '../../src/services/financeReconciliationService.js';
import { buildIssueGroups } from '../../src/services/issueGroupingService.js';
import { auditCultureWorkflow } from '../../src/services/cultureWorkflowBridgeService.js';
import { buildNotificationPayloadFromAlert } from '../../src/services/notificationPayloads.js';
import { buildStockMovementPayload } from '../../src/services/stockMovementHelpers.js';
import { auditRhPayrollFinanceGaps } from '../../src/services/rhPayrollFinanceSyncService.js';
import { buildEquipmentSmartFarmSummary } from '../../src/services/equipmentSmartFarmBridge.js';

test('roadmap: issue grouping regroupe les éléments liés', () => {
  const key = 'ventes:ventes:CMD-1:encaissement';
  const groups = buildIssueGroups({
    alertes: [{ id: 'A1', issue_key: key, title: 'Encaissement manquant', status: 'nouvelle', source_module: 'ventes' }],
    taches: [{ id: 'T1', issue_key: key, title: 'Encaisser vente', status: 'ouverte', source_module: 'ventes' }],
  });
  expect(groups).toHaveLength(1);
  expect(groups[0].itemCount).toBe(2);
});

test('roadmap: rapprochement finance détecte paiement orphelin', () => {
  const audit = auditFinanceReconciliation({
    payments: [{ id: 'PAI-1', order_id: 'CMD-1', montant: 12000 }],
    finances: [],
    sales_orders: [{ id: 'CMD-1', montant_total: 12000 }],
  });
  expect(audit.paymentGaps).toHaveLength(1);
});

test('roadmap: culture récolte sans stock remonte un écart', () => {
  const audit = auditCultureWorkflow({
    cultures: [{ id: 'C1', nom: 'Tomates', quantite_recoltee: 50 }],
    stocks: [],
    salesOrders: [],
    businessEvents: [{ culture_id: 'C1', event_type: 'recolte_culture', target_id: 'C1' }],
  });
  expect(audit[0].gaps).toContain('recolte_sans_stock');
});

test('roadmap: payload push alerte contient tag et deep-link', () => {
  const payload = buildNotificationPayloadFromAlert({
    id: 'ALE-1',
    title: 'Stock critique',
    severity: 'critique',
    module_source: 'stock',
    entity_id: 'STK-1',
  });
  expect(payload.tag).toBeTruthy();
  expect(payload.url).toContain('alertes');
});

test('roadmap: mouvement stock enregistre delta positif', () => {
  const row = buildStockMovementPayload({
    before: { id: 'STK-1', quantite: 4 },
    after: { id: 'STK-1', quantite: 9 },
  });
  expect(row.movement_type).toBe('entree');
  expect(row.quantity).toBe(5);
});

test('roadmap: RH paie sans finance remonte un gap', () => {
  const audit = auditRhPayrollFinanceGaps({
    rh: [{ id: 'EMP-1', nom: 'Moussa', statut: 'actif', salaire_mensuel: 90000 }],
    transactions: [],
  });
  expect(audit.gaps.length).toBeGreaterThan(0);
});

test('roadmap: équipement smart farm lie capteur', () => {
  const summary = buildEquipmentSmartFarmSummary(
    [{ id: 'EQ-1', name: 'Incubateur' }],
    [{ id: 'S1', equipment_id: 'EQ-1' }],
    [],
  );
  expect(summary[0].totalDevices).toBe(1);
});

test('roadmap: panneaux UI branchés dans modules actifs', () => {
  const files = [
    'src/modules/IssueProblemFichePanel.jsx',
    'src/modules/RhPayrollFinanceSyncPanel.jsx',
    'src/modules/EquipementsSmartFarmBridge.jsx',
    'src/modules/FinanceReconciliationPanel.jsx',
    'src/modules/DocumentsOrphanSyncPanel.jsx',
  ];
  files.forEach((file) => {
    expect(readFileSync(file, 'utf8').length).toBeGreaterThan(100);
  });
  const alertes = readFileSync('src/modules/AlertesCenter.jsx', 'utf8');
  expect(alertes).toContain('IssueProblemFichePanel');
  const sync = readFileSync('src/modules/SyncERPModule.jsx', 'utf8');
  expect(sync).toContain('IssueProblemFichePanel');
  const ventes = readFileSync('src/modules/VentesV4.jsx', 'utf8');
  expect(ventes).toContain('SalesWorkflowRepairPanel');
});
