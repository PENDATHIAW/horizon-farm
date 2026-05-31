/** Annexe méthodologique — formules, noms de paramètres et sources de données (exhaustif). */

import { DEFAULT_PILOTAGE_SETTINGS, normalizePilotageSettings } from './pilotageSettingsService.js';
import { HIJRI_FESTIVAL_RULES } from './islamicCalendarEngine.js';

const arr = (v) => (Array.isArray(v) ? v : []);

export const FORMULA_CATEGORIES = [
  { id: 'calendrier', label: 'Calendrier & timing' },
  { id: 'commerce', label: 'Commerce & objectifs CA' },
  { id: 'demande', label: 'Demande & couverture' },
  { id: 'zootechnie', label: 'Zootechnie & efficacité' },
  { id: 'couts', label: 'Coûts & rentabilité' },
  { id: 'flux', label: 'Flux, stock & logistique' },
  { id: 'prix', label: 'Prix dynamique & marge' },
  { id: 'analytique', label: 'Analytique croisée' },
  { id: 'graphiques', label: 'Graphiques décisionnels' },
  { id: 'pilotage', label: 'Pilotage & alertes techniques' },
];

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
  { id: 'couts', title: 'Coûts revient', items: ['calculateAnimalCost / calculateAvicoleLotCost — MCA = CA − coût aliment.'] },
  { id: 'prix', title: 'Prix recommandé', items: ['MAX(prixPlancher ; prixMarché × coefSaisonnalité).'] },
];

