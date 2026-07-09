import { createSupabaseCrudService } from './baseSupabaseService.js';

export const feedRawMaterialsService = createSupabaseCrudService('feed_raw_materials');
export const feedRawBatchesService = createSupabaseCrudService('feed_raw_batches');
export const feedFormulasService = createSupabaseCrudService('feed_formulas');
export const feedFormulaVersionsService = createSupabaseCrudService('feed_formula_versions');
export const feedFormulaIngredientsService = createSupabaseCrudService('feed_formula_ingredients');
export const feedFacilityZonesService = createSupabaseCrudService('feed_facility_zones');
export const feedProductionOrdersService = createSupabaseCrudService('feed_production_orders');
export const feedFinishedBatchesService = createSupabaseCrudService('feed_finished_batches');
export const feedQualityChecksService = createSupabaseCrudService('feed_quality_checks');
