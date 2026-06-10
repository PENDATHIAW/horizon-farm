import { syncFinanceSideEffects } from '../services/erpInterconnectionEngine';
import {
  buildCultureHarvestWorkflow,
  buildCultureInputUsageWorkflow,
  buildCultureLossWorkflow,
  cultureAvailableQty,
  cultureHarvestQty,
  cultureUnitPrice,
} from './cultureWorkflows';
import { financeIds } from './sideEffectIds';
import { toNumber } from './format';
import {
  buildCultureConsumptionMovementPayload,
  persistConsumptionMovement,
} from './stockConsumptionBridge.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const clean = (value) => String(value || '').trim();
const lower = (value) => clean(value).toLowerCase();
const today = () => new Date().toISOString().slice(0, 10);
const num = (value) => toNumber(value);

/**
 * Règle canonique P1-5 : récolte commerciale → revenu à la vente uniquement.
 * Pas d'écriture finance « récolte » si voie commerciale (stock/opportunité ouverte).
 */
export function shouldSkipHarvestFinanceForCommercialPath({ after = {}, workflow = {} } = {}) {
  const saleQty = cultureAvailableQty(after);
  if (saleQty > 0) return true;
  const oppStatus = lower(workflow?.opportunity?.statut || workflow?.opportunity?.status || '');
  if (oppStatus === 'ouverte' || oppStatus === 'open') return true;
  if (after.vendable || after.pret_a_la_vente || after.ready_for_sale || after.sale_ready) return true;
  return false;
}

export function buildCultureHarvestFinanceRow({ culture = {}, amount = 0, date = '' } = {}) {
  const value = num(amount);
  const cultureId = clean(culture.id);
  if (value <= 0 || !cultureId) return null;
  return {
    id: financeIds.cultureHarvest(cultureId),
    type: 'entree',
    libelle: `Récolte ${culture.nom || cultureId}`,
    montant: value,
    amount: value,
    date: date || culture.date_recolte || today(),
    categorie: 'Récoltes',
    activite: 'cultures',
    module_lie: 'cultures',
    related_id: cultureId,
    source_module: 'cultures',
    source_record_id: cultureId,
    statut: 'a_encaisser',
    side_effects_managed: true,
    created_from: 'culture_side_effects',
  };
}

export async function runCultureHarvestSideEffects({
  before = {},
  after = {},
  stocks = [],
  opportunities = [],
  transactions = [],
  source = 'fiche culture',
  date = '',
  handlers = {},
} = {}) {
  const workflow = buildCultureHarvestWorkflow({ before, after, stocks, opportunities, source, date: date || today() });
  if (!workflow) return null;

  if (workflow.stockExistingId) {
    await handlers.onUpdateStock?.(workflow.stockExistingId, workflow.stock);
  } else if (handlers.onCreateStock) {
    await handlers.onCreateStock({ ...workflow.stock, side_effects_managed: true });
  }

  if (workflow.opportunityExistingId) {
    await handlers.onUpdateOpportunity?.(workflow.opportunityExistingId, workflow.opportunity);
  } else if (handlers.onCreateOpportunity) {
    await handlers.onCreateOpportunity({ ...workflow.opportunity, side_effects_managed: true });
  }

  const qty = cultureHarvestQty(after);
  const amount = num(cultureUnitPrice(after)) * qty;
  const skipHarvestFinance = shouldSkipHarvestFinanceForCommercialPath({ after, workflow });
  if (amount > 0 && !skipHarvestFinance) {
    const financeRow = buildCultureHarvestFinanceRow({ culture: after, amount, date });
    if (financeRow) {
      const exists = arr(transactions).find((row) => clean(row.id) === clean(financeRow.id));
      if (!exists) await handlers.onCreateFinanceTransaction?.(financeRow);
      await syncFinanceSideEffects(exists || financeRow, { handlers });
    }
  }

  if (workflow.event && handlers.onCreateBusinessEvent) {
    await handlers.onCreateBusinessEvent({ ...workflow.event, side_effects_managed: true });
  }

  if (handlers.onCreateTrace && after.id) {
    await handlers.onCreateTrace?.({
      id: `TRA-CULTURE-${after.id}`,
      type: 'culture',
      source_id: after.id,
      source_module: 'cultures',
      etapes: [{
        date: date || today(),
        titre: 'Récolte disponible',
        event_type: 'recolte',
        module_source: 'cultures',
        montant: amount,
        details: `${qty} ${after.unite || 'kg'} récoltés`,
      }],
      side_effects_managed: true,
    });
  }

  return workflow;
}

