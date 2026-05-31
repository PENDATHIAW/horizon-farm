/** Annexe méthodologique — formules, noms de paramètres et sources de données. */

import { DEFAULT_PILOTAGE_SETTINGS, normalizePilotageSettings } from './pilotageSettingsService.js';
import { HIJRI_FESTIVAL_RULES } from './islamicCalendarEngine.js';

const arr = (v) => (Array.isArray(v) ? v : []);

/** Rappels textuels courts (complètent les blocs formule). */
export const DECISION_METHODOLOGY_SECTIONS = [
  { id: 'calendrier', title: 'Calendrier marché', items: ['Dates hijri calculées automatiquement.', 'Surcharge via growth_settings.festival_dates.*'] },
  { id: 'quand-vendre', title: 'QUAND VENDRE', items: ['Compare gainValeurJour et coutRationJour.', 'Bovin → Animaux · Bande chair → Avicole.'] },
  { id: 'quand-lancer', title: 'QUAND LANCER', items: ['Une date pivot par produit et par fête.', 'Priorité critique si pivot dépassée sans stock.'] },
  { id: 'bfr', title: 'BFR', items: ['Blocage si coveragePct < bfr_min_coverage_pct.'] },
  { id: 'demande', title: 'Demande & couverture', items: ['coverage_rate et gap_revenue alimentent Objectifs.'] },
  { id: 'zootechnical', title: 'Zootechnie', items: ['Écart réel vs souche theoreticalStandardAtAge.'] },
  { id: 'break_even', title: 'Point mort', items: ['breakEvenCa et targetCaForNetMargin pour G3.'] },
  { id: 'stock_audit', title: 'Audit aliment', items: ['Surconsommation bâtiment vs théorique souche.'] },
];