/** Blocs formule affichés dans l'onglet Annexe (Centre + Objectifs) — exhaustif. */
export const FORMULA_BLOCKS = [
  {
    id: "hijri_calendar",
    modules: ["centre_ia", "objectifs_croissance"],
    category: "calendrier",
    title: "Calendrier hijri — dates de fêtes",
    formula: "dateGrégorienne = hijriToGregorian(hy, hm, hd)\n\nTabaski     → hy, hm=12, hd=10\nKorité      → hy, hm=10, hd=1\nRamadan     → hy, hm=9,  hd=1\nMagal       → hy, hm=2,  hd=18\nGamou       → hy, hm=3,  hd=12\nFin d'année → grégorien, 24 décembre\n\ndatePivot(fête, produit) = dateFête − cycleDays(produit)",
    parameters: [
      { name: "hy", label: "Année hijri", unit: "—", default: "auto", source: "gregorianToHijri(dateDuJour)" },
      { name: "hm / hd", label: "Mois / jour hijri", unit: "—", default: "voir règles", source: "islamicCalendarEngine.HIJRI_FESTIVAL_RULES" },
      { name: "festival_dates", label: "Surcharge manuelle", unit: "ISO", default: "vide", source: "growth_settings.festival_dates.*" },
    ],
    outputs: ["dateIso", "eventDate", "pivotDate"],
  },
  {
    id: "launch_timing",
    modules: ["centre_ia"],
    category: "calendrier",
    title: "QUAND LANCER — dates pivot par fête et produit",
    formula: "Pour chaque fête F et produit P :\n  pivotDate = eventDate − cycleDays[P]\n\ncycleDays :\n  bovins         = BOVIN_CYCLE_DAYS (90)\n  poulets_chair  = BROILER_CYCLE_DAYS (40)\n  oeufs          = 30\n\nPriorité :\n  critique si pivotDate dépassée ET hasActiveLot = false\n  haute    si 0 ≤ joursRestants ≤ 14\n  moyenne  sinon\n\nhasActiveLot(bovins)  : animaux bovins entrés ≥ cycleDays − 15\nhasActiveLot(chair)   : bande chair lancée ≥ cycleDays − 10\nhasActiveLot(oeufs)   : pondeuses actives > 0",
    parameters: [
      { name: "BOVIN_CYCLE_DAYS", label: "Cycle embouche bovine", unit: "j", default: "90", source: "strategicDecisionEngine.js" },
      { name: "BROILER_CYCLE_DAYS", label: "Cycle poulet chair", unit: "j", default: "40", source: "strategicDecisionEngine.js" },
      { name: "eventDate", label: "Date fête", unit: "ISO", default: "calcul hijri", source: "buildMarketEvents()" },
      { name: "pivotDate", label: "Date limite mise en place", unit: "ISO", default: "—", source: "addDays(eventDate, −cycleDays)" },
    ],
    outputs: ["eventLabel", "activityLines[]", "message", "priority"],
  },
  {
    id: "date_pivot",
    modules: ["centre_ia", "objectifs_croissance"],
    category: "calendrier",
    title: "Date pivot lot et âge (datePivotEngine)",
    formula: "pivotDate = entity.date_pivot | date_debut | date_entree | created_at\n\nageDays = floor((referenceDate − pivotDate) / 86400000)\n\ntheoretical = theoreticalStandardAtAge(breedCode, ageDays)\n\nbuildLotPivotContext → { lotId, workshop, breedCode, ageDays, theoretical }",
    parameters: [
      { name: "date_pivot", label: "Date pivot lot", unit: "ISO", default: "date_entree", source: "lot.date_pivot | date_debut" },
      { name: "breedCode", label: "Code souche", unit: "—", default: "—", source: "resolveBreedCode(lot) · breedStockReferential" },
      { name: "referenceDate", label: "Date de référence", unit: "ISO", default: "aujourd'hui", source: "options.referenceDate" },
    ],
    outputs: ["ageDays", "theoretical", "workshop", "targetDays"],
  },
  {
    id: "lead_times",
    modules: ["centre_ia", "objectifs_croissance"],
    category: "calendrier",
    title: "Délais moyens de cycle (estimateLeadTimes)",
    formula: "leadTimes[activité] = moyenne(historique ERP) ou défaut BP\n\nDéfauts :\n  oeufs = 150 j · poulets_chair = 40 j\n  bovins/ovins/caprins = 90 j · cultures = 90 j\n\nUtilisé pour latest_start = target_date − leadTimes[activité]",
    parameters: [
      { name: "days_to_lay", label: "Délai ponte lot", unit: "j", default: "150", source: "lot.days_to_lay | age_debut_ponte_jours" },
      { name: "cycle_days", label: "Durée cycle chair", unit: "j", default: "40", source: "lot.cycle_days | duree_cycle" },
      { name: "days_to_sale", label: "Délai vente bovin", unit: "j", default: "90", source: "animal.days_to_sale | duree_garde_jours" },
    ],
    outputs: ["leadTimes.oeufs", "leadTimes.poulets_chair", "leadTimes.bovins"],
  },
  {
    id: "commercial_calendar",
    modules: ["centre_ia"],
    category: "calendrier",
    title: "Calendrier commercial mensuel (buildCommercialCalendar)",
    formula: "Pour chaque mois M de l'exercice :\n  target = BP.revenue.monthly[M].total\n  focus  = activités avec CA BP > 0 (oeufs, chair, bovins)\n\ncurrent = mois en cours · next = 6 mois suivants",
    parameters: [
      { name: "monthly_targets", label: "Objectifs mensuels", unit: "FCFA", default: "BP officiel", source: "HORIZON_FARM_OFFICIAL_BP.revenue.monthly" },
      { name: "activityYear", label: "Exercice", unit: "—", default: "auto", source: "resolveActivityYearContext(dataMap)" },
    ],
    outputs: ["current", "next[]", "year[]"],
  },
  {
    id: "sell_now",
    modules: ["centre_ia"],
    category: "commerce",
    title: "QUAND VENDRE — maturité économique",
    formula: "gmqSmoothed = lissage(GMQ, alimentation_logs, 7j)\n\nBovin embouche :\n  gainValeurJour = gmqSmoothed × prixKg\n  coutRationJour = dailyFeedKg × feedPrice\n\nBande chair :\n  gainValeurJour = gmqSmoothed × effectifActif × prixKg\n  coutRationJour = dailyFeedKg × feedPrice\n\nSI gainValeurJour < coutRationJour → URGENCE VENTE",
    parameters: [
      { name: "gmqSmoothed", label: "GMQ lissée", unit: "kg/j", default: "—", source: "calculateAnimalCost / alimentation_logs" },
      { name: "prixKg", label: "Prix marché viande", unit: "FCFA/kg", default: "—", source: "animal.prix_kg_marche | lot.prix_vente_kg" },
      { name: "dailyFeedKg", label: "Aliment consommé / jour", unit: "kg/j", default: "—", source: "dailyFeedKgForEntity()" },
      { name: "feedPrice", label: "Prix aliment", unit: "FCFA/kg", default: "—", source: "feedPricePerKg(stock)" },
      { name: "effectifActif", label: "Effectif bande", unit: "sujets", default: "—", source: "avicoleActiveCount(lot)" },
    ],
    outputs: ["gainValeurJour", "coutRationJour", "priority=critique"],
  },
  {
    id: "commercial_gap",
    modules: ["centre_ia", "objectifs_croissance"],
    category: "commerce",
    title: "Écart CA commercial (buildGoalPerformance)",
    formula: "remaining = max(0, activityGoal.target − activityGoal.realized)\nca_attainment = (realized / target) × 100\n\nPar activité :\n  target = monthTarget × (activityAnnual / annualRevenueTarget)\n  realized = Σ ventes classées (classifySaleActivity)\n\nGlobal :\n  monthTarget = BP mensuel ou growth_settings.monthly_targets[i]\n  encaisse = min(realized, max(payments, finances entrées))\n  marge = realized − depenses",
    parameters: [
      { name: "activityGoal.target", label: "Objectif CA activité", unit: "FCFA", default: "BP officiel", source: "buildGoalPerformance()" },
      { name: "annual_ca_target", label: "Objectif annuel global", unit: "FCFA", default: "BP", source: "growth_settings.annual_ca_target" },
      { name: "monthTarget", label: "Objectif mois courant", unit: "FCFA", default: "BP mensuel", source: "monthlyRevenueTargets[planIndex]" },
    ],
    outputs: ["gap_revenue", "ca_attainment", "remaining", "encaisse", "marge"],
  },
  {
    id: "production_capacity",
    modules: ["centre_ia", "objectifs_croissance"],
    category: "commerce",
    title: "Capacité production ponte (buildProductionCapacity)",
    formula: "activeLayers = Σ effectif pondeuses actives\n\navgEggsDay = Σ oeufs (14 derniers j) / min(14, nb jours logs)\n\nlayingRate = (avgEggsDay / activeLayers) × 100\n\ntabletsDay = avgEggsDay / 30",
    parameters: [
      { name: "production_oeufs_logs", label: "Journal ponte", unit: "—", default: "—", source: "dataMap.production_oeufs_logs" },
      { name: "activeLayers", label: "Pondeuses actives", unit: "sujets", default: "—", source: "avicoleActiveCount(lot pondeuse)" },
    ],
    outputs: ["eggsDay", "tabletsDay", "layingRate", "capacitySource"],
  },
  {
    id: "financial_gap",
    modules: ["objectifs_croissance"],
    category: "commerce",
    title: "Écarts financiers ateliers (buildFinancialGapAnalysis)",
    formula: "Par atelier ws :\n  caRealized = Σ ventes mois (classifySaleActivity)\n  caTargetMonth = workshopTargets.monthly[monthIdx].caTarget\n  caGap = caTargetMonth − caRealized\n  caAttainment = (caRealized / caTargetMonth) × 100\n\n  marginRealized = caRealized × (marginPctTarget / 100)\n  marginGap = marginTargetMonth − marginRealized\n\n  mispricingAlert = pricing.mispricingRisk",
    parameters: [
      { name: "workshopTargets", label: "Objectifs ateliers", unit: "FCFA/mois", default: "BP", source: "buildWorkshopFinancialTargets()" },
      { name: "marginPctTarget", label: "Marge brute cible", unit: "%", default: "35", source: "growth_settings.target_gross_margin_pct" },
    ],
    outputs: ["caGap", "marginGap", "mispricingAlerts[]"],
  },
  {
    id: "workshop_targets",
    modules: ["objectifs_croissance"],
    category: "commerce",
    title: "Objectifs CA/marge par atelier (buildWorkshopFinancialTargets)",
    formula: "Pour chaque atelier (pondeuses, chair, bovins, maraîchage) :\n  caTarget[M] = BP.revenue.monthly[M][bpKey]\n  marginTarget[M] = caTarget[M] × target_gross_margin_pct\n\nannualCaTarget = Σ caTarget[M]\nannualMarginTarget = annualCaTarget × marginPct",
    parameters: [
      { name: "target_gross_margin_pct", label: "Marge brute cible", unit: "%", default: "35", source: "growth_settings.target_gross_margin_pct" },
      { name: "maraichage_monthly", label: "CA maraîchage mensuel", unit: "FCFA", default: "settings", source: "growth_settings.maraichage_monthly" },
    ],
    outputs: ["monthly[]", "annualCaTarget", "annualMarginTarget"],
  },
  {
    id: "break_even",
    modules: ["centre_ia", "objectifs_croissance"],
    category: "commerce",
    title: "Point mort mensuel (computeMonthlyBreakEven)",
    formula: "fixedMonthly = (fixedCosts.annual + payroll.annual) / 12\nvariableMonthly = variableCosts.correctedAnnualTotal / 12\n\nbreakEvenCa = (fixedMonthly + variableMonthly) / grossMarginPct\n\ntargetCaForNetMargin =\n  (fixedMonthly + variableMonthly) / (grossMarginPct − netMarginTargetPct)\n\ngapToBreakEven = breakEvenCa − caRealizedMonth\nisProfitable = caRealizedMonth ≥ breakEvenCa",
    parameters: [
      { name: "target_gross_margin_pct", label: "Marge brute cible", unit: "%", default: "35", source: "growth_settings.target_gross_margin_pct" },
      { name: "target_net_margin_pct", label: "Marge nette cible", unit: "%", default: "12", source: "growth_settings.target_net_margin_pct" },
      { name: "fixedCosts / payroll", label: "Charges fixes BP", unit: "FCFA/an", default: "BP officiel", source: "HORIZON_FARM_OFFICIAL_BP" },
    ],
    outputs: ["breakEvenCa", "targetCaForNetMargin", "gapToBreakEven", "isProfitable"],
  },
  {
    id: "demand_coverage",
    modules: ["centre_ia", "objectifs_croissance"],
    category: "demande",
    title: "Demande et couverture stock (farmDemandCoverageEngine)",
    formula: "demandIndex = baseFactor(saison) × eventBoost(fête)\nrevenueTarget = (annualTarget × mix[activité] / 12) × demandIndex\nestimatedUnits = revenueTarget / unitPrice\n\navailableRevenue = availableUnits × unitPrice\ncoverageRate = (availableRevenue / revenueTarget) × 100\ngapRevenue = max(0, revenueTarget − availableRevenue)\ngapUnits = max(0, estimatedUnits − availableUnits)\n\ncoverage_status :\n  ≥ 100% → couvert · ≥ 60% → partiel · sinon insuffisant\n\nlatest_start = target_date − leadTimes[activité]",
    parameters: [
      { name: "annual_mix", label: "Mix activités", unit: "parts", default: "BP", source: "growth_settings.annual_mix" },
      { name: "demandLevel", label: "Demande", unit: "forte|normale|faible", default: "—", source: "horizonCommercialCalendar + eventBoost" },
      { name: "unitPrice", label: "Prix unitaire moyen", unit: "FCFA", default: "historique ventes", source: "avgUnitPrice(activity, sales_orders)" },
      { name: "availableUnits", label: "Stock / production dispo", unit: "unités", default: "—", source: "buildFarmSupplyCoverage()" },
    ],
    outputs: ["coverage_rate", "gap_revenue", "gap_units", "target_date", "latest_start"],
  },
  {
    id: "demand_forecast",
    modules: ["centre_ia", "objectifs_croissance"],
    category: "demande",
    title: "Prévision demande mensuelle (buildMonthlyDemandForecast)",
    formula: "Pour chaque mois M et activité A :\n  baseFactor = demandLevelToFactor(commercialMonth.demand[A])\n  eventBoost = 1.18 (fête forte) ou 1.08 (fête modérée) ou 1\n  demandIndex = baseFactor × eventBoost\n\n  revenueTarget = (annualTarget × mix[A] / 12) × demandIndex\n  estimatedUnits = revenueTarget / unitPrice(A)",
    parameters: [
      { name: "annual_ca_target", label: "Objectif annuel", unit: "FCFA", default: "BP", source: "growth_settings.annual_ca_target" },
      { name: "annual_mix", label: "Mix activités", unit: "parts", default: "BP", source: "growth_settings.annual_mix" },
      { name: "market_events", label: "Fêtes du mois", unit: "—", default: "calcul hijri", source: "buildMarketEvents()" },
    ],
    outputs: ["demandIndex", "revenueTarget", "estimatedUnits", "demandLevel"],
  },
  {
    id: "supply_coverage",
    modules: ["centre_ia", "objectifs_croissance"],
    category: "demande",
    title: "Couverture offre ferme (buildFarmSupplyCoverage)",
    formula: "availableUnits[activité] = stock + production prévue − engagements\n\navailableRevenue = availableUnits × unitPrice\n\ncoverageRate = (availableRevenue / revenueTarget) × 100\n\nfindDemandCoverageForActivity(coverage, activity, targetDate)",
    parameters: [
      { name: "stock", label: "Stocks produits finis", unit: "unités", default: "—", source: "dataMap.stock" },
      { name: "production_capacity", label: "Capacité production", unit: "—", default: "—", source: "buildProductionCapacity()" },
    ],
    outputs: ["availableUnits", "availableRevenue", "coverageRate"],
  },
  {
    id: "zootechnical",
    modules: ["centre_ia", "objectifs_croissance"],
    category: "zootechnie",
    title: "Écarts zootechniques — standard souche",
    formula: "realValue = mesure terrain (ponte, poids, GMQ…)\ntheoretical = theoreticalStandardAtAge(code_souche, ageDays)\ngapPct = ((real − theoretical) / theoretical) × 100\n\nstatut = OK si |gapPct| ≤ tolerancePct\n         warning si gapPct < −tolerancePct\n         critical si gapPct < −2×tolerancePct\n\nfeedOvercost (pondeuses) = |gapPct| × feedOvercostPerPointPct × effectif / 100\ndelayDays (chair) = (theoretical − realWeight) / gmq",
    parameters: [
      { name: "code_souche", label: "Code souche", unit: "—", default: "—", source: "lot.code_souche | breedStockReferential" },
      { name: "tolerancePct", label: "Tolérance écart", unit: "%", default: "5 ponte · 8 poids", source: "breedStockReferential" },
      { name: "gmqTargetG", label: "Cible GMQ souche", unit: "g/j", default: "55 chair · 800 bovin", source: "breedStockReferential.gmqTargetG" },
    ],
    outputs: ["realValue", "theoretical", "gapPct", "feedOvercostFcfa", "delayDays"],
  },
  {
    id: "laying_rate",
    modules: ["centre_ia", "objectifs_croissance"],
    category: "zootechnie",
    title: "Taux de ponte réel (computeRealLayingRate)",
    formula: "rate = (Σ oeufs fenêtre / (effectif × nbJoursLogs)) × 100\n\nFenêtre par défaut = 7 jours\n\ntheoretical = theoreticalStandardAtAge(breedCode, ageDays)\n  ou theoreticalLayingRate(souche, ageWeeks) :\n    peak Lohmann = 92% · ISA = 90% · défaut = 88%\n    si ageWeeks < 20 : min(peak, 0.1 + ageWeeks×0.04)\n    si ageWeeks > 40 : max(0.65, peak − (ageWeeks−40)×0.003)\n\ndrop48h = rate7j − rate2j → corrélation aliment / véto si drop ≥ 3 pts",
    parameters: [
      { name: "production_oeufs_logs", label: "Journal ponte", unit: "—", default: "—", source: "dataMap.production_oeufs_logs" },
      { name: "windowDays", label: "Fenêtre calcul", unit: "j", default: "7", source: "computeRealLayingRate()" },
    ],
    outputs: ["rate", "theoretical", "deviation", "correlation"],
  },
  {
    id: "gmq_real",
    modules: ["centre_ia", "objectifs_croissance"],
    category: "zootechnie",
    title: "GMQ réel (computeRealGmq / calculateAnimalCost)",
    formula: "Chair :\n  gmq(g) = ((poids_moyen_kg − poids_entree) / ageDays) × 1000\n\nBovin :\n  gmq(kg/j) = (poids_actuel − poids_entree) / elapsedDays\n\noptimal (vente) :\n  dailyGainValue = gmq × prixKg / 1000\n  optimal = dailyFeedCost ≥ dailyGainValue → vendre",
    parameters: [
      { name: "poids_moyen_actuel", label: "Poids moyen lot", unit: "g ou kg", default: "—", source: "lot.poids_moyen_actuel" },
      { name: "poids_entree", label: "Poids entrée", unit: "kg", default: "0.042 chair", source: "lot.poids_entree | animal.poids_entree" },
      { name: "prix_kg_marche", label: "Prix marché", unit: "FCFA/kg", default: "—", source: "animal.prix_kg_marche" },
    ],
    outputs: ["gmq", "dailyGainValue", "dailyFeedCost", "optimal"],
  },
  {
    id: "ic_chair",
    modules: ["centre_ia", "objectifs_croissance"],
    category: "zootechnie",
    title: "Indice de consommation chair (IC)",
    formula: "IC = feedKg / liveWeightKg\n\nliveWeightKg = poids_moyen × effectif (chair)\n             ou feedKg / (sellableEggs / 12) (pondeuses proxy)\n\nCible BROILER_IC_TARGET = 1,6 – 1,9\n\nAlerte si IC > 1,9 (gaspillage) ou IC < 1,6×0.8 (pesée douteuse)",
    parameters: [
      { name: "feedKg", label: "Aliment consommé", unit: "kg", default: "—", source: "alimentation_logs cumul lot" },
      { name: "liveWeightKg", label: "Poids vif total", unit: "kg", default: "—", source: "lot.poids_moyen × effectif" },
      { name: "BROILER_IC_TARGET", label: "Plage cible IC", unit: "—", default: "1,6 – 1,9", source: "decisionCenterMetrics.js" },
    ],
    outputs: ["ic", "tone", "icAlert"],
  },
  {
    id: "ith_heat",
    modules: ["centre_ia", "objectifs_croissance"],
    category: "zootechnie",
    title: "Stress thermique (ITH / checkThermalStress)",
    formula: "ITH = temperature + humidity\n\nCanicule si :\n  ITH ≥ ith_stress_threshold (29)\n  OU temp ≥ HEAT_FORECAST_THRESHOLD (38°C)\n  OU ≥ 3 jours prévision ≥ 38°C\n\nPonte : alerte si temp ≥ 32°C ET realPonte < theoretical − 5 pts\nAction : delayDays = 14 · densityReductionPct = 15",
    parameters: [
      { name: "temperature", label: "Température", unit: "°C", default: "—", source: "meteo.temperature" },
      { name: "humidity", label: "Humidité", unit: "%", default: "—", source: "meteo.humidity" },
      { name: "ith_stress_threshold", label: "Seuil ITH stress", unit: "—", default: "29", source: "growth_settings.ith_stress_threshold" },
    ],
    outputs: ["ith", "delayDays", "densityReductionPct", "thermal.alert"],
  },
  {
    id: "theoretical_standard",
    modules: ["centre_ia", "objectifs_croissance"],
    category: "zootechnie",
    title: "Courbe standard souche (theoreticalStandardAtAge)",
    formula: "theoreticalStandardAtAge(breedCode, ageDays) :\n  interpolation linéaire entre points courbe souche\n\nBREED_STOCK_REFERENTIAL[code] :\n  metric = layingRate | weightG | weightKg\n  curve[] = { ageDays, value }\n  tolerancePct, gmqTargetG, feedOvercostPerPointPct",
    parameters: [
      { name: "breedCode", label: "Code souche", unit: "—", default: "—", source: "resolveBreedCode(lot)" },
      { name: "ageDays", label: "Âge lot", unit: "j", default: "computeAgeDays()", source: "datePivotEngine" },
    ],
    outputs: ["theoretical", "metric", "targetDays"],
  },
  {
    id: "cost_animal",
    modules: ["centre_ia", "objectifs_croissance"],
    category: "couts",
    title: "Coût revient embouche (calculateAnimalCost)",
    formula: "baseCost = prix_achat animal\n\nrealFeedCost = Σ alimentation_logs (ou estimation FEEDING_DEFAULTS)\n\nhealthCost = Σ interventions santé (isHealthCostEvent)\n\notherDirectCost = charges directes (chauffage, transport, MO…)\n\ntotalCost = baseCost + realFeedCost + healthCost + otherDirectCost\n\ngmq = (poids_actuel − poids_entree) / elapsedDays\n\ncostPerKg = totalCost / poids_vif\nmargin = prix_vente − totalCost",
    parameters: [
      { name: "alimentation_logs", label: "Logs alimentation", unit: "—", default: "—", source: "dataMap.alimentation_logs" },
      { name: "FEEDING_DEFAULTS", label: "Rations espèce", unit: "kg/j", default: "bovin 4.5 · ovin 2.5", source: "costEngine.FEEDING_DEFAULTS" },
      { name: "healthEvents", label: "Interventions santé", unit: "—", default: "—", source: "dataMap.sante | vaccins" },
    ],
    outputs: ["totalCost", "gmq", "costPerKg", "margin", "costComplete"],
  },
  {
    id: "cost_avicole",
    modules: ["centre_ia", "objectifs_croissance"],
    category: "couts",
    title: "Coût revient lot avicole (calculateAvicoleLotCost)",
    formula: "purchaseCost = effectif × prix_unitaire_sujet (caisse poussins)\n\nrealFeedCost = Σ alimentation_logs lot\n\nhealthCost + otherDirectCost = charges directes lot\n\ntotalCost = purchase + aliment + santé + extras\n\nChair :\n  sellableSubjects = effectif − mortalité − pertes\n  costPerKg = totalCost / (poids_moyen × sellableSubjects)\n\nPonte :\n  costPerEgg = totalCost / œufs vendables\n  sellableEggs = production cumulée",
    parameters: [
      { name: "DEFAULT_BROILER_CRATE_SIZE", label: "Sujets / caisse", unit: "sujets", default: "50", source: "costEngine.js" },
      { name: "DEFAULT_BROILER_CRATE_PRICE", label: "Prix caisse poussins", unit: "FCFA", default: "32000", source: "costEngine.js" },
      { name: "DEFAULT_LAYER_AMORTIZATION_DAYS", label: "Amortissement pondeuse", unit: "j", default: "540", source: "costEngine.js" },
    ],
    outputs: ["totalCost", "costPerKg", "costPerEgg", "sellableSubjects", "mca"],
  },
  {
    id: "cost_layer_tablet",
    modules: ["objectifs_croissance"],
    category: "couts",
    title: "Coût vente tablette œufs (calculateLayerTabletSaleCost)",
    formula: "eggCost = costPerEggWithoutPackaging × eggQty\n\npackagingCost = packagingUnitCost × tabletQty\n\nsaleCost = eggCost + packagingCost + transportCost + lossCost\n\nmargin = CA tablettes − saleCost\n\neggQty = tablets × DEFAULT_EGGS_PER_TABLET (30)",
    parameters: [
      { name: "DEFAULT_EGGS_PER_TABLET", label: "Œufs / tablette", unit: "œufs", default: "30", source: "costEngine.js" },
      { name: "transportCost", label: "Transport vente", unit: "FCFA", default: "0", source: "paramètre vente" },
      { name: "lossCost", label: "Pertes casse", unit: "FCFA", default: "0", source: "paramètre vente" },
    ],
    outputs: ["saleCost", "eggCost", "packagingCost", "margin"],
  },
  {
    id: "mca_rentabilite",
    modules: ["centre_ia", "objectifs_croissance"],
    category: "couts",
    title: "Marge sur coût alimentaire (MCA)",
    formula: "Centre (decisionCenterMetrics) :\n  mca = revenue − feedCost\n  mcaFlash (bovin) = prix_vente_estime − (baseCost + feedCost)\n\nObjectifs (lotAnalyticsEngine) :\n  mcaPct = ((revenueEstimate − feedCost) / feedCost) × 100\n\nunitCost :\n  ponte → totalCost / œufs7j\n  chair → totalCost / (effectif × poids_vif_kg)",
    parameters: [
      { name: "revenue", label: "CA réalisé / estimé", unit: "FCFA", default: "—", source: "sales_orders | estimations lot" },
      { name: "feedCost", label: "Coût aliment", unit: "FCFA", default: "—", source: "alimentation_logs cumul" },
    ],
    outputs: ["mca", "mcaPct", "unitCost", "tone"],
  },
  {
    id: "rentabilite_ranking",
    modules: ["centre_ia", "objectifs_croissance"],
    category: "couts",
    title: "Classement rentabilité lots et fournisseurs",
    formula: "Par lot/animal :\n  revenue, totalCost, feedCost, mca, unitCost, tone\n\nsupplierRanking :\n  marginPct = (Σ mca / Σ revenue) × 100\n  tri par mca décroissant\n\nAlerte rentabilité si mca < 0 ou tone = bad",
    parameters: [
      { name: "fournisseur", label: "Fournisseur aliment / poussins", unit: "—", default: "—", source: "lot.fournisseur | animal.provenance" },
    ],
    outputs: ["supplierRanking[]", "lotRentabilite[]", "animalRentabilite[]"],
  },
  {
    id: "bfr",
    modules: ["centre_ia"],
    category: "flux",
    title: "BFR cycle — blocage lancement (validateCycleBfrCoverage)",
    formula: "coutEstimeCycle = plannedHeadcount × avgDailyFeedPerHead × cycleDays × feedPrice\n\ntotalAvailable = max(0, treasury) + vipReceivables\n\ncoveragePct = (totalAvailable / coutEstimeCycle) × 100\n\nblocked = coveragePct < bfr_min_coverage_pct\n\nfeedAutonomyDays = stockAlimentKg / dailyNeed\n\ntreasury = Σ entrées finances − Σ sorties finances\nvipReceivables = créances clients VIP échéance ≤ 7 j",
    parameters: [
      { name: "next_band_size", label: "Effectif prochaine bande", unit: "sujets", default: "5000", source: "growth_settings.next_band_size" },
      { name: "avgDailyFeedPerHead", label: "Ration / tête / jour", unit: "kg", default: "0.095 chair · 4.5 bovin", source: "validateCycleBfrCoverage" },
      { name: "bfr_min_coverage_pct", label: "Couverture minimum", unit: "%", default: "50", source: "growth_settings.bfr_min_coverage_pct" },
      { name: "vip_client_ids", label: "Clients VIP BFR", unit: "ids", default: "[]", source: "growth_settings.vip_client_ids" },
    ],
    outputs: ["coveragePct", "blocked", "coutEstimeCycle", "feedAutonomyDays"],
  },
  {
    id: "stock_audit",
    modules: ["centre_ia", "objectifs_croissance"],
    category: "flux",
    title: "Audit stock aliment bâtiment (auditFeedStockConsumption)",
    formula: "Par bâtiment B et jour J :\n  theoretical = Σ (effectif_lot × feedStandardKgPerBird(workshop, ageDays))\n\n  actual = Σ alimentation_logs(J, B)\n         + Σ business_events sortie aliment(J, B)\n\n  overPct = ((actual − theoretical) / theoretical) × 100\n\nAlerte si overPct > STOCK_AUDIT_THRESHOLD_PCT (10%)\npendant STOCK_AUDIT_CONSECUTIVE_DAYS (3) jours consécutifs",
    parameters: [
      { name: "STOCK_AUDIT_THRESHOLD_PCT", label: "Écart max acceptable", unit: "%", default: "10", source: "strategicDecisionEngine.js" },
      { name: "STOCK_AUDIT_CONSECUTIVE_DAYS", label: "Jours consécutifs", unit: "j", default: "3", source: "strategicDecisionEngine.js" },
      { name: "feedStandardKgPerBird", label: "Standard ration souche", unit: "kg/j/sujet", default: "—", source: "strategicDecisionEngine.feedStandardKgPerBird" },
    ],
    outputs: ["overPct", "theoreticalKg", "actualKg", "consecutiveDays", "building"],
  },
  {
    id: "flux_silo",
    modules: ["centre_ia", "objectifs_croissance"],
    category: "flux",
    title: "Autonomie silo aliment (buildFlux)",
    formula: "dailyConsumption = moyenne(alimentation_logs 30j)\n  ou fallback Σ (effectif × ration/j)\n\ndaysLeft = stockKg / dailyConsumption\n\nAlerte si daysLeft < STOCK_CRITICAL_DAYS (5)\n\npct = min(100, stockKg / (dailyConsumption × 30) × 100)",
    parameters: [
      { name: "STOCK_CRITICAL_DAYS", label: "Seuil stock critique", unit: "j", default: "5", source: "decisionCenterMetrics.js" },
      { name: "stock", label: "Stock aliment", unit: "kg", default: "—", source: "dataMap.stock (catégorie aliment)" },
    ],
    outputs: ["daysLeft", "dailyConsumption", "tone", "pct"],
  },
  {
    id: "flux_occupation",
    modules: ["centre_ia", "objectifs_croissance"],
    category: "flux",
    title: "Occupation bâtiments et balance matière",
    formula: "occupancyPct = min(100, effectif_bâtiment / 500 × 100)\n\nmaterialBalance :\n  entrees = effectif_initial\n  sorties = vendus + effectif_actif\n  pertes = mortalité\n  lossValue = pertes × (totalCost / effectif_initial)\n  mortalityPct = (pertes / entrees) × 100",
    parameters: [
      { name: "batiment", label: "Bâtiment", unit: "—", default: "—", source: "lot.batiment | lot.building" },
      { name: "capacity_ref", label: "Capacité référence", unit: "sujets", default: "500", source: "decisionCenterMetrics (hardcodé)" },
    ],
    outputs: ["occupancyPct", "materialBalance[]", "lossValue"],
  },
  {
    id: "sanitary",
    modules: ["centre_ia", "objectifs_croissance"],
    category: "flux",
    title: "Vide sanitaire (buildSanitaryVacuumAlerts)",
    formula: "gapDays = date_entree_lot_suivant − date_fin_lot_précédent\n\nblocking = gapDays < sanitary_min_days (10)\n\neffectiveGap = lot.vide_sanitaire_jours si renseigné, sinon gapDays",
    parameters: [
      { name: "sanitary_min_days", label: "Vide sanitaire min", unit: "j", default: "10", source: "growth_settings.sanitary_min_days" },
      { name: "SANITARY_MIN_DAYS", label: "Constante Objectifs", unit: "j", default: "10", source: "objectifsDecisionEngine.js" },
    ],
    outputs: ["gapDays", "blocking", "requiredDays"],
  },
  {
    id: "sanitary_extended",
    modules: ["centre_ia"],
    category: "flux",
    title: "Vide sanitaire prolongé — mortalité pathologique",
    formula: "mortalityRate = (morts / effectif_initial) × 100\n\nSi mortalityRate > mortality_threshold_pct (5%) :\n  extraVacuumDays = growth_settings.extra_vacuum_days (7)\n  totalWait = sanitary_min_days + extraVacuumDays\n  earliestLaunchDate = today + extraVacuumDays\n\nenrichSanitaryAlert → actions désinfection + validation véto",
    parameters: [
      { name: "mortality_threshold_pct", label: "Seuil mortalité bande préc.", unit: "%", default: "5", source: "growth_settings.mortality_threshold_pct" },
      { name: "extra_vacuum_days", label: "Prolongation pathologie", unit: "j", default: "7", source: "growth_settings.extra_vacuum_days" },
    ],
    outputs: ["mortalityRate", "extraVacuumDays", "earliestLaunchDate", "blocking"],
  },
  {
    id: "shrinkage",
    modules: ["centre_ia", "objectifs_croissance"],
    category: "flux",
    title: "Démarque stock (buildStockShrinkageAnalysis)",
    formula: "Œufs :\n  shrinkPct = ((theoreticalEggs − soldEggs) / theoreticalEggs) × 100\n  Alerte si shrinkPct > 2%\n\nAliment global :\n  overPct = ((actualFeedKg − theoreticalFeedKg) / theoreticalFeedKg) × 100\n  Alerte si overPct > 10%\n\nlossValue = (theoretical − actual) × prix_unitaire",
    parameters: [
      { name: "production_oeufs_logs", label: "Ponte théorique", unit: "œufs", default: "—", source: "production_oeufs_logs" },
      { name: "sales_orders", label: "Ventes enregistrées", unit: "—", default: "—", source: "sales_orders" },
    ],
    outputs: ["shrinkPct", "lossValue", "theoretical", "actual"],
  },
  {
    id: "pricing_floor",
    modules: ["objectifs_croissance"],
    category: "prix",
    title: "Prix plancher (computeFloorPrice)",
    formula: "floorPrice = unitCost × (1 + minMarginPct / 100)\n\nunitCost défaut :\n  oeufs = 550 · chair = 1900 · bovins = 300000 · cultures = 400 FCFA\n\nminMarginPct = growth_settings.min_margin_pct ou 15%",
    parameters: [
      { name: "unitCost", label: "Coût unitaire revient", unit: "FCFA", default: "voir DEFAULT_UNIT_COST", source: "calculateAvicoleLotCost / calculateAnimalCost" },
      { name: "min_margin_pct", label: "Marge minimum", unit: "%", default: "15", source: "growth_settings.min_margin_pct" },
    ],
    outputs: ["floorPrice"],
  },
  {
    id: "pricing_seasonality",
    modules: ["objectifs_croissance"],
    category: "prix",
    title: "Coefficient saisonnalité (computeSeasonalityCoefficient)",
    formula: "Si historique ventes ≥ 2 mois :\n  avgMonthly = totalRevenue / monthsWithData\n  raw = monthRevenue / avgMonthly\n  coef = clamp(raw, 0.85, 1.25)\n\nSinon :\n  coef = demandLevelToFactor(commercialMonth.demand[activité])\n    forte = 1.15 · normale = 1 · faible = 0.85",
    parameters: [
      { name: "sales_orders", label: "Historique ventes", unit: "—", default: "—", source: "dataMap.sales_orders" },
      { name: "referenceDate", label: "Mois de référence", unit: "ISO", default: "aujourd'hui", source: "options.referenceDate" },
    ],
    outputs: ["seasonalityCoefficient"],
  },
  {
    id: "pricing_recommended",
    modules: ["objectifs_croissance"],
    category: "prix",
    title: "Prix recommandé ERP (computeRecommendedPrice)",
    formula: "floor = computeFloorPrice(unitCost, minMarginPct)\nmarket = resolveLocalMarketPrice(activité, marketPrices, location)\nadjustedMarket = market × seasonalityCoefficient\n\nrecommendedPrice = MAX(floor, adjustedMarket)\n\nmispricingRisk = floor > adjustedMarket\n  → \"Coût production trop élevé vs marché local\"",
    parameters: [
      { name: "market_prices", label: "Prix marché local", unit: "FCFA", default: "DEFAULT_MARKET", source: "dataMap.market_prices | price_catalog" },
      { name: "location", label: "Localité ferme", unit: "—", default: "—", source: "farm.ville | meteo.ville" },
    ],
    outputs: ["floorPrice", "marketPrice", "adjustedMarketPrice", "recommendedPrice", "mispricingRisk"],
  },
  {
    id: "pricing_matrix",
    modules: ["objectifs_croissance"],
    category: "prix",
    title: "Matrice prix par activité (buildPricingMatrix)",
    formula: "Pour chaque activité ∈ [oeufs, poulets_chair, bovins] :\n  computeRecommendedPrice(...)\n  practicedPrice = moyenne(prix ventes historiques activité)\n\nÉcart pratiqué vs recommandé → mispricingAlert dans buildFinancialGapAnalysis",
    parameters: [
      { name: "unitCosts", label: "Coûts unitaires par activité", unit: "FCFA", default: "calcul ERP", source: "calculateAvicoleLotCost / calculateAnimalCost" },
      { name: "activities", label: "Activités analysées", unit: "—", default: "oeufs, chair, bovins", source: "buildPricingMatrix param" },
    ],
    outputs: ["pricing[]", "practicedPrice", "mispricingAlerts[]"],
  },
  {
    id: "scissors_effect",
    modules: ["centre_ia"],
    category: "analytique",
    title: "Effet ciseau — hausse intrants aliment (buildScissorsEffectAlert)",
    formula: "Pour chaque commodité (maïs, soja, tourteau) :\n  monthlyPct = ((dernier_prix − premier_prix) / premier_prix) × 100 / nb_mois\n  projected3mPct = monthlyPct × 3\n\navgRise = moyenne(projected3mPct des hausses ≥ 5%/mois)\n\neconomieEstimee = stockAlimentKg × feedPrice × (avgRise / 100) × 0.5\n\nRecommandation si trésorerie > economieEstimee → acheter 3 mois stock",
    parameters: [
      { name: "market_prices", label: "Cours intrants", unit: "FCFA", default: "—", source: "dataMap.market_prices" },
      { name: "feedStock", label: "Stock aliment actuel", unit: "kg", default: "—", source: "dataMap.stock" },
    ],
    outputs: ["projectedRisePct", "economieEstimee", "hasTreasurySurplus"],
  },
  {
    id: "transformation_arbitrage",
    modules: ["centre_ia"],
    category: "analytique",
    title: "Arbitrage incubation vs vente œufs (buildTransformationArbitrage)",
    formula: "netEggMargin = eggTrayPrice\n\nnetChickMargin = chickPrice × hatchRate − incubatorCostPerEgg\n\ndiffPct = ((netChickMargin − netEggMargin) / netEggMargin) × 100\n\nSi |diffPct| ≥ 5% :\n  incubatePct = min(80, 50 + diffPct/2) si diffPct > 0\n  sinon vente directe œufs recommandée\n\nDéfauts : eggTrayPrice=900 · chickPrice=350 · hatchRate=0.82 · incubatorCost=15 F/œuf",
    parameters: [
      { name: "egg_tray_price", label: "Prix tablette œufs", unit: "FCFA", default: "900", source: "market_prices | growth_settings.egg_tray_price" },
      { name: "chick_day_old_price", label: "Prix poussin", unit: "FCFA", default: "350", source: "market_prices | growth_settings" },
      { name: "hatch_rate", label: "Taux éclosion", unit: "ratio", default: "0.82", source: "growth_settings.hatch_rate" },
      { name: "incubator_cost_per_egg", label: "Coût incubation / œuf", unit: "FCFA", default: "15", source: "growth_settings.incubator_cost_per_egg" },
    ],
    outputs: ["netChickMargin", "netEggMargin", "diffPct", "incubatePct"],
  },
  {
    id: "vet_comparison",
    modules: ["centre_ia", "objectifs_croissance"],
    category: "analytique",
    title: "Comparatif vétérinaires (buildVetPerformanceComparison)",
    formula: "Par type d'intervention :\n  avgCost(vet) = moyenne(cout interventions)\n  avgRecovery(vet) = moyenne(jours rétablissement)\n\n  costSavePct = ((worst.avgCost − best.avgCost) / worst.avgCost) × 100\n  recoveryGain = worst.avgRecovery − best.avgRecovery\n\nInsight si costSavePct ≥ 5% ou recoveryGain ≥ 2 j",
    parameters: [
      { name: "sante", label: "Interventions réalisées", unit: "—", default: "—", source: "dataMap.sante | vaccins" },
      { name: "veterinaires", label: "Référentiel véto", unit: "—", default: "—", source: "dataMap.veterinaires" },
    ],
    outputs: ["rankings[]", "insights[]", "avgCost", "avgRecovery"],
  },
  {
    id: "feed_inflation",
    modules: ["centre_ia", "objectifs_croissance"],
    category: "analytique",
    title: "Inflation aliment fournisseur (buildFeedInflationAlerts)",
    formula: "Période courante = 30 derniers j · précédente = J−60 à J−30\n\ncurAvg = moyenne(prix/kg achats courants)\nprevAvg = moyenne(prix/kg achats précédents)\n\npctChange = ((curAvg − prevAvg) / prevAvg) × 100\n\nAlerte si pctChange ≥ 10% (critique si ≥ 15%)",
    parameters: [
      { name: "alimentation_logs", label: "Achats aliment", unit: "—", default: "—", source: "dataMap.alimentation_logs" },
      { name: "achats", label: "Mouvements stock", unit: "—", default: "—", source: "dataMap.achats | stock_movements" },
    ],
    outputs: ["pctChange", "currentPricePerKg", "previousPricePerKg"],
  },
  {
    id: "feed_supplier_ranking",
    modules: ["centre_ia"],
    category: "analytique",
    title: "Comparatif fournisseurs aliment (buildFeedComparisons)",
    formula: "avgPricePerKg(fournisseur) = totalAmount / totalKg\n\nspreadPct = ((worst − best) / best) × 100\n\nAlerte si spreadPct ≥ 5% (bad si > 15%)\n\nperiodAlerts : variation prix produit ≥ 5% sur 30 j vs 30 j précédents",
    parameters: [
      { name: "fournisseurs", label: "Référentiel fournisseurs", unit: "—", default: "—", source: "dataMap.fournisseurs" },
      { name: "alimentation_logs", label: "Historique achats", unit: "—", default: "—", source: "dataMap.alimentation_logs" },
    ],
    outputs: ["supplierRankings[]", "supplierAlerts[]", "periodAlerts[]"],
  },
  {
    id: "seasonality_weather",
    modules: ["objectifs_croissance"],
    category: "analytique",
    title: "Saisonnalité météo vs performance (buildSeasonalityWeatherAnalysis)",
    formula: "Par mois :\n  layingRate = oeufs / (effectif × nbJours)\n  icProxy = feedKg / (oeufs / 12)\n\nisHotSeason = avril–mai (mois 4–5)\n\nseasonalDrop = avgCoolLaying − avgHotLaying\n\nAlerte si seasonalDrop ≥ 5 pts ou temp actuelle ≥ 35°C",
    parameters: [
      { name: "meteo", label: "Météo actuelle", unit: "°C / %", default: "—", source: "dataMap.meteo" },
      { name: "production_oeufs_logs", label: "Historique ponte", unit: "—", default: "—", source: "production_oeufs_logs" },
    ],
    outputs: ["seasonalDropPct", "rows[]", "insights[]"],
  },
  {
    id: "client_quality",
    modules: ["objectifs_croissance"],
    category: "analytique",
    title: "Qualité lots par client (buildLotQualityByClient)",
    formula: "unitPrice = montant_total / quantité\n\ntriStrict = notes contient \"tri\" ou exigence \"calibr\"\n\nmarginScore :\n  faible si triStrict ET unitPrice < 5000\n  bonne si unitPrice ≥ 5000\n\nAlerte si triStrict ET marginScore = faible",
    parameters: [
      { name: "sales_orders", label: "Commandes clients", unit: "—", default: "—", source: "dataMap.sales_orders" },
      { name: "clients", label: "Référentiel clients", unit: "—", default: "—", source: "dataMap.clients" },
    ],
    outputs: ["clientRanking[]", "insights[]", "marginScore"],
  },
  {
    id: "maraichage_biomass",
    modules: ["centre_ia", "objectifs_croissance"],
    category: "analytique",
    title: "Valorisation fumier / litière (calculateBiomassValue)",
    formula: "litterKgYear = poules × 0.08 × 365\nmanureKgYear = bovins × 15 × 365\ntotalEffluentKg = litter + manure\n\nbagsSaved = floor(totalEffluentKg / 50)\nfertilizerSavings = bagsSaved × npkBagPrice (15000 F)\n\nCentre maraîchage :\n  marginM2 = yieldKgM2 × priceKg − seedCostM2\n  marginHa = marginM2 × 10000",
    parameters: [
      { name: "npk_bag_price", label: "Prix sac NPK 50kg", unit: "FCFA", default: "15000", source: "growth_settings.npk_bag_price" },
      { name: "FERTILIZER_BAG_KG", label: "Poids sac engrais", unit: "kg", default: "50", source: "decisionCenterMetrics.js" },
    ],
    outputs: ["economie_totale_fcfa", "bagsSaved", "cropSimulation[]"],
  },
  {
    id: "maraichage_sandbox",
    modules: ["objectifs_croissance"],
    category: "analytique",
    title: "Simulateur maraîchage (simulateMaraichageSandbox)",
    formula: "totalCost = baseCharges + extraCharges + yieldKg × costPerKg\n\nrevenueA = yieldKg × marketPriceA\nrevenueB = yieldKg × marketPriceB\n\nmarginA = revenueA − totalCost\nmarginB = revenueB − totalCost\n\nbreakEvenKgA = ceil(totalCost / (marketPriceA − costPerKg))",
    parameters: [
      { name: "baseCharges", label: "Charges fixes parcelle", unit: "FCFA", default: "0", source: "paramètre sandbox" },
      { name: "yieldKg", label: "Rendement attendu", unit: "kg", default: "—", source: "paramètre sandbox" },
      { name: "costPerKg", label: "Coût production / kg", unit: "FCFA/kg", default: "400", source: "paramètre sandbox" },
    ],
    outputs: ["marginA", "marginB", "breakEvenKgA", "breakEvenKgB"],
  },
  {
    id: "charts_g1_g7",
    modules: ["objectifs_croissance"],
    category: "graphiques",
    title: "Graphiques G1 – G7 (Objectifs)",
    formula: "G1 : courbe ponte réelle vs souche (theoreticalStandardAtAge)\nG2 : comparaison lots (rentabilité / cycle)\nG3 : CA mensuel vs breakEvenCa vs targetCaForNetMargin\nG4 : âge lots (J+ageDays)\nG5 : flux trésorerie\nG6 : jauge attainment objectif annuel (%)\nG7 : coût revient vs marché vs prix pratiqué par activité",
    parameters: [
      { name: "chartData.g1…g7", label: "Jeux de données", unit: "—", default: "—", source: "buildChartDataset() · objectifsDecisionEngine" },
    ],
    outputs: ["chartData"],
  },
  {
    id: "charts_centre",
    modules: ["centre_ia"],
    category: "graphiques",
    title: "Graphiques Centre décisionnel",
    formula: "Ponte vs aliment : layingRate(%) + feedKg/j\nIC chair par lot : feedKg / liveWeightKg\nEmbouche GMQ : gmq vs seuil 400 g/j\nSilo : daysLeft = stockKg / consoJour\nMaraîchage : simulateur charges / rendement / prix marché",
    parameters: [
      { name: "STOCK_CRITICAL_DAYS", label: "Seuil stock aliment critique", unit: "j", default: "5", source: "decisionCenterMetrics.js" },
      { name: "production_oeufs_logs", label: "Journal ponte", unit: "—", default: "—", source: "dataMap.production_oeufs_logs" },
    ],
    outputs: ["graphiques.avicoleDaily", "graphiques.broilerIC", "graphiques.cattleGMQ", "graphiques.siloLevels"],
  },
  {
    id: "technical_farming",
    modules: ["centre_ia"],
    category: "pilotage",
    title: "Alertes conduite technique (buildTechnicalFarmingAlerts)",
    formula: "Règles technicalFarmingRules appliquées sur :\n  lots avicole · animaux · stocks · santé · capteurs\n\nSévérité → priorité recommandation :\n  critique/urgence → haute · warning → moyenne\n\nactivityFromTechnicalAlert → oeufs | chair | bovins | stock | cultures",
    parameters: [
      { name: "sensor_devices", label: "Capteurs IoT", unit: "—", default: "—", source: "dataMap.sensor_devices" },
      { name: "business_events", label: "Événements métier", unit: "—", default: "—", source: "dataMap.business_events" },
    ],
    outputs: ["technical_alerts[]", "technical_recommendations[]"],
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
  { term: 'MCA', definition: 'Marge sur coût alimentaire — CA ou revenu estimé moins coût aliment.' },
  { term: 'theoreticalStandardAtAge', definition: 'Valeur attendue souche à ageDays (ponte, poids, GMQ).' },
  { term: 'mispricingRisk', definition: 'Prix plancher > prix marché ajusté — risque de mévente.' },
  { term: 'overPct / shrinkPct', definition: 'Écart % entre consommation ou production réelle et théorique.' },
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

export function formulasGroupedByCategory(moduleId = 'centre_ia') {
  const formulas = formulasForModule(moduleId);
  const groups = new Map();
  formulas.forEach((block) => {
    const cat = block.category || 'autre';
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat).push(block);
  });
  return FORMULA_CATEGORIES
    .filter((cat) => groups.has(cat.id))
    .map((cat) => ({ ...cat, blocks: groups.get(cat.id) }));
}

export default FORMULA_BLOCKS;
