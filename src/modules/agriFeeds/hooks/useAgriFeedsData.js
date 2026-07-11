import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  feedFacilityZonesService,
  feedFinishedBatchesService,
  feedFormulaIngredientsService,
  feedFormulaVersionsService,
  feedFormulasService,
  feedPhase1ComparisonsService,
  feedProductionOrdersService,
  feedQualityChecksService,
  feedRawBatchesService,
  feedRawMaterialsService,
  feedTrialsService,
} from '../../../services/agriFeedsService.js';

export const AGRI_FEEDS_TABLE_KEYS = Object.freeze([
  'feed_raw_materials',
  'feed_raw_batches',
  'feed_formulas',
  'feed_formula_versions',
  'feed_formula_ingredients',
  'feed_facility_zones',
  'feed_production_orders',
  'feed_finished_batches',
  'feed_quality_checks',
  'feed_trials',
  'feed_phase1_comparisons',
]);

const serviceMap = {
  feed_raw_materials: feedRawMaterialsService,
  feed_raw_batches: feedRawBatchesService,
  feed_formulas: feedFormulasService,
  feed_formula_versions: feedFormulaVersionsService,
  feed_formula_ingredients: feedFormulaIngredientsService,
  feed_facility_zones: feedFacilityZonesService,
  feed_production_orders: feedProductionOrdersService,
  feed_finished_batches: feedFinishedBatchesService,
  feed_quality_checks: feedQualityChecksService,
  feed_trials: feedTrialsService,
  feed_phase1_comparisons: feedPhase1ComparisonsService,
};

const emptyRows = () => Object.fromEntries(AGRI_FEEDS_TABLE_KEYS.map((key) => [key, []]));

export default function useAgriFeedsData({ activeFarm = null, autoLoad = true } = {}) {
  const mountedRef = useRef(false);
  const [rowsByKey, setRowsByKey] = useState(emptyRows);
  const [loadingByKey, setLoadingByKey] = useState({});
  const [errorByKey, setErrorByKey] = useState({});

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const scopePayload = useCallback((payload = {}) => {
    if (!activeFarm?.id || payload.farm_id) return payload;
    return { ...payload, farm_id: activeFarm.id };
  }, [activeFarm?.id]);

  const refreshOne = useCallback(async (key) => {
    const service = serviceMap[key];
    if (!service) return [];
    setLoadingByKey((prev) => ({ ...prev, [key]: true }));
    setErrorByKey((prev) => ({ ...prev, [key]: null }));
    try {
      const rows = await service.getAll();
      const safeRows = Array.isArray(rows) ? rows : [];
      if (mountedRef.current) setRowsByKey((prev) => ({ ...prev, [key]: safeRows }));
      return safeRows;
    } catch (error) {
      if (mountedRef.current) setErrorByKey((prev) => ({ ...prev, [key]: error?.message || 'Erreur de chargement' }));
      return [];
    } finally {
      if (mountedRef.current) setLoadingByKey((prev) => ({ ...prev, [key]: false }));
    }
  }, []);

  useEffect(() => {
    if (!autoLoad) return;
    AGRI_FEEDS_TABLE_KEYS.forEach((key) => { void refreshOne(key); });
  }, [autoLoad, refreshOne]);

  return useMemo(() => Object.fromEntries(AGRI_FEEDS_TABLE_KEYS.map((key) => {
    const service = serviceMap[key];
    const rows = rowsByKey[key] || [];
    const refresh = () => refreshOne(key);
    return [key, {
      rows,
      rawRows: rows,
      usingDemoRows: false,
      loading: Boolean(loadingByKey[key]),
      error: errorByKey[key] || null,
      refresh,
      create: async (payload) => {
        const created = await service.create(scopePayload(payload));
        setRowsByKey((prev) => ({ ...prev, [key]: [created, ...(prev[key] || [])] }));
        void refresh();
        return created;
      },
      update: async (id, payload) => {
        const updated = await service.update(id, scopePayload(payload));
        setRowsByKey((prev) => ({ ...prev, [key]: (prev[key] || []).map((row) => String(row.id) === String(id) ? updated : row) }));
        void refresh();
        return updated;
      },
      remove: async (id) => {
        const result = await service.remove(id);
        setRowsByKey((prev) => ({ ...prev, [key]: (prev[key] || []).filter((row) => String(row.id) !== String(id)) }));
        return result;
      },
    }];
  })), [errorByKey, loadingByKey, refreshOne, rowsByKey, scopePayload]);
}