/** Blocs formule affichés dans l'onglet Annexe (Centre + Objectifs). */
export const FORMULA_BLOCKS = [
  {
    id: 'hijri_calendar',
    modules: ['centre_ia', 'objectifs_croissance'],
    title: 'Calendrier hijri — dates de fêtes',
    formula: `dateGrégorienne = hijriToGregorian(hy, hm, hd)

Tabaski     → hy, hm=12, hd=10
Korité      → hy, hm=10, hd=1
Ramadan     → hy, hm=9,  hd=1
Magal       → hy, hm=2,  hd=18
Gamou       → hy, hm=3,  hd=12
Fin d'année → grégorien, 24 décembre

datePivot(fête, produit) = dateFête − cycleDays(produit)`,
    parameters: [
      { name: 'hy', label: 'Année hijri', unit: '—', default: 'auto', source: 'gregorianToHijri(dateDuJour)' },
      { name: 'hm / hd', label: 'Mois / jour hijri', unit: '—', default: 'voir règles', source: 'islamicCalendarEngine.HIJRI_FESTIVAL_RULES' },
      { name: 'festival_dates', label: 'Surcharge manuelle', unit: 'ISO', default: 'vide', source: 'growth_settings.festival_dates.* (pilotage localStorage)' },
    ],
    outputs: ['dateIso', 'eventDate', 'pivotDate'],
  },
  {
    id: 'sell_now',
    modules: ['centre_ia'],
    title: 'QUAND VENDRE — maturité économique',
    formula: `gmqSmoothed = lissage(GMQ, alimentation_logs, 7j)

Bovin embouche :
  gainValeurJour = gmqSmoothed × prixKg
  coutRationJour = dailyFeedKg × feedPrice

Bande chair :
  gainValeurJour = gmqSmoothed × effectifActif × prixKg
  coutRationJour = dailyFeedKg × feedPrice

SI gainValeurJour < coutRationJour → URGENCE VENTE`,
    parameters: [
      { name: 'gmqSmoothed', label: 'GMQ lissée', unit: 'kg/j', default: '—', source: 'calculateAnimalCost / alimentation_logs' },
      { name: 'prixKg', label: 'Prix marché viande', unit: 'FCFA/kg', default: '—', source: 'animal.prix_kg_marche | lot.prix_vente_kg | market_prices' },
      { name: 'dailyFeedKg', label: 'Aliment consommé / jour', unit: 'kg/j', default: '—', source: 'dailyFeedKgForEntity(entity, alimentation_logs)' },
      { name: 'feedPrice', label: 'Prix aliment', unit: 'FCFA/kg', default: '—', source: 'feedPricePerKg(stock)' },
      { name: 'effectifActif', label: 'Effectif bande', unit: 'sujets', default: '—', source: 'avicoleActiveCount(lot)' },
    ],
    outputs: ['gainValeurJour', 'coutRationJour', 'priority=critique'],
  },
  {
    id: 'launch_timing',
    modules: ['centre_ia'],
    title: 'QUAND LANCER — dates pivot par fête et produit',
    formula: `Pour chaque fête F et produit P :
  pivotDate = eventDate − cycleDays[P]

cycleDays :
  bovins         = BOVIN_CYCLE_DAYS (90)
  poulets_chair  = BROILER_CYCLE_DAYS (40)
  oeufs          = 30

Priorité :
  critique si pivotDate dépassée ET hasActiveLot = false
  haute    si 0 ≤ joursRestants ≤ 14
  moyenne  sinon

hasActiveLot(bovins)  : animaux bovins entrés ≥ cycleDays − 15
hasActiveLot(chair)   : bande chair lancée ≥ cycleDays − 10
hasActiveLot(oeufs)   : pondeuses actives > 0`,
    parameters: [
      { name: 'BOVIN_CYCLE_DAYS', label: 'Cycle embouche bovine', unit: 'j', default: '90', source: 'strategicDecisionEngine.js' },
      { name: 'BROILER_CYCLE_DAYS', label: 'Cycle poulet chair', unit: 'j', default: '40', source: 'strategicDecisionEngine.js' },
      { name: 'eventDate', label: 'Date fête', unit: 'ISO', default: 'calcul hijri', source: 'buildMarketEvents()' },
      { name: 'pivotDate', label: 'Date limite mise en place', unit: 'ISO', default: '—', source: 'addDays(eventDate, −cycleDays)' },
    ],
    outputs: ['eventLabel', 'activityLines[]', 'message', 'priority'],
  },
  {
    id: 'ith_heat',
    modules: ['centre_ia'],
    title: 'Stress thermique (ITH)',
    formula: `ITH = temperature + humidity

Canicule si :
  ITH ≥ ith_stress_threshold
  OU temp ≥ HEAT_FORECAST_THRESHOLD (38°C)
  OU ≥ 3 jours prévision ≥ 38°C

Action : delayDays = 14 · densityReductionPct = 15`,
    parameters: [
      { name: 'temperature', label: 'Température', unit: '°C', default: '—', source: 'meteo.temperature | meteo.temp' },
      { name: 'humidity', label: 'Humidité', unit: '%', default: '—', source: 'meteo.humidity | meteo.humidite' },
      { name: 'ith_stress_threshold', label: 'Seuil ITH stress', unit: '—', default: '29', source: 'growth_settings.ith_stress_threshold' },
      { name: 'HEAT_FORECAST_THRESHOLD', label: 'Seuil chaleur', unit: '°C', default: '38', source: 'strategicDecisionEngine.js' },
    ],
    outputs: ['ith', 'delayDays', 'densityReductionPct'],
  },
  {
    id: 'bfr',
    modules: ['centre_ia'],
    title: 'BFR cycle — blocage lancement',
    formula: `coutEstimeCycle = plannedHeadcount × avgDailyFeedPerHead × cycleDays × feedPrice

totalAvailable = max(0, treasury) + vipReceivables

coveragePct = (totalAvailable / coutEstimeCycle) × 100

blocked = coveragePct < bfr_min_coverage_pct

treasury = Σ entrées finances − Σ sorties finances
vipReceivables = créances clients VIP échéance ≤ 7 j`,
    parameters: [
      { name: 'next_band_size', label: 'Effectif prochaine bande', unit: 'sujets', default: '5000', source: 'growth_settings.next_band_size' },
      { name: 'avgDailyFeedPerHead', label: 'Ration / tête / jour', unit: 'kg', default: '0,095 chair · 4,5 bovin', source: 'strategicDecisionEngine.validateCycleBfrCoverage' },
      { name: 'feedPrice', label: 'Prix aliment', unit: 'FCFA/kg', default: '—', source: 'feedPricePerKg(stock)' },
      { name: 'bfr_min_coverage_pct', label: 'Couverture minimum', unit: '%', default: '50', source: 'growth_settings.bfr_min_coverage_pct' },
      { name: 'vip_client_ids', label: 'Clients VIP BFR', unit: 'ids', default: '[]', source: 'growth_settings.vip_client_ids' },
    ],
    outputs: ['coveragePct', 'blocked', 'coutEstimeCycle', 'totalAvailable'],
  },
  {
    id: 'sanitary',
    modules: ['centre_ia'],
    title: 'Vide sanitaire',
    formula: `sanitaryMinDays = growth_settings.sanitary_min_days

Prolongation si mortalité bande précédente > mortality_threshold_pct :
  extraVacuumDays = growth_settings.extra_vacuum_days

blocking = joursDepuisDernièreBande < sanitaryMinDays + extraVacuumDays`,
    parameters: [
      { name: 'sanitary_min_days', label: 'Vide sanitaire min', unit: 'j', default: '10', source: 'growth_settings.sanitary_min_days' },
      { name: 'mortality_threshold_pct', label: 'Seuil mortalité bande préc.', unit: '%', default: '5', source: 'growth_settings.mortality_threshold_pct' },
      { name: 'extra_vacuum_days', label: 'Prolongation pathologie', unit: 'j', default: '7', source: 'growth_settings.extra_vacuum_days' },
    ],
    outputs: ['blocking', 'vacuumDaysRemaining'],
  },
  {
    id: 'stock_audit',
    modules: ['centre_ia'],
    title: 'Audit stock aliment',
    formula: `overPct = ((consoRéelle − consoThéorique) / consoThéorique) × 100

Alerte si overPct > STOCK_AUDIT_THRESHOLD_PCT (10%)
pendant STOCK_AUDIT_CONSECUTIVE_DAYS (3) jours consécutifs`,
    parameters: [
      { name: 'STOCK_AUDIT_THRESHOLD_PCT', label: 'Écart max acceptable', unit: '%', default: '10', source: 'strategicDecisionEngine.js' },
      { name: 'STOCK_AUDIT_CONSECUTIVE_DAYS', label: 'Jours consécutifs', unit: 'j', default: '3', source: 'strategicDecisionEngine.js' },
    ],
    outputs: ['overPct', 'building', 'consecutiveDays'],
  },
  {
    id: 'commercial_gap',
    modules: ['centre_ia', 'objectifs_croissance'],
    title: 'Écart CA commercial (Recommandations)',
    formula: `remaining = max(0, activityGoal.target − activityGoal.realized)
ca_attainment = (realized / target) × 100

Priorité haute si remaining > 0`,
    parameters: [
      { name: 'activityGoal.target', label: 'Objectif CA activité', unit: 'FCFA', default: 'BP officiel', source: 'buildGoalPerformance() · HORIZON_FARM_OFFICIAL_BP' },
      { name: 'activityGoal.realized', label: 'CA réalisé période', unit: 'FCFA', default: '—', source: 'sales_orders + finances (entrées)' },
      { name: 'annual_ca_target', label: 'Objectif annuel global', unit: 'FCFA', default: 'BP', source: 'growth_settings.annual_ca_target' },
    ],
    outputs: ['gap_revenue', 'ca_attainment', 'priority'],
  },
  {
    id: 'demand_coverage',
    modules: ['objectifs_croissance', 'centre_ia'],
    title: 'Demande & couverture stock',
    formula: `demandIndex = baseFactor(saison) × eventBoost(fête)
revenueTarget = (annualTarget × mix[activité] / 12) × demandIndex
estimatedUnits = revenueTarget / unitPrice

availableRevenue = availableUnits × unitPrice
coverageRate = (availableRevenue / revenueTarget) × 100
gapRevenue = max(0, revenueTarget − availableRevenue)
gapUnits = max(0, estimatedUnits − availableUnits)

coverage_status :
  ≥ 100% → couvert · ≥ 60% → partiel · sinon insuffisant`,
    parameters: [
      { name: 'annual_mix', label: 'Mix activités', unit: 'parts', default: 'BP', source: 'growth_settings.annual_mix' },
      { name: 'demandLevel', label: 'Demande', unit: 'forte|normale|faible', default: '—', source: 'horizonCommercialCalendar + eventBoost' },
      { name: 'unitPrice', label: 'Prix unitaire moyen', unit: 'FCFA', default: 'historique ventes', source: 'avgUnitPrice(activity, sales_orders)' },
      { name: 'availableUnits', label: 'Stock / production dispo', unit: 'unités', default: '—', source: 'buildFarmSupplyCoverage()' },
    ],
    outputs: ['coverage_rate', 'gap_revenue', 'gap_units', 'target_date', 'latest_start'],
  },
  {
    id: 'zootechnical',
    modules: ['objectifs_croissance'],
    title: 'Écarts zootechniques (Objectifs)',
    formula: `realValue = mesure terrain (ponte, poids, GMQ…)
theoretical = theoreticalStandardAtAge(code_souche, ageDays)
gapPct = ((real − theoretical) / theoretical) × 100

statut = OK si |gapPct| ≤ tolerancePct
         alerte si gapPct < −tolerancePct`,
    parameters: [
      { name: 'code_souche', label: 'Code souche', unit: '—', default: '—', source: 'lot.code_souche | breedStockReferential' },
      { name: 'tolerancePct', label: 'Tolérance écart', unit: '%', default: '5 ponte · 8 poids', source: 'breedStockReferential' },
      { name: 'gmqTargetG', label: 'Cible GMQ souche', unit: 'g/j', default: '55 chair · 800 bovin', source: 'breedStockReferential.gmqTargetG' },
    ],
    outputs: ['realValue', 'theoretical', 'gapPct', 'ponteAlert', 'icAlert'],
  },
  {
    id: 'break_even',
    modules: ['objectifs_croissance'],
    title: 'Point mort mensuel (G3)',
    formula: `fixedMonthly = (fixedCosts.annual + payroll.annual) / 12
variableMonthly = variableCosts.correctedAnnualTotal / 12

breakEvenCa = (fixedMonthly + variableMonthly) / grossMarginPct

targetCaForNetMargin =
  (fixedMonthly + variableMonthly) / (grossMarginPct − netMarginTargetPct)

gapToBreakEven = breakEvenCa − caRealizedMonth`,
    parameters: [
      { name: 'target_gross_margin_pct', label: 'Marge brute cible', unit: '%', default: '35', source: 'growth_settings.target_gross_margin_pct' },
      { name: 'target_net_margin_pct', label: 'Marge nette cible', unit: '%', default: '12', source: 'growth_settings.target_net_margin_pct' },
      { name: 'fixedCosts / payroll', label: 'Charges fixes BP', unit: 'FCFA/an', default: 'BP officiel', source: 'HORIZON_FARM_OFFICIAL_BP' },
    ],
    outputs: ['breakEvenCa', 'targetCaForNetMargin', 'isProfitable'],
  },
  {
    id: 'ic_chair',
    modules: ['centre_ia', 'objectifs_croissance'],
    title: 'Indice de consommation chair (IC)',
    formula: `IC = feedKg / liveWeightKg

Cible BROILER_IC_TARGET = 1,6 – 1,9

Alerte si IC > 1,9 (gaspillage) ou IC anormalement bas`,
    parameters: [
      { name: 'feedKg', label: 'Aliment consommé', unit: 'kg', default: '—', source: 'alimentation_logs cumul lot' },
      { name: 'liveWeightKg', label: 'Poids vif total', unit: 'kg', default: '—', source: 'lot.poids_moyen × effectif' },
      { name: 'BROILER_IC_TARGET', label: 'Plage cible IC', unit: '—', default: '1,6 – 1,9', source: 'decisionCenterMetrics.js' },
    ],
    outputs: ['ic', 'tone'],
  },
  {
    id: 'charts_g1_g7',
    modules: ['objectifs_croissance'],
    title: 'Graphiques G1 – G7 (Objectifs)',
    formula: `G1 : courbe ponte réelle vs souche (theoreticalStandardAtAge)
G2 : comparaison lots (rentabilité / cycle)
G3 : CA mensuel vs breakEvenCa vs targetCaForNetMargin
G4 : âge lots (J+ageDays)
G5 : flux trésorerie
G6 : jauge attainment objectif annuel (%)
G7 : coût revient vs marché vs prix pratiqué par activité`,
    parameters: [
      { name: 'chartData.g1…g7', label: 'Jeux de données', unit: '—', default: '—', source: 'buildChartDataset() · objectifsDecisionEngine' },
    ],
    outputs: ['chartData'],
  },
  {
    id: 'charts_centre',
    modules: ['centre_ia'],
    title: 'Graphiques Centre décisionnel',
    formula: `Ponte vs aliment : layingRate(%) + feedKg/j
IC chair par lot : feedKg / liveWeightKg
Embouche GMQ : gmq vs seuil 400 g/j
Silo : daysLeft = stockKg / consoJour
Maraîchage : simulateur charges / rendement / prix marché`,
    parameters: [
      { name: 'STOCK_CRITICAL_DAYS', label: 'Seuil stock aliment critique', unit: 'j', default: '5', source: 'decisionCenterMetrics.js' },
      { name: 'production_oeufs_logs', label: 'Journal ponte', unit: '—', default: '—', source: 'dataMap.production_oeufs_logs' },
    ],
    outputs: ['graphiques.avicoleDaily', 'graphiques.broilerIC', 'graphiques.cattleGMQ'],
  },
];

