/**
 * Chantier 5 - Cultures : récolte → stock vendable → vente Commercial.
 */

import { makeId } from './ids.js';
import { toNumber } from './format.js';
import { financeIds, documentIds } from './sideEffectIds.js';
import {
  applyStockMovement,
  stockQuantity,
  stockUnitPrice,
} from './stockWorkflows.js';
import {
  buildCultureHarvestWorkflow,
  buildIrrigationEventWorkflow,
  cultureHarvestUnit,
  cultureLabel,
  cultureStockKey,
  cultureUnitPrice,
} from './cultureWorkflows.js';
import {
  runNewSaleSideEffects,
} from './saleSideEffects.js';
import { calculateCultureMetrics } from './businessCalculations.js';
import {
  attachDailyEntryMeta,
  DAILY_ENTRY_TYPES,
  dailyEntryRecordId,
  findDailyEntryReplay,
  resolveDailyEntryIdentity,
} from './dailyQuickEntryContract.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const clean = (value) => String(value || '').trim();
const lower = (value) => clean(value).toLowerCase();
const num = (value) => toNumber(value);
const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toISOString();

export const CULTURE_DOMAINS = {
  HARVEST: 'recolte',
  EXPENSE: 'depense',
  SALE: 'vente',
};

export const SALE_PAYMENT = {
  PAYE: 'paye',
  PARTIEL: 'partiel',
  CREDIT: 'non_paye',
};

export function buildCultureIssueKey(domain = '', recordId = '', suffix = '') {
  const d = clean(domain) || 'cultures';
  const id = clean(recordId) || 'record';
  const tail = clean(suffix);
  return tail ? `cultures:${d}:${id}:${tail}` : `cultures:${d}:${id}`;
}

export function normalizeCulturePaymentStatus(value = '') {
  const v = lower(value);
  if (['paye', 'paid', 'payé'].includes(v)) return SALE_PAYMENT.PAYE;
  if (['partiel', 'partial'].includes(v)) return SALE_PAYMENT.PARTIEL;
  return SALE_PAYMENT.CREDIT;
}

export function validateCultureHarvestForm(form = {}) {
  if (!clean(form.culture_id)) return 'Culture obligatoire.';
  const qty = num(form.quantite_recoltee ?? form.quantite);
  if (qty <= 0) return 'Quantité récoltée obligatoire.';
  const downgraded = Math.max(0, num(form.quantite_declassee ?? form.quantite_declassement));
  const loss = Math.max(0, num(form.quantite_perdue ?? form.quantite_perte));
  if (downgraded + loss > qty) return 'Déclassement et pertes ne peuvent pas dépasser la récolte.';
  if (form.destination === 'perte') return '';
  return '';
}

export function validateCultureIrrigationForm(form = {}) {
  if (!clean(form.culture_id)) return 'Culture obligatoire.';
  if (num(form.volume_litres ?? form.volume_l) <= 0) return 'Volume d’irrigation obligatoire.';
  return '';
}

export function validateCultureExpenseForm(form = {}) {
  if (!clean(form.culture_id)) return 'Culture obligatoire.';
  const amount = num(form.montant ?? form.cout);
  if (amount <= 0) return 'Montant dépense obligatoire.';
  return '';
}

export function validateCultureSaleForm(form = {}) {
  if (!clean(form.client_id)) return 'Client obligatoire.';
  if (!clean(form.source_id)) return 'Produit stock (récolte) obligatoire.';
  const qty = num(form.quantity ?? form.quantite);
  if (qty <= 0) return 'Quantité obligatoire.';
  if (num(form.unit_price) <= 0 && lower(form.source_type) !== 'service') return 'Prix unitaire obligatoire.';
  return '';
}

function harvestFees(form = {}) {
  return num(form.frais_recolte) + num(form.frais_transport) + num(form.frais_conditionnement)
    + num(form.frais_main_oeuvre) + num(form.autres_frais);
}

