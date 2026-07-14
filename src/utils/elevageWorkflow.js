/**
 * Chantier 4 - Élevage : une saisie par onglet métier, impacts stock / finance / alertes / tâches / traçabilité.
 */

import { makeId } from './ids.js';
import { toNumber } from './format.js';
import { financeIds } from './sideEffectIds.js';
import {
  applyStockMovement,
  buildStockCriticalFollowUp,
  hasOpenStockReorderTask,
  isStockCritical,
  stockQuantity,
  stockUnitPrice,
} from './stockWorkflows.js';
import {
  avicoleActiveCount,
  avicoleDeadCount,
  avicoleInitialCount,
} from './avicoleMetrics.js';
import { runHealthStockConsumptionSideEffects, buildHealthProofDocument } from './healthSideEffects.js';
import {
  buildEggPackagingConsumptionPayload,
  buildEggProductionStockMovementPayload,
  EGG_PACKAGING_GAP_MESSAGE,
  EGG_STOCK_GAP_MESSAGE,
  persistConsumptionMovement,
} from './stockConsumptionBridge.js';
import {
  commitFeedingWorkflow,
  commitHealthWorkflow,
  prepareFeedingWorkflow,
  prepareHealthWorkflow,
} from '../services/workflowService.js';
import { resolveElevageThresholds, mortalityAlertSeverity } from './elevageThresholds.js';
import { computeOfficialLayingRate } from './elevageLayingRate.js';
import { resolveElevageLogFarmId, stampElevageLogFarmId } from './elevageFarmScope.js';
import {
  attachDailyEntryMeta,
  DAILY_ENTRY_TYPES,
  dailyEntryRecordId,
  findDailyEntryReplay,
  resolveDailyEntryIdentity,
} from './dailyQuickEntryContract.js';

export { computeOfficialLayingRate, computeLotOfficialLayingRate, formatOfficialLayingRate, aggregateSummaryLayingRate, LAYING_RATE_NOT_CALCULABLE } from './elevageLayingRate.js';
export { resolveElevageThresholds, ELEVAGE_THRESHOLDS_DEFAULTS, mortalityAlertSeverity } from './elevageThresholds.js';
export { resolveElevageLogFarmId, stampElevageLogFarmId, backfillElevageLogFarmId } from './elevageFarmScope.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const clean = (value) => String(value || '').trim();
const lower = (value) => clean(value).toLowerCase();
const num = (value) => toNumber(value);
const today = () => new Date().toISOString().slice(0, 10);
const EGGS_PER_TABLET = 30;
const DAY_MS = 86400000;
const BROILER_DEFAULT_CYCLE_DAYS = 45;
const BROILER_FEED_KG_PER_SUBJECT = 4.5;
const BROILER_TARGET_WEIGHT_KG = 1.8;
const BOVINE_WEIGHING_STALE_DAYS = 30;
const BROILER_CLOSED_STATUSES = ['vendu', 'cloture', 'clôturé', 'archive', 'archivé', 'perdu_mortalite', 'termine', 'terminé', 'abattu', 'reforme'];

export const ELEVAGE_DOMAINS = {
  FEEDING: 'alimentation',
  HEALTH: 'sante',
  MORTALITY: 'mortalite',
  EGGS: 'production_oeufs',
  TRANSFORM: 'transformation',
  WEIGHING: 'pesee',
};

export const ANIMAL_LOSS_NOT_CALCULABLE = 'Perte financière non calculable : coût d\'achat absent.';

export function buildElevageIssueKey(domain = '', recordId = '', suffix = '') {
  const d = clean(domain) || 'elevage';
  const id = clean(recordId) || 'record';
  const tail = clean(suffix);
  return tail ? `elevage:${d}:${id}:${tail}` : `elevage:${d}:${id}`;
}

const addDays = (date = today(), days = 0) => {
  const base = new Date(date || today());
  if (Number.isNaN(base.getTime())) return today();
  base.setDate(base.getDate() + Number(days || 0));
  return base.toISOString().slice(0, 10);
};

const daysBetween = (start = today(), end = today()) => {
  const a = new Date(start || today());
  const b = new Date(end || today());
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0;
  return Math.max(0, Math.round((b - a) / DAY_MS));
};

