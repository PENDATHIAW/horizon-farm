#!/usr/bin/env python3
"""Generate exhaustive decisionMethodology.js for Annexe tab."""

import json
import os

def p(name, label, unit, default, source):
    return {"name": name, "label": label, "unit": unit, "default": default, "source": source}

def blk(id_, modules, category, title, formula, parameters, outputs):
    return {
        "id": id_,
        "modules": modules,
        "category": category,
        "title": title,
        "formula": formula.strip(),
        "parameters": parameters,
        "outputs": outputs,
    }

BOTH = ["centre_ia", "objectifs_croissance"]
CENTRE = ["centre_ia"]
OBJ = ["objectifs_croissance"]

blocks = [
    blk("hijri_calendar", BOTH, "calendrier", "Calendrier hijri — dates de fêtes", """
dateGrégorienne = hijriToGregorian(hy, hm, hd)

Tabaski     → hy, hm=12, hd=10
Korité      → hy, hm=10, hd=1
Ramadan     → hy, hm=9,  hd=1
Magal       → hy, hm=2,  hd=18
Gamou       → hy, hm=3,  hd=12
Fin d'année → grégorien, 24 décembre

datePivot(fête, produit) = dateFête − cycleDays(produit)""",
    [p("hy", "Année hijri", "—", "auto", "gregorianToHijri(dateDuJour)"),
     p("hm / hd", "Mois / jour hijri", "—", "voir règles", "islamicCalendarEngine.HIJRI_FESTIVAL_RULES"),
     p("festival_dates", "Surcharge manuelle", "ISO", "vide", "growth_settings.festival_dates.*")],
    ["dateIso", "eventDate", "pivotDate"]),

    blk("launch_timing", CENTRE, "calendrier", "QUAND LANCER — dates pivot par fête et produit", """
Pour chaque fête F et produit P :
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
hasActiveLot(oeufs)   : pondeuses actives > 0""",
    [p("BOVIN_CYCLE_DAYS", "Cycle embouche bovine", "j", "90", "strategicDecisionEngine.js"),
     p("BROILER_CYCLE_DAYS", "Cycle poulet chair", "j", "40", "strategicDecisionEngine.js"),
     p("eventDate", "Date fête", "ISO", "calcul hijri", "buildMarketEvents()"),
     p("pivotDate", "Date limite mise en place", "ISO", "—", "addDays(eventDate, −cycleDays)")],
    ["eventLabel", "activityLines[]", "message", "priority"]),

    blk("date_pivot", BOTH, "calendrier", "Date pivot lot et âge (datePivotEngine)", """
pivotDate = entity.date_pivot | date_debut | date_entree | created_at

ageDays = floor((referenceDate − pivotDate) / 86400000)

theoretical = theoreticalStandardAtAge(breedCode, ageDays)

buildLotPivotContext → { lotId, workshop, breedCode, ageDays, theoretical }""",
    [p("date_pivot", "Date pivot lot", "ISO", "date_entree", "lot.date_pivot | date_debut"),
     p("breedCode", "Code souche", "—", "—", "resolveBreedCode(lot) · breedStockReferential"),
     p("referenceDate", "Date de référence", "ISO", "aujourd'hui", "options.referenceDate")],
    ["ageDays", "theoretical", "workshop", "targetDays"]),

    blk("lead_times", BOTH, "calendrier", "Délais moyens de cycle (estimateLeadTimes)", """
leadTimes[activité] = moyenne(historique ERP) ou défaut BP

Défauts :
  oeufs = 150 j · poulets_chair = 40 j
  bovins/ovins/caprins = 90 j · cultures = 90 j

Utilisé pour latest_start = target_date − leadTimes[activité]""",
    [p("days_to_lay", "Délai ponte lot", "j", "150", "lot.days_to_lay | age_debut_ponte_jours"),
     p("cycle_days", "Durée cycle chair", "j", "40", "lot.cycle_days | duree_cycle"),
     p("days_to_sale", "Délai vente bovin", "j", "90", "animal.days_to_sale | duree_garde_jours")],
    ["leadTimes.oeufs", "leadTimes.poulets_chair", "leadTimes.bovins"]),

    blk("commercial_calendar", CENTRE, "calendrier", "Calendrier commercial mensuel (buildCommercialCalendar)", """
Pour chaque mois M de l'exercice :
  target = BP.revenue.monthly[M].total
  focus  = activités avec CA BP > 0 (oeufs, chair, bovins)

current = mois en cours · next = 6 mois suivants""",
    [p("monthly_targets", "Objectifs mensuels", "FCFA", "BP officiel", "HORIZON_FARM_OFFICIAL_BP.revenue.monthly"),
     p("activityYear", "Exercice", "—", "auto", "resolveActivityYearContext(dataMap)")],
    ["current", "next[]", "year[]"]),

    blk("sell_now", CENTRE, "commerce", "QUAND VENDRE — maturité économique", """
gmqSmoothed = lissage(GMQ, alimentation_logs, 7j)

Bovin embouche :
  gainValeurJour = gmqSmoothed × prixKg
  coutRationJour = dailyFeedKg × feedPrice

Bande chair :
  gainValeurJour = gmqSmoothed × effectifActif × prixKg
  coutRationJour = dailyFeedKg × feedPrice

SI gainValeurJour < coutRationJour → URGENCE VENTE""",
    [p("gmqSmoothed", "GMQ lissée", "kg/j", "—", "calculateAnimalCost / alimentation_logs"),
     p("prixKg", "Prix marché viande", "FCFA/kg", "—", "animal.prix_kg_marche | lot.prix_vente_kg"),
     p("dailyFeedKg", "Aliment consommé / jour", "kg/j", "—", "dailyFeedKgForEntity()"),
     p("feedPrice", "Prix aliment", "FCFA/kg", "—", "feedPricePerKg(stock)"),
     p("effectifActif", "Effectif bande", "sujets", "—", "avicoleActiveCount(lot)")],
    ["gainValeurJour", "coutRationJour", "priority=critique"]),

    blk("commercial_gap", BOTH, "commerce", "Écart CA commercial (buildGoalPerformance)", """
remaining = max(0, activityGoal.target − activityGoal.realized)
ca_attainment = (realized / target) × 100

Par activité :
  target = monthTarget × (activityAnnual / annualRevenueTarget)
  realized = Σ ventes classées (classifySaleActivity)

Global :
  monthTarget = BP mensuel ou growth_settings.monthly_targets[i]
  encaisse = min(realized, max(payments, finances entrées))
  marge = realized − depenses""",
    [p("activityGoal.target", "Objectif CA activité", "FCFA", "BP officiel", "buildGoalPerformance()"),
     p("annual_ca_target", "Objectif annuel global", "FCFA", "BP", "growth_settings.annual_ca_target"),
     p("monthTarget", "Objectif mois courant", "FCFA", "BP mensuel", "monthlyRevenueTargets[planIndex]")],
    ["gap_revenue", "ca_attainment", "remaining", "encaisse", "marge"]),

    blk("production_capacity", BOTH, "commerce", "Capacité production ponte (buildProductionCapacity)", """
activeLayers = Σ effectif pondeuses actives

avgEggsDay = Σ oeufs (14 derniers j) / min(14, nb jours logs)

layingRate = (avgEggsDay / activeLayers) × 100

tabletsDay = avgEggsDay / 30""",
    [p("production_oeufs_logs", "Journal ponte", "—", "—", "dataMap.production_oeufs_logs"),
     p("activeLayers", "Pondeuses actives", "sujets", "—", "avicoleActiveCount(lot pondeuse)")],
    ["eggsDay", "tabletsDay", "layingRate", "capacitySource"]),

    blk("financial_gap", OBJ, "commerce", "Écarts financiers ateliers (buildFinancialGapAnalysis)", """
Par atelier ws :
  caRealized = Σ ventes mois (classifySaleActivity)
  caTargetMonth = workshopTargets.monthly[monthIdx].caTarget
  caGap = caTargetMonth − caRealized
  caAttainment = (caRealized / caTargetMonth) × 100

  marginRealized = caRealized × (marginPctTarget / 100)
  marginGap = marginTargetMonth − marginRealized

  mispricingAlert = pricing.mispricingRisk""",
    [p("workshopTargets", "Objectifs ateliers", "FCFA/mois", "BP", "buildWorkshopFinancialTargets()"),
     p("marginPctTarget", "Marge brute cible", "%", "35", "growth_settings.target_gross_margin_pct")],
    ["caGap", "marginGap", "mispricingAlerts[]"]),

    blk("workshop_targets", OBJ, "commerce", "Objectifs CA/marge par atelier (buildWorkshopFinancialTargets)", """
Pour chaque atelier (pondeuses, chair, bovins, maraîchage) :
  caTarget[M] = BP.revenue.monthly[M][bpKey]
  marginTarget[M] = caTarget[M] × target_gross_margin_pct

annualCaTarget = Σ caTarget[M]
annualMarginTarget = annualCaTarget × marginPct""",
    [p("target_gross_margin_pct", "Marge brute cible", "%", "35", "growth_settings.target_gross_margin_pct"),
     p("maraichage_monthly", "CA maraîchage mensuel", "FCFA", "settings", "growth_settings.maraichage_monthly")],
    ["monthly[]", "annualCaTarget", "annualMarginTarget"]),

    blk("break_even", BOTH, "commerce", "Point mort mensuel (computeMonthlyBreakEven)", """
fixedMonthly = (fixedCosts.annual + payroll.annual) / 12
variableMonthly = variableCosts.correctedAnnualTotal / 12

breakEvenCa = (fixedMonthly + variableMonthly) / grossMarginPct

targetCaForNetMargin =
  (fixedMonthly + variableMonthly) / (grossMarginPct − netMarginTargetPct)

gapToBreakEven = breakEvenCa − caRealizedMonth
isProfitable = caRealizedMonth ≥ breakEvenCa""",
    [p("target_gross_margin_pct", "Marge brute cible", "%", "35", "growth_settings.target_gross_margin_pct"),
     p("target_net_margin_pct", "Marge nette cible", "%", "12", "growth_settings.target_net_margin_pct"),
     p("fixedCosts / payroll", "Charges fixes BP", "FCFA/an", "BP officiel", "HORIZON_FARM_OFFICIAL_BP")],
    ["breakEvenCa", "targetCaForNetMargin", "gapToBreakEven", "isProfitable"]),

    blk("demand_coverage", BOTH, "demande", "Demande et couverture stock (farmDemandCoverageEngine)", """
demandIndex = baseFactor(saison) × eventBoost(fête)
revenueTarget = (annualTarget × mix[activité] / 12) × demandIndex
estimatedUnits = revenueTarget / unitPrice

availableRevenue = availableUnits × unitPrice
coverageRate = (availableRevenue / revenueTarget) × 100
gapRevenue = max(0, revenueTarget − availableRevenue)
gapUnits = max(0, estimatedUnits − availableUnits)

coverage_status :
  ≥ 100% → couvert · ≥ 60% → partiel · sinon insuffisant

latest_start = target_date − leadTimes[activité]""",
    [p("annual_mix", "Mix activités", "parts", "BP", "growth_settings.annual_mix"),
     p("demandLevel", "Demande", "forte|normale|faible", "—", "horizonCommercialCalendar + eventBoost"),
     p("unitPrice", "Prix unitaire moyen", "FCFA", "historique ventes", "avgUnitPrice(activity, sales_orders)"),
     p("availableUnits", "Stock / production dispo", "unités", "—", "buildFarmSupplyCoverage()")],
    ["coverage_rate", "gap_revenue", "gap_units", "target_date", "latest_start"]),

    blk("demand_forecast", BOTH, "demande", "Prévision demande mensuelle (buildMonthlyDemandForecast)", """
Pour chaque mois M et activité A :
  baseFactor = demandLevelToFactor(commercialMonth.demand[A])
  eventBoost = 1.18 (fête forte) ou 1.08 (fête modérée) ou 1
  demandIndex = baseFactor × eventBoost

  revenueTarget = (annualTarget × mix[A] / 12) × demandIndex
  estimatedUnits = revenueTarget / unitPrice(A)""",
    [p("annual_ca_target", "Objectif annuel", "FCFA", "BP", "growth_settings.annual_ca_target"),
     p("annual_mix", "Mix activités", "parts", "BP", "growth_settings.annual_mix"),
     p("market_events", "Fêtes du mois", "—", "calcul hijri", "buildMarketEvents()")],
    ["demandIndex", "revenueTarget", "estimatedUnits", "demandLevel"]),

    blk("supply_coverage", BOTH, "demande", "Couverture offre ferme (buildFarmSupplyCoverage)", """
availableUnits[activité] = stock + production prévue − engagements

availableRevenue = availableUnits × unitPrice

coverageRate = (availableRevenue / revenueTarget) × 100

findDemandCoverageForActivity(coverage, activity, targetDate)""",
    [p("stock", "Stocks produits finis", "unités", "—", "dataMap.stock"),
     p("production_capacity", "Capacité production", "—", "—", "buildProductionCapacity()")],
    ["availableUnits", "availableRevenue", "coverageRate"]),

    blk("zootechnical", BOTH, "zootechnie", "Écarts zootechniques — standard souche", """
realValue = mesure terrain (ponte, poids, GMQ…)
theoretical = theoreticalStandardAtAge(code_souche, ageDays)
gapPct = ((real − theoretical) / theoretical) × 100

statut = OK si |gapPct| ≤ tolerancePct
         warning si gapPct < −tolerancePct
         critical si gapPct < −2×tolerancePct

feedOvercost (pondeuses) = |gapPct| × feedOvercostPerPointPct × effectif / 100
delayDays (chair) = (theoretical − realWeight) / gmq""",
    [p("code_souche", "Code souche", "—", "—", "lot.code_souche | breedStockReferential"),
     p("tolerancePct", "Tolérance écart", "%", "5 ponte · 8 poids", "breedStockReferential"),
     p("gmqTargetG", "Cible GMQ souche", "g/j", "55 chair · 800 bovin", "breedStockReferential.gmqTargetG")],
    ["realValue", "theoretical", "gapPct", "feedOvercostFcfa", "delayDays"]),

    blk("laying_rate", BOTH, "zootechnie", "Taux de ponte réel (computeRealLayingRate)", """
rate = (Σ oeufs fenêtre / (effectif × nbJoursLogs)) × 100

Fenêtre par défaut = 7 jours

theoretical = theoreticalStandardAtAge(breedCode, ageDays)
  ou theoreticalLayingRate(souche, ageWeeks) :
    peak Lohmann = 92% · ISA = 90% · défaut = 88%
    si ageWeeks < 20 : min(peak, 0.1 + ageWeeks×0.04)
    si ageWeeks > 40 : max(0.65, peak − (ageWeeks−40)×0.003)

drop48h = rate7j − rate2j → corrélation aliment / véto si drop ≥ 3 pts""",
    [p("production_oeufs_logs", "Journal ponte", "—", "—", "dataMap.production_oeufs_logs"),
     p("windowDays", "Fenêtre calcul", "j", "7", "computeRealLayingRate()")],
    ["rate", "theoretical", "deviation", "correlation"]),

    blk("gmq_real", BOTH, "zootechnie", "GMQ réel (computeRealGmq / calculateAnimalCost)", """
Chair :
  gmq(g) = ((poids_moyen_kg − poids_entree) / ageDays) × 1000

Bovin :
  gmq(kg/j) = (poids_actuel − poids_entree) / elapsedDays

optimal (vente) :
  dailyGainValue = gmq × prixKg / 1000
  optimal = dailyFeedCost ≥ dailyGainValue → vendre""",
    [p("poids_moyen_actuel", "Poids moyen lot", "g ou kg", "—", "lot.poids_moyen_actuel"),
     p("poids_entree", "Poids entrée", "kg", "0.042 chair", "lot.poids_entree | animal.poids_entree"),
     p("prix_kg_marche", "Prix marché", "FCFA/kg", "—", "animal.prix_kg_marche")],
    ["gmq", "dailyGainValue", "dailyFeedCost", "optimal"]),

    blk("ic_chair", BOTH, "zootechnie", "Indice de consommation chair (IC)", """
IC = feedKg / liveWeightKg

liveWeightKg = poids_moyen × effectif (chair)
             ou feedKg / (sellableEggs / 12) (pondeuses proxy)

Cible BROILER_IC_TARGET = 1,6 – 1,9

Alerte si IC > 1,9 (gaspillage) ou IC < 1,6×0.8 (pesée douteuse)""",
    [p("feedKg", "Aliment consommé", "kg", "—", "alimentation_logs cumul lot"),
     p("liveWeightKg", "Poids vif total", "kg", "—", "lot.poids_moyen × effectif"),
     p("BROILER_IC_TARGET", "Plage cible IC", "—", "1,6 – 1,9", "decisionCenterMetrics.js")],
    ["ic", "tone", "icAlert"]),

    blk("ith_heat", BOTH, "zootechnie", "Stress thermique (ITH / checkThermalStress)", """
ITH = temperature + humidity

Canicule si :
  ITH ≥ ith_stress_threshold (29)
  OU temp ≥ HEAT_FORECAST_THRESHOLD (38°C)
  OU ≥ 3 jours prévision ≥ 38°C

Ponte : alerte si temp ≥ 32°C ET realPonte < theoretical − 5 pts
Action : delayDays = 14 · densityReductionPct = 15""",
    [p("temperature", "Température", "°C", "—", "meteo.temperature"),
     p("humidity", "Humidité", "%", "—", "meteo.humidity"),
     p("ith_stress_threshold", "Seuil ITH stress", "—", "29", "growth_settings.ith_stress_threshold")],
    ["ith", "delayDays", "densityReductionPct", "thermal.alert"]),

    blk("theoretical_standard", BOTH, "zootechnie", "Courbe standard souche (theoreticalStandardAtAge)", """
theoreticalStandardAtAge(breedCode, ageDays) :
  interpolation linéaire entre points courbe souche

BREED_STOCK_REFERENTIAL[code] :
  metric = layingRate | weightG | weightKg
  curve[] = { ageDays, value }
  tolerancePct, gmqTargetG, feedOvercostPerPointPct""",
    [p("breedCode", "Code souche", "—", "—", "resolveBreedCode(lot)"),
     p("ageDays", "Âge lot", "j", "computeAgeDays()", "datePivotEngine")],
    ["theoretical", "metric", "targetDays"]),

    blk("cost_animal", BOTH, "couts", "Coût revient embouche (calculateAnimalCost)", """
baseCost = prix_achat animal

realFeedCost = Σ alimentation_logs (ou estimation FEEDING_DEFAULTS)

healthCost = Σ interventions santé (isHealthCostEvent)

otherDirectCost = charges directes (chauffage, transport, MO…)

totalCost = baseCost + realFeedCost + healthCost + otherDirectCost

gmq = (poids_actuel − poids_entree) / elapsedDays

costPerKg = totalCost / poids_vif
margin = prix_vente − totalCost""",
    [p("alimentation_logs", "Logs alimentation", "—", "—", "dataMap.alimentation_logs"),
     p("FEEDING_DEFAULTS", "Rations espèce", "kg/j", "bovin 4.5 · ovin 2.5", "costEngine.FEEDING_DEFAULTS"),
     p("healthEvents", "Interventions santé", "—", "—", "dataMap.sante | vaccins")],
    ["totalCost", "gmq", "costPerKg", "margin", "costComplete"]),

    blk("cost_avicole", BOTH, "couts", "Coût revient lot avicole (calculateAvicoleLotCost)", """
purchaseCost = effectif × prix_unitaire_sujet (caisse poussins)

realFeedCost = Σ alimentation_logs lot

healthCost + otherDirectCost = charges directes lot

totalCost = purchase + aliment + santé + extras

Chair :
  sellableSubjects = effectif − mortalité − pertes
  costPerKg = totalCost / (poids_moyen × sellableSubjects)

Ponte :
  costPerEgg = totalCost / œufs vendables
  sellableEggs = production cumulée""",
    [p("DEFAULT_BROILER_CRATE_SIZE", "Sujets / caisse", "sujets", "50", "costEngine.js"),
     p("DEFAULT_BROILER_CRATE_PRICE", "Prix caisse poussins", "FCFA", "32000", "costEngine.js"),
     p("DEFAULT_LAYER_AMORTIZATION_DAYS", "Amortissement pondeuse", "j", "540", "costEngine.js")],
    ["totalCost", "costPerKg", "costPerEgg", "sellableSubjects", "mca"]),

    blk("cost_layer_tablet", OBJ, "couts", "Coût vente tablette œufs (calculateLayerTabletSaleCost)", """
eggCost = costPerEggWithoutPackaging × eggQty

packagingCost = packagingUnitCost × tabletQty

saleCost = eggCost + packagingCost + transportCost + lossCost

margin = CA tablettes − saleCost

eggQty = tablets × DEFAULT_EGGS_PER_TABLET (30)""",
    [p("DEFAULT_EGGS_PER_TABLET", "Œufs / tablette", "œufs", "30", "costEngine.js"),
     p("transportCost", "Transport vente", "FCFA", "0", "paramètre vente"),
     p("lossCost", "Pertes casse", "FCFA", "0", "paramètre vente")],
    ["saleCost", "eggCost", "packagingCost", "margin"]),

    blk("mca_rentabilite", BOTH, "couts", "Marge sur coût alimentaire (MCA)", """
Centre (decisionCenterMetrics) :
  mca = revenue − feedCost
  mcaFlash (bovin) = prix_vente_estime − (baseCost + feedCost)

Objectifs (lotAnalyticsEngine) :
  mcaPct = ((revenueEstimate − feedCost) / feedCost) × 100

unitCost :
  ponte → totalCost / œufs7j
  chair → totalCost / (effectif × poids_vif_kg)""",
    [p("revenue", "CA réalisé / estimé", "FCFA", "—", "sales_orders | estimations lot"),
     p("feedCost", "Coût aliment", "FCFA", "—", "alimentation_logs cumul")],
    ["mca", "mcaPct", "unitCost", "tone"]),

    blk("rentabilite_ranking", BOTH, "couts", "Classement rentabilité lots et fournisseurs", """
Par lot/animal :
  revenue, totalCost, feedCost, mca, unitCost, tone

supplierRanking :
  marginPct = (Σ mca / Σ revenue) × 100
  tri par mca décroissant

Alerte rentabilité si mca < 0 ou tone = bad""",
    [p("fournisseur", "Fournisseur aliment / poussins", "—", "—", "lot.fournisseur | animal.provenance")],
    ["supplierRanking[]", "lotRentabilite[]", "animalRentabilite[]"]),

    blk("bfr", CENTRE, "flux", "BFR cycle — blocage lancement (validateCycleBfrCoverage)", """
coutEstimeCycle = plannedHeadcount × avgDailyFeedPerHead × cycleDays × feedPrice

totalAvailable = max(0, treasury) + vipReceivables

coveragePct = (totalAvailable / coutEstimeCycle) × 100

blocked = coveragePct < bfr_min_coverage_pct

feedAutonomyDays = stockAlimentKg / dailyNeed

treasury = Σ entrées finances − Σ sorties finances
vipReceivables = créances clients VIP échéance ≤ 7 j""",
    [p("next_band_size", "Effectif prochaine bande", "sujets", "5000", "growth_settings.next_band_size"),
     p("avgDailyFeedPerHead", "Ration / tête / jour", "kg", "0.095 chair · 4.5 bovin", "validateCycleBfrCoverage"),
     p("bfr_min_coverage_pct", "Couverture minimum", "%", "50", "growth_settings.bfr_min_coverage_pct"),
     p("vip_client_ids", "Clients VIP BFR", "ids", "[]", "growth_settings.vip_client_ids")],
    ["coveragePct", "blocked", "coutEstimeCycle", "feedAutonomyDays"]),

    blk("stock_audit", BOTH, "flux", "Audit stock aliment bâtiment (auditFeedStockConsumption)", """
Par bâtiment B et jour J :
  theoretical = Σ (effectif_lot × feedStandardKgPerBird(workshop, ageDays))

  actual = Σ alimentation_logs(J, B)
         + Σ business_events sortie aliment(J, B)

  overPct = ((actual − theoretical) / theoretical) × 100

Alerte si overPct > STOCK_AUDIT_THRESHOLD_PCT (10%)
pendant STOCK_AUDIT_CONSECUTIVE_DAYS (3) jours consécutifs""",
    [p("STOCK_AUDIT_THRESHOLD_PCT", "Écart max acceptable", "%", "10", "strategicDecisionEngine.js"),
     p("STOCK_AUDIT_CONSECUTIVE_DAYS", "Jours consécutifs", "j", "3", "strategicDecisionEngine.js"),
     p("feedStandardKgPerBird", "Standard ration souche", "kg/j/sujet", "—", "strategicDecisionEngine.feedStandardKgPerBird")],
    ["overPct", "theoreticalKg", "actualKg", "consecutiveDays", "building"]),

    blk("flux_silo", BOTH, "flux", "Autonomie silo aliment (buildFlux)", """
dailyConsumption = moyenne(alimentation_logs 30j)
  ou fallback Σ (effectif × ration/j)

daysLeft = stockKg / dailyConsumption

Alerte si daysLeft < STOCK_CRITICAL_DAYS (5)

pct = min(100, stockKg / (dailyConsumption × 30) × 100)""",
    [p("STOCK_CRITICAL_DAYS", "Seuil stock critique", "j", "5", "decisionCenterMetrics.js"),
     p("stock", "Stock aliment", "kg", "—", "dataMap.stock (catégorie aliment)")],
    ["daysLeft", "dailyConsumption", "tone", "pct"]),

    blk("flux_occupation", BOTH, "flux", "Occupation bâtiments et balance matière", """
occupancyPct = min(100, effectif_bâtiment / 500 × 100)

materialBalance :
  entrees = effectif_initial
  sorties = vendus + effectif_actif
  pertes = mortalité
  lossValue = pertes × (totalCost / effectif_initial)
  mortalityPct = (pertes / entrees) × 100""",
    [p("batiment", "Bâtiment", "—", "—", "lot.batiment | lot.building"),
     p("capacity_ref", "Capacité référence", "sujets", "500", "decisionCenterMetrics (hardcodé)")],
    ["occupancyPct", "materialBalance[]", "lossValue"]),

    blk("sanitary", BOTH, "flux", "Vide sanitaire (buildSanitaryVacuumAlerts)", """
gapDays = date_entree_lot_suivant − date_fin_lot_précédent

blocking = gapDays < sanitary_min_days (10)

effectiveGap = lot.vide_sanitaire_jours si renseigné, sinon gapDays""",
    [p("sanitary_min_days", "Vide sanitaire min", "j", "10", "growth_settings.sanitary_min_days"),
     p("SANITARY_MIN_DAYS", "Constante Objectifs", "j", "10", "objectifsDecisionEngine.js")],
    ["gapDays", "blocking", "requiredDays"]),

    blk("sanitary_extended", CENTRE, "flux", "Vide sanitaire prolongé — mortalité pathologique", """
mortalityRate = (morts / effectif_initial) × 100

Si mortalityRate > mortality_threshold_pct (5%) :
  extraVacuumDays = growth_settings.extra_vacuum_days (7)
  totalWait = sanitary_min_days + extraVacuumDays
  earliestLaunchDate = today + extraVacuumDays

enrichSanitaryAlert → actions désinfection + validation véto""",
    [p("mortality_threshold_pct", "Seuil mortalité bande préc.", "%", "5", "growth_settings.mortality_threshold_pct"),
     p("extra_vacuum_days", "Prolongation pathologie", "j", "7", "growth_settings.extra_vacuum_days")],
    ["mortalityRate", "extraVacuumDays", "earliestLaunchDate", "blocking"]),

    blk("shrinkage", BOTH, "flux", "Démarque stock (buildStockShrinkageAnalysis)", """
Œufs :
  shrinkPct = ((theoreticalEggs − soldEggs) / theoreticalEggs) × 100
  Alerte si shrinkPct > 2%

Aliment global :
  overPct = ((actualFeedKg − theoreticalFeedKg) / theoreticalFeedKg) × 100
  Alerte si overPct > 10%

lossValue = (theoretical − actual) × prix_unitaire""",
    [p("production_oeufs_logs", "Ponte théorique", "œufs", "—", "production_oeufs_logs"),
     p("sales_orders", "Ventes enregistrées", "—", "—", "sales_orders")],
    ["shrinkPct", "lossValue", "theoretical", "actual"]),

    blk("pricing_floor", OBJ, "prix", "Prix plancher (computeFloorPrice)", """
floorPrice = unitCost × (1 + minMarginPct / 100)

unitCost défaut :
  oeufs = 550 · chair = 1900 · bovins = 300000 · cultures = 400 FCFA

minMarginPct = growth_settings.min_margin_pct ou 15%""",
    [p("unitCost", "Coût unitaire revient", "FCFA", "voir DEFAULT_UNIT_COST", "calculateAvicoleLotCost / calculateAnimalCost"),
     p("min_margin_pct", "Marge minimum", "%", "15", "growth_settings.min_margin_pct")],
    ["floorPrice"]),

    blk("pricing_seasonality", OBJ, "prix", "Coefficient saisonnalité (computeSeasonalityCoefficient)", """
Si historique ventes ≥ 2 mois :
  avgMonthly = totalRevenue / monthsWithData
  raw = monthRevenue / avgMonthly
  coef = clamp(raw, 0.85, 1.25)

Sinon :
  coef = demandLevelToFactor(commercialMonth.demand[activité])
    forte = 1.15 · normale = 1 · faible = 0.85""",
    [p("sales_orders", "Historique ventes", "—", "—", "dataMap.sales_orders"),
     p("referenceDate", "Mois de référence", "ISO", "aujourd'hui", "options.referenceDate")],
    ["seasonalityCoefficient"]),

    blk("pricing_recommended", OBJ, "prix", "Prix recommandé ERP (computeRecommendedPrice)", """
floor = computeFloorPrice(unitCost, minMarginPct)
market = resolveLocalMarketPrice(activité, marketPrices, location)
adjustedMarket = market × seasonalityCoefficient

recommendedPrice = MAX(floor, adjustedMarket)

mispricingRisk = floor > adjustedMarket
  → "Coût production trop élevé vs marché local" """,
    [p("market_prices", "Prix marché local", "FCFA", "DEFAULT_MARKET", "dataMap.market_prices | price_catalog"),
     p("location", "Localité ferme", "—", "—", "farm.ville | meteo.ville")],
    ["floorPrice", "marketPrice", "adjustedMarketPrice", "recommendedPrice", "mispricingRisk"]),

    blk("pricing_matrix", OBJ, "prix", "Matrice prix par activité (buildPricingMatrix)", """
Pour chaque activité ∈ [oeufs, poulets_chair, bovins] :
  computeRecommendedPrice(...)
  practicedPrice = moyenne(prix ventes historiques activité)

Écart pratiqué vs recommandé → mispricingAlert dans buildFinancialGapAnalysis""",
    [p("unitCosts", "Coûts unitaires par activité", "FCFA", "calcul ERP", "calculateAvicoleLotCost / calculateAnimalCost"),
     p("activities", "Activités analysées", "—", "oeufs, chair, bovins", "buildPricingMatrix param")],
    ["pricing[]", "practicedPrice", "mispricingAlerts[]"]),

    blk("scissors_effect", CENTRE, "analytique", "Effet ciseau — hausse intrants aliment (buildScissorsEffectAlert)", """
Pour chaque commodité (maïs, soja, tourteau) :
  monthlyPct = ((dernier_prix − premier_prix) / premier_prix) × 100 / nb_mois
  projected3mPct = monthlyPct × 3

avgRise = moyenne(projected3mPct des hausses ≥ 5%/mois)

economieEstimee = stockAlimentKg × feedPrice × (avgRise / 100) × 0.5

Recommandation si trésorerie > economieEstimee → acheter 3 mois stock""",
    [p("market_prices", "Cours intrants", "FCFA", "—", "dataMap.market_prices"),
     p("feedStock", "Stock aliment actuel", "kg", "—", "dataMap.stock")],
    ["projectedRisePct", "economieEstimee", "hasTreasurySurplus"]),

    blk("transformation_arbitrage", CENTRE, "analytique", "Arbitrage incubation vs vente œufs (buildTransformationArbitrage)", """
netEggMargin = eggTrayPrice

netChickMargin = chickPrice × hatchRate − incubatorCostPerEgg

diffPct = ((netChickMargin − netEggMargin) / netEggMargin) × 100

Si |diffPct| ≥ 5% :
  incubatePct = min(80, 50 + diffPct/2) si diffPct > 0
  sinon vente directe œufs recommandée

Défauts : eggTrayPrice=900 · chickPrice=350 · hatchRate=0.82 · incubatorCost=15 F/œuf""",
    [p("egg_tray_price", "Prix tablette œufs", "FCFA", "900", "market_prices | growth_settings.egg_tray_price"),
     p("chick_day_old_price", "Prix poussin", "FCFA", "350", "market_prices | growth_settings"),
     p("hatch_rate", "Taux éclosion", "ratio", "0.82", "growth_settings.hatch_rate"),
     p("incubator_cost_per_egg", "Coût incubation / œuf", "FCFA", "15", "growth_settings.incubator_cost_per_egg")],
    ["netChickMargin", "netEggMargin", "diffPct", "incubatePct"]),

    blk("vet_comparison", BOTH, "analytique", "Comparatif vétérinaires (buildVetPerformanceComparison)", """
Par type d'intervention :
  avgCost(vet) = moyenne(cout interventions)
  avgRecovery(vet) = moyenne(jours rétablissement)

  costSavePct = ((worst.avgCost − best.avgCost) / worst.avgCost) × 100
  recoveryGain = worst.avgRecovery − best.avgRecovery

Insight si costSavePct ≥ 5% ou recoveryGain ≥ 2 j""",
    [p("sante", "Interventions réalisées", "—", "—", "dataMap.sante | vaccins"),
     p("veterinaires", "Référentiel véto", "—", "—", "dataMap.veterinaires")],
    ["rankings[]", "insights[]", "avgCost", "avgRecovery"]),

    blk("feed_inflation", BOTH, "analytique", "Inflation aliment fournisseur (buildFeedInflationAlerts)", """
Période courante = 30 derniers j · précédente = J−60 à J−30

curAvg = moyenne(prix/kg achats courants)
prevAvg = moyenne(prix/kg achats précédents)

pctChange = ((curAvg − prevAvg) / prevAvg) × 100

Alerte si pctChange ≥ 10% (critique si ≥ 15%)""",
    [p("alimentation_logs", "Achats aliment", "—", "—", "dataMap.alimentation_logs"),
     p("achats", "Mouvements stock", "—", "—", "dataMap.achats | stock_movements")],
    ["pctChange", "currentPricePerKg", "previousPricePerKg"]),

    blk("feed_supplier_ranking", CENTRE, "analytique", "Comparatif fournisseurs aliment (buildFeedComparisons)", """
avgPricePerKg(fournisseur) = totalAmount / totalKg

spreadPct = ((worst − best) / best) × 100

Alerte si spreadPct ≥ 5% (bad si > 15%)

periodAlerts : variation prix produit ≥ 5% sur 30 j vs 30 j précédents""",
    [p("fournisseurs", "Référentiel fournisseurs", "—", "—", "dataMap.fournisseurs"),
     p("alimentation_logs", "Historique achats", "—", "—", "dataMap.alimentation_logs")],
    ["supplierRankings[]", "supplierAlerts[]", "periodAlerts[]"]),

    blk("seasonality_weather", OBJ, "analytique", "Saisonnalité météo vs performance (buildSeasonalityWeatherAnalysis)", """
Par mois :
  layingRate = oeufs / (effectif × nbJours)
  icProxy = feedKg / (oeufs / 12)

isHotSeason = avril–mai (mois 4–5)

seasonalDrop = avgCoolLaying − avgHotLaying

Alerte si seasonalDrop ≥ 5 pts ou temp actuelle ≥ 35°C""",
    [p("meteo", "Météo actuelle", "°C / %", "—", "dataMap.meteo"),
     p("production_oeufs_logs", "Historique ponte", "—", "—", "production_oeufs_logs")],
    ["seasonalDropPct", "rows[]", "insights[]"]),

    blk("client_quality", OBJ, "analytique", "Qualité lots par client (buildLotQualityByClient)", """
unitPrice = montant_total / quantité

triStrict = notes contient "tri" ou exigence "calibr"

marginScore :
  faible si triStrict ET unitPrice < 5000
  bonne si unitPrice ≥ 5000

Alerte si triStrict ET marginScore = faible""",
    [p("sales_orders", "Commandes clients", "—", "—", "dataMap.sales_orders"),
     p("clients", "Référentiel clients", "—", "—", "dataMap.clients")],
    ["clientRanking[]", "insights[]", "marginScore"]),

    blk("maraichage_biomass", BOTH, "analytique", "Valorisation fumier / litière (calculateBiomassValue)", """
litterKgYear = poules × 0.08 × 365
manureKgYear = bovins × 15 × 365
totalEffluentKg = litter + manure

bagsSaved = floor(totalEffluentKg / 50)
fertilizerSavings = bagsSaved × npkBagPrice (15000 F)

Centre maraîchage :
  marginM2 = yieldKgM2 × priceKg − seedCostM2
  marginHa = marginM2 × 10000""",
    [p("npk_bag_price", "Prix sac NPK 50kg", "FCFA", "15000", "growth_settings.npk_bag_price"),
     p("FERTILIZER_BAG_KG", "Poids sac engrais", "kg", "50", "decisionCenterMetrics.js")],
    ["economie_totale_fcfa", "bagsSaved", "cropSimulation[]"]),

    blk("maraichage_sandbox", OBJ, "analytique", "Simulateur maraîchage (simulateMaraichageSandbox)", """
totalCost = baseCharges + extraCharges + yieldKg × costPerKg

revenueA = yieldKg × marketPriceA
revenueB = yieldKg × marketPriceB

marginA = revenueA − totalCost
marginB = revenueB − totalCost

breakEvenKgA = ceil(totalCost / (marketPriceA − costPerKg))""",
    [p("baseCharges", "Charges fixes parcelle", "FCFA", "0", "paramètre sandbox"),
     p("yieldKg", "Rendement attendu", "kg", "—", "paramètre sandbox"),
     p("costPerKg", "Coût production / kg", "FCFA/kg", "400", "paramètre sandbox")],
    ["marginA", "marginB", "breakEvenKgA", "breakEvenKgB"]),

    blk("charts_g1_g7", OBJ, "graphiques", "Graphiques G1 – G7 (Objectifs)", """
G1 : courbe ponte réelle vs souche (theoreticalStandardAtAge)
G2 : comparaison lots (rentabilité / cycle)
G3 : CA mensuel vs breakEvenCa vs targetCaForNetMargin
G4 : âge lots (J+ageDays)
G5 : flux trésorerie
G6 : jauge attainment objectif annuel (%)
G7 : coût revient vs marché vs prix pratiqué par activité""",
    [p("chartData.g1…g7", "Jeux de données", "—", "—", "buildChartDataset() · objectifsDecisionEngine")],
    ["chartData"]),

    blk("charts_centre", CENTRE, "graphiques", "Graphiques Centre décisionnel", """
Ponte vs aliment : layingRate(%) + feedKg/j
IC chair par lot : feedKg / liveWeightKg
Embouche GMQ : gmq vs seuil 400 g/j
Silo : daysLeft = stockKg / consoJour
Maraîchage : simulateur charges / rendement / prix marché""",
    [p("STOCK_CRITICAL_DAYS", "Seuil stock aliment critique", "j", "5", "decisionCenterMetrics.js"),
     p("production_oeufs_logs", "Journal ponte", "—", "—", "dataMap.production_oeufs_logs")],
    ["graphiques.avicoleDaily", "graphiques.broilerIC", "graphiques.cattleGMQ", "graphiques.siloLevels"]),

    blk("technical_farming", CENTRE, "pilotage", "Alertes conduite technique (buildTechnicalFarmingAlerts)", """
Règles technicalFarmingRules appliquées sur :
  lots avicole · animaux · stocks · santé · capteurs

Sévérité → priorité recommandation :
  critique/urgence → haute · warning → moyenne

activityFromTechnicalAlert → oeufs | chair | bovins | stock | cultures""",
    [p("sensor_devices", "Capteurs IoT", "—", "—", "dataMap.sensor_devices"),
     p("business_events", "Événements métier", "—", "—", "dataMap.business_events")],
    ["technical_alerts[]", "technical_recommendations[]"]),
]

