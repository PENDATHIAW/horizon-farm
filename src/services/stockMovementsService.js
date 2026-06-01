import { createSupabaseCrudService } from './baseSupabaseService.js';

export const stockMovementsCrud = createSupabaseCrudService('stock_movements');

export {
  buildStockMovementPayload,
  listStockMovements,
  persistStockMovement,
  summarizeMovements,
} from './stockMovementHelpers.js';
