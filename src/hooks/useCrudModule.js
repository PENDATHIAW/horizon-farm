import { useMemo } from 'react';
import { useAppData } from '../context/AppContext';
import { filterDeletedRows, forgetDeletedId, rememberDeletedId } from '../utils/deletedRecords';
import { calculateAnimalMetricsWithLoss, calculateCultureMetricsWithLoss, calculateLotMetricsWithLoss } from '../utils/lossAdjustedMetrics';
import { toNumber } from '../utils/format';

const lossValue = (row = {}) => toNumber(row.valeur_perte_estimee ?? row.perte_estimee ?? row.montant_sinistre ?? row.pertes_mortalite_estimees);
const animalLossValue = (row = {}) => toNumber(row.valeur_perte_estimee ?? row.purchase_cost ?? row.cout_achat ?? row.prix_achat);

function enrichAnimal(row = {}, dataMap = {}) {
  const metrics = calculateAnimalMetricsWithLoss({ animal: row, animals: dataMap.animaux || [], feedingLogs: dataMap.alimentation_logs || [], vaccins: dataMap.vaccins || [] });
  return {
    ...row,
    valeur_perte_estimee: animalLossValue(row) || metrics.lossValue,
    cout_total_avec_pertes: metrics.totalCostWithLoss,
    marge_reelle: metrics.margin,
    score_sante: toNumber(row.score_sante) || metrics.healthScore,
  };
}

function enrichLot(row = {}, dataMap = {}) {
  const metrics = calculateLotMetricsWithLoss({ lot: row, feedingLogs: dataMap.alimentation_logs || [], productionLogs: dataMap.production_oeufs_logs || [] });
  return {
    ...row,
    valeur_perte_estimee: lossValue(row) || metrics.lossValue,
    cout_total_avec_pertes: metrics.totalCostsWithLoss,
    marge_estimee_avec_pertes: metrics.estimatedMargin,
    total_cost_per_head: metrics.totalCostPerHead,
    margin_per_head: metrics.marginPerHead,
  };
}

function enrichCulture(row = {}) {
  const metrics = calculateCultureMetricsWithLoss(row);
  return {
    ...row,
    valeur_perte_estimee: lossValue(row) || metrics.lossValue,
    quantite_disponible: toNumber(row.quantite_disponible) || metrics.availableQty,
    cout_total_reel: toNumber(row.cout_total_reel) || metrics.totalCostWithLoss,
    marge_reelle: toNumber(row.marge_reelle) || metrics.marginReal || metrics.marginEstimated,
    score_sante: toNumber(row.score_sante) || metrics.healthScore,
  };
}

function enrichRows(moduleKey, rows, dataMap) {
  if (moduleKey === 'animaux') return rows.map((row) => enrichAnimal(row, dataMap));
  if (moduleKey === 'avicole') return rows.map((row) => enrichLot(row, dataMap));
  if (moduleKey === 'cultures') return rows.map(enrichCulture);
  return rows;
}

export default function useCrudModule(moduleKey) {
  const {
    dataMap,
    loadingMap,
    errorMap,
    createRecord,
    updateRecord,
    deleteRecord,
    refreshModule,
  } = useAppData();

  return useMemo(
    () => {
      const sourceRows = Array.isArray(dataMap[moduleKey]) ? dataMap[moduleKey] : [];
      const filteredRows = filterDeletedRows(moduleKey, sourceRows);
      const rows = enrichRows(moduleKey, filteredRows, dataMap);
      const findExistingRow = (id) => filteredRows.find((row) => String(row?.id) === String(id));
      return {
        rows,
        rawRows: filteredRows,
        usingDemoRows: false,
        loading: Boolean(loadingMap[moduleKey]),
        error: errorMap[moduleKey] || null,
        create: async (payload) => {
          if (payload?.__restoreDeleted && payload?.id) forgetDeletedId(moduleKey, payload.id);
          const { __restoreDeleted, ...safePayload } = payload || {};
          return createRecord(moduleKey, safePayload);
        },
        update: (id, payload) => updateRecord(moduleKey, id, payload),
        remove: async (id) => {
          rememberDeletedId(moduleKey, id, findExistingRow(id));
          return deleteRecord(moduleKey, id);
        },
        refresh: () => refreshModule(moduleKey, { immediate: true }),
      };
    },
    [moduleKey, dataMap, loadingMap, errorMap, createRecord, updateRecord, deleteRecord, refreshModule]
  );
}