function buildCulturePatchAfterHarvest(culture = {}, form = {}, qty = 0, unitCost = 0, quality = {}) {
  const price = num(form.prix_vente_unitaire ?? form.prix_vente_kg ?? culture.prix_vente_unitaire ?? cultureUnitPrice(culture));
  const revenue = qty * price;
  const extra = harvestFees(form);
  if (form.destination === 'perte') {
    return {
      pertes_recolte: num(culture.pertes_recolte) + qty,
      pertes: num(culture.pertes) + qty,
      date_derniere_recolte: form.date || today(),
      cout_recolte: num(culture.cout_recolte) + extra,
      statut: culture.statut || 'a_surveiller',
    };
  }
  return {
    quantite_recoltee: num(culture.quantite_recoltee) + qty,
    quantite_disponible: num(culture.quantite_disponible) + quality.sellableQty,
    production_reelle: num(culture.production_reelle) + qty,
    quantite_declassee: num(culture.quantite_declassee) + quality.downgradedQty,
    pertes_recolte: num(culture.pertes_recolte) + quality.lossQty,
    pertes: num(culture.pertes) + quality.lossQty,
    unite_recolte: form.unite || cultureHarvestUnit(culture),
    prix_vente_unitaire: price,
    prix_vente_kg: price,
    revenu_estime: num(culture.revenu_estime) || revenue,
    date_recolte_reelle: form.date || today(),
    date_derniere_recolte: form.date || today(),
    cout_recolte: num(culture.cout_recolte) + extra,
    cout_revient_unitaire_recolte: unitCost,
    statut: 'recolte',
    disponible_commercial: true,
        is_sellable: true,
        vendable: true,
    pret_a_la_vente: true,
    ready_for_sale: true,
    last_harvest_at: now(),
  };
}

function cultureProfitabilityPatch(culture = {}, { revenueDelta = 0, costDelta = 0 } = {}) {
  const merged = {
    ...culture,
    revenu_reel: num(culture.revenu_reel) + revenueDelta,
    cout_total_reel: num(culture.cout_total_reel) + costDelta,
  };
  const metrics = calculateCultureMetrics(merged);
  return {
    revenu_reel: merged.revenu_reel,
    cout_total_reel: merged.cout_total_reel,
    marge_reelle: metrics.marginReal ?? (merged.revenu_reel - merged.cout_total_reel),
    marge_estimee: metrics.marginEstimated,
  };
}

/**
 * Cultures → Récolte : journal, stock, mouvement, opportunité, finance potentiel, traçabilité.
 */