export function buildBroilerLotStartWorkflow({
  lot = {},
  lots = [],
  batiments = [],
  fournisseurs = [],
  date = today(),
} = {}) {
  const lotId = clean(lot.id) || makeId('LOTCH');
  const startDate = lot.date_debut || lot.date_entree || date;
  const initialCount = num(lot.initial_count ?? lot.effectif_initial ?? lot.quantite);
  const unitCost = num(lot.prix_unitaire_sujet ?? lot.cout_unitaire_poussin);
  const purchaseCost = num(lot.cout_total_achat ?? lot.purchase_cost ?? lot.cout_poussins) || unitCost * initialCount;
  const cycleDays = num(lot.duree_cycle_valeur) || BROILER_DEFAULT_CYCLE_DAYS;
  const saleDate = lot.date_fin_prevue || lot.date_objectif_vente || addDays(startDate, cycleDays);
  const buildingId = clean(lot.batiment_id || lot.building_id) || (arr(batiments).length === 1 ? clean(batiments[0].id) : '');
  const supplierId = clean(lot.fournisseur_id || lot.supplier_id) || (arr(fournisseurs).length === 1 ? clean(fournisseurs[0].id) : '');
  const feedNeedKg = num(lot.besoin_aliment_previsionnel_kg ?? lot.feed_need_kg) || Math.round(initialCount * BROILER_FEED_KG_PER_SUBJECT);
  const targetWeight = num(lot.poids_objectif ?? lot.target_weight) || BROILER_TARGET_WEIGHT_KG;
  const expectedRevenue = num(lot.prix_vente_prevu ?? lot.expected_revenue);
  const expectedMargin = expectedRevenue > 0 ? expectedRevenue - purchaseCost : num(lot.marge_previsionnelle);
  const issueKey = buildElevageIssueKey('broiler_lot_start', lotId, startDate);
  const activeInSameBuilding = buildingId ? arr(lots).find((existing) => {
    if (clean(existing.id) === lotId) return false;
    const sameBuilding = clean(existing.batiment_id || existing.building_id) === buildingId;
    if (!sameBuilding) return false;
    const status = lower(existing.status || existing.statut);
    return !BROILER_CLOSED_STATUSES.includes(status) && avicoleActiveCount(existing) > 0;
  }) : null;
  const missing = [
    initialCount > 0 ? '' : 'effectif initial',
    buildingId ? '' : 'bâtiment',
    purchaseCost > 0 ? '' : 'coût initial',
    supplierId ? '' : 'fournisseur',
  ].filter(Boolean);
  const blockingReasons = [
    activeInSameBuilding ? `bâtiment déjà occupé par ${activeInSameBuilding.name || activeInSameBuilding.nom || activeInSameBuilding.id}` : '',
  ].filter(Boolean);
  const vaccinationDates = [
    { label: 'Vaccin démarrage', due: addDays(startDate, 7) },
    { label: 'Rappel vaccin chair', due: addDays(startDate, 14) },
  ];
  const weighingDates = [7, 14, 21, 28, 35].map((day) => ({
    label: `Pesée J+${day}`,
    due: addDays(startDate, day),
  }));

  const lotPayload = {
    ...lot,
    id: lotId,
    type: 'Chair',
    type_lot: 'chair',
    status: lot.status || 'en_croissance',
    statut: lot.statut || lot.status || 'en_croissance',
    initial_count: initialCount,
    current_count: initialCount,
    effectif_actuel: initialCount,
    batiment_id: buildingId,
    building_id: buildingId,
    fournisseur_id: supplierId,
    supplier_id: supplierId,
    cout_poussins: purchaseCost,
    purchase_cost: purchaseCost,
    prix_unitaire_sujet: initialCount > 0 ? Math.round(purchaseCost / initialCount) : unitCost,
    besoin_aliment_previsionnel_kg: feedNeedKg,
    feed_need_kg: feedNeedKg,
    date_debut: startDate,
    date_entree: lot.date_entree || startDate,
    date_fin_prevue: saleDate,
    date_objectif_vente: saleDate,
    duree_cycle_valeur: cycleDays,
    duree_cycle_unite: 'jours',
    poids_objectif: targetWeight,
    calendrier_vaccination: vaccinationDates,
    calendrier_pesee: weighingDates,
    reporting_lot_ready: missing.length === 0,
    marge_previsionnelle: expectedMargin,
    batiment_capacity_reserved: Boolean(buildingId),
    batiment_capacity_reserved_at: startDate,
    broiler_start_status: blockingReasons.length ? 'bloque' : 'valide',
    objective_impact: {
      expected_sale_date: saleDate,
      expected_margin: expectedMargin,
      feed_need_kg: feedNeedKg,
      target_weight_kg: targetWeight,
    },
    source_module: lot.source_module || 'avicole',
    issue_key: issueKey,
  };

  const taskBase = {
    module_lie: 'avicole',
    source_module: 'avicole',
    source_record_id: lotId,
    related_id: lotId,
    status: 'a_faire',
  };
  const tasks = [
    {
      id: makeId('TSK'),
      ...taskBase,
      title: `Démarrer lot chair ${lot.name || lot.nom || lotId}`,
      due_date: startDate,
      priority: missing.length ? 'haute' : 'moyenne',
      task_dedupe_key: `${issueKey}:demarrage`,
      checklist: 'Confirmer bâtiment; Confirmer fournisseur; Vérifier eau/chauffage; Démarrer suivi alimentation; Programmer vaccins et pesées',
    },
    ...vaccinationDates.map((item) => ({
      id: makeId('TSK'),
      ...taskBase,
      title: item.label,
      due_date: item.due,
      priority: 'haute',
      task_dedupe_key: `${issueKey}:vaccin:${item.due}`,
      checklist: 'Préparer vaccin; Enregistrer soin; Joindre preuve si disponible',
    })),
    ...weighingDates.map((item) => ({
      id: makeId('TSK'),
      ...taskBase,
      title: item.label,
      due_date: item.due,
      priority: 'moyenne',
      task_dedupe_key: `${issueKey}:pesee:${item.due}`,
      checklist: 'Peser échantillon; Enregistrer GMQ; Comparer objectif',
    })),
  ];

  const financeTransaction = purchaseCost > 0 ? {
    id: makeId('TRX'),
    type: 'sortie',
    transaction_type: 'sortie',
    libelle: `Démarrage lot chair ${lot.name || lotId}`,
    montant: purchaseCost,
    amount: purchaseCost,
    date: startDate,
    categorie: 'Cheptel avicole',
    module_lie: 'avicole',
    related_id: lotId,
    source_module: 'avicole',
    source_record_id: lotId,
    fournisseur_id: supplierId,
    statut: 'paye',
    status: 'paye',
    cash_effect: true,
  } : null;

  return {
    lot: lotPayload,
    tasks,
    financeTransaction,
    blocked: blockingReasons.length > 0,
    blockingReasons,
    alert: missing.length || blockingReasons.length ? {
      id: makeId('ALT'),
      title: blockingReasons.length ? `Démarrage lot chair bloqué: ${lot.name || lotId}` : `Lot chair incomplet: ${lot.name || lotId}`,
      message: blockingReasons.length ? blockingReasons.join(', ') : `Données à compléter: ${missing.join(', ')}`,
      module_source: 'avicole',
      entity_type: 'lot_avicole',
      entity_id: lotId,
      severity: blockingReasons.length ? 'haute' : 'warning',
      status: 'nouvelle',
      alert_dedupe_key: `${issueKey}:${blockingReasons.length ? 'blocked' : 'missing'}`,
    } : null,
    capacityPatch: buildingId ? {
      id: buildingId,
      lot_actif_id: lotId,
      reserved_lot_id: lotId,
      capacity_status: 'occupe',
      capacity_reserved_at: startDate,
    } : null,
    event: {
      id: makeId('EVT'),
      event_type: 'broiler_lot_start',
      type_evenement: 'broiler_lot_start',
      module_source: 'avicole',
      entity_type: 'lot_avicole',
      entity_id: lotId,
      title: `Démarrage lot chair · ${lot.name || lotId}`,
      description: `${initialCount} sujet(s) · besoin aliment ${feedNeedKg} kg · vente estimée ${saleDate}`,
      event_date: startDate,
      severity: missing.length || blockingReasons.length ? 'warning' : 'info',
      amount: purchaseCost,
      linked_task_count: tasks.length,
      issue_key: issueKey,
      blocking_reasons: blockingReasons,
      saisies_evitees: 8,
    },
    reporting: {
      lot_id: lotId,
      effectif_initial: initialCount,
      batiment_id: buildingId,
      fournisseur_id: supplierId,
      cout_initial: purchaseCost,
      besoin_aliment_previsionnel_kg: feedNeedKg,
      date_vente_estimee: saleDate,
      marge_previsionnelle: expectedMargin,
      capacity_reserved: Boolean(buildingId),
      objectives_impact: lotPayload.objective_impact,
      missing_fields: missing,
      blocking_reasons: blockingReasons,
    },
  };
}

export function tabletsFromEggs(eggCount = 0) {
  const sellable = Math.max(0, num(eggCount));
  return {
    tablettes: Math.floor(sellable / EGGS_PER_TABLET),
    oeufs_restants: sellable % EGGS_PER_TABLET,
  };
}

export function findEggStockRow(stocks = []) {
  return arr(stocks).find((row) => /oeuf|œuf|tablette|plateau/i.test(`${row.produit || row.nom || ''} ${row.categorie || ''}`));
}

export function validateElevageFeedingForm(form = {}) {
  const qty = num(form.quantite);
  if (qty <= 0) return 'Quantité aliment obligatoire.';
  if (!clean(form.stock_id)) return 'Produit aliment (stock) obligatoire.';
  if (!clean(form.lot_id) && !clean(form.animal_id) && !clean(form.cible_id)) {
    return 'Lot ou animal cible obligatoire pour lier la rentabilité.';
  }
  return '';
}

export function validateElevageHealthForm(form = {}) {
  if (!clean(form.nom) && !clean(form.type_soin) && !clean(form.vaccin)) return 'Intitulé du soin obligatoire.';
  if (!clean(form.lot_id) && !clean(form.animal_id) && !clean(form.target_id)) return 'Cible lot ou animal obligatoire.';
  const productQty = num(form.quantite_stock);
  if (clean(form.stock_id) && productQty <= 0) return 'Quantité produit sanitaire obligatoire si stock renseigné.';
  return '';
}

export function validateElevageMortalityForm(form = {}) {
  const qty = num(form.quantite ?? form.count);
  if (qty <= 0) return 'Nombre de mortalités obligatoire.';
  if (!clean(form.lot_id) && !clean(form.animal_id)) return 'Lot ou animal obligatoire.';
  return '';
}

export function validateElevageEggForm(form = {}) {
  const eggs = num(form.oeufs_produits ?? form.eggs_count);
  if (eggs <= 0) return 'Production œufs obligatoire.';
  if (!clean(form.lot_id)) return 'Lot pondeuse obligatoire.';
  const broken = num(form.oeufs_casses);
  if (broken > eggs) return 'Casses ne peuvent pas dépasser la production.';
  return '';
}

export function validateElevageWeighingForm(form = {}) {
  const weight = num(form.poids ?? form.weight);
  if (weight <= 0) return 'Poids obligatoire.';
  if (!clean(form.lot_id) && !clean(form.animal_id)) return 'Lot ou animal obligatoire.';
  return '';
}

function feedingTargetId(form = {}) {
  return clean(form.lot_id) || clean(form.animal_id) || clean(form.cible_id);
}

function accumulateLotFeedCost(lot = {}, amount = 0) {
  const prev = num(lot.cout_aliment ?? lot.feed_cost);
  return { cout_aliment: prev + amount, feed_cost: prev + amount };
}

function accumulateAnimalFeedCost(animal = {}, amount = 0) {
  const prev = num(animal.cout_alimentation ?? animal.feed_cost);
  return { cout_alimentation: prev + amount, feed_cost: prev + amount };
}

