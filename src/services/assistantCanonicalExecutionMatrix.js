/**
 * ASSISTANT_CANONICAL_EXECUTION_MATRIX
 * Mapping intention → workflow canonique (aucun moteur parallèle).
 */

import { TARGET_WORKFLOWS } from './aiGateway/aiActionDrafts.js';

export const CANONICAL_EXECUTION_MATRIX = Object.freeze([
  {
    intent: 'sale_record',
    family: 'DECLARER',
    phrase: 'j\'ai vendu',
    workflow: 'commitCommercialSale',
    targetWorkflow: TARGET_WORKFLOWS.COMMERCIAL_SALE,
    modules: ['commercial', 'stock', 'finances', 'tracabilite'],
    autoExecute: false,
  },
  {
    intent: 'sale_payment',
    family: 'DECLARER',
    phrase: 'j\'ai payé / encaissé',
    workflow: 'recordSalePayment',
    targetWorkflow: TARGET_WORKFLOWS.SALE_PAYMENT,
    modules: ['finances', 'commercial'],
    autoExecute: false,
  },
  {
    intent: 'delivery',
    family: 'DECLARER',
    phrase: 'j\'ai livré',
    workflow: 'confirmSaleDelivery',
    targetWorkflow: null,
    modules: ['commercial', 'stock', 'tracabilite'],
    autoExecute: false,
    note: 'Ouverture formulaire module Commercial — pas d\'écriture directe assistant',
  },
  {
    intent: 'purchase_stock',
    family: 'DECLARER',
    phrase: 'j\'ai reçu un achat',
    workflow: 'commitStockPurchaseWorkflow',
    targetWorkflow: TARGET_WORKFLOWS.STOCK_PURCHASE,
    modules: ['stock', 'finances', 'fournisseurs', 'tracabilite'],
    autoExecute: false,
  },
  {
    intent: 'culture_harvest',
    family: 'DECLARER',
    phrase: 'j\'ai récolté',
    workflow: 'commitCultureHarvest',
    targetWorkflow: TARGET_WORKFLOWS.HARVEST,
    modules: ['cultures', 'stock', 'tracabilite'],
    autoExecute: false,
  },
  {
    intent: 'culture_expense',
    family: 'DECLARER',
    phrase: 'intrant culture',
    workflow: 'commitCultureExpense',
    targetWorkflow: null,
    modules: ['cultures', 'finances', 'tracabilite'],
    autoExecute: false,
    note: 'Formulaire Cultures — workflow canonique module',
  },
  {
    intent: 'mortality_event',
    family: 'DECLARER',
    phrase: 'mortalité',
    workflow: 'commitElevageMortality',
    targetWorkflow: null,
    modules: ['elevage', 'avicole', 'tracabilite'],
    autoExecute: false,
    note: 'Formulaire Élevage · parcours du module',
  },
  {
    intent: 'transformation',
    family: 'DECLARER',
    phrase: 'transformation',
    workflow: 'commitOfficialTransformation',
    targetWorkflow: null,
    modules: ['elevage', 'stock', 'tracabilite'],
    autoExecute: false,
    note: 'Formulaire Élevage transformation',
  },
  {
    intent: 'health_action',
    family: 'DECLARER',
    phrase: 'j\'ai vacciné / soin',
    workflow: 'commitHealthWorkflow',
    targetWorkflow: TARGET_WORKFLOWS.HEALTH,
    modules: ['sante', 'stock', 'tracabilite'],
    autoExecute: false,
  },
  {
    intent: 'finance_entry',
    family: 'DECLARER',
    phrase: 'j\'ai payé une dépense',
    workflow: 'commitFinanceEntry',
    targetWorkflow: null,
    modules: ['finance_pilotage', 'tracabilite'],
    autoExecute: false,
    note: 'Ouverture fiche Finance — pas d\'écriture directe sans validation',
  },
]);

const INTENT_WORKFLOW_MAP = Object.fromEntries(
  CANONICAL_EXECUTION_MATRIX.map((row) => [row.intent, row]),
);

export function resolveCanonicalWorkflow(intent = '') {
  return INTENT_WORKFLOW_MAP[intent] || null;
}

/** Consultation investisseur — moteurs lecture seule autorisés. */
export const INVESTOR_READ_ENGINES = Object.freeze([
  { engine: 'consolidateFinance', usage: 'trésorerie, créances, dettes, marge' },
  { engine: 'buildConsolidatedCommercialKpis', usage: 'CA, encaissé, panier moyen' },
  { engine: 'summarizeSalesMargins', usage: 'marges produits' },
  { engine: 'buildObjectifsCroissanceData', usage: 'objectifs croissance' },
]);

export default CANONICAL_EXECUTION_MATRIX;