export async function commitCultureHarvest({ form = {}, context = {}, handlers = {} } = {}) {
  const err = validateCultureHarvestForm(form);
  if (err) throw new Error(err);

  const cultureId = clean(form.culture_id);
  const culture = arr(context.cultures).find((row) => clean(row.id) === cultureId);
  if (!culture) throw new Error('Culture introuvable');

  const qty = num(form.quantite_recoltee ?? form.quantite);
  const unit = form.unite || cultureHarvestUnit(culture);
  const date = form.date || today();
  const farmId = clean(form.farm_id || context.farmId || context.activeFarm?.id || culture.farm_id);
  const identity = resolveDailyEntryIdentity(DAILY_ENTRY_TYPES.HARVEST, form, {
    farmId,
    recordId: cultureId,
  });
  const replay = findDailyEntryReplay([
    ...arr(context.harvestRecords),
    ...arr(context.businessEvents),
  ], identity.eventKey);
  if (replay) return { ok: true, replayed: true, eventKey: identity.eventKey, qty, unit };

  const harvestId = clean(form.harvest_id) || dailyEntryRecordId('RECOLTE', identity);
  const issueKey = identity.eventKey;
  const destination = lower(form.destination || 'stock');
  const downgradedQty = destination === 'perte'
    ? 0
    : Math.max(0, num(form.quantite_declassee ?? form.quantite_declassement));
  const lossQty = destination === 'perte'
    ? qty
    : Math.max(0, num(form.quantite_perdue ?? form.quantite_perte));
  const sellableQty = Math.max(0, qty - downgradedQty - lossQty);
  const extra = harvestFees(form);
  const metrics = calculateCultureMetrics(culture);
  const unitCost = qty > 0
    ? ((num(culture.cout_total_reel) || metrics.costTotal) + extra) / qty
    : 0;

  const harvestRecord = attachDailyEntryMeta({
    id: harvestId,
    culture_id: cultureId,
    related_id: cultureId,
    target_id: cultureId,
    target_type: 'cultures',
    type_evenement: 'culture_harvest_record',
    event_type: 'culture_harvest_record',
    source_module: 'cultures',
    module_lie: 'cultures',
    title: `Récolte · ${cultureLabel(culture)}`,
    description: `${qty} ${unit} · vendable ${sellableQty} · déclassé ${downgradedQty} · pertes ${lossQty}${extra > 0 ? ` · frais ${extra}` : ''}`,
    event_date: date,
    date,
    quantite: qty,
    quantite_vendable: sellableQty,
    quantite_declassee: downgradedQty,
    quantite_perdue: lossQty,
    unite: unit,
    montant: extra,
    issue_key: issueKey,
    side_effects_managed: true,
  }, identity, form.recorded_by || context.userId);

  await handlers.onCreateHarvestRecord?.(harvestRecord);
  if (!handlers.onCreateHarvestRecord && handlers.onCreateBusinessEvent) {
    await handlers.onCreateBusinessEvent(harvestRecord);
  }

  const before = { ...culture };
  const after = {
    ...culture,
    ...buildCulturePatchAfterHarvest(culture, form, qty, unitCost, { sellableQty, downgradedQty, lossQty }),
    derniere_recolte_id: harvestId,
  };

  await handlers.onUpdateCulture?.(cultureId, after);

  let newStockQty = null;
  if (destination !== 'perte' && sellableQty > 0) {
    const workflow = buildCultureHarvestWorkflow({
      before,
      after,
      stocks: context.stocks,
      opportunities: context.opportunities,
      source: 'cultures_recolte',
      date,
    });

    if (workflow) {
      const stockRow = workflow.stockExistingId
        ? { ...workflow.stock, id: workflow.stockExistingId }
        : { ...workflow.stock, id: dailyEntryRecordId('STK-Q', { ...identity, eventKey: `${identity.eventKey}:stock-row` }) };

      const unitPrice = num(form.prix_vente_unitaire) || unitCost || cultureUnitPrice(after);
      const stockPayload = {
        ...stockRow,
        quantite: workflow.stockExistingId
          ? num(stockRow.quantite) + sellableQty
          : sellableQty,
        prix_unitaire: unitPrice,
        prixUnit: unitPrice,
        prixunit: unitPrice,
        cout_revient_unitaire: unitCost,
        disponible_commercial: true,
        is_sellable: true,
        vendable: true,
        commercial_ready: true,
        harvest_record_id: harvestId,
        issue_key: issueKey,
        linked_harvest_id: harvestId,
        culture_id: cultureId,
        source_module: 'cultures',
        source_record_id: cultureId,
        stock_key: cultureStockKey(after),
        farm_id: culture.farm_id || form.farm_id || after.farm_id,
        side_effects_managed: true,
      };

      if (workflow.stockExistingId && handlers.onUpdateStock) {
        const existing = arr(context.stocks).find((s) => clean(s.id) === clean(workflow.stockExistingId));
        const movement = applyStockMovement(existing || stockPayload, {
          type: 'entree',
          qty: sellableQty,
          motif: `Récolte ${cultureLabel(culture)}`,
          date,
        });
        await handlers.onUpdateStock(workflow.stockExistingId, {
          ...movement.stock,
          ...stockPayload,
          quantite: stockQuantity(movement.stock),
        });
        newStockQty = stockQuantity(movement.stock);
        if (handlers.onCreateBusinessEvent && movement.event) {
          const stockEventIdentity = { ...identity, eventKey: `${identity.eventKey}:stock` };
          await handlers.onCreateBusinessEvent(attachDailyEntryMeta({
            ...movement.event,
            id: dailyEntryRecordId('EVT-Q', stockEventIdentity),
            event_type: 'entree_stock_recolte',
            issue_key: stockEventIdentity.eventKey,
            linked_harvest_id: harvestId,
            culture_id: cultureId,
          }, stockEventIdentity, form.recorded_by || context.userId));
        }
      } else if (handlers.onCreateStock) {
        await handlers.onCreateStock(stockPayload);
        newStockQty = num(stockPayload.quantite);
        if (handlers.onCreateBusinessEvent) {
          const stockEventIdentity = { ...identity, eventKey: `${identity.eventKey}:stock` };
          await handlers.onCreateBusinessEvent(attachDailyEntryMeta({
            id: dailyEntryRecordId('EVT-Q', stockEventIdentity),
            event_type: 'entree_stock_recolte',
            module_source: 'cultures',
            entity_type: 'stock',
            entity_id: stockPayload.id,
            title: `Entrée stock récolte · ${cultureLabel(culture)}`,
            description: `${sellableQty} ${unit}`,
            event_date: date,
            issue_key: stockEventIdentity.eventKey,
            linked_harvest_id: harvestId,
            quantity: sellableQty,
            side_effects_managed: true,
          }, stockEventIdentity, form.recorded_by || context.userId));
        }
      }

      if (handlers.onCreateStockMovement) {
        const movementKey = `${identity.eventKey}:stock-movement`;
        const movementExists = arr(context.stockMovements).some((row) => clean(row.event_key || row.idempotency_key || row.dedupe_key) === movementKey);
        if (!movementExists) {
          await handlers.onCreateStockMovement({
            id: dailyEntryRecordId('STKMVT-Q', { ...identity, eventKey: movementKey }),
            stock_id: stockPayload.id,
            movement_type: 'entree',
            quantity: sellableQty,
            unit,
            stock_before: Math.max(0, num(newStockQty) - sellableQty),
            stock_after: num(newStockQty),
            stock_delta: sellableQty,
            source_module: 'cultures',
            source_record_id: harvestId,
            notes: `Récolte ${cultureLabel(culture)}`,
            movement_date: date,
            farm_id: farmId || null,
            entry_id: identity.entryId,
            event_key: movementKey,
            idempotency_key: movementKey,
            recorded_by: form.recorded_by || context.userId || 'system',
            dedupe_key: movementKey,
          });
        }
      }

      if (workflow.opportunity) {
        if (workflow.opportunityExistingId && handlers.onUpdateOpportunity) {
          await handlers.onUpdateOpportunity(workflow.opportunityExistingId, {
            ...workflow.opportunity,
            issue_key: buildCultureIssueKey(CULTURE_DOMAINS.HARVEST, harvestId, 'opp'),
          });
        } else if (handlers.onCreateOpportunity) {
          await handlers.onCreateOpportunity({
            ...workflow.opportunity,
            id: dailyEntryRecordId('OPP-Q', { ...identity, eventKey: `${identity.eventKey}:opportunity` }),
            issue_key: buildCultureIssueKey(CULTURE_DOMAINS.HARVEST, harvestId, 'opp'),
            side_effects_managed: true,
          });
        }
      }

      if (workflow.event && handlers.onCreateBusinessEvent) {
        const workflowEventIdentity = { ...identity, eventKey: `${identity.eventKey}:workflow` };
        await handlers.onCreateBusinessEvent(attachDailyEntryMeta({
          ...workflow.event,
          id: dailyEntryRecordId('EVT-Q', workflowEventIdentity),
          issue_key: workflowEventIdentity.eventKey,
          linked_harvest_id: harvestId,
        }, workflowEventIdentity, form.recorded_by || context.userId));
      }
    }
  }

  return {
    ok: true,
    harvestId,
    issueKey,
    eventKey: identity.eventKey,
    qty,
    sellableQty,
    downgradedQty,
    lossQty,
    unit,
    unitCost,
    newStockQty,
  };
}