function accumulateLotHealthCost(lot = {}, amount = 0) {
  const prev = num(lot.cout_vaccins ?? lot.cout_sante ?? lot.health_cost);
  return { cout_vaccins: prev + amount, cout_sante: prev + amount, health_cost: prev + amount };
}

function accumulateAnimalHealthCost(animal = {}, amount = 0) {
  const prev = num(animal.cout_sante ?? animal.health_cost);
  return { cout_sante: prev + amount, health_cost: prev + amount };
}

const openStatus = (row = {}) =>
  !['termine', 'terminé', 'done', 'traitee', 'traitée', 'annule', 'annulé', 'closed', 'resolue', 'résolue'].includes(lower(row.status || row.statut));

function mortalityRateOf(lot = {}) {
  const initial = avicoleInitialCount(lot);
  const dead = avicoleDeadCount(lot);
  return initial > 0 ? (dead / initial) * 100 : 0;
}

export function buildMortalityAlert({ lot = {}, rate = 0, thresholds = null } = {}) {
  const lotId = clean(lot.id);
  const resolved = thresholds || resolveElevageThresholds();
  const severity = mortalityAlertSeverity(rate, resolved);
  if (!lotId || !severity) return null;
  const key = buildElevageIssueKey(ELEVAGE_DOMAINS.MORTALITY, lotId, 'seuil');
  return {
    id: makeId('ALT'),
    title: `Mortalité élevée - ${lot.name || lot.nom || lotId}`,
    message: `Taux ${rate.toFixed(1)}% (seuil alerte ${resolved.mortalityAlertPct}%).`,
    module_source: 'elevage',
    entity_type: 'lot_avicole',
    entity_id: lotId,
    severity,
    status: 'nouvelle',
    alert_dedupe_key: key,
    issue_key: key,
    action_recommandee: 'Contrôle sanitaire et biosécurité',
    side_effects_managed: true,
  };
}

export function buildVaccineReminderTask({ health = {} } = {}) {
  const due = clean(health.date_rappel || health.prochaine_date || health.next_due);
  if (!due) return null;
  const healthId = clean(health.id);
  const key = buildElevageIssueKey(ELEVAGE_DOMAINS.HEALTH, healthId, 'rappel');
  return {
    id: makeId('TSK'),
    title: `Rappel vaccin/soin · ${health.nom || healthId}`,
    module_lie: 'sante',
    related_id: healthId,
    source_module: 'elevage',
    source_record_id: healthId,
    due_date: due,
    priority: 'normale',
    status: 'a_faire',
    task_dedupe_key: key,
    issue_key: key,
    side_effects_managed: true,
  };
}

export function buildSanitaryWithdrawalAlert({ health = {}, animal = null, lot = null } = {}) {
  const until = clean(health.delai_sanitaire_fin || health.withdrawal_until);
  if (!until) return null;
  const targetId = clean(health.animal_id || animal?.id || health.lot_id || lot?.id);
  const key = buildElevageIssueKey(ELEVAGE_DOMAINS.HEALTH, targetId, 'delai');
  return {
    id: makeId('ALT'),
    title: 'Délai sanitaire en cours',
    message: `Traitement actif jusqu'au ${until}. Vente interdite si non levé.`,
    module_source: 'elevage',
    entity_type: health.animal_id ? 'animal' : 'lot_avicole',
    entity_id: targetId,
    severity: 'warning',
    status: 'nouvelle',
    alert_dedupe_key: key,
    issue_key: key,
    side_effects_managed: true,
  };
}

/**
 * Alimentation depuis Élevage > Alimentation.
 */
export async function commitElevageFeeding({ form = {}, context = {}, handlers = {} } = {}) {
  const err = validateElevageFeedingForm(form);
  if (err) throw new Error(err);

  const stock = arr(context.stocks).find((row) => clean(row.id) === clean(form.stock_id));
  const qty = num(form.quantite);
  if (stock && qty > stockQuantity(stock)) {
    throw new Error(`Stock insuffisant (${stockQuantity(stock)} ${stock.unite || ''})`);
  }

  const amount = num(form.montant_total) || (stock ? qty * stockUnitPrice(stock) : 0);
  const farmId = resolveElevageLogFarmId({ form, context });
  const identity = resolveDailyEntryIdentity(DAILY_ENTRY_TYPES.FEEDING, form, {
    farmId,
    recordId: feedingTargetId(form),
  });
  const replay = findDailyEntryReplay([
    ...arr(context.alimentationLogs),
    ...arr(context.businessEvents),
  ], identity.eventKey);
  if (replay) return { ok: true, replayed: true, eventKey: identity.eventKey, qty, amount };

  const logId = clean(form.id) || dailyEntryRecordId('ALIM', identity);
  const issueKey = identity.eventKey;
  const log = stampElevageLogFarmId(attachDailyEntryMeta({
    ...form,
    id: logId,
    date: form.date || today(),
    montant_total: amount,
    source_module: 'elevage',
    source_record_id: feedingTargetId(form),
    issue_key: issueKey,
    side_effects_managed: true,
    created_from: 'elevage_workflow',
  }, identity, form.recorded_by || context.userId), farmId);

  const preview = prepareFeedingWorkflow(log, { transactions: context.transactions, events: context.businessEvents });
  preview.records.alimentation = log;
  if (preview.records.trace) {
    preview.records.trace = {
      ...preview.records.trace,
      module_source: 'elevage',
      issue_key: issueKey,
      entity_id: feedingTargetId(form),
    };
  }

  let newStockQty = stock ? stockQuantity(stock) : null;
  await commitFeedingWorkflow(preview, {
    context,
    ...handlers,
    onCreateAlimentation: async (row) => {
      await handlers.onCreateAlimentation?.({ ...row, issue_key: issueKey });
    },
    onUpdateStockMovement: stock
      ? async () => {
          const movement = applyStockMovement(stock, { type: 'sortie', qty, motif: log.notes || 'Alimentation élevage', date: log.date });
          await handlers.onUpdateStock?.(stock.id, movement.stock);
          if (handlers.onCreateBusinessEvent && movement.event) {
            const stockEventIdentity = { ...identity, eventKey: `${identity.eventKey}:stock` };
            await handlers.onCreateBusinessEvent(attachDailyEntryMeta({
              ...movement.event,
              id: dailyEntryRecordId('EVT-Q', stockEventIdentity),
              issue_key: stockEventIdentity.eventKey,
              module_source: 'elevage',
            }, stockEventIdentity, form.recorded_by || context.userId));
          }
          const nextQty = stockQuantity(movement.stock);
          if (isStockCritical(movement.stock, nextQty)) {
            const followUp = buildStockCriticalFollowUp(movement.stock, nextQty);
            if (followUp?.alert && !arr(context.alertes).some((a) => openStatus(a) && clean(a.alert_dedupe_key) === followUp.key)) {
              if (!hasOpenStockReorderTask(movement.stock, context.tasks)) {
                const alertKey = `${identity.eventKey}:stock-low-alert`;
                const taskKey = `${identity.eventKey}:stock-low-task`;
                await handlers.onCreateAlert?.({ ...followUp.alert, id: dailyEntryRecordId('ALT-Q', { ...identity, eventKey: alertKey }), issue_key: alertKey, alert_dedupe_key: alertKey });
                await handlers.onCreateTask?.({ ...followUp.task, id: dailyEntryRecordId('TSK-Q', { ...identity, eventKey: taskKey }), issue_key: taskKey, task_dedupe_key: taskKey });
              }
            }
          }
          newStockQty = nextQty;
        }
      : handlers.onUpdateStockMovement,
    onCreateBusinessEvent: async (evt) => {
      const childEventKey = evt?.event_type === 'alimentation'
        ? identity.eventKey
        : `${identity.eventKey}:${clean(evt?.event_type || 'event')}`;
      const childIdentity = { ...identity, eventKey: childEventKey };
      await handlers.onCreateBusinessEvent?.(attachDailyEntryMeta({
        ...evt,
        id: dailyEntryRecordId('EVT-Q', childIdentity),
        module_source: 'elevage',
        issue_key: issueKey,
        event_type: evt?.event_type || 'alimentation',
      }, childIdentity, form.recorded_by || context.userId));
    },
  });

  if (clean(form.lot_id) && handlers.onUpdateLot) {
    const lot = arr(context.lots).find((row) => clean(row.id) === clean(form.lot_id));
    if (lot) await handlers.onUpdateLot(lot.id, accumulateLotFeedCost(lot, amount));
  }
  if (clean(form.animal_id) && handlers.onUpdateAnimal) {
    const animal = arr(context.animaux).find((row) => clean(row.id) === clean(form.animal_id));
    if (animal) await handlers.onUpdateAnimal(animal.id, accumulateAnimalFeedCost(animal, amount));
  }

  return { ok: true, logId, issueKey, eventKey: identity.eventKey, amount, qty, unit: stock?.unite || form.unite || 'kg', newStockQty };
}

