import useCrudModule from '../hooks/useCrudModule';
import { makeId } from '../utils/ids';
import { persistStockMovement } from '../services/stockMovementHelpers';
import StockMovementsPanel from './StockMovementsPanel.jsx';
import StockSalesOpportunityBridge from './StockSalesOpportunityBridge.jsx';
import SellableStockPublicationBridge from './commercial/SellableStockPublicationBridge.jsx';
import StocksV4 from './StocksV4.jsx';

const n = (value = 0) => Number(value || 0) || 0;
const today = () => new Date().toISOString().slice(0, 10);
const labelOf = (row = {}) => row.produit || row.name || row.nom || row.id || 'Produit stock';
const qtyOf = (row = {}) => n(row.quantite ?? row.quantity ?? row.stock);
const unitOf = (row = {}) => row.unite || row.unit || '';
const stockMovementKey = (id, date = today()) => `stock-movement:${id}:${date}`;

export default function StocksV5(props) {
  const eventsCrud = useCrudModule('business_events');
  const movementsCrud = useCrudModule('stock_movements');
  const rows = props.rows || [];
  const movements = props.stockMovements || movementsCrud.rows || [];

  const movementHandlers = {
    onCreateStockMovement: props.onCreateStockMovement || movementsCrud.create,
    onRefreshStockMovements: props.onRefreshStockMovements || movementsCrud.refresh,
  };

  const createMovementEvent = async (before = {}, after = {}, patch = {}) => {
    const oldQty = qtyOf(before);
    const newQty = qtyOf(after);
    const delta = newQty - oldQty;
    if (!after?.id || Math.abs(delta) <= 0) return;
    const movementType = patch.last_movement_type || (delta > 0 ? 'entree' : 'sortie');
    const isLoss = String(movementType).includes('perte');
    const type = isLoss ? 'perte' : delta > 0 ? 'entree' : 'sortie';
    const qty = Math.abs(delta);
    const date = String(patch.date || patch.last_movement_date || today()).slice(0, 10);
    const eventId = makeId('EVT');
    await (props.onCreateBusinessEvent || eventsCrud.create)?.({
      id: eventId,
      event_type: `stock_mouvement_${type}`,
      module_source: 'stock',
      module: 'stock',
      source_type: 'stock',
      entity_type: 'stock',
      source_id: after.id,
      entity_id: after.id,
      title: `${type === 'entree' ? 'Entrée stock' : type === 'perte' ? 'Perte stock' : 'Sortie stock'} · ${labelOf(after)}`,
      description: [`Ancien stock: ${oldQty} ${unitOf(after)}`, `Nouveau stock: ${newQty} ${unitOf(after)}`, `Variation: ${delta > 0 ? '+' : '-'}${qty} ${unitOf(after)}`, patch.last_movement_note || patch.notes || ''].filter(Boolean).join('\n'),
      event_date: date,
      date,
      severity: type === 'perte' ? 'warning' : 'info',
      quantity: qty,
      quantite: qty,
      stock_before: oldQty,
      stock_after: newQty,
      stock_delta: delta,
      linked_stock_id: after.id,
      dedupe_key: `${stockMovementKey(after.id, date)}:${newQty}`,
      saisies_evitees: 1,
    });
    await persistStockMovement({ before, after, patch, linkedEventId: eventId, handlers: movementHandlers });
    await (props.onRefreshBusinessEvents || eventsCrud.refresh)?.();
  };

  const guardedUpdate = async (id, patch = {}) => {
    const before = rows.find((row) => String(row.id) === String(id)) || {};
    const after = { ...before, ...patch, id };
    await props.onUpdate?.(id, patch);
    if (!patch.skip_stock_movement_event && !patch.side_effects_managed) await createMovementEvent(before, after, patch);
  };

  const guardedCreate = async (payload = {}) => {
    await props.onCreate?.(payload);
    if (qtyOf(payload) > 0 && !payload.skip_stock_movement_event && !payload.side_effects_managed) await createMovementEvent({ id: payload.id, quantite: 0, quantity: 0, stock: 0 }, payload, { last_movement_type: 'entree', notes: 'Création stock' });
  };

  return (
    <div className="space-y-4">
      <StocksV4 {...props} rows={rows} onCreate={guardedCreate} onUpdate={guardedUpdate} onCreateBusinessEvent={props.onCreateBusinessEvent || eventsCrud.create} onRefreshBusinessEvents={props.onRefreshBusinessEvents || eventsCrud.refresh} />
      <SellableStockPublicationBridge rows={rows} />
      <StockSalesOpportunityBridge
        rows={rows}
        opportunities={props.opportunities}
        onUpdate={guardedUpdate}
        onRefresh={props.onRefresh}
        onCreateOpportunity={props.onCreateOpportunity}
        onUpdateOpportunity={props.onUpdateOpportunity}
        onRefreshOpportunities={props.onRefreshOpportunities}
        onCreateBusinessEvent={props.onCreateBusinessEvent || eventsCrud.create}
        onRefreshBusinessEvents={props.onRefreshBusinessEvents || eventsCrud.refresh}
      />
      <StockMovementsPanel movements={movements} />
    </div>
  );
}
