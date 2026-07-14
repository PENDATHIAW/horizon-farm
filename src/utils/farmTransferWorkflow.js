/**
 * Achats & Stock V2 - transfert inter-fermes simple (préparatoire + exécution).
 */

import { makeId } from './ids.js';
import { toNumber } from './format.js';
import { persistStockMovement, MOVEMENT_SOURCE_TYPES } from '../services/stockMovementHelpers.js';
import { appendStockTraceStep } from './stockTraceSideEffects.js';

const clean = (value) => String(value || '').trim();
const n = (value) => toNumber(value);
const today = () => new Date().toISOString().slice(0, 10);

export const TRANSFER_STATUS = {
  REQUESTED: 'demande',
  ACCEPTED: 'accepte',
  REFUSED: 'refuse',
  COMPLETED: 'effectue',
};

export function validateFarmTransfer({ sourceFarmId = '', destFarmId = '', stock = {}, qty = 0 } = {}) {
  if (!clean(sourceFarmId)) return 'Ferme source obligatoire.';
  if (!clean(destFarmId)) return 'Ferme destination obligatoire.';
  if (clean(sourceFarmId) === clean(destFarmId)) return 'Source et destination doivent être différentes.';
  if (!stock?.id) return 'Article stock obligatoire.';
  const available = n(stock.quantite ?? stock.quantity);
  if (n(qty) <= 0) return 'Quantité obligatoire.';
  if (n(qty) > available) return `Stock insuffisant : ${available} disponible(s).`;
  return '';
}

export function prepareFarmTransfer({
  sourceFarmId = '',
  destFarmId = '',
  stock = {},
  qty = 0,
  motif = '',
  requestedBy = '',
} = {}) {
  const error = validateFarmTransfer({ sourceFarmId, destFarmId, stock, qty });
  if (error) return { ok: false, error };

  const transferId = makeId('XFER');
  const date = today();
  const unit = stock.unite || stock.unit || '';
  const label = stock.produit || stock.name || stock.nom || stock.id;

  return {
    ok: true,
    transfer: {
      id: transferId,
      status: TRANSFER_STATUS.REQUESTED,
      source_farm_id: sourceFarmId,
      dest_farm_id: destFarmId,
      stock_id: stock.id,
      stock_label: label,
      quantity: n(qty),
      unit,
      motif: clean(motif) || `Transfert ${label}`,
      requested_by: requestedBy,
      requested_at: new Date().toISOString(),
      date,
    },
    businessEvent: {
      id: makeId('EVT'),
      event_type: 'transfert_inter_fermes',
      module_source: 'stock',
      title: `Transfert demandé · ${label}`,
      description: `${n(qty)} ${unit} · ${sourceFarmId} → ${destFarmId}`,
      event_date: date,
      entity_id: transferId,
      linked_stock_id: stock.id,
      farm_id: sourceFarmId,
      metadata: { dest_farm_id: destFarmId, status: TRANSFER_STATUS.REQUESTED },
    },
  };
}

export function buildTransferMovementPayloads({ transfer = {}, stock = {}, sourceBeforeQty = 0, destBeforeQty = 0 } = {}) {
  const qty = n(transfer.quantity);
  if (!transfer.id || !stock.id || qty <= 0) return { exit: null, entry: null };

  const movementRef = `xfer:${transfer.id}`;
  const sourceAfter = Math.max(0, sourceBeforeQty - qty);
  const destAfter = destBeforeQty + qty;

  const base = {
    quantity: qty,
    unit: transfer.unit || stock.unite || '',
    movement_ref: movementRef,
    movement_date: transfer.date || today(),
    metadata: {
      movement_kind: 'transfert_inter_fermes',
      transfer_id: transfer.id,
      motif: transfer.motif,
    },
  };

  return {
    exit: {
      ...base,
      stock_id: stock.id,
      movement_type: 'sortie',
      stock_before: sourceBeforeQty,
      stock_after: sourceAfter,
      stock_delta: sourceAfter - sourceBeforeQty,
      source_module: 'stock',
      source_record_id: transfer.id,
      farm_id: transfer.source_farm_id,
      dedupe_key: `stock-mvt:${movementRef}:exit`,
      notes: `Transfert sortie → ${transfer.dest_farm_id}`,
    },
    entry: {
      ...base,
      stock_id: stock.id,
      movement_type: 'entree',
      stock_before: destBeforeQty,
      stock_after: destAfter,
      stock_delta: destAfter - destBeforeQty,
      source_module: 'stock',
      source_record_id: transfer.id,
      farm_id: transfer.dest_farm_id,
      dedupe_key: `stock-mvt:${movementRef}:entry`,
      notes: `Transfert entrée ← ${transfer.source_farm_id}`,
    },
  };
}