/**
 * Santé depuis Élevage > Santé (enrichit commitHealthWorkflow).
 */
export async function commitElevageHealth({ form = {}, context = {}, handlers = {} } = {}) {
  const err = validateElevageHealthForm(form);
  if (err) throw new Error(err);

  const healthId = clean(form.id) || makeId('VAC');
  const issueKey = buildElevageIssueKey(ELEVAGE_DOMAINS.HEALTH, healthId);
  const cost = num(form.cout ?? form.montant);
  const farmId = resolveElevageLogFarmId({ form, context });
  const health = stampElevageLogFarmId({
    ...form,
    id: healthId,
    nom: form.nom || form.type_soin || form.vaccin || 'Soin',
    date: form.date || today(),
    statut: form.statut || 'fait',
    effectuee: form.effectuee || today(),
    source_module: 'elevage',
    issue_key: issueKey,
    side_effects_managed: true,
  }, farmId);

  const preview = prepareHealthWorkflow(health, { transactions: context.transactions, tasks: context.tasks });
  preview.records.health_patch = health;
  if (preview.records.finance) {
    preview.records.finance = { ...preview.records.finance, issue_key: issueKey, id: financeIds.health(healthId) };
  }

  if (handlers.onCreateHealth) {
    await handlers.onCreateHealth(health);
  }

  await commitHealthWorkflow(preview, {
    context,
    showImpactToast: false,
    ...handlers,
    onUpdateHealth: async (id, patch) => {
      await handlers.onUpdateHealth?.(id, { ...health, ...patch });
    },
    onCreateBusinessEvent: async (evt) => {
      await handlers.onCreateBusinessEvent?.({ ...evt, issue_key: issueKey, module_source: 'elevage' });
    },
  });

  const reminder = buildVaccineReminderTask({ health });
  if (reminder && handlers.onCreateTask) {
    const exists = arr(context.tasks).some((t) => openStatus(t) && clean(t.task_dedupe_key) === reminder.task_dedupe_key);
    if (!exists) await handlers.onCreateTask(reminder);
  }

  const sanitary = buildSanitaryWithdrawalAlert({
    health,
    animal: arr(context.animaux).find((a) => clean(a.id) === clean(health.animal_id)),
    lot: arr(context.lots).find((l) => clean(l.id) === clean(health.lot_id)),
  });
  if (sanitary && handlers.onCreateAlert) {
    const exists = arr(context.alertes).some((a) => openStatus(a) && clean(a.alert_dedupe_key) === sanitary.alert_dedupe_key);
    if (!exists) await handlers.onCreateAlert(sanitary);
  }

  if ((form.facture_url || form.ordonnance_url || form.preuve_document) && handlers.onCreateDocument) {
    const doc = buildHealthProofDocument({ health });
    if (doc) await handlers.onCreateDocument({ ...doc, file_url: form.facture_url || form.ordonnance_url || form.preuve_document, issue_key: issueKey });
  }

  if (clean(form.stock_id) && num(form.quantite_stock) > 0 && handlers.onUpdateStock) {
    const stock = arr(context.stocks).find((row) => clean(row.id) === clean(form.stock_id));
    const qtyUsed = num(form.quantite_stock);
    if (stock) {
      const beforeQty = num(stock.quantite ?? stock.quantity);
      const movement = applyStockMovement(stock, { type: 'sortie', qty: qtyUsed, motif: `Soin ${health.nom}`, date: health.date });
      const afterQty = num(movement.stock?.quantite ?? movement.stock?.quantity ?? (beforeQty - qtyUsed));
      await handlers.onUpdateStock(stock.id, movement.stock);
      await runHealthStockConsumptionSideEffects({
        healthRecord: { ...health, stock_id: form.stock_id, quantite_utilisee: qtyUsed, product_source: 'stock' },
        stock,
        qty: qtyUsed,
        beforeQty,
        afterQty,
        handlers: {
          onCreateStockMovement: handlers.onCreateStockMovement,
          onRefreshStockMovements: handlers.onRefreshStockMovements,
          existingStockMovements: handlers.existingStockMovements || arr(context.stockMovements),
        },
      });
    }
  } else if (!clean(form.stock_id) && num(form.quantite_stock) > 0) {
    // écart documenté : produit déclaré sans stock_id
  }

  if (clean(form.lot_id) && handlers.onUpdateLot) {
    const lot = arr(context.lots).find((row) => clean(row.id) === clean(form.lot_id));
    if (lot) await handlers.onUpdateLot(lot.id, accumulateLotHealthCost(lot, cost));
  }
  if (clean(form.animal_id) && handlers.onUpdateAnimal) {
    const animal = arr(context.animaux).find((row) => clean(row.id) === clean(form.animal_id));
    if (animal) await handlers.onUpdateAnimal(animal.id, accumulateAnimalHealthCost(animal, cost));
  }

  return { ok: true, healthId, issueKey, cost };
}

/**
 * Mortalité lot (Santé ou Transformation).
 */
