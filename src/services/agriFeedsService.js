import { createSupabaseCrudService } from './baseSupabaseService.js';

export const feedRawMaterialsService = createSupabaseCrudService('feed_raw_materials');
export const feedRawBatchesService = createSupabaseCrudService('feed_raw_batches');
export const feedFormulasService = createSupabaseCrudService('feed_formulas');
export const feedFormulaVersionsService = createSupabaseCrudService('feed_formula_versions');
export const feedFormulaIngredientsService = createSupabaseCrudService('feed_formula_ingredients');
export const feedFacilityZonesService = createSupabaseCrudService('feed_facility_zones');
