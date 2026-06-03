/**
 * Registre des exécuteurs workflow — seule porte d'écriture post-validation IA.
 */

import {
  commitPurchaseWorkflow,
  commitSaleWorkflow,
  commitFeedingWorkflow,
  commitHealthWorkflow,
  commitBiosecurityWorkflow,
  commitHarvestWorkflow,
  commitEquipmentWorkflow,
  commitAlertActionWorkflow,
} from '../workflowService.js';
import { commitDocumentLink } from '../../utils/documentsWorkflow.js';
import { commitCultureHarvest } from '../../utils/culturesWorkflow.js';
import { commitStockPurchaseWorkflow } from '../../utils/stockPurchaseWorkflow.js';
import { commitCommercialSale } from '../../utils/commercialSaleWorkflow.js';
import { recordSalePayment } from '../../utils/recordSalePayment.js';
import { TARGET_WORKFLOWS } from './aiActionDrafts.js';
import { ALLOWED_WORKFLOW_EXECUTORS } from './aiSafetyGuard.js';

export const WORKFLOW_EXECUTOR_MAP = {
  [TARGET_WORKFLOWS.PURCHASE]: commitPurchaseWorkflow,
  [TARGET_WORKFLOWS.SALE]: commitSaleWorkflow,
  [TARGET_WORKFLOWS.FEEDING]: commitFeedingWorkflow,
  [TARGET_WORKFLOWS.HEALTH]: commitHealthWorkflow,
  [TARGET_WORKFLOWS.BIOSECURITY]: commitBiosecurityWorkflow,
  [TARGET_WORKFLOWS.HARVEST]: commitCultureHarvest,
  [TARGET_WORKFLOWS.HARVEST_LEGACY]: commitHarvestWorkflow,
  [TARGET_WORKFLOWS.DOCUMENT_LINK]: commitDocumentLink,
  [TARGET_WORKFLOWS.STOCK_PURCHASE]: commitStockPurchaseWorkflow,
  [TARGET_WORKFLOWS.COMMERCIAL_SALE]: commitCommercialSale,
  [TARGET_WORKFLOWS.SALE_PAYMENT]: recordSalePayment,
  [TARGET_WORKFLOWS.EQUIPMENT]: commitEquipmentWorkflow,
  [TARGET_WORKFLOWS.ALERT_ACTION]: commitAlertActionWorkflow,
};

export function resolveWorkflowExecutor(targetWorkflow = '') {
  if (!ALLOWED_WORKFLOW_EXECUTORS.has(targetWorkflow)) return null;
  return WORKFLOW_EXECUTOR_MAP[targetWorkflow] || null;
}