export const ENTITY_GLOSSARY = [
  { term: 'Bande / lot avicole', definition: 'Ensemble poulets chair ou pondeuses — champs lot_id, module Avicole.' },
  { term: 'Bête / embouche', definition: 'Animal individuel bovin/ovin/caprin — champs animaux.id, module Animaux.' },
  { term: 'gmqSmoothed', definition: 'Gain moyen quotidien lissé (kg/j) sur les derniers logs alimentation.' },
  { term: 'pivotDate', definition: 'Dernière date pour lancer/acheter avant une fête (eventDate − cycleDays).' },
  { term: 'coveragePct', definition: 'Couverture BFR en % — trésorerie+VIP vs coût cycle aliment.' },
  { term: 'coverage_rate', definition: 'Couverture demande en % — stock valorisé vs objectif CA activité.' },
  { term: 'ITH', definition: 'temperature + humidity — indice stress thermique.' },
  { term: 'IC', definition: 'feedKg / liveWeightKg — indice de consommation chair.' },
];

export const PILOTAGE_PARAM_ROWS = [
  { key: 'sanitary_min_days', label: 'Vide sanitaire minimum', unit: 'j' },
  { key: 'mortality_threshold_pct', label: 'Seuil mortalité bande préc.', unit: '%' },
  { key: 'extra_vacuum_days', label: 'Prolongation pathologie', unit: 'j' },
  { key: 'next_band_size', label: 'Effectif prochaine bande', unit: 'sujets' },
  { key: 'bfr_min_coverage_pct', label: 'Couverture BFR minimum', unit: '%' },
  { key: 'ith_stress_threshold', label: 'Seuil ITH stress', unit: '—' },
];

