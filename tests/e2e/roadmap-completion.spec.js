import { expect, test } from '@playwright/test';
import { readFileSync } from 'fs';
import { auditFinanceReconciliation } from '../../src/services/financeReconciliationService.js';
import { buildIssueGroups } from '../../src/services/issueGroupingService.js';
import { auditCultureWorkflow } from '../../src/services/cultureWorkflowBridgeService.js';
import { buildNotificationPayloadFromAlert } from '../../src/services/notificationPayloads.js';
import { buildStockMovementPayload } from '../../src/services/stockMovementHelpers.js';
import { auditRhPayrollFinanceGaps } from '../../src/services/rhPayrollFinanceSyncService.js';
import { buildSmartFarmDeviceFollowUp } from '../../src/utils/smartFarmWorkflows.js';

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

test('roadmap: un capteur critique prépare alerte, tâche et événement', () => {
  const followUp = buildSmartFarmDeviceFollowUp({
    device: { id: 'S1', name: 'Humidité', status: 'offline' },
  });
  expect(followUp.alert.entity_id).toBe('S1');
  expect(followUp.task.source_record_id).toBe('S1');
  expect(followUp.event.event_type).toBe('smartfarm_signal_critique');
});

test('roadmap: panneaux UI branchés dans modules actifs', () => {
  const files = [
    'src/modules/activiteSuivi/ActiviteWorkflowBridge.jsx',
    'src/modules/EquipementsOperationalModule.jsx',
    'src/modules/finance/FinancePilotageV1Module.jsx',
    'src/modules/documents/DocumentsWorkflowBridge.jsx',
  ];
  files.forEach((file) => {
    expect(readFileSync(file, 'utf8').length).toBeGreaterThan(100);
  });
  const activite = readFileSync('src/modules/activiteSuivi/ActiviteWorkflowBridge.jsx', 'utf8');
  expect(activite).toContain('createLinkedTaskFromAlert');
  const gestion = readFileSync('src/modules/GestionSystemeV1Module.jsx', 'utf8');
  expect(gestion).toContain('SystemSyncView');
  const equipements = readFileSync('src/modules/EquipementsOperationalModule.jsx', 'utf8');
  expect(equipements).toContain('EquipementsQuickActionsBridge');
  const commercial = readFileSync('src/modules/CommercialRecoveredModule.jsx', 'utf8');
  expect(commercial).toContain('DailySaleModal');
});
