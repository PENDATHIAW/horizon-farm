/**
 * Écarts chantier 4 — détection des incohérences élevage / stock / finance / tâches.
 */

import { toNumber } from './format.js';
import { financeIds } from './sideEffectIds.js';
import { avicoleDeadCount, avicoleInitialCount } from './avicoleMetrics.js';
import { buildElevageIssueKey, ELEVAGE_DOMAINS, findEggStockRow } from './elevageWorkflow.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const clean = (value) => String(value || '').trim();
const lower = (value) => clean(value).toLowerCase();
const num = (value) => toNumber(value);

const openStatus = (row = {}) =>
  !['termine', 'terminé', 'done', 'traitee', 'traitée', 'annule', 'annulé', 'closed', 'resolue', 'résolue'].includes(lower(row.status || row.statut));

const isFeedStock = (row = {}) => /aliment|feed|provende|son|mais|maïs|foin|fourrage/i.test(`${row.produit || row.nom || ''} ${row.categorie || ''}`);

const stockQtyOf = (row = {}) => num(row.quantite ?? row.quantity);

export function buildElevageGapRows({
  alimentationLogs = [],
  sante = [],
  lots = [],
  animaux = [],
  stocks = [],
  productionLogs = [],
  transactions = [],
  tasks = [],
  alertes = [],
  businessEvents = [],
  salesOrders = [],
} = {}) {
  const gaps = [];
  const push = (row) => gaps.push({ severity: 'warning', ...row });

  arr(alimentationLogs).forEach((log) => {
    const logId = clean(log.id);
    const qty = num(log.quantite);
    const hasTarget = clean(log.lot_id) || clean(log.animal_id) || clean(log.cible_id);
    const hasStockOut = num(log.quantite) > 0 && clean(log.stock_id);
    const financeId = financeIds.feeding(logId);
    const hasFinance = arr(transactions).some((t) => clean(t.id) === financeId || clean(t.source_record_id) === logId);

    if (logId && qty > 0 && clean(log.stock_id) && !log.side_effects_managed) {
      const stock = arr(stocks).find((s) => clean(s.id) === clean(log.stock_id));
      if (stock && !log.stock_movement_ref) {
        push({
          issue_key: buildElevageIssueKey(ELEVAGE_DOMAINS.FEEDING, logId, 'sans_sortie_stock'),
          title: 'Alimentation sans sortie stock',
          detail: `Journal ${logId} : ${qty} ${log.unite || ''} non tracé en mouvement.`,
          repair: 'feeding_stock',
          record_id: logId,
        });
      }
    }

    if (logId && qty > 0 && !hasTarget) {
      push({
        issue_key: buildElevageIssueKey(ELEVAGE_DOMAINS.FEEDING, logId, 'sans_cible'),
        title: 'Sortie aliment sans lot/animal',
        detail: `Journal ${logId} non rattaché à une cible rentabilité.`,
        repair: 'feeding_target',
        record_id: logId,
      });
    }

    if (logId && num(log.montant_total) > 0 && !hasFinance && !log.skip_finance) {
      push({
        issue_key: buildElevageIssueKey(ELEVAGE_DOMAINS.FEEDING, logId, 'sans_finance'),
        title: 'Coût alimentation non en finance',
        detail: `${log.montant_total} F non retrouvé en charges.`,
        repair: 'feeding_finance',
        record_id: logId,
      });
    }
  });

  arr(stocks).filter(isFeedStock).forEach((stock) => {
    const qty = stockQtyOf(stock);
    if (qty < 0) {
      push({
        issue_key: buildElevageIssueKey('stock', stock.id, 'negatif'),
        title: 'Stock aliment négatif',
        detail: `${stock.produit || stock.id} : ${qty} ${stock.unite || ''}.`,
        repair: 'stock_negative',
        record_id: stock.id,
      });
    }
  });

  arr(sante).forEach((row) => {
    const healthId = clean(row.id);
    const cost = num(row.cout ?? row.montant);
    const productQty = num(row.quantite_stock);
    const financeId = financeIds.health(healthId);
    const hasFinance = cost <= 0 || arr(transactions).some((t) => clean(t.id) === financeId);
    const reminder = clean(row.date_rappel || row.prochaine_date);
    const taskKey = buildElevageIssueKey(ELEVAGE_DOMAINS.HEALTH, healthId, 'rappel');
    const hasReminderTask = !reminder || arr(tasks).some((t) => openStatus(t) && clean(t.task_dedupe_key) === taskKey);

    if (healthId && productQty > 0 && !clean(row.stock_id) && !row.stock_movement_ref) {
      push({
        issue_key: buildElevageIssueKey(ELEVAGE_DOMAINS.HEALTH, healthId, 'sans_sortie_stock'),
        title: 'Soin sans produit stock sorti',
        detail: `${row.nom || healthId} : quantité produit sans mouvement stock.`,
        repair: 'health_stock',
        record_id: healthId,
      });
    }

    if (healthId && reminder && !hasReminderTask) {
      push({
        issue_key: buildElevageIssueKey(ELEVAGE_DOMAINS.HEALTH, healthId, 'sans_tache'),
        title: 'Vaccin avec rappel sans tâche',
        detail: `Rappel ${reminder} sans tâche ouverte.`,
        repair: 'health_reminder_task',
        record_id: healthId,
      });
    }

    if (healthId && cost > 0 && !hasFinance) {
      push({
        issue_key: buildElevageIssueKey(ELEVAGE_DOMAINS.HEALTH, healthId, 'sans_finance'),
        title: 'Coût santé non repris en rentabilité',
        detail: `${cost} F non lié en finance.`,
        repair: 'health_finance',
        record_id: healthId,
      });
    }

    const until = clean(row.delai_sanitaire_fin || row.withdrawal_until);
    const animalId = clean(row.animal_id);
    if (until && animalId) {
      const animal = arr(animaux).find((a) => clean(a.id) === animalId);
      if (animal && ['vendu', 'sold'].some((w) => lower(animal.status || animal.statut).includes(w))) {
        push({
          issue_key: buildElevageIssueKey(ELEVAGE_DOMAINS.HEALTH, healthId, 'vente_sous_traitement'),
          title: 'Animal vendu sous traitement',
          detail: `${animalId} vendu avant fin délai sanitaire (${until}).`,
          repair: 'health_withdrawal',
          record_id: healthId,
        });
      }
    }
  });

  arr(lots).forEach((lot) => {
    const lotId = clean(lot.id);
    const initial = avicoleInitialCount(lot);
    const dead = avicoleDeadCount(lot);
    const mortalityEvents = arr(businessEvents).filter((e) =>
      clean(e.entity_id) === lotId && /mort|mortalit/i.test(`${e.event_type || ''} ${e.title || ''}`));
    const rate = initial > 0 ? (dead / initial) * 100 : 0;

    if (dead > 0 && !mortalityEvents.length && !lot.mortality_side_effects) {
      push({
        issue_key: buildElevageIssueKey(ELEVAGE_DOMAINS.MORTALITY, lotId, 'sans_evenement'),
        title: 'Effectif diminué sans événement mortalité',
        detail: `Lot ${lot.name || lotId} : ${dead} morts sans business_event.`,
        repair: 'mortality_event',
        record_id: lotId,
      });
    }

    if (rate >= 4) {
      const alertKey = buildElevageIssueKey(ELEVAGE_DOMAINS.MORTALITY, lotId, 'seuil');
      const hasAlert = arr(alertes).some((a) => openStatus(a) && clean(a.alert_dedupe_key) === alertKey);
      if (!hasAlert) {
        push({
          issue_key: alertKey,
          title: 'Mortalité élevée sans alerte',
          detail: `Taux ${rate.toFixed(1)}% sans alerte ouverte.`,
          repair: 'mortality_alert',
          record_id: lotId,
        });
      }
    }
  });

  arr(productionLogs).forEach((log) => {
    const logId = clean(log.id);
    const sellable = Math.max(0, num(log.oeufs_produits) - num(log.oeufs_casses));
    const eggStock = findEggStockRow(stocks);
    if (logId && sellable > 0 && eggStock && !log.stock_entry_ref && !log.side_effects_managed) {
      push({
        issue_key: buildElevageIssueKey(ELEVAGE_DOMAINS.EGGS, logId, 'sans_stock'),
        title: 'Production sans stock œufs',
        detail: `${sellable} œufs non entrés en stock ${eggStock.id}.`,
        repair: 'eggs_stock',
        record_id: logId,
      });
    }
  });

  arr(salesOrders).forEach((order) => {
    if (!/oeuf|œuf|tablette/i.test(`${order.product_name || ''} ${order.notes || ''}`)) return;
    const orderId = clean(order.id);
    const hasStockOut = arr(businessEvents).some((e) =>
      clean(e.linked_order_id) === orderId && /sortie_stock|oeuf/i.test(`${e.event_type || ''}`));
    if (orderId && num(order.quantite) > 0 && !hasStockOut) {
      push({
        issue_key: buildElevageIssueKey(ELEVAGE_DOMAINS.EGGS, orderId, 'vente_sans_stock'),
        title: 'Vente œufs sans sortie stock',
        detail: `Commande ${orderId} sans mouvement stock œufs.`,
        repair: 'eggs_sale_stock',
        record_id: orderId,
      });
    }
  });

  return gaps;
}