export async function runCultureInputSideEffects({
  culture = {},
  stock = {},
  qty = 0,
  motif = '',
  date = '',
  handlers = {},
} = {}) {
  const workflow = buildCultureInputUsageWorkflow({ culture, stock, qty, motif, date: date || today() });
  if (!workflow) return null;

  const beforeQty = num(stock.quantite ?? stock.quantity);
  const afterQty = num(workflow.stockPatch.quantite ?? workflow.stockPatch.quantity);

  await handlers.onUpdateStock?.(stock.id, workflow.stockPatch);
  await handlers.onUpdateCulture?.(culture.id, workflow.culturePatch);
  if (workflow.event && handlers.onCreateBusinessEvent) {
    await handlers.onCreateBusinessEvent({ ...workflow.event, side_effects_managed: true });
  }

  if (handlers.onCreateStockMovement) {
    const consumptionPayload = buildCultureConsumptionMovementPayload({
      culture,
      stock: { ...stock, quantite: afterQty, quantity: afterQty },
      qty,
      beforeQty,
      afterQty,
      motif,
      date: date || today(),
      farmId: stock.farm_id || culture.farm_id,
    });
    if (consumptionPayload) {
      await persistConsumptionMovement({
        before: { id: stock.id, quantite: beforeQty },
        after: { id: stock.id, quantite: afterQty, unite: stock.unite || stock.unit, farm_id: consumptionPayload.farm_id },
        patch: {
          source_module: consumptionPayload.source_module,
          source_record_id: consumptionPayload.source_record_id,
          movement_ref: consumptionPayload.movement_ref,
          dedupe_key: consumptionPayload.dedupe_key,
          notes: consumptionPayload.notes,
        },
        payload: consumptionPayload,
        handlers,
        existingMovements: handlers.existingStockMovements || [],
      });
    }
  }

  return workflow;
}

export async function runCultureLossSideEffects({
  culture = {},
  qty = 0,
  unitPrice = 0,
  reason = '',
  date = '',
  transactions = [],
  handlers = {},
} = {}) {
  const workflow = buildCultureLossWorkflow({ culture, qty, unitPrice, reason, date: date || today() });
  if (!workflow) return null;

  await handlers.onUpdateCulture?.(culture.id, workflow.culturePatch);
  if (workflow.event && handlers.onCreateBusinessEvent) {
    await handlers.onCreateBusinessEvent({ ...workflow.event, side_effects_managed: true });
  }

  const amount = num(workflow.event?.amount);
  if (amount > 0 && handlers.onCreateFinanceTransaction) {
    const financeRow = {
      id: `TRX-PERTE-CULT-${culture.id}-${date || today()}`,
      type: 'sortie',
      libelle: `Perte culture ${culture.nom || culture.id}`,
      montant: amount,
      date: date || today(),
      categorie: 'Cultures',
      module_lie: 'cultures',
      related_id: culture.id,
      side_effects_managed: true,
      created_from: 'culture_side_effects',
    };
    const exists = arr(transactions).find((row) => clean(row.id) === clean(financeRow.id));
    if (!exists) await handlers.onCreateFinanceTransaction(financeRow);
    await syncFinanceSideEffects(exists || financeRow, { handlers });
  }

  return workflow;
}
