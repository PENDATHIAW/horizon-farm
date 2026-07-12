import { emitHorizonForm } from '../services/formModalManager.js';
import { getAntiDuplicationPair } from './antiDuplicationRegistry.js';

const today = () => new Date().toISOString().slice(0, 10);
const lower = (value = '') => String(value || '').toLowerCase();

export function redirectToSource(onNavigate, pairId, { tab = null, toastFn = null } = {}) {
  const pair = getAntiDuplicationPair(pairId);
  if (!pair || !onNavigate) return null;
  const targetTab = tab || pair.sourceTab;
  if (targetTab) onNavigate(pair.sourceModule, { tab: targetTab });
  else onNavigate(pair.sourceModule);
  toastFn?.(`Module source : ${pair.sourceModule}`);
  return pair;
}

export function openStockPurchase({ onNavigate, setTab, title = 'Réception stock' } = {}) {
  emitHorizonForm('stock', 'stock_purchase', title, { date: today() });
  if (typeof setTab === 'function') setTab('Stock');
  else onNavigate?.('achats_stock', { tab: 'Stock' });
}

export function openFinanceCharge({ setTab, title = 'Charge / dépense' } = {}) {
  emitHorizonForm('finances', 'finance_entry', title, { date: today(), type: 'sortie' });
  setTab?.('Trésorerie');
}

export function openDocumentProofFromTransaction(transactionId, label = '') {
  emitHorizonForm('documents', 'supplier_invoice', label ? `Joindre preuve : ${label}` : 'Joindre preuve', {
    date: today(),
    transaction_id: transactionId,
    related_id: transactionId,
    source_record_id: transactionId,
    module_source: 'finances',
  });
}

export function openCommercialSale(onNavigate) {
  onNavigate?.('commercial', { tab: 'Ventes' });
  emitHorizonForm('ventes', 'sale_record', 'Nouvelle vente', { date: today() });
}

export function openEquipementsMaintenance(onNavigate) {
  onNavigate?.('equipements');
}

export function openSmartFarmCapteurs(onNavigate) {
  onNavigate?.('smartfarm');
}

export function openFinanceurReport(onNavigate) {
  onNavigate?.('rapports');
}

export function isStockPurchaseIntent(payload = {}) {
  const hay = lower(`${payload.categorie || ''} ${payload.category || ''} ${payload.libelle || ''} ${payload.title || ''} ${payload.type || ''}`);
  return /achat|stock|approvision|fournisseur|réception|reception|aliment|provende/.test(hay);
}

export function isSaleIntent(payload = {}) {
  const hay = lower(`${payload.categorie || ''} ${payload.libelle || ''} ${payload.title || ''} ${payload.type || ''} ${payload.nature || ''}`);
  return /vente|client|commercial|opportun|ca\b|recette vente/.test(hay);
}

export function resolveFinanceEntryTarget(payload = {}, onNavigate) {
  if (isSaleIntent(payload)) {
    openCommercialSale(onNavigate);
    return { redirected: true, pairId: 'vente_commercial_finance', module: 'commercial' };
  }
  if (isStockPurchaseIntent(payload)) {
    openStockPurchase({ onNavigate });
    return { redirected: true, pairId: 'charge_vs_stock', module: 'achats_stock' };
  }
  return { redirected: false };
}

export function shouldBlockInlineAlertCreation(moduleId = '') {
  return moduleId === 'centre_decisionnel';
}