/** Cultures → Irrigation : coût technique, suivi eau, alerte et traçabilité sans faux décaissement. */
export async function commitCultureIrrigation({ form = {}, context = {}, handlers = {} } = {}) {
  const err = validateCultureIrrigationForm(form);
  if (err) throw new Error(err);

  const cultureId = clean(form.culture_id);
  const culture = arr(context.cultures).find((row) => clean(row.id) === cultureId);
  if (!culture) throw new Error('Culture introuvable');

  const date = form.date || today();
  const farmId = clean(form.farm_id || context.farmId || context.activeFarm?.id || culture.farm_id);
  const identity = resolveDailyEntryIdentity(DAILY_ENTRY_TYPES.IRRIGATION, form, {
    farmId,
    recordId: cultureId,
  });
  const replay = findDailyEntryReplay(context.businessEvents, identity.eventKey);
  const volumeLitres = num(form.volume_litres ?? form.volume_l);
  if (replay) return { ok: true, replayed: true, eventKey: identity.eventKey, volumeLitres };

  const workflow = buildIrrigationEventWorkflow({
    culture,
    payload: form,
    smartReadings: context.smartReadings,
    date,
  });

  if (workflow.culturePatch) {
    await handlers.onUpdateCulture?.(cultureId, {
      ...workflow.culturePatch,
      issue_key: identity.eventKey,
      event_key: identity.eventKey,
    });
  }

  if (workflow.alert && handlers.onCreateAlert) {
    const key = `${identity.eventKey}:alert`;
    const exists = arr(context.alertes).some((row) => clean(row.alert_dedupe_key || row.issue_key) === key);
    if (!exists) {
      await handlers.onCreateAlert({
        ...workflow.alert,
        id: dailyEntryRecordId('ALT-Q', { ...identity, eventKey: key }),
        alert_dedupe_key: key,
        issue_key: key,
      });
    }
  }

  if (workflow.task && handlers.onCreateTask) {
    const key = `${identity.eventKey}:task`;
    const exists = arr(context.tasks).some((row) => clean(row.task_dedupe_key || row.issue_key) === key);
    if (!exists) {
      await handlers.onCreateTask({
        ...workflow.task,
        id: dailyEntryRecordId('TSK-Q', { ...identity, eventKey: key }),
        task_dedupe_key: key,
        issue_key: key,
      });
    }
  }

  await handlers.onCreateBusinessEvent?.(attachDailyEntryMeta({
    ...workflow.event,
    id: identity.eventId,
    issue_key: identity.eventKey,
    farm_id: farmId || undefined,
    side_effects_managed: true,
  }, identity, form.recorded_by || context.userId));

  return {
    ok: true,
    eventKey: identity.eventKey,
    volumeLitres,
    cost: num(workflow.reporting?.cout),
    abnormal: Boolean(workflow.reporting?.abnormal),
  };
}