export async function commitElevageMortality({ form = {}, context = {}, handlers = {} } = {}) {
  const err = validateElevageMortalityForm(form);
  if (err) throw new Error(err);

  const qty = num(form.quantite ?? form.count);
  const date = form.date || today();
  const lotId = clean(form.lot_id);
  const animalId = clean(form.animal_id);
  const farmId = resolveElevageLogFarmId({ form, context });
  const identity = resolveDailyEntryIdentity(DAILY_ENTRY_TYPES.MORTALITY, form, {
    farmId,
    recordId: lotId || animalId,
  });
  const replay = findDailyEntryReplay([
    ...arr(context.mortalityRecords),
    ...arr(context.businessEvents),
  ], identity.eventKey);
  if (replay) return { ok: true, replayed: true, eventKey: identity.eventKey, qty };

  const issueKey = identity.eventKey;

  let lotAfter = null;
  if (lotId && handlers.onUpdateLot) {
    const lot = arr(context.lots).find((row) => clean(row.id) === lotId);
    if (!lot) throw new Error('Lot introuvable');
    const prevDead = avicoleDeadCount(lot);
    const newDead = prevDead + qty;
    const prevActive = avicoleActiveCount(lot);
    const nextActive = Math.max(0, prevActive - qty);
    const patch = {
      mortality: newDead,
      morts: newDead,
      current_count: nextActive,
      effectif_actuel: nextActive,
      last_event_date: date,
      last_health_note: form.notes || form.motif || '',
      status: nextActive === 0 ? 'perdu_mortalite' : (lot.status || 'actif'),
      statut: nextActive === 0 ? 'perdu_mortalite' : (lot.statut || 'actif'),
    };
    const lossUnit = num(lot.prix_unitaire_sujet ?? lot.unit_cost ?? lot.cout_unitaire_poussin);
    const economicLoss = num(form.valeur_perte) || qty * lossUnit;
    if (economicLoss > 0) {
      patch.valeur_perte_estimee = num(lot.valeur_perte_estimee) + economicLoss;
      patch.perte_estimee = patch.valeur_perte_estimee;
    }
    await handlers.onUpdateLot(lotId, patch);
    lotAfter = { ...lot, ...patch };
    const rate = mortalityRateOf(lotAfter);
    const alert = buildMortalityAlert({ lot: lotAfter, rate });
    if (alert && handlers.onCreateAlert) {
      const exists = arr(context.alertes).some((a) => openStatus(a) && clean(a.alert_dedupe_key) === alert.alert_dedupe_key);
      if (!exists) await handlers.onCreateAlert({ ...alert, id: dailyEntryRecordId('ALT-Q', { ...identity, eventKey: `${identity.eventKey}:mortality-alert` }) });
    }
    if (economicLoss > 0 && handlers.onCreateFinanceTransaction) {
      const financeRow = {
        id: dailyEntryRecordId('TRX-MORT', { ...identity, eventKey: `${identity.eventKey}:loss` }),
        type: 'sortie',
        libelle: `Perte mortalité ${lot.name || lotId}`,
        montant: economicLoss,
        amount: economicLoss,
        date,
        categorie: 'Pertes',
        activite: 'avicole',
        module_lie: 'elevage',
        source_module: 'elevage',
        source_record_id: lotId,
        issue_key: issueKey,
        event_key: `${identity.eventKey}:loss`,
        farm_id: farmId || lot.farm_id || null,
        cash_effect: false,
        source_type: 'perte_technique',
        recorded_by: form.recorded_by || context.userId || 'system',
        idempotency_key: `${identity.eventKey}:loss`,
        side_effects_managed: true,
      };
      const exists = arr(context.transactions).some((t) => clean(t.id) === financeRow.id);
      if (!exists) await handlers.onCreateFinanceTransaction(financeRow);
    }
  }

  if (animalId && handlers.onUpdateAnimal) {
    const animal = arr(context.animaux).find((row) => clean(row.id) === animalId);
    if (!animal) throw new Error('Animal introuvable');
    const purchaseCost = num(animal.cout_achat ?? animal.purchase_cost ?? animal.prix_achat ?? animal.cout_acquisition);
    const economicLoss = num(form.valeur_perte) || purchaseCost;
    await handlers.onUpdateAnimal(animalId, {
      status: 'mort',
      statut: 'mort',
      date_sortie: date,
      date_deces: date,
      cause_deces: form.notes || form.motif || form.cause || '',
      notes: form.notes || form.motif || '',
      perte_estimee: economicLoss > 0 ? economicLoss : undefined,
    });
    if (handlers.onCreateAlert && qty >= 1) {
      const alertKey = buildElevageIssueKey(ELEVAGE_DOMAINS.MORTALITY, animalId, 'animal');
      const exists = arr(context.alertes).some((a) => openStatus(a) && clean(a.alert_dedupe_key) === alertKey);
      if (!exists) {
        await handlers.onCreateAlert({
          id: dailyEntryRecordId('ALT-Q', { ...identity, eventKey: `${identity.eventKey}:animal-alert` }),
          title: `Mortalité animal - ${animal.nom || animal.name || animalId}`,
          message: form.notes || form.motif || 'Animal déclaré mort.',
          module_source: 'elevage',
          entity_type: 'animal',
          entity_id: animalId,
          severity: 'warning',
          status: 'nouvelle',
          alert_dedupe_key: alertKey,
          issue_key: alertKey,
          side_effects_managed: true,
        });
      }
    }
    if (economicLoss > 0 && handlers.onCreateFinanceTransaction) {
      const financeRow = {
        id: dailyEntryRecordId('TRX-MORT-ANI', { ...identity, eventKey: `${identity.eventKey}:loss` }),
        type: 'sortie',
        libelle: `Perte mortalité ${animal.nom || animal.name || animalId}`,
        montant: economicLoss,
        amount: economicLoss,
        date,
        categorie: 'Pertes',
        activite: 'animaux',
        module_lie: 'elevage',
        source_module: 'elevage',
        source_record_id: animalId,
        issue_key: issueKey,
        event_key: `${identity.eventKey}:loss`,
        farm_id: farmId || animal.farm_id || null,
        cash_effect: false,
        source_type: 'perte_technique',
        recorded_by: form.recorded_by || context.userId || 'system',
        idempotency_key: `${identity.eventKey}:loss`,
        side_effects_managed: true,
      };
      const exists = arr(context.transactions).some((t) => clean(t.id) === financeRow.id);
      if (!exists) await handlers.onCreateFinanceTransaction(financeRow);
    }
  }

  let financialGap = null;
  if (animalId && !lotId) {
    const animal = arr(context.animaux).find((row) => clean(row.id) === animalId);
    const purchaseCost = num(animal?.cout_achat ?? animal?.purchase_cost ?? animal?.prix_achat);
    if (!num(form.valeur_perte) && purchaseCost <= 0) financialGap = ANIMAL_LOSS_NOT_CALCULABLE;
  }

  await handlers.onCreateBusinessEvent?.(attachDailyEntryMeta({
    id: identity.eventId,
    event_type: 'mortalite',
    module_source: 'elevage',
    entity_type: lotId ? 'lot_avicole' : 'animal',
    entity_id: lotId || animalId,
    title: `Mortalité · ${qty} tête(s)`,
    description: form.notes || form.motif || '',
    event_date: date,
    severity: 'warning',
    quantity: qty,
    issue_key: issueKey,
    side_effects_managed: true,
  }, identity, form.recorded_by || context.userId));

  return {
    ok: true,
    issueKey,
    eventKey: identity.eventKey,
    qty,
    lotAfter,
    activeCount: lotAfter ? avicoleActiveCount(lotAfter) : (animalId ? 0 : null),
    financialGap,
  };
}

/**
 * Production œufs depuis Élevage > Production.
 */