/** Exécute transfert : sortie source + entrée destination (même article, farm_id distinct). */
export async function commitFarmTransfer({
  transfer = {},
  stock = {},
  destStock = null,
  handlers = {},
  existingMovements = [],
} = {}) {
  if (transfer.status !== TRANSFER_STATUS.ACCEPTED && transfer.status !== TRANSFER_STATUS.REQUESTED) {
    return { ok: false, error: 'Transfert non exécutable dans cet état.' };
  }

  const sourceBefore = n(stock.quantite ?? stock.quantity);
  const destRow = destStock || stock;
  const destBefore = n(destRow.quantite ?? destRow.quantity);
  const qty = n(transfer.quantity);
  const sourceAfter = Math.max(0, sourceBefore - qty);
  const destAfter = destBefore + qty;

  await handlers.onUpdateStock?.(stock.id, {
    quantite: sourceAfter,
    quantity: sourceAfter,
    farm_id: transfer.source_farm_id,
    last_movement_type: 'sortie',
    last_movement_label: transfer.motif,
    last_movement_qty: qty,
  });

  if (destStock?.id && destStock.id !== stock.id) {
    await handlers.onUpdateStock?.(destStock.id, {
      quantite: destAfter,
      quantity: destAfter,
      farm_id: transfer.dest_farm_id,
      last_movement_type: 'entree',
      last_movement_label: transfer.motif,
      last_movement_qty: qty,
    });
  } else {
    await handlers.onUpdateStock?.(stock.id, {
      farm_id: transfer.dest_farm_id,
      quantite: destAfter,
      quantity: destAfter,
      last_movement_type: 'entree',
      last_movement_label: transfer.motif,
      last_movement_qty: qty,
    });
  }

  const payloads = buildTransferMovementPayloads({
    transfer: { ...transfer, status: TRANSFER_STATUS.COMPLETED },
    stock,
    sourceBeforeQty: sourceBefore,
    destBeforeQty: destBefore,
  });

  if (handlers.onCreateStockMovement) {
    for (const payload of [payloads.exit, payloads.entry].filter(Boolean)) {
      await persistStockMovement({
        before: { id: payload.stock_id, quantite: payload.stock_before },
        after: { id: payload.stock_id, quantite: payload.stock_after, unite: payload.unit, farm_id: payload.farm_id },
        patch: {
          last_movement_type: payload.movement_type,
          source_module: 'stock',
          source_record_id: transfer.id,
          movement_ref: payload.movement_ref,
          dedupe_key: payload.dedupe_key,
          notes: payload.notes,
          metadata: payload.metadata,
        },
        handlers,
        farmId: payload.farm_id,
        movementRef: payload.movement_ref,
        dedupeKey: payload.dedupe_key,
        existingMovements,
      });
    }
  }

  if (handlers.onCreateBusinessEvent) {
    await handlers.onCreateBusinessEvent({
      id: makeId('EVT'),
      event_type: 'transfert_inter_fermes',
      module_source: 'stock',
      title: `Transfert effectué · ${transfer.stock_label || stock.id}`,
      description: `${qty} ${transfer.unit} · ${transfer.source_farm_id} → ${transfer.dest_farm_id}`,
      event_date: today(),
      entity_id: transfer.id,
      linked_stock_id: stock.id,
      metadata: { status: TRANSFER_STATUS.COMPLETED, movement_kind: MOVEMENT_SOURCE_TYPES.MANUAL_ENTRY },
    });
  }

  await appendStockTraceStep({
    stock,
    eventType: 'transfert_inter_fermes',
    titre: 'Transfert inter-fermes',
    details: `${qty} ${transfer.unit || stock.unite || ''} · ${transfer.source_farm_id} → ${transfer.dest_farm_id}`,
    date: transfer.date || today(),
    handlers,
  });

  return { ok: true, transfer: { ...transfer, status: TRANSFER_STATUS.COMPLETED } };
}