/** Dépense culture liée + preuve document optionnelle. */
export async function commitCultureExpense({ form = {}, context = {}, handlers = {} } = {}) {
  const err = validateCultureExpenseForm(form);
  if (err) throw new Error(err);

  const cultureId = clean(form.culture_id);
  const culture = arr(context.cultures).find((row) => clean(row.id) === cultureId);
  if (!culture) throw new Error('Culture introuvable');

  const amount = num(form.montant ?? form.cout);
  const expenseId = clean(form.id) || makeId('DEP-CULT');
  const issueKey = buildCultureIssueKey(CULTURE_DOMAINS.EXPENSE, expenseId);
  const date = form.date || today();
  const category = form.categorie || form.type_depense || 'Charge culture';

  await handlers.onCreateBusinessEvent?.({
    id: expenseId,
    event_type: 'depense_culture',
    module_source: 'cultures',
    entity_type: 'culture',
    entity_id: cultureId,
    title: `Dépense · ${cultureLabel(culture)}`,
    description: `${category} · ${amount} FCFA`,
    event_date: date,
    montant: amount,
    amount,
    issue_key: issueKey,
    side_effects_managed: true,
  });

  const financeRow = {
    id: financeIds.cultureExpense(cultureId, expenseId),
    type: 'sortie',
    libelle: `${category} · ${cultureLabel(culture)}`,
    montant: amount,
    amount,
    date,
    categorie: 'Cultures',
    activite: 'cultures',
    module_lie: 'cultures',
    source_module: 'cultures',
    source_record_id: cultureId,
    related_id: cultureId,
    issue_key: issueKey,
    side_effects_managed: true,
  };
  const exists = arr(context.transactions).some((t) => clean(t.id) === financeRow.id);
  if (!exists && handlers.onCreateFinanceTransaction) {
    await handlers.onCreateFinanceTransaction(financeRow);
  }

  if ((form.document_url || form.preuve_url) && handlers.onCreateDocument) {
    await handlers.onCreateDocument({
      id: documentIds.cultureExpense(cultureId, expenseId),
      title: `Preuve ${category}`,
      document_category: 'facture',
      module_source: 'cultures',
      entity_id: cultureId,
      file_url: form.document_url || form.preuve_url,
      issue_key: issueKey,
      side_effects_managed: true,
    });
  }

  const costField = {
    cout_semences: 'cout_semences',
    cout_engrais: 'cout_engrais',
    cout_eau: 'cout_eau',
    cout_main_oeuvre: 'cout_main_oeuvre',
    cout_traitement: 'cout_traitement',
    semences: 'cout_semences',
    engrais: 'cout_engrais',
    eau: 'cout_eau',
    main_oeuvre: 'cout_main_oeuvre',
    traitement: 'cout_traitement',
  }[lower(category)] || null;
  const culturePatch = costField
    ? { [costField]: num(culture[costField]) + amount }
  : { autres_frais: num(culture.autres_frais) + amount };

  await handlers.onUpdateCulture?.(cultureId, {
    ...culturePatch,
    ...cultureProfitabilityPatch({ ...culture, ...culturePatch }, { costDelta: amount }),
    issue_key: issueKey,
  });

  return { ok: true, expenseId, issueKey, amount };
}

export function computeCultureSaleAmounts(form = {}) {
  const qty = num(form.quantity ?? form.quantite);
  const unitPrice = num(form.unit_price ?? form.prix_unitaire);
  const productTotal = qty * unitPrice;
  const deliveryFee = ['livraison', 'a_livrer'].includes(lower(form.fulfillment_mode))
    ? num(form.delivery_fee)
    : 0;
  const grandTotal = productTotal + deliveryFee;
  const status = normalizeCulturePaymentStatus(form.payment_status);
  let paid = 0;
  if (status === SALE_PAYMENT.PAYE) paid = grandTotal;
  else if (status === SALE_PAYMENT.PARTIEL) paid = Math.min(grandTotal, num(form.paid_amount));
  return { qty, unitPrice, productTotal, deliveryFee, grandTotal, paid, remaining: Math.max(0, grandTotal - paid), paymentStatus: status };
}