export async function commitElevageEggProduction({ form = {}, context = {}, handlers = {} } = {}) {
  const err = validateElevageEggForm(form);
  if (err) throw new Error(err);

  const eggs = num(form.oeufs_produits);
  const broken = num(form.oeufs_casses);
  const sellable = Math.max(0, eggs - broken);
  const tablet = tabletsFromEggs(sellable);
  const farmId = resolveElevageLogFarmId({ form, context });
  const identity = resolveDailyEntryIdentity(DAILY_ENTRY_TYPES.EGGS, form, {
    farmId,
    recordId: form.lot_id,
  });
  const replay = findDailyEntryReplay([
    ...arr(context.productionLogs),
    ...arr(context.businessEvents),
  ], identity.eventKey);
  if (replay) return { ok: true, replayed: true, eventKey: identity.eventKey, sellable, tablet };

  const logId = clean(form.id) || dailyEntryRecordId('PROD', identity);
  const issueKey = identity.eventKey;
  const thresholds = resolveElevageThresholds(context.farmSettings);
  const laying = computeOfficialLayingRate({
    eggsProduced: eggs,
    activeLayers: avicoleActiveCount(arr(context.lots).find((l) => clean(l.id) === clean(form.lot_id)) || {}),
  });

  const log = stampElevageLogFarmId(attachDailyEntryMeta({
    ...form,
    id: logId,
    date: form.date || today(),
    oeufs_produits: eggs,
    oeufs_casses: broken,
    oeufs_vendables: sellable,
    tablettes: tablet.tablettes,
    tablettes_vendables: tablet.tablettes,
    oeufs_restants: tablet.oeufs_restants,
    oeufs_par_tablette: EGGS_PER_TABLET,
    source_module: 'elevage',
    issue_key: issueKey,
    side_effects_managed: true,
    ...(laying.calculable ? { taux_ponte: laying.rate, taux_ponte_calcule: laying.rate } : {}),
  }, identity, form.recorded_by || context.userId), farmId);

  const packagingStockId = clean(form.packaging_stock_id);
  const packagingQty = num(form.packaging_qty) > 0 ? num(form.packaging_qty) : (tablet.tablettes > 0 ? tablet.tablettes : 0);
  if (packagingStockId) log.packaging_stock_id = packagingStockId;
  if (packagingQty > 0) log.packaging_qty = packagingQty;

  await handlers.onCreateProduction?.(log);

  let stockGap = null;
  let newStockQty = null;
  const eggStock = findEggStockRow(context.stocks);
  if (eggStock && sellable > 0 && handlers.onUpdateStock) {
    const beforeQty = num(eggStock.quantite ?? eggStock.quantity);
    const movement = applyStockMovement(eggStock, {
      type: 'entree',
      qty: sellable,
      motif: `Production lot ${form.lot_id}`,
      date: log.date,
    });
    const afterQty = num(movement.stock?.quantite ?? movement.stock?.quantity ?? (beforeQty + sellable));
    newStockQty = afterQty;
    await handlers.onUpdateStock(eggStock.id, { ...movement.stock, disponible_commercial: true });
    if (handlers.onCreateStockMovement) {
      const payload = buildEggProductionStockMovementPayload({
        log,
        stock: eggStock,
        sellableEggs: sellable,
        beforeQty,
        afterQty,
        farmId: farmId || eggStock.farm_id,
      });
      if (payload) {
        await persistConsumptionMovement({
          before: { id: eggStock.id, quantite: beforeQty },
          after: { id: eggStock.id, quantite: afterQty, unite: eggStock.unite || eggStock.unit, farm_id: payload.farm_id },
          patch: {
            source_module: payload.source_module,
            source_record_id: payload.source_record_id,
            movement_ref: payload.movement_ref,
            dedupe_key: payload.dedupe_key,
            notes: payload.notes,
          },
          payload,
          handlers: {
            onCreateStockMovement: handlers.onCreateStockMovement,
            onRefreshStockMovements: handlers.onRefreshStockMovements,
            existingStockMovements: handlers.existingStockMovements || arr(context.stockMovements),
          },
          existingMovements: handlers.existingStockMovements || arr(context.stockMovements),
        });
      }
    }
    if (handlers.onCreateBusinessEvent && movement.event) {
      const stockEventIdentity = { ...identity, eventKey: `${identity.eventKey}:stock` };
      await handlers.onCreateBusinessEvent(attachDailyEntryMeta({
        ...movement.event,
        id: dailyEntryRecordId('EVT-Q', stockEventIdentity),
        event_type: 'entree_stock_oeufs',
        issue_key: stockEventIdentity.eventKey,
        module_source: 'elevage',
        farm_id: farmId,
      }, stockEventIdentity, form.recorded_by || context.userId));
    }
  } else if (sellable > 0 && !eggStock) {
    stockGap = EGG_STOCK_GAP_MESSAGE;
    log.stock_gap_noted = true;
  }

  let packagingGap = null;
  if (packagingQty > 0 && packagingStockId && handlers.onUpdateStock) {
    const packagingStock = arr(context.stocks).find((row) => clean(row.id) === packagingStockId);
    if (packagingStock) {
      const beforePkg = num(packagingStock.quantite ?? packagingStock.quantity);
      const pkgMovement = applyStockMovement(packagingStock, {
        type: 'sortie',
        qty: packagingQty,
        motif: `Emballage ramassage ${form.lot_id}`,
        date: log.date,
      });
      const afterPkg = num(pkgMovement.stock?.quantite ?? pkgMovement.stock?.quantity ?? (beforePkg - packagingQty));
      await handlers.onUpdateStock(packagingStock.id, pkgMovement.stock);
      if (handlers.onCreateStockMovement) {
        const payload = buildEggPackagingConsumptionPayload({
          log,
          stock: packagingStock,
          qty: packagingQty,
          beforeQty: beforePkg,
          afterQty: afterPkg,
          farmId: packagingStock.farm_id || log.farm_id,
        });
        if (payload) {
          await persistConsumptionMovement({
            before: { id: packagingStock.id, quantite: beforePkg },
            after: { id: packagingStock.id, quantite: afterPkg, unite: packagingStock.unite || packagingStock.unit, farm_id: payload.farm_id },
            patch: {
              source_module: payload.source_module,
              source_record_id: payload.source_record_id,
              movement_ref: payload.movement_ref,
              dedupe_key: payload.dedupe_key,
              notes: payload.notes,
            },
            payload,
            handlers: {
              onCreateStockMovement: handlers.onCreateStockMovement,
              onRefreshStockMovements: handlers.onRefreshStockMovements,
              existingStockMovements: handlers.existingStockMovements || arr(context.stockMovements),
            },
            existingMovements: handlers.existingStockMovements || arr(context.stockMovements),
          });
        }
      }
    }
  } else if (packagingQty > 0 && !packagingStockId) {
    packagingGap = EGG_PACKAGING_GAP_MESSAGE;
    log.packaging_gap_noted = true;
  }

  const brokenRate = eggs > 0 ? (broken / eggs) * 100 : 0;
  await handlers.onCreateBusinessEvent?.(attachDailyEntryMeta({
    id: identity.eventId,
    event_type: 'production_oeufs',
    module_source: 'elevage',
    entity_type: 'lot_avicole',
    entity_id: form.lot_id,
    title: `Ramassage ${sellable} œufs`,
    description: `${tablet.tablettes} tablette(s), ${tablet.oeufs_restants} reliquat`,
    event_date: log.date,
    severity: brokenRate >= thresholds.eggBreakAlertPct ? 'warning' : 'info',
    issue_key: issueKey,
    farm_id: farmId,
    side_effects_managed: true,
  }, identity, form.recorded_by || context.userId));

  return {
    ok: true,
    logId,
    issueKey,
    eventKey: identity.eventKey,
    sellable,
    tablet,
    layingRate: laying.calculable ? laying.rate : null,
    newStockQty,
    packagingGap,
    stockGap,
  };
}

/**
 * Transformation / abattage / réforme.
 */
export async function commitElevageTransformation({ form = {}, context = {}, handlers = {} } = {}) {
  const lotId = clean(form.lot_id);
  const animalId = clean(form.animal_id);
  if (!lotId && !animalId) throw new Error('Lot ou animal obligatoire.');

  const date = form.date || today();
  const kind = lower(form.kind || form.type || 'reforme');
  const issueKey = buildElevageIssueKey(ELEVAGE_DOMAINS.TRANSFORM, lotId || animalId, kind);
  const qty = num(form.quantite ?? form.count) || avicoleActiveCount(arr(context.lots).find((l) => clean(l.id) === lotId) || {});

  if (lotId && handlers.onUpdateLot) {
    const lot = arr(context.lots).find((row) => clean(row.id) === lotId);
    if (!lot) throw new Error('Lot introuvable');
    const nextActive = Math.max(0, avicoleActiveCount(lot) - qty);
    const statusMap = {
      abattage: 'abattu',
      reforme: 'reforme',
      vente: 'pret_vente',
      pret_vente: 'pret_vente',
    };
    const status = statusMap[kind] || form.statut || 'pret_vente';
    await handlers.onUpdateLot(lotId, {
      current_count: kind === 'pret_vente' ? avicoleActiveCount(lot) : nextActive,
      effectif_actuel: kind === 'pret_vente' ? avicoleActiveCount(lot) : nextActive,
      status,
      statut: status,
      date_sortie: date,
      last_event_date: date,
    });
  }

  if (animalId && handlers.onUpdateAnimal) {
    await handlers.onUpdateAnimal(animalId, {
      status: kind === 'abattage' ? 'abattu' : form.statut || 'pret_vente',
      statut: kind === 'abattage' ? 'abattu' : form.statut || 'pret_vente',
      date_sortie: date,
    });
  }

  const stockQty = num(form.stock_qty ?? form.quantite_stock);
  if (clean(form.stock_id) && stockQty > 0 && handlers.onUpdateStock) {
    const stock = arr(context.stocks).find((row) => clean(row.id) === clean(form.stock_id));
    if (stock) {
      const movement = applyStockMovement(stock, { type: 'entree', qty: stockQty, motif: `Transformation ${kind}`, date });
      await handlers.onUpdateStock(stock.id, movement.stock);
    }
  }

  if ((form.document_url || form.certificat_sanitaire) && handlers.onCreateDocument) {
    await handlers.onCreateDocument({
      id: makeId('DOC'),
      title: `Document sanitaire ${kind}`,
      document_category: 'sanitaire',
      module_source: 'elevage',
      entity_id: lotId || animalId,
      file_url: form.document_url || form.certificat_sanitaire,
      issue_key: issueKey,
      side_effects_managed: true,
    });
  }

  await handlers.onCreateBusinessEvent?.({
    id: makeId('EVT'),
    event_type: `transformation_${kind}`,
    module_source: 'elevage',
    entity_type: lotId ? 'lot_avicole' : 'animal',
    entity_id: lotId || animalId,
    title: `Transformation · ${kind}`,
    description: form.notes || '',
    event_date: date,
    issue_key: issueKey,
    side_effects_managed: true,
  });

  return { ok: true, issueKey, kind };
}

