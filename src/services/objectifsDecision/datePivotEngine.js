import { resolveActivityYearContext, buildActivityYearInputFromDataMap } from '../../utils/activityYear.js';
import { HORIZON_FARM_OFFICIAL_BP } from '../horizonFarmOfficialBusinessPlan';
import { inferWorkshopFromLot, resolveBreedCode, theoreticalStandardAtAge, getBreedStock } from './breedStockReferential.js';

const arr = (v) => (Array.isArray(v) ? v : []);
const num = (v = 0) => Number(v || 0) || 0;
const iso = (d) => {
  const date = d instanceof Date ? d : new Date(d || Date.now());
  return Number.isNaN(date.getTime()) ? new Date().toISOString().slice(0, 10) : date.toISOString().slice(0, 10);
};

export function resolvePivotDate(entity = {}) {
  return entity.date_pivot || entity.date_debut || entity.entry_date || entity.date_entree || entity.date_mise_en_place || entity.created_at?.slice?.(0, 10) || iso(new Date());
}

export function computeAgeDays(entity = {}, referenceDate = new Date()) {
  const pivot = resolvePivotDate(entity);
  const ref = referenceDate instanceof Date ? referenceDate : new Date(referenceDate);
  const start = new Date(pivot);
  if (Number.isNaN(start.getTime()) || Number.isNaN(ref.getTime())) return 0;
  return Math.max(0, Math.floor((ref.getTime() - start.getTime()) / 86400000));
}

export function buildLotPivotContext(lot = {}, referenceDate = new Date()) {
  const breedCode = resolveBreedCode(lot);
  const breed = getBreedStock(breedCode);
  const ageDays = computeAgeDays(lot, referenceDate);
  const theoretical = breedCode ? theoreticalStandardAtAge(breedCode, ageDays) : null;
  return {
    lotId: lot.id,
    lotName: lot.name || lot.nom || lot.id,
    workshop: inferWorkshopFromLot(lot),
    breedCode,
    breedLabel: breed?.label || '-',
    pivotDate: resolvePivotDate(lot),
    ageDays,
    theoretical,
    metric: breed?.metric || null,
    targetDays: breed?.targetDays || null,
  };
}

/** Objectifs CA et marge brute mensuels par atelier (exercice). */
export function buildWorkshopFinancialTargets(dataMap = {}, options = {}) {
  const activityYear = options.activityYear || resolveActivityYearContext(buildActivityYearInputFromDataMap(dataMap));
  const settings = dataMap.growth_settings || {};
  const monthlyBp = HORIZON_FARM_OFFICIAL_BP.revenue.monthly || [];
  const marginPct = num(settings.target_gross_margin_pct ?? settings.marge_brute_cible_pct ?? 35) / 100;

  const workshops = [
    { key: 'pondeuses', activity: 'oeufs', bpKey: 'oeufs' },
    { key: 'poulets_chair', activity: 'poulets_chair', bpKey: 'chair' },
    { key: 'bovins', activity: 'bovins', bpKey: 'bovins' },
    { key: 'maraichage', activity: 'cultures', bpKey: null },
  ];

  return workshops.map((ws) => {
    const monthly = monthlyBp.map((row, index) => {
      const caTarget = ws.bpKey ? num(row[ws.bpKey]) : num(settings.maraichage_monthly?.[index]);
      const marginTarget = Math.round(caTarget * marginPct);
      return {
        month: index + 1,
        monthCode: activityYear.year1MonthKeys?.[index] || `M${index + 1}`,
        caTarget,
        marginTarget,
      };
    });
    const annualCa = monthly.reduce((s, r) => s + r.caTarget, 0);
    return {
      ...ws,
      label: ws.key === 'pondeuses' ? 'Pondeuses' : ws.key === 'poulets_chair' ? 'Poulets de chair' : ws.key === 'bovins' ? 'Embouche bovine' : 'Maraîchage',
      monthly,
      annualCaTarget: annualCa,
      annualMarginTarget: Math.round(annualCa * marginPct),
      marginPctTarget: marginPct * 100,
    };
  });
}

export function linkLotsToBreedStandards(lots = [], referenceDate = new Date()) {
  return arr(lots).map((lot) => buildLotPivotContext(lot, referenceDate));
}