/** Commercial → Ventes : vente stock récolte culture. */
export function buildCultureStockSaleRecords({ form = {}, orderId = '', clientLabel = '' } = {}) {
  const { qty, unitPrice, productTotal, deliveryFee, grandTotal, paid, remaining, paymentStatus } = computeCultureSaleAmounts(form);
  const issueKey = buildCultureIssueKey(CULTURE_DOMAINS.SALE, orderId || 'new');
  const paymentId = paid > 0 ? makeId('PAI') : null;
  const invoiceId = form.invoice_issued !== false ? makeId('FAC') : null;

  const order = {
    id: orderId || makeId('CMD'),
    client_id: form.client_id,
    client_nom: clientLabel,
    date: form.date || today(),
    source_type: 'stock',
    source_id: form.source_id,
    source_module: 'stock',
    product_name: form.product_name,
    quantity: qty,
    quantite: qty,
    unit: form.unit || 'kg',
    unit_price: unitPrice,
    prix_unitaire: unitPrice,
    montant_total: grandTotal,
    montant_ht: productTotal,
    frais_livraison: deliveryFee,
    montant_paye: paid,
    reste_a_payer: remaining,
    statut_paiement: paymentStatus,
    statut_commande: remaining > 0 ? 'confirme' : 'livre',
    fulfillment_mode: form.fulfillment_mode || 'recupere',
    culture_id: form.culture_id || '',
    harvest_record_id: form.harvest_record_id || '',
    issue_key: issueKey,
    side_effects_managed: true,
  };

  return {
    order,
    payment: paid > 0 ? {
      id: paymentId,
      order_id: order.id,
      client_id: form.client_id,
      montant: paid,
      amount: paid,
      date_paiement: form.date || today(),
      moyen_paiement: form.payment_method || 'especes',
      issue_key: buildCultureIssueKey(CULTURE_DOMAINS.SALE, order.id, 'paiement'),
    } : null,
    invoice: invoiceId ? {
      id: invoiceId,
      order_id: order.id,
      client_id: form.client_id,
      montant_total: grandTotal,
      statut: paymentStatus === SALE_PAYMENT.PAYE ? 'payee' : 'emise',
      issue_key: buildCultureIssueKey(CULTURE_DOMAINS.SALE, order.id, 'facture'),
    } : null,
    issueKey,
    paid,
    remaining,
    grandTotal,
  };
}

export async function commitCultureStockSale({ form = {}, context = {}, handlers = {} } = {}) {
  const err = validateCultureSaleForm(form);
  if (err) throw new Error(err);

  const stock = arr(context.stocks).find((s) => clean(s.id) === clean(form.source_id));
  if (!stock) throw new Error('Stock récolte introuvable');
  const { qty, grandTotal, paid, remaining } = computeCultureSaleAmounts(form);
  if (qty > stockQuantity(stock)) {
    throw new Error(`Stock insuffisant : ${stockQuantity(stock)} ${stock.unite || ''}`);
  }

  const client = arr(context.clients).find((c) => clean(c.id) === clean(form.client_id));
  const clientLabel = client?.nom || client?.name || form.client_id;
  const records = buildCultureStockSaleRecords({ form, clientLabel });
  const orderId = records.order.id;

  await handlers.onCreateOrder?.(records.order);
  if (records.payment && handlers.onCreatePayment) await handlers.onCreatePayment(records.payment);
  if (records.invoice && handlers.onCreateInvoice) await handlers.onCreateInvoice(records.invoice);

  await runNewSaleSideEffects({
    order: records.order,
    orderId,
    form: { ...form, source_type: 'stock', quantity: qty },
    paid,
    remaining,
    paymentId: records.payment?.id || '',
    invoiceId: records.invoice?.id || '',
    productName: form.product_name || stock.produit,
    clientLabel,
    realClientId: form.client_id,
    stocks: context.stocks,
    cultures: context.cultures,
    clients: context.clients,
    salesOrders: context.salesOrders,
    payments: context.payments,
    transactions: context.transactions,
    tasks: context.tasks,
    alertes: context.alertes,
    handlers,
  });

  const cultureId = clean(form.culture_id || stock.culture_id || stock.source_record_id);
  if (cultureId && handlers.onUpdateCulture) {
    const culture = arr(context.cultures).find((c) => clean(c.id) === cultureId);
    if (culture) {
      await handlers.onUpdateCulture(cultureId, {
        quantite_vendue: num(culture.quantite_vendue) + qty,
        ...cultureProfitabilityPatch(culture, { revenueDelta: grandTotal }),
        derniere_vente_id: orderId,
      });
    }
  }

  await handlers.onCreateBusinessEvent?.({
    id: makeId('EVT'),
    event_type: 'vente_culture',
    module_source: 'commercial',
    entity_type: 'culture',
    entity_id: cultureId || stock.id,
    title: `Vente récolte · ${form.product_name || stock.produit}`,
    description: `${qty} ${form.unit || stock.unite || 'kg'} · ${grandTotal} FCFA`,
    event_date: form.date || today(),
    linked_order_id: orderId,
    issue_key: records.issueKey,
    side_effects_managed: true,
  });

  return { ok: true, orderId, issueKey: records.issueKey, paid, remaining };
}

