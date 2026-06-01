import { fmtNumber, toNumber } from '../utils/format.js';
import { makeId } from '../utils/ids.js';

export const EGGS_PER_TABLET = 30;
const arr = (value) => (Array.isArray(value) ? value : []);
const today = () => new Date().toISOString().slice(0, 10);

export const eggCount = (row = {}) => toNumber(row.oeufs_produits ?? row.eggs ?? row.eggs_count ?? row.quantity ?? row.quantite);
export const brokenEggs = (row = {}) => toNumber(row.oeufs_casses ?? row.broken ?? row.casses ?? row.pertes);
export const sellableEggs = (row = {}) => Math.max(0, eggCount(row) - brokenEggs(row));
export const tabletsFromEggs = (value = 0) => ({
  tablettes: Math.floor(Math.max(0, toNumber(value)) / EGGS_PER_TABLET),
  oeufs_restants: Math.max(0, toNumber(value)) % EGGS_PER_TABLET,
});
export const tabletLabel = (value = 0) => {
  const converted = tabletsFromEggs(value);
  return `${fmtNumber(converted.tablettes)} tablette(s) + ${fmtNumber(converted.oeufs_restants)} œuf(s)`;
};

function finishedProductKey({ produit, sourceRecordId, categorie }) {
  return `${String(produit || '').trim().toLowerCase()}::${String(sourceRecordId || '').trim()}::${String(categorie || '').trim()}`;
}

export function isEggStockRow(row = {}) {
  const text = `${row.produit || ''} ${row.nom || ''} ${row.categorie || ''}`.toLowerCase();
  return row.categorie === 'produit_fini_oeufs' || /oeuf|egg|tablette|plateau/.test(text);
}

async function upsertFinishedStock({
  stockCrud,
  produit,
  categorie,
  activiteLiee = 'avicole',
  unite,
  quantityDelta,
  sourceRecordId,
  sourceLabel,
  movementType,
  eventId,
  date,
  status = 'ok',
  notes,
}) {
  const delta = toNumber(quantityDelta);
  if (!delta || !stockCrud) return null;
  const rows = arr(stockCrud.rows);
  const key = finishedProductKey({ produit, sourceRecordId, categorie });
  const existing = rows.find((row) => finishedProductKey({
    produit: row.produit,
    sourceRecordId: row.source_record_id || row.origine_id,
    categorie: row.categorie,
  }) === key);

  if (existing) {
    const nextQty = Math.max(0, toNumber(existing.quantite) + delta);
    await stockCrud.update?.(existing.id, {
      quantite: nextQty,
      statut: nextQty <= 0 ? 'epuise' : status,
      stock_status: nextQty <= 0 ? 'epuise' : status,
      last_movement_type: movementType,
      last_movement_qty: delta,
      last_movement_at: new Date().toISOString(),
      origine_label: sourceLabel,
      source_module: 'avicole',
      source_record_id: sourceRecordId,
      linked_event_id: eventId,
      notes: notes || existing.notes,
    });
    await stockCrud.refresh?.();
    return existing.id;
  }

  if (delta < 0) return null;
  const id = makeId('STKPF');
  await stockCrud.create?.({
    id,
    produit,
    categorie,
    activite_liee: activiteLiee,
    quantite: delta,
    unite,
    seuil: 0,
    stock_max: 0,
    prixUnit: 0,
    statut: status,
    stock_status: status,
    source_module: 'avicole',
    source_record_id: sourceRecordId,
    origine_label: sourceLabel,
    linked_event_id: eventId,
    date_derniere_reception: date || today(),
    last_movement_type: movementType,
    last_movement_qty: delta,
    last_movement_at: new Date().toISOString(),
    notes: notes || `Produit fini généré automatiquement depuis ${sourceLabel || 'Avicole'}`,
  });
  await stockCrud.refresh?.();
  return id;
}

/** Synchronise le stock tablettes d'œufs après un ramassage (création, modification ou suppression). */
export async function syncEggStockFromProduction({ stockCrud, log = {}, previousLog = {} } = {}) {
  const deltaEggs = sellableEggs(log) - sellableEggs(previousLog);
  if (!deltaEggs) return null;
  const converted = tabletsFromEggs(Math.abs(deltaEggs));
  return upsertFinishedStock({
    stockCrud,
    produit: 'Tablettes d’œufs vendables',
    categorie: 'produit_fini_oeufs',
    unite: 'œuf',
    quantityDelta: deltaEggs,
    sourceRecordId: log.lot_id || previousLog?.lot_id,
    sourceLabel: `Lot pondeuse ${log.lot_name || log.lot_id || previousLog?.lot_name || previousLog?.lot_id}`,
    movementType: deltaEggs > 0 ? 'entree_production_tablettes_oeufs' : 'correction_ramassage_tablettes_oeufs',
    eventId: log.id || previousLog?.id,
    date: log.date || previousLog?.date,
    notes: `${fmtNumber(Math.abs(deltaEggs))} œufs = ${fmtNumber(converted.tablettes)} tablette(s) + ${fmtNumber(converted.oeufs_restants)} œuf(s) · 1 tablette = ${EGGS_PER_TABLET} œufs`,
  });
}

export function auditEggProductionStockGaps(data = {}) {
  const eggLogs = arr(data.production_oeufs_logs || data.productionLogs);
  const stocks = arr(data.stock || data.stocks);
  const recentEggs = eggLogs.slice(0, 14).reduce((sum, row) => sum + sellableEggs(row), 0);
  const eggStockQty = stocks.filter(isEggStockRow).reduce((sum, row) => sum + toNumber(row.quantite ?? row.quantity), 0);
  const missing = recentEggs > 0 && eggStockQty <= 0;
  return { recentEggs, eggStockQty, missing, eggLogs: eggLogs.length, stockRows: stocks.filter(isEggStockRow).length };
}
