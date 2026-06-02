import { fmtNumber, toNumber } from '../utils/format';
import { makeId } from '../utils/ids';
import { defaultDlcForCategory, isFreshStockCategory } from '../utils/stockFreshProduct';

export const EGGS_PER_TABLET = 30;
export const EGG_STOCK_PRODUCT = 'Tablettes d’œufs vendables';
export const EGG_STOCK_CATEGORY = 'produit_fini_oeufs';

const arr = (value) => (Array.isArray(value) ? value : []);
const today = () => new Date().toISOString().slice(0, 10);
const lower = (v) => String(v || '').toLowerCase();

export function finishedProductKey({ produit, sourceRecordId, categorie }) {
  return `${String(produit || '').trim().toLowerCase()}::${String(sourceRecordId || '').trim()}::${String(categorie || '').trim()}`;
}

export function sellableEggsFromLog(row = {}) {
  const produced = toNumber(row.oeufs_produits ?? row.eggs ?? row.quantity ?? row.quantite);
  const broken = toNumber(row.oeufs_casses ?? row.broken ?? row.casses ?? row.pertes);
  return Math.max(0, produced - broken);
}

export function tabletsFromEggs(eggs = 0) {
  const sellable = Math.max(0, toNumber(eggs));
  return {
    tablettes: Math.floor(sellable / EGGS_PER_TABLET),
    oeufs_restants: sellable % EGGS_PER_TABLET,
  };
}

export function buildEggProductionPayload({ form = {}, lot = {}, previousId = null }) {
  const produced = toNumber(form.oeufs_produits ?? form.eggs_count ?? form.eggs);
  const broken = toNumber(form.oeufs_casses ?? form.broken ?? 0);
  const sellable = Math.max(0, produced - broken);
  const converted = tabletsFromEggs(sellable);
  return {
    ...form,
    id: form.id || previousId || `PROD-${Date.now()}`,
    lot_id: lot.id,
    lot_name: lot.name || lot.nom || lot.id,
    related_id: lot.id,
    date: form.date || today(),
    oeufs_produits: produced,
    oeufs_casses: broken,
    oeufs_vendables: sellable,
    oeufs: sellable,
    eggs_count: sellable,
    tablettes: converted.tablettes,
    tablettes_vendables: converted.tablettes,
    plateaux: converted.tablettes,
    oeufs_restants: converted.oeufs_restants,
    oeufs_reliquat: converted.oeufs_restants,
    oeufs_par_tablette: EGGS_PER_TABLET,
    unite_vente: 'tablette',
    type_evenement: 'ramassage_oeufs',
    source_module: form.source_module || 'avicole',
  };
}

export function generateBatchId({ prefix = 'AB', sourceId = '', date = today() }) {
  const day = String(date).replace(/-/g, '').slice(0, 8);
  const tail = String(sourceId || 'GEN').replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase() || 'GEN';
  return `${prefix}-${day}-${tail}`;
}

