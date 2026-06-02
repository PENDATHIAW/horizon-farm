import { syncFinanceSideEffects } from '../services/erpInterconnectionEngine.js';
import {
  buildCultureHarvestWorkflow,
  buildCultureInputUsageWorkflow,
  buildCultureLossWorkflow,
  cultureHarvestQty,
  cultureUnitPrice,
} from './cultureWorkflows.js';
import { financeIds } from './sideEffectIds.js';
import { toNumber } from './format.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const clean = (value) => String(value || '').trim();
const today = () => new Date().toISOString().slice(0, 10);
const num = (value) => toNumber(value);

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
  businessEvents = [],
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
  if (amount > 0) {
    const financeRow = buildCultureHarvestFinanceRow({ culture: after, amount, date });
    if (financeRow) {
      const exists = arr(transactions).find((row) => clean(row.id) === clean(financeRow.id));
      if (!exists) await handlers.onCreateFinanceTransaction?.(financeRow);
      await syncFinanceSideEffects(exists || financeRow, { handlers });
    }
  }

  if (workflow.event && handlers.onCreateBusinessEvent) {
    const cultureId = clean(after.id);
    const alreadyLogged = arr(businessEvents).some((row) => clean(row.entity_id || row.source_id) === cultureId
      && ['recolte_culture_disponible', 'recolte_culture'].includes(clean(row.event_type)));
    if (!alreadyLogged) {
      await handlers.onCreateBusinessEvent({ ...workflow.event, side_effects_managed: true });
    }
  }

  if (handlers.onCreateTrace && after.id) {
    const traceId = `TRA-CULTURE-${after.id}`;
    await handlers.onCreateTrace?.({
      id: traceId,
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

  await handlers.onUpdateStock?.(stock.id, workflow.stockPatch);
  await handlers.onUpdateCulture?.(culture.id, workflow.culturePatch);
  if (workflow.event && handlers.onCreateBusinessEvent) {
    await handlers.onCreateBusinessEvent({ ...workflow.event, side_effects_managed: true });
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