export function validateCultureTransformationForm(form = {}) {
  if (!clean(form.source_stock_id)) return 'Stock matière première obligatoire.';
  const qty = num(form.quantite);
  if (qty <= 0) return 'Quantité à transformer obligatoire.';
  if (!clean(form.produit_fini)) return 'Nom produit transformé obligatoire.';
  if (num(form.quantite_produit_fini) <= 0) return 'Quantité produit fini obligatoire.';
  return '';
}

/** Matière première récoltée → produit transformé en stock (sortie + entrée + coût). */
export async function commitCultureTransformation({ form = {}, context = {}, handlers = {} } = {}) {
  const err = validateCultureTransformationForm(form);
  if (err) throw new Error(err);

  const sourceStock = arr(context.stocks).find((s) => clean(s.id) === clean(form.source_stock_id));
  if (!sourceStock) throw new Error('Stock matière première introuvable');

  const qty = num(form.quantite);
  if (qty > stockQuantity(sourceStock)) {
    throw new Error(`Stock insuffisant : ${stockQuantity(sourceStock)} ${sourceStock.unite || ''}`);
  }

  const date = form.date || today();
  const transformId = clean(form.id) || makeId('TRANS-CULT');
  const issueKey = buildCultureIssueKey('transformation', transformId);
  const transformCost = num(form.cout_transformation);
  const outQty = num(form.quantite_produit_fini);
  const productName = clean(form.produit_fini);
  const unit = clean(form.unite_produit_fini || sourceStock.unite || 'kg');
  const cultureId = clean(form.culture_id || sourceStock.culture_id);
  const farmId = sourceStock.farm_id || form.farm_id;
  const sourceUnitCost = num(sourceStock.cout_revient_unitaire || sourceStock.prix_unitaire || stockUnitPrice(sourceStock));
  const unitCost = outQty > 0 ? ((sourceUnitCost * qty) + transformCost) / outQty : sourceUnitCost;

  const exitMovement = applyStockMovement(sourceStock, {
    type: 'sortie',
    qty,
    motif: `Transformation → ${productName}`,
    date,
  });
  await handlers.onUpdateStock?.(sourceStock.id, exitMovement.stock);

  const finishedPayload = {
    id: clean(form.finished_stock_id) || makeId('STK'),
    produit: productName,
    name: productName,
    categorie: 'Produit transformé culture',
    category: 'produit_transforme_culture',
    quantite: outQty,
    unite: unit,
    cout_revient_unitaire: unitCost,
    prix_unitaire: num(form.prix_vente_unitaire) || unitCost,
    source_module: 'cultures',
    source_type: 'transformation',
    culture_id: cultureId || undefined,
    linked_transform_id: transformId,
    farm_id: farmId,
    issue_key: buildCultureIssueKey('transformation', transformId, 'stock'),
    side_effects_managed: true,
    notes: form.notes || `Transformé depuis ${sourceStock.produit || sourceStock.id}`,
    date_entree: date,
    disponible_commercial: true,
    is_sellable: true,
    vendable: true,
  };

  await handlers.onCreateStock?.(finishedPayload);

  await handlers.onCreateBusinessEvent?.({
    id: transformId,
    event_type: 'transformation_culture',
    module_source: 'cultures',
    entity_type: 'culture',
    entity_id: cultureId || sourceStock.id,
    title: `Transformation · ${productName}`,
    description: `${qty} → ${outQty} ${unit}${transformCost > 0 ? ` · coût ${transformCost} FCFA` : ''}`,
    event_date: date,
    quantite: outQty,
    issue_key: issueKey,
    side_effects_managed: true,
  });

  if (transformCost > 0 && handlers.onCreateFinanceTransaction) {
    await handlers.onCreateFinanceTransaction({
      id: makeId('TRX'),
      type: 'sortie',
      libelle: `Transformation culture · ${productName}`,
      montant: transformCost,
      date,
      categorie: 'Transformation cultures',
      module_lie: 'cultures',
      related_id: cultureId || sourceStock.id,
      issue_key: buildCultureIssueKey('transformation', transformId, 'finance'),
      side_effects_managed: true,
    });
  }

  return { ok: true, transformId, issueKey, finishedStockId: finishedPayload.id };
}