export async function upsertFinishedStock({
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
  emplacement = '',
  numero_lot = '',
  date_peremption = '',
  prixUnit = 0,
  is_sellable = true,
}) {
  const delta = toNumber(quantityDelta);
  if (!delta) return null;
  const rows = arr(stockCrud.rows);
  const key = finishedProductKey({ produit, sourceRecordId, categorie });
  const existing = rows.find((row) => finishedProductKey({
    produit: row.produit,
    sourceRecordId: row.source_record_id || row.origine_id,
    categorie: row.categorie,
  }) === key);

  const fresh = isFreshStockCategory(categorie);
  const dlc = date_peremption || (fresh ? defaultDlcForCategory(categorie, date || today()) : '');
  const patch = {
    statut: status,
    stock_status: status,
    last_movement_type: movementType,
    last_movement_qty: delta,
    last_movement_at: new Date().toISOString(),
    origine_label: sourceLabel,
    source_module: existing?.source_module || 'avicole',
    source_record_id: sourceRecordId,
    linked_event_id: eventId,
    notes: notes || existing?.notes,
    is_sellable: is_sellable !== false,
    vendable: is_sellable !== false,
    skip_stock_movement_event: true,
  };
  if (emplacement) patch.emplacement = emplacement;
  if (numero_lot) patch.numero_lot = numero_lot;
  if (dlc) patch.date_peremption = dlc;

  if (existing) {
    const nextQty = Math.max(0, toNumber(existing.quantite) + delta);
    await stockCrud.update?.(existing.id, {
      ...patch,
      quantite: nextQty,
      statut: nextQty <= 0 ? 'epuise' : status,
      stock_status: nextQty <= 0 ? 'epuise' : status,
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
    prixUnit: toNumber(prixUnit),
    prixunit: toNumber(prixUnit),
    prix_unitaire: toNumber(prixUnit),
    emplacement: emplacement || (fresh ? 'Chambre froide 1' : ''),
    numero_lot: numero_lot || (fresh ? generateBatchId({ prefix: 'PF', sourceId: sourceRecordId, date }) : ''),
    date_peremption: dlc,
    ...patch,
    date_derniere_reception: date || today(),
    notes: notes || `Produit fini généré depuis ${sourceLabel || 'production'}`,
  });
  await stockCrud.refresh?.();
  return id;
}

/** Sync stock œufs vendables from production log delta */
export async function syncEggStockFromLogs({ stockCrud, log = {}, previousLog = {} }) {
  const deltaEggs = sellableEggsFromLog(log) - sellableEggsFromLog(previousLog);
  if (!deltaEggs) return null;
  const converted = tabletsFromEggs(Math.abs(deltaEggs));
  const lotId = log.lot_id || previousLog?.lot_id || log.related_id;
  return upsertFinishedStock({
    stockCrud,
    produit: EGG_STOCK_PRODUCT,
    categorie: EGG_STOCK_CATEGORY,
    unite: 'œuf',
    quantityDelta: deltaEggs,
    sourceRecordId: lotId,
    sourceLabel: `Lot pondeuse ${log.lot_name || log.lot_id || previousLog?.lot_name || lotId}`,
    movementType: deltaEggs > 0 ? 'entree_production_tablettes_oeufs' : 'correction_ramassage_tablettes_oeufs',
    eventId: log.id || previousLog?.id,
    date: log.date || previousLog?.date,
    emplacement: 'Chambre froide œufs',
    numero_lot: generateBatchId({ prefix: 'OE', sourceId: lotId, date: log.date }),
    notes: `${fmtNumber(Math.abs(deltaEggs))} œufs = ${fmtNumber(converted.tablettes)} tablette(s) + ${fmtNumber(converted.oeufs_restants)} œuf(s) · 1 tablette = ${EGGS_PER_TABLET} œufs`,
  });
}

/** Deduct sellable eggs from central egg stock line (optional lot-specific line) */
export async function deductEggStockForSale({ stockCrud, lotId = '', tabletsSold = 0, date = today() }) {
  const eggsSold = Math.max(0, toNumber(tabletsSold)) * EGGS_PER_TABLET;
  if (!eggsSold) return null;
  const rows = arr(stockCrud.rows);
  const key = finishedProductKey({ produit: EGG_STOCK_PRODUCT, sourceRecordId: lotId || '', categorie: EGG_STOCK_CATEGORY });
  let existing = rows.find((row) => finishedProductKey({
    produit: row.produit,
    sourceRecordId: row.source_record_id || row.origine_id,
    categorie: row.categorie,
  }) === key);
  if (!existing && lotId) {
    existing = rows.find((row) => lower(row.produit).includes('œuf') || lower(row.produit).includes('oeuf'));
  }
  if (!existing) return null;
  const nextQty = Math.max(0, toNumber(existing.quantite) - eggsSold);
  await stockCrud.update?.(existing.id, {
    quantite: nextQty,
    statut: nextQty <= 0 ? 'epuise' : existing.statut || 'ok',
    stock_status: nextQty <= 0 ? 'epuise' : existing.stock_status || 'ok',
    last_movement_type: 'sortie_vente_oeufs',
    last_movement_qty: eggsSold,
    last_movement_at: new Date().toISOString(),
    skip_stock_movement_event: true,
  });
  await stockCrud.refresh?.();
  return existing.id;
}

export async function transferFreezeStock({
  stockCrud,
  row = {},
  targetEmplacement = 'Congélateur négatif',
  targetCategory = 'produit_fini_viande_surgelé',
  freezeMonths = 6,
}) {
  if (!row?.id) throw new Error('Ligne stock introuvable');
  const date = today();
  const dlcDate = new Date();
  dlcDate.setMonth(dlcDate.getMonth() + toNumber(freezeMonths) || 6);
  const patch = {
    emplacement: targetEmplacement,
    categorie: targetCategory || row.categorie,
    date_peremption: dlcDate.toISOString().slice(0, 10),
    statut: 'ok',
    stock_status: 'ok',
    last_movement_type: 'transfert_congelation',
    last_movement_label: `Transféré vers ${targetEmplacement}`,
    last_movement_at: new Date().toISOString(),
    skip_stock_movement_event: true,
  };
  await stockCrud.update?.(row.id, patch);
  await stockCrud.refresh?.();
  return patch;
}

export function buildMeatStockPayload({
  produit,
  categorie = 'produit_fini_viande_frais',
  quantite,
  unite = 'kg',
  unitCost = 0,
  sourceModule = 'avicole',
  sourceRecordId = '',
  eventId = '',
  origineLabel = '',
  emplacement = 'Chambre froide 1',
  date = today(),
}) {
  return {
    id: makeId('STKVIANDE'),
    produit,
    categorie,
    activite_liee: sourceModule === 'animaux' ? 'animaux' : 'avicole',
    quantite: Number(toNumber(quantite).toFixed(2)),
    unite,
    seuil: 0,
    stock_max: 0,
    prixUnit: Number(toNumber(unitCost).toFixed(2)),
    prixunit: Number(toNumber(unitCost).toFixed(2)),
    prix_unitaire: Number(toNumber(unitCost).toFixed(2)),
    cout_revient_unitaire: Number(toNumber(unitCost).toFixed(2)),
    statut: 'ok',
    stock_status: 'ok',
    source_module: sourceModule,
    source_record_id: sourceRecordId,
    linked_event_id: eventId,
    origine_label: origineLabel,
    emplacement,
    numero_lot: generateBatchId({ prefix: 'AB', sourceId: sourceRecordId, date }),
    date_peremption: defaultDlcForCategory(categorie, date),
    date_derniere_reception: date,
    last_movement_type: 'entree_abattage',
    last_movement_qty: Number(toNumber(quantite).toFixed(2)),
    last_movement_at: new Date().toISOString(),
    is_sellable: true,
    vendable: true,
    skip_stock_movement_event: true,
    notes: `Viande issue transformation · coût ${Number(toNumber(unitCost).toFixed(2))}/kg`,
  };
}

export function buildHarvestStockPayload({
  produit,
  categorie = 'recolte_vegetale',
  quantite,
  unite = 'kg',
  unitCost = 0,
  sourceModule = 'cultures',
  sourceRecordId = '',
  eventId = '',
  origineLabel = '',
  emplacement = 'Chambre froide maraîchage',
  date = today(),
}) {
  return {
    id: makeId('STKREC'),
    produit,
    categorie,
    activite_liee: 'cultures',
    quantite: Number(toNumber(quantite).toFixed(2)),
    unite,
    seuil: 0,
    stock_max: 0,
    prixUnit: Number(toNumber(unitCost).toFixed(2)),
    prixunit: Number(toNumber(unitCost).toFixed(2)),
    prix_unitaire: Number(toNumber(unitCost).toFixed(2)),
    cout_revient_unitaire: Number(toNumber(unitCost).toFixed(2)),
    statut: 'ok',
    stock_status: 'ok',
    source_module: sourceModule,
    source_record_id: sourceRecordId,
    culture_id: sourceRecordId,
    linked_event_id: eventId,
    origine_label: origineLabel,
    emplacement,
    numero_lot: generateBatchId({ prefix: 'RC', sourceId: sourceRecordId, date }),
    date_peremption: defaultDlcForCategory(categorie, date),
    date_derniere_reception: date,
    last_movement_type: 'entree_recolte_culture',
    last_movement_qty: Number(toNumber(quantite).toFixed(2)),
    last_movement_at: new Date().toISOString(),
    is_sellable: true,
    vendable: true,
    skip_stock_movement_event: true,
    notes: `Récolte issue cultures · coût ${Number(toNumber(unitCost).toFixed(2))}/${unite}`,
  };
}