/**
 * Pesée lot ou animal - historique + poids actuel + business_event.
 */
export async function commitElevageWeighing({ form = {}, context = {}, handlers = {} } = {}) {
  const err = validateElevageWeighingForm(form);
  if (err) throw new Error(err);

  const date = form.date || today();
  const weight = num(form.poids ?? form.weight);
  const unit = clean(form.unite || form.unit) || 'kg';
  const lotId = clean(form.lot_id);
  const animalId = clean(form.animal_id);
  const farmId = resolveElevageLogFarmId({ form, context });
  const identity = resolveDailyEntryIdentity(DAILY_ENTRY_TYPES.WEIGHING, form, {
    farmId,
    recordId: lotId || animalId,
  });
  const replay = findDailyEntryReplay([
    ...arr(context.weightRecords),
    ...arr(context.businessEvents),
  ], identity.eventKey);
  if (replay) return { ok: true, replayed: true, eventKey: identity.eventKey, weight, unit };

  const recordId = clean(form.id) || dailyEntryRecordId('PES', identity);
  const issueKey = identity.eventKey;
  const comment = form.notes || form.commentaire || '';

  const record = stampElevageLogFarmId(attachDailyEntryMeta({
    id: recordId,
    date,
    poids: weight,
    weight,
    unite: unit,
    unit,
    lot_id: lotId || undefined,
    animal_id: animalId || undefined,
    notes: comment,
    source_module: 'elevage',
    issue_key: issueKey,
    side_effects_managed: true,
  }, identity, form.recorded_by || context.userId), farmId);

  if (handlers.onCreateWeightRecord) {
    await handlers.onCreateWeightRecord(record);
  }

  let targetWeight = null;
  let metrics = {
    previousWeight: 0,
    previousDate: '',
    daysSincePrevious: 0,
    gmq: 0,
    targetGmq: num(form.objectif_gmq ?? form.target_gmq),
    costPerKgGained: 0,
    feedCostCumulative: 0,
    estimatedExitDate: '',
    forecastMargin: 0,
    performanceLow: false,
    staleBeforeWeighing: false,
  };
  if (lotId && handlers.onUpdateLot) {
    const lot = arr(context.lots).find((row) => clean(row.id) === lotId);
    if (lot) {
      targetWeight = num(lot.poids_objectif_vente ?? lot.target_weight ?? lot.objectif_poids_moyen);
      const history = arr(lot.weight_history || lot.historique_poids || lot.pesees);
      const previous = history[history.length - 1] || null;
      metrics.previousWeight = num(previous?.poids ?? previous?.weight ?? lot.poids_moyen_actuel ?? lot.weight_avg);
      metrics.previousDate = previous?.date || lot.date_derniere_pesee || lot.last_weighing_date || '';
      metrics.daysSincePrevious = metrics.previousDate ? Math.max(1, daysBetween(metrics.previousDate, date)) : 0;
      metrics.gmq = metrics.previousWeight > 0 && metrics.daysSincePrevious > 0
        ? Number(((weight - metrics.previousWeight) / metrics.daysSincePrevious).toFixed(3))
        : 0;
      metrics.targetGmq = metrics.targetGmq || num(lot.objectif_gmq ?? lot.target_gmq) || (lower(lot.type).includes('chair') ? 0.045 : 0);
      metrics.staleBeforeWeighing = metrics.daysSincePrevious > BOVINE_WEIGHING_STALE_DAYS;
      metrics.performanceLow = metrics.targetGmq > 0 && metrics.gmq > 0 && metrics.gmq < metrics.targetGmq * 0.8;
      const entryWeight = num(lot.poids_initial ?? lot.starting_weight_avg ?? history[0]?.poids ?? history[0]?.weight);
      const gained = Math.max(0, weight - entryWeight);
      metrics.feedCostCumulative = num(lot.cout_aliment ?? lot.feed_cost ?? lot.cout_alimentaire_cumule);
      const totalCost = num(lot.purchase_cost ?? lot.cout_poussins) + metrics.feedCostCumulative + num(lot.frais_sante ?? lot.health_cost) + num(lot.autres_frais);
      metrics.costPerKgGained = gained > 0 ? Math.round(totalCost / gained) : 0;
      const remaining = targetWeight > 0 ? Math.max(0, targetWeight - weight) : 0;
      metrics.estimatedExitDate = remaining > 0 && metrics.gmq > 0 ? addDays(date, Math.ceil(remaining / metrics.gmq)) : (remaining <= 0 && targetWeight > 0 ? date : '');
      const expectedSale = num(lot.prix_vente_prevu ?? lot.valeur_vente_estimee);
      metrics.forecastMargin = expectedSale > 0 ? expectedSale - totalCost : num(lot.marge_previsionnelle);
      const nextHistory = [...history, { date, poids: weight, weight, note: comment }];
      await handlers.onUpdateLot(lotId, {
        poids_moyen_actuel: weight,
        last_weight_avg: weight,
        weight_avg: weight,
        average_weight: weight,
        date_derniere_pesee: date,
        last_weighing_date: date,
        weight_history: nextHistory,
        historique_poids: nextHistory,
        gmq: metrics.gmq,
        gain_moyen_quotidien: metrics.gmq,
        objectif_gmq: metrics.targetGmq,
        cout_par_kg_gagne: metrics.costPerKgGained,
        cout_alimentaire_cumule: metrics.feedCostCumulative,
        date_sortie_estimee: metrics.estimatedExitDate,
        date_objectif_vente: metrics.estimatedExitDate || lot.date_objectif_vente,
        marge_previsionnelle: metrics.forecastMargin,
      });
    }
  }

  if (animalId && handlers.onUpdateAnimal) {
    const animal = arr(context.animaux).find((row) => clean(row.id) === animalId);
    if (animal) {
      targetWeight = num(animal.poids_objectif ?? animal.target_weight ?? animal.poids_vente_cible);
      const history = arr(animal.weight_history || animal.historique_poids || animal.pesees);
      const previous = history[history.length - 1] || null;
      const entryWeight = num(animal.poids_entree ?? animal.weight_entry ?? animal.poids_initial ?? history[0]?.poids ?? history[0]?.weight);
      metrics.previousWeight = num(previous?.poids ?? previous?.weight ?? animal.poids_actuel ?? animal.poids ?? animal.weight);
      metrics.previousDate = previous?.date || animal.date_derniere_pesee || animal.last_weighing_date || animal.date_entree_ferme || animal.date_achat || '';
      metrics.daysSincePrevious = metrics.previousDate ? Math.max(1, daysBetween(metrics.previousDate, date)) : 0;
      metrics.gmq = metrics.previousWeight > 0 && metrics.daysSincePrevious > 0
        ? Number(((weight - metrics.previousWeight) / metrics.daysSincePrevious).toFixed(3))
        : 0;
      metrics.targetGmq = metrics.targetGmq || num(animal.objectif_gmq ?? animal.target_gmq) || 0.8;
      metrics.staleBeforeWeighing = metrics.daysSincePrevious > BOVINE_WEIGHING_STALE_DAYS;
      metrics.performanceLow = metrics.targetGmq > 0 && metrics.gmq > 0 && metrics.gmq < metrics.targetGmq * 0.8;
      const gained = Math.max(0, weight - entryWeight);
      metrics.feedCostCumulative = num(animal.feed_cost ?? animal.alimentation ?? animal.cout_alimentaire_cumule);
      const totalCost = num(animal.purchase_cost ?? animal.cout_achat ?? animal.prix_achat) + metrics.feedCostCumulative + num(animal.health_cost ?? animal.frais_sante) + num(animal.autres_frais);
      metrics.costPerKgGained = gained > 0 ? Math.round(totalCost / gained) : 0;
      const remaining = targetWeight > 0 ? Math.max(0, targetWeight - weight) : 0;
      metrics.estimatedExitDate = remaining > 0 && metrics.gmq > 0 ? addDays(date, Math.ceil(remaining / metrics.gmq)) : (remaining <= 0 && targetWeight > 0 ? date : '');
      const expectedSale = num(animal.prix_vente_estime ?? animal.sale_price ?? animal.prix_vente_prevu);
      metrics.forecastMargin = expectedSale > 0 ? expectedSale - totalCost : num(animal.marge_previsionnelle);
      const nextHistory = [...history, { date, poids: weight, weight, note: comment }];
      await handlers.onUpdateAnimal(animalId, {
        poids: weight,
        poids_actuel: weight,
        current_weight: weight,
        date_derniere_pesee: date,
        weight_history: nextHistory,
        historique_poids: nextHistory,
        gmq: metrics.gmq,
        gain_moyen_quotidien: metrics.gmq,
        objectif_gmq: metrics.targetGmq,
        cout_par_kg_gagne: metrics.costPerKgGained,
        cout_alimentaire_cumule: metrics.feedCostCumulative,
        date_sortie_estimee: metrics.estimatedExitDate,
        date_objectif_vente: metrics.estimatedExitDate || animal.date_objectif_vente,
        marge_previsionnelle: metrics.forecastMargin,
      });
    }
  }

  const followUpTargetId = lotId || animalId;
  if (followUpTargetId && metrics.performanceLow && handlers.onCreateTask) {
    await handlers.onCreateTask({
      id: dailyEntryRecordId('TSK-Q', { ...identity, eventKey: `${identity.eventKey}:gmq-task` }),
      title: `Performance poids faible · ${followUpTargetId}`,
      module_lie: lotId ? 'avicole' : 'animaux',
      source_module: 'elevage',
      source_record_id: followUpTargetId,
      related_id: followUpTargetId,
      task_dedupe_key: `${issueKey}:gmq-faible`,
      due_date: addDays(date, 1),
      priority: 'haute',
      status: 'a_faire',
      checklist: 'Revoir ration; Vérifier santé; Contrôler coût/kg; Programmer prochaine pesée',
      notes: `GMQ ${metrics.gmq} kg/j sous objectif ${metrics.targetGmq} kg/j.`,
    });
  }

  if (followUpTargetId && metrics.staleBeforeWeighing && handlers.onCreateAlert) {
    await handlers.onCreateAlert({
      id: dailyEntryRecordId('ALT-Q', { ...identity, eventKey: `${identity.eventKey}:stale-alert` }),
      title: `Pesée trop ancienne · ${followUpTargetId}`,
      message: `${metrics.daysSincePrevious} jours depuis la précédente pesée. Suivi croissance à sécuriser.`,
      module_source: 'elevage',
      entity_type: lotId ? 'lot_avicole' : 'animal',
      entity_id: followUpTargetId,
      severity: 'warning',
      status: 'nouvelle',
      alert_dedupe_key: `${issueKey}:retard-pesee`,
    });
  }

  if (followUpTargetId && metrics.performanceLow && handlers.onCreateAlert) {
    await handlers.onCreateAlert({
      id: dailyEntryRecordId('ALT-Q', { ...identity, eventKey: `${identity.eventKey}:gmq-alert` }),
      title: `Gain insuffisant · ${followUpTargetId}`,
      message: `GMQ ${metrics.gmq} kg/j sous objectif ${metrics.targetGmq} kg/j. Ration, santé et coût alimentaire à contrôler.`,
      module_source: 'elevage',
      entity_type: lotId ? 'lot_avicole' : 'animal',
      entity_id: followUpTargetId,
      severity: 'haute',
      status: 'nouvelle',
      alert_dedupe_key: `${issueKey}:gmq-faible`,
    });
  }

  await handlers.onCreateBusinessEvent?.(attachDailyEntryMeta({
    id: identity.eventId,
    event_type: animalId ? 'bovine_weighing' : 'pesee_elevage',
    type_evenement: animalId ? 'bovine_weighing' : 'pesee_elevage',
    module_source: 'elevage',
    entity_type: lotId ? 'lot_avicole' : 'animal',
    entity_id: lotId || animalId,
    title: `Pesée · ${weight} ${unit}`,
    description: comment || (targetWeight ? `Cible ${targetWeight} ${unit}` : ''),
    event_date: date,
    quantity: weight,
    gmq: metrics.gmq,
    objectif_gmq: metrics.targetGmq,
    cout_par_kg_gagne: metrics.costPerKgGained,
    cout_alimentaire_cumule: metrics.feedCostCumulative,
    date_sortie_estimee: metrics.estimatedExitDate,
    marge_previsionnelle: metrics.forecastMargin,
    issue_key: issueKey,
    farm_id: farmId,
    side_effects_managed: true,
  }, identity, form.recorded_by || context.userId));

  return {
    ok: true,
    recordId,
    issueKey,
    eventKey: identity.eventKey,
    weight,
    unit,
    targetWeight,
    ...metrics,
    onTarget: targetWeight > 0 ? weight >= targetWeight * 0.95 : null,
  };
}