const FESTIVAL_PARAM_ROWS = Object.entries(HIJRI_FESTIVAL_RULES).map(([key, rule]) => ({
  key,
  label: rule.label,
  rule: `${rule.day} / mois hijri ${rule.month}`,
}));

/** Valeurs pilotage + fêtes pour affichage dynamique dans l'Annexe. */
export function buildAnnexeSnapshot(dataMap = {}) {
  const settings = normalizePilotageSettings(dataMap.growth_settings || DEFAULT_PILOTAGE_SETTINGS);
  return {
    pilotage: PILOTAGE_PARAM_ROWS.map((row) => ({
      ...row,
      value: settings[row.key],
      default: DEFAULT_PILOTAGE_SETTINGS[row.key],
    })),
    festivals: FESTIVAL_PARAM_ROWS,
    growthSettings: {
      annual_ca_target: settings.annual_ca_target || dataMap.growth_settings?.annual_ca_target || 'BP officiel',
      target_gross_margin_pct: dataMap.growth_settings?.target_gross_margin_pct ?? 35,
      target_net_margin_pct: dataMap.growth_settings?.target_net_margin_pct ?? 12,
      vip_count: arr(settings.vip_client_ids).length,
    },
  };
}

export function formulasForModule(moduleId = 'centre_ia') {
  return FORMULA_BLOCKS.filter((block) => block.modules.includes(moduleId));
}

export default FORMULA_BLOCKS;