/** Scénario intégré récolte → vente payée / crédit → marge. */
export async function runCultureScenario(handlersFactory) {
  const state = {
    cultures: [],
    stocks: [],
    opportunities: [],
    transactions: [],
    events: [],
    orders: [],
    payments: [],
    invoices: [],
    documents: [],
    clients: [{ id: 'CLI-1', nom: 'Marché Thiès' }],
  };

  const handlers = {
    onCreateCulture: async (row) => { state.cultures.push(row); },
    onUpdateCulture: async (id, patch) => {
      const i = state.cultures.findIndex((c) => c.id === id);
      if (i >= 0) state.cultures[i] = { ...state.cultures[i], ...patch };
    },
    onCreateHarvestRecord: async (row) => { state.events.push(row); },
    onCreateStock: async (row) => { state.stocks.push(row); },
    onUpdateStock: async (id, patch) => {
      const i = state.stocks.findIndex((s) => s.id === id);
      if (i >= 0) state.stocks[i] = { ...state.stocks[i], ...patch };
    },
    onCreateOpportunity: async (row) => { state.opportunities.push(row); },
    onCreateFinanceTransaction: async (row) => { state.transactions.push(row); },
    onCreateBusinessEvent: async (row) => { state.events.push(row); },
    onCreateDocument: async (row) => { state.documents.push(row); },
    onCreateOrder: async (row) => { state.orders.push(row); },
    onCreatePayment: async (row) => { state.payments.push(row); },
    onCreateInvoice: async (row) => { state.invoices.push(row); },
    onUpdateOpportunity: async (id, patch) => {
      const i = state.opportunities.findIndex((o) => o.id === id);
      if (i >= 0) state.opportunities[i] = { ...state.opportunities[i], ...patch };
    },
    ...handlersFactory?.(state),
  };

  const cultureId = 'CULT-1';
  await handlers.onCreateCulture({
    id: cultureId,
    nom: 'Tomates parcelle A',
    record_type: 'culture',
    surface: 1000,
    cout_semences: 50000,
    cout_engrais: 80000,
    budget_prevu: 200000,
    statut: 'floraison',
  });

  const ctx = () => ({
    cultures: state.cultures,
    stocks: state.stocks,
    opportunities: state.opportunities,
    transactions: state.transactions,
    clients: state.clients,
    salesOrders: state.orders,
    payments: state.payments,
    alertes: [],
    tasks: [],
  });

  await commitCultureHarvest({
    form: {
      culture_id: cultureId,
      quantite_recoltee: 500,
      unite: 'kg',
      prix_vente_unitaire: 400,
      date: '2026-06-01',
      destination: 'stock',
    },
    context: ctx(),
    handlers,
  });

  const stockId = state.stocks[0]?.id;
  await commitCultureExpense({
    form: {
      culture_id: cultureId,
      montant: 15000,
      categorie: 'cout_traitement',
      date: '2026-06-02',
      preuve_url: 'https://example.com/facture-traitement.pdf',
    },
    context: ctx(),
    handlers,
  });

  await commitCultureStockSale({
    form: {
      client_id: 'CLI-1',
      source_id: stockId,
      culture_id: cultureId,
      product_name: state.stocks[0]?.produit,
      quantity: 200,
      unit: 'kg',
      unit_price: 450,
      payment_status: 'paye',
      date: '2026-06-05',
    },
    context: ctx(),
    handlers: {
      ...handlers,
      onUpdateStock: handlers.onUpdateStock,
      onCreateFinanceTransaction: handlers.onCreateFinanceTransaction,
      onCreateAlert: async () => {},
      onCreateTask: async () => {},
      onCreateTrace: async () => {},
      onUpdateClient: async () => {},
    },
  });

  await commitCultureStockSale({
    form: {
      client_id: 'CLI-1',
      source_id: stockId,
      culture_id: cultureId,
      product_name: state.stocks[0]?.produit,
      quantity: 100,
      unit: 'kg',
      unit_price: 400,
      payment_status: 'non_paye',
      date: '2026-06-08',
    },
    context: ctx(),
    handlers: {
      ...handlers,
      onCreateOrder: async (row) => { state.orders.push({ ...row, id: makeId('CMD') }); },
      onCreateFinanceTransaction: handlers.onCreateFinanceTransaction,
      onCreateAlert: async (row) => { state.events.push(row); },
      onCreateTask: async () => {},
      onCreateTrace: async () => {},
      onUpdateClient: async () => {},
    },
  });

  const culture = state.cultures.find((c) => c.id === cultureId);
  const stock = state.stocks.find((s) => s.id === stockId);
  return { state, culture, stock };
}