/** Scénario lot chair intégré (handlers mémoire pour tests). */
export async function runBroilerLotScenario(handlersFactory = () => ({})) {
  const state = {
    lots: [],
    stocks: [{ id: 'STK-ALIM', produit: 'Aliment chair', categorie: 'aliment', quantite: 5000, unite: 'kg', prix_unitaire: 400, seuil: 200 }],
    animaux: [],
    alimentation_logs: [],
    sante: [],
    production_logs: [],
    transactions: [],
    tasks: [],
    alertes: [],
    events: [],
    orders: [],
  };

  const handlers = {
    onCreateLot: async (row) => { state.lots.push(row); },
    onUpdateLot: async (id, patch) => {
      const i = state.lots.findIndex((l) => l.id === id);
      if (i >= 0) state.lots[i] = { ...state.lots[i], ...patch };
    },
    onCreateAlimentation: async (row) => { state.alimentation_logs.push(row); },
    onUpdateStock: async (id, patch) => {
      const i = state.stocks.findIndex((s) => s.id === id);
      if (i >= 0) state.stocks[i] = { ...state.stocks[i], ...patch };
    },
    onCreateHealth: async (row) => { state.sante.push(row); },
    onUpdateHealth: async (id, patch) => {
      const i = state.sante.findIndex((h) => h.id === id);
      if (i >= 0) state.sante[i] = { ...state.sante[i], ...patch };
      else state.sante.push({ id, ...patch });
    },
    onCreateFinanceTransaction: async (row) => { state.transactions.push(row); },
    onCreateTask: async (row) => { state.tasks.push(row); },
    onCreateAlert: async (row) => { state.alertes.push(row); },
    onCreateBusinessEvent: async (row) => { state.events.push(row); },
    onCreateProduction: async (row) => { state.production_logs.push(row); },
    ...handlersFactory(state),
  };

  const lotId = 'LOTCH-TEST';
  await handlers.onCreateLot({
    id: lotId,
    name: 'Lot chair test',
    type: 'Chair',
    initial_count: 1000,
    effectif_initial: 1000,
    current_count: 1000,
    effectif_actuel: 1000,
    mortality: 0,
    cout_total_achat: 500000,
    prix_unitaire_sujet: 500,
  });

  const ctx = () => ({
    lots: state.lots,
    stocks: state.stocks,
    animaux: state.animaux,
    transactions: state.transactions,
    tasks: state.tasks,
    alertes: state.alertes,
    businessEvents: state.events,
  });

  await commitElevageFeeding({
    form: { stock_id: 'STK-ALIM', lot_id: lotId, quantite: 100, date: '2026-06-01' },
    context: ctx(),
    handlers,
  });

  await commitElevageMortality({
    form: { lot_id: lotId, quantite: 20, date: '2026-06-05', notes: 'Mortalité début cycle' },
    context: ctx(),
    handlers,
  });

  await commitElevageHealth({
    form: {
      lot_id: lotId,
      nom: 'Vaccin Newcastle',
      cout: 15000,
      date: '2026-06-06',
      date_rappel: '2026-07-06',
      stock_id: '',
      quantite_stock: 0,
    },
    context: ctx(),
    handlers,
  });

  await commitElevageTransformation({
    form: { lot_id: lotId, kind: 'pret_vente', date: '2026-06-30' },
    context: ctx(),
    handlers,
  });

  const lot = state.lots.find((l) => l.id === lotId);
  return { state, lot };
}