def js_str(s):
    return json.dumps(s, ensure_ascii=False)

def render_block(b):
    lines = [
        "  {",
        f"    id: {js_str(b['id'])},",
        f"    modules: {json.dumps(b['modules'])},",
        f"    category: {js_str(b['category'])},",
        f"    title: {js_str(b['title'])},",
        f"    formula: {js_str(b['formula'])},",
        "    parameters: [",
    ]
    for row in b["parameters"]:
        lines.append(
            f"      {{ name: {js_str(row['name'])}, label: {js_str(row['label'])}, unit: {js_str(row['unit'])}, default: {js_str(row['default'])}, source: {js_str(row['source'])} }},"
        )
    lines.append("    ],")
    lines.append(f"    outputs: {json.dumps(b['outputs'])},\n  }},")
    return "\n".join(lines)

footer = """
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
"""

header = """/** Annexe méthodologique — formules, noms de paramètres et sources de données (exhaustif). */

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
"""

out_path = "/workspace/src/services/decisionMethodology.js"
with open(out_path, "w", encoding="utf-8") as f:
    f.write(header)
    for b in blocks:
        f.write(render_block(b))
        f.write("\n")
    f.write("];\n")
    f.write(footer)

print(f"Wrote {len(blocks)} blocks to {out_path}")
