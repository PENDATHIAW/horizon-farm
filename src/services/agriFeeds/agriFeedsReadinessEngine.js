/**
 * AGRI FEEDS — moteur de readiness data-driven.
 *
 * Distingue clairement :
 *   - REFERENCE      → collecte Phase 1
 *   - PILOT_INTERNAL (Phase 2A) → production pilote interne
 *   - PROGRESSIVE_SALES (Phase 2B) → vente progressive
 *
 * Le moteur ne répond jamais uniquement « prêt / pas prêt ».
 * Il retourne : score, mode recommandé, blockers, warnings,
 * données utilisées, données manquantes, actions prioritaires,
 * et signale toujours qu’une validation humaine est requise.
 *
 * L’IA propose. L’humain décide.
 */
import {
  AGRI_FEEDS_DEPLOYMENT_MODES,
  AGRI_FEEDS_READINESS_THRESHOLDS,
  DEFAULT_PLANNED_FACILITY_ZONES,
} from '../../config/agriFeeds.config.js';
import { toNumber } from '../../utils/format.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const norm = (v = '') => String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const clamp = (v) => Math.max(0, Math.min(100, Math.round(v)));

function isFeedStock(row = {}) {
  const text = norm(`${row.categorie || ''} ${row.produit || ''} ${row.product_name || ''}`);
  return text.includes('aliment') || text.includes('feed') || text.includes('provende')
    || text.includes('matiere_premiere_aliment') || text.includes('aliment_agri');
}

function isMarketFeedStock(row = {}) {
  const cat = norm(row.categorie || '');
  return cat.includes('aliment_betail') || cat.includes('aliment_avicole')
    || (isFeedStock(row) && !cat.includes('aliment_agri') && !cat.includes('matiere_premiere'));
}

function isCriticalAlert(alert = {}) {
  const status = norm(alert.status || alert.statut || alert.state || '');
  if (['closed', 'resolue', 'resolue', 'traite', 'traitee', 'archived'].includes(status)) return false;
  const severity = norm(alert.severity || alert.gravite || alert.priority || alert.priorite || '');
  return severity.includes('critique') || severity.includes('critical')
    || severity.includes('haute') || severity.includes('high')
    || severity.includes('urgent');
}

function safePct(num, den) {
  const d = toNumber(den);
  if (d <= 0) return 0;
  return (toNumber(num) / d) * 100;
}

function scoreBucket({ score, label, cap, met, missing, warnings, used, missingData }) {
  return {
    score: clamp(score),
    label,
    cap,
    met,
    missing,
    warnings,
    used,
    missingData,
  };
}

/* --------------------------- Phase 1 — REFERENCE -------------------------- */

function scorePhase1Reference(dataMap = {}) {
  const logs = arr(dataMap.alimentation_logs);
  const stocks = arr(dataMap.stock || dataMap.stocks).filter(isMarketFeedStock);
  const lots = arr(dataMap.avicole || dataMap.lots);
  const animaux = arr(dataMap.animaux);
  const fournisseurs = arr(dataMap.fournisseurs);
  const finances = arr(dataMap.finances || dataMap.transactions);

  const feedFinance = finances.filter((r) => {
    const t = norm(`${r.categorie || ''} ${r.libelle || ''} ${r.module_lie || ''}`);
    return t.includes('aliment') || t.includes('stock');
  });

  let score = 0;
  const met = [];
  const missing = [];
  const blockers = [];
  const used = [];
  const missingData = [];

  if (logs.length >= 5) {
    score += 25;
    met.push(`${logs.length} distributions d’aliment enregistrées`);
    used.push('alimentation_logs');
  } else if (logs.length >= 1) {
    score += 12;
    met.push(`${logs.length} distribution(s) d’aliment`);
    missing.push('Atteindre au moins 5 distributions pour une référence solide');
    used.push('alimentation_logs');
  } else {
    missing.push('Aucune distribution d’aliment enregistrée');
    blockers.push('Collecter les distributions d’aliment Phase 1');
    missingData.push('alimentation_logs');
  }

  if (stocks.length >= 1) {
    score += 15;
    met.push(`${stocks.length} ligne(s) stock aliment marché`);
    used.push('stock (aliment marché)');
  } else {
    missing.push('Aucun stock aliment marché');
    blockers.push('Enregistrer les achats d’aliment du marché');
    missingData.push('stock aliment marché');
  }

  const lotsWithFeed = lots.filter((lot) => {
    const id = String(lot.id || '');
    return logs.some((l) => String(l.cible_id || l.lot_id || '') === id)
      || toNumber(lot.cout_aliment || lot.alimentation_calculee) > 0;
  });
  if (lotsWithFeed.length >= 2 || (lotsWithFeed.length >= 1 && animaux.length >= 1)) {
    score += 20;
    met.push('Lots / animaux reliés à l’alimentation');
    used.push('avicole / animaux ↔ alimentation_logs');
  } else if (lots.length + animaux.length > 0) {
    score += 8;
    missing.push('Relier davantage de lots aux distributions d’aliment');
  } else {
    missing.push('Aucun lot ou animal pour rattacher les coûts alimentaires');
    missingData.push('avicole / animaux');
  }

  if (fournisseurs.length >= 1) {
    score += 10;
    met.push('Fournisseurs disponibles');
    used.push('fournisseurs');
  } else {
    missing.push('Aucun fournisseur enregistré');
    missingData.push('fournisseurs');
  }

  if (feedFinance.length >= 1 || logs.some((l) => toNumber(l.montant_total) > 0)) {
    score += 15;
    met.push('Coûts alimentaires tracés (finance ou logs)');
    used.push('finances (aliment)');
  } else {
    missing.push('Coûts alimentaires non encore tracés');
    missingData.push('finances (aliment)');
  }

  const zones = arr(dataMap.feed_facility_zones);
  const plannedZones = zones.length > 0 ? zones : DEFAULT_PLANNED_FACILITY_ZONES;
  if (plannedZones.length >= 4) {
    score += 15;
    met.push(`${plannedZones.length} zones AGRI FEEDS prévues / suivies`);
    used.push('feed_facility_zones');
  } else {
    missing.push('Réserver les zones site AGRI FEEDS');
    missingData.push('feed_facility_zones');
  }

  return {
    score: clamp(score),
    met,
    missing,
    blockers,
    used,
    missingData,
    metrics: {
      alimentationLogs: logs.length,
      marketFeedStocks: stocks.length,
      lotsWithFeed: lotsWithFeed.length,
      fournisseurs: fournisseurs.length,
      zonesPlanned: plannedZones.length,
    },
  };
}

/* --------------------- Phase 2A — PILOT_INTERNAL --------------------------- */
/**
 * 12 critères pondérés (total 100). Chaque critère renvoie un score borné
 * ainsi qu’une décomposition claire des données utilisées / manquantes.
 */
function scorePilotPhase2A(dataMap = {}, phase1 = {}) {
  const logs = arr(dataMap.alimentation_logs);
  const finances = arr(dataMap.finances || dataMap.transactions);
  const sales = arr(dataMap.sales_orders);
  const payments = arr(dataMap.payments);
  const invoices = arr(dataMap.invoices);
  const lots = arr(dataMap.avicole || dataMap.lots);
  const animaux = arr(dataMap.animaux);
  const santeEvents = arr(dataMap.sante || dataMap.veterinaires);
  const equipements = arr(dataMap.equipements);
  const zones = arr(dataMap.feed_facility_zones);
  const rawMaterials = arr(dataMap.feed_raw_materials);
  const rawBatches = arr(dataMap.feed_raw_batches);
  const alerts = arr(dataMap.alertes_center);

  const buckets = [];

  /* 1. Qualité / volume des données historiques Phase 1 (cap 12) */
  {
    const cap = 12;
    const met = [];
    const missing = [];
    const warnings = [];
    const used = ['alimentation_logs'];
    const missingData = [];
    let s = 0;
    if (logs.length >= 30) { s = cap; met.push(`${logs.length} distributions Phase 1`); }
    else if (logs.length >= 10) { s = cap * 0.7; met.push(`${logs.length} distributions Phase 1`); warnings.push('Volume Phase 1 encore modéré (< 30 distributions)'); }
    else if (logs.length >= 5) { s = cap * 0.4; missing.push('Compléter au moins 30 distributions Phase 1'); warnings.push('Base Phase 1 fragile'); }
    else {
      missing.push('Volume de données Phase 1 insuffisant');
      missingData.push('alimentation_logs (≥ 10)');
    }
    buckets.push(scoreBucket({ score: s, label: 'Qualité & volume Phase 1', cap, met, missing, warnings, used, missingData }));
  }

  /* 2. Stabilité sanitaire (cap 10) */
  {
    const cap = 10;
    const met = [];
    const missing = [];
    const warnings = [];
    const used = ['sante', 'avicole', 'animaux'];
    const missingData = [];
    let s = 0;
    const mortalityRates = lots
      .map((lot) => {
        const initial = toNumber(lot.initial_count || lot.effectif_initial);
        const mort = toNumber(lot.mortality || lot.mortalite);
        return initial > 0 ? (mort / initial) * 100 : null;
      })
      .filter((v) => v != null);
    const avgMortality = mortalityRates.length
      ? mortalityRates.reduce((a, b) => a + b, 0) / mortalityRates.length
      : null;
    const openHealthAlerts = alerts.filter((a) => isCriticalAlert(a) && norm(`${a.module_source || a.module || ''}`).includes('sante')).length;
    const riskyAnimals = animaux.filter((animal) => ['malade', 'critique', 'a_surveiller', 'sous_traitement'].some((status) => norm(`${animal.health_status || animal.status || animal.statut}`).includes(status))).length;
    if (avgMortality != null) {
      if (avgMortality <= 5 && openHealthAlerts === 0 && riskyAnimals === 0) {
        s = cap;
        met.push(`Mortalité moyenne ${avgMortality.toFixed(1)} %`);
      } else if (avgMortality <= 10 && openHealthAlerts === 0) {
        s = cap * 0.6;
        warnings.push(`Mortalité moyenne ${avgMortality.toFixed(1)} % — surveiller`);
      } else {
        s = cap * 0.3;
        warnings.push(`Mortalité moyenne ${avgMortality.toFixed(1)} % ou alertes sanitaires ouvertes`);
        if (openHealthAlerts > 0) missing.push(`${openHealthAlerts} alerte(s) sanitaire critique ouverte(s)`);
        if (riskyAnimals > 0) missing.push(`${riskyAnimals} animal/animaux à risque sanitaire`);
      }
      if (santeEvents.length === 0) warnings.push('Aucun événement sanitaire tracé');
    } else {
      missing.push('Pas de suivi mortalité pour évaluer la stabilité sanitaire');
      missingData.push('avicole.mortality / animaux');
    }
    buckets.push(scoreBucket({ score: s, label: 'Stabilité sanitaire', cap, met, missing, warnings, used, missingData }));
  }

  /* 3. Indice de consommation (cap 8) */
  {
    const cap = 8;
    const met = [];
    const missing = [];
    const warnings = [];
    const used = ['avicole', 'alimentation_logs'];
    const missingData = [];
    let s = 0;
    const lotsWithIc = lots.filter((lot) => toNumber(lot.indice_consommation || lot.feed_conversion || lot.fcr) > 0);
    if (lotsWithIc.length >= 2) { s = cap; met.push(`${lotsWithIc.length} lots avec IC calculé`); }
    else if (lotsWithIc.length === 1) { s = cap * 0.6; warnings.push('Seul un lot avec IC — enrichir'); }
    else {
      missing.push('Indice de consommation non calculé');
      missingData.push('avicole.indice_consommation');
    }
    buckets.push(scoreBucket({ score: s, label: 'Indice de consommation', cap, met, missing, warnings, used, missingData }));
  }

  /* 4. Coût alimentaire connu (cap 8) */
  {
    const cap = 8;
    const met = [];
    const missing = [];
    const warnings = [];
    const used = ['finances', 'alimentation_logs'];
    const missingData = [];
    let s = 0;
    const feedCost = finances
      .filter((f) => norm(`${f.categorie || ''} ${f.libelle || ''}`).includes('aliment'))
      .reduce((sum, f) => sum + toNumber(f.montant), 0);
    const logCost = logs.reduce((sum, l) => sum + toNumber(l.montant_total), 0);
    const totalFeedCost = feedCost + logCost;
    if (totalFeedCost > 0) {
      s = cap;
      met.push(`Coût alimentaire tracé (${Math.round(totalFeedCost).toLocaleString()} FCFA)`);
    } else {
      missing.push('Coût alimentaire non tracé');
      missingData.push('finances (aliment)');
    }
    buckets.push(scoreBucket({ score: s, label: 'Coût alimentaire suivi', cap, met, missing, warnings, used, missingData }));
  }

  /* 5. Marges observées (cap 8) */
  {
    const cap = 8;
    const met = [];
    const missing = [];
    const warnings = [];
    const used = ['sales_orders', 'finances'];
    const missingData = [];
    let s = 0;
    const revenue = sales.reduce((sum, s2) => sum + toNumber(s2.montant_total || s2.total_ttc || s2.total_ht), 0);
    const opex = finances
      .filter((f) => ['depense', 'charge', 'sortie'].includes(norm(f.type || f.sens || '')))
      .reduce((sum, f) => sum + toNumber(f.montant), 0);
    if (revenue > 0 && opex > 0) {
      const margin = revenue - opex;
      const marginPct = safePct(margin, revenue);
      if (margin > 0 && marginPct >= 10) { s = cap; met.push(`Marge observée ${marginPct.toFixed(1)} %`); }
      else if (margin > 0) { s = cap * 0.6; warnings.push(`Marge faible (${marginPct.toFixed(1)} %)`); }
      else { s = cap * 0.2; warnings.push(`Marge négative — risque avant lancement pilote`); }
    } else {
      missing.push('Marge observée non calculable (CA ou charges manquants)');
      missingData.push('sales_orders / finances');
    }
    buckets.push(scoreBucket({ score: s, label: 'Marges observées', cap, met, missing, warnings, used, missingData }));
  }

  /* 6. Trésorerie (cap 8) */
  {
    const cap = 8;
    const met = [];
    const missing = [];
    const warnings = [];
    const used = ['finances', 'payments'];
    const missingData = [];
    let s = 0;
    const cashIn = payments.reduce((sum, p) => sum + toNumber(p.montant || p.amount || p.montant_paye), 0);
    const cashFinance = finances.reduce((sum, f) => {
      const t = norm(f.type || f.sens || '');
      const amt = toNumber(f.montant);
      if (['recette', 'entree', 'income', 'revenu'].includes(t)) return sum + amt;
      if (['depense', 'charge', 'sortie'].includes(t)) return sum - amt;
      return sum;
    }, 0);
    const netCash = cashIn + cashFinance;
    if (finances.length + payments.length === 0) {
      missing.push('Aucun mouvement de trésorerie tracé');
      missingData.push('finances / payments');
    } else if (netCash >= 0) {
      s = cap;
      met.push('Trésorerie positive nette');
    } else {
      s = cap * 0.3;
      warnings.push('Trésorerie nette négative — prudence avant pilote AGRI FEEDS');
    }
    buckets.push(scoreBucket({ score: s, label: 'Trésorerie', cap, met, missing, warnings, used, missingData }));
  }

  /* 7. Créances et dettes (cap 6) */
  {
    const cap = 6;
    const met = [];
    const missing = [];
    const warnings = [];
    const used = ['invoices', 'payments'];
    const missingData = [];
    let s;
    const receivables = invoices.reduce((sum, inv) => {
      const total = toNumber(inv.montant_total || inv.total_ttc);
      const paid = toNumber(inv.montant_paye || inv.paid_amount);
      return sum + Math.max(0, total - paid);
    }, 0);
    const overdue = invoices.filter((inv) => {
      const due = inv.due_date || inv.echeance;
      if (!due) return false;
      return new Date(due) < new Date() && toNumber(inv.montant_total) > toNumber(inv.montant_paye);
    }).length;
    if (invoices.length === 0) {
      s = cap * 0.5;
      warnings.push('Aucune facture pour évaluer créances / dettes');
      missingData.push('invoices');
    } else if (overdue === 0 && receivables < 500000) {
      s = cap;
      met.push('Créances / dettes maîtrisées');
    } else if (overdue <= 2) {
      s = cap * 0.6;
      warnings.push(`${overdue} facture(s) en retard`);
    } else {
      s = cap * 0.2;
      warnings.push(`${overdue} factures en retard — risque financier`);
    }
    buckets.push(scoreBucket({ score: s, label: 'Créances & dettes', cap, met, missing, warnings, used, missingData }));
  }

  /* 8. Disponibilité de l’eau (cap 6) */
  {
    const cap = 6;
    const met = [];
    const missing = [];
    const warnings = [];
    const used = ['equipements', 'feed_facility_zones'];
    const missingData = [];
    let s = 0;
    const waterEquip = equipements.filter((e) => norm(`${e.type || ''} ${e.nom || ''} ${e.categorie || ''}`).match(/eau|forage|puits|chateau|bassin|water/));
    const zoneWater = zones.some((z) => norm(z.notes || z.name || '').match(/eau|forage|water/));
    if (waterEquip.length >= 1 || zoneWater) {
      s = cap;
      met.push('Source d’eau disponible pour production');
    } else {
      missing.push('Aucune source d’eau documentée');
      missingData.push('equipements (eau/forage)');
    }
    buckets.push(scoreBucket({ score: s, label: 'Disponibilité eau', cap, met, missing, warnings, used, missingData }));
  }

  /* 9. État du site AGRI FEEDS (cap 8) */
  {
    const cap = 8;
    const met = [];
    const missing = [];
    const warnings = [];
    const used = ['feed_facility_zones'];
    const missingData = [];
    let s = 0;
    const activeZones = zones.filter((z) => ['available', 'in_use'].includes(norm(z.status || '')));
    const criticalTypes = ['raw_material_storage', 'production_area', 'finished_goods_storage', 'quality_control'];
    const covered = criticalTypes.filter((t) => activeZones.some((z) => norm(z.zone_type) === t)).length;
    if (covered >= 4) { s = cap; met.push('4 zones critiques opérationnelles'); }
    else if (covered >= 2) { s = cap * 0.5; warnings.push(`Seulement ${covered}/4 zones critiques opérationnelles`); }
    else {
      missing.push('Site AGRI FEEDS pas encore opérationnel');
      missingData.push('feed_facility_zones (available/in_use)');
    }
    buckets.push(scoreBucket({ score: s, label: 'État du site AGRI FEEDS', cap, met, missing, warnings, used, missingData }));
  }

  /* 10. Fournisseurs matières premières (cap 8) */
  {
    const cap = 8;
    const met = [];
    const missing = [];
    const warnings = [];
    const used = ['fournisseurs', 'feed_raw_materials', 'feed_raw_batches'];
    const missingData = [];
    let s = 0;
    if (rawMaterials.length >= 3 && rawBatches.filter((b) => norm(b.quality_status) === 'accepted').length >= 3) {
      s = cap;
      met.push(`${rawMaterials.length} MP · ${rawBatches.length} lot(s) approvisionnés`);
    } else if (rawMaterials.length >= 1) {
      s = cap * 0.5;
      warnings.push(`Seulement ${rawMaterials.length} matière(s) première(s) — élargir`);
      if (rawBatches.length === 0) missing.push('Aucun lot MP réceptionné');
    } else {
      missing.push('Aucun fournisseur MP AGRI FEEDS');
      missingData.push('feed_raw_materials / feed_raw_batches');
    }
    buckets.push(scoreBucket({ score: s, label: 'Fournisseurs matières premières', cap, met, missing, warnings, used, missingData }));
  }

  /* 11. Encadrement technique (cap 8) */
  {
    const cap = 8;
    const met = [];
    const missing = [];
    const warnings = [];
    const used = ['veterinaires', 'sante', 'fournisseurs'];
    const missingData = [];
    let s = 0;
    const techContacts = arr(dataMap.veterinaires).length
      + arr(dataMap.fournisseurs).filter((f) => norm(f.supplier_type || f.type || f.categorie || '').includes('technic')).length;
    if (techContacts >= 2) { s = cap; met.push(`${techContacts} contact(s) technique(s) référencés`); }
    else if (techContacts === 1) { s = cap * 0.5; warnings.push('Un seul contact technique référencé'); }
    else {
      missing.push('Aucun encadrement technique référencé');
      missingData.push('veterinaires / fournisseurs technique');
    }
    buckets.push(scoreBucket({ score: s, label: 'Encadrement technique', cap, met, missing, warnings, used, missingData }));
  }

  /* 12. Absence d’alertes critiques ouvertes (cap 10) */
  {
    const cap = 10;
    const met = [];
    const missing = [];
    const warnings = [];
    const used = ['alertes_center'];
    const missingData = [];
    let s;
    const openCritical = alerts.filter(isCriticalAlert).length;
    if (openCritical === 0) { s = cap; met.push('Aucune alerte critique ouverte'); }
    else if (openCritical <= 2) { s = cap * 0.4; warnings.push(`${openCritical} alerte(s) critique(s) ouverte(s)`); }
    else { s = 0; warnings.push(`${openCritical} alertes critiques ouvertes — bloquant si non traitées`); }
    buckets.push(scoreBucket({ score: s, label: 'Alertes critiques ouvertes', cap, met, missing, warnings, used, missingData }));
  }

  const total = buckets.reduce((sum, b) => sum + b.score, 0);
  const totalCap = buckets.reduce((sum, b) => sum + b.cap, 0);
  const score = Math.round((total / totalCap) * 100);

  const met = buckets.flatMap((b) => b.met);
  const missing = buckets.flatMap((b) => b.missing);
  const warnings = buckets.flatMap((b) => b.warnings);
  const used = Array.from(new Set(buckets.flatMap((b) => b.used)));
  const missingData = Array.from(new Set(buckets.flatMap((b) => b.missingData)));

  const blockers = [];
  if (phase1.score < 35) blockers.push('Référence Phase 1 encore trop faible pour un pilote fiable');
  buckets.forEach((b) => {
    if (b.score === 0 && b.cap >= 8) {
      blockers.push(`Critère bloquant : ${b.label}`);
    }
  });

  return {
    score: clamp(score),
    met,
    missing,
    warnings,
    used,
    missingData,
    blockers,
    breakdown: buckets.map((b) => ({
      label: b.label,
      score: b.score,
      cap: b.cap,
      met: b.met,
      missing: b.missing,
      warnings: b.warnings,
    })),
  };
}

/* -------------------- Phase 2B — PROGRESSIVE_SALES ------------------------ */
/**
 * La vente progressive est **bloquée** tant qu’un seul de ces éléments manque :
 *   - au moins une formule testée (`internal_testing`, `to_improve`,
 *     `internally_validated`, `client_testing`, `commercializable`) ;
 *   - un coût réel de production calculé (`feed_production_orders.real_cost_per_kg > 0`) ;
 *   - une comparaison avec la référence Phase 1 ;
 *   - au moins un contrôle qualité `feed_quality_checks` enregistré ;
 *   - une validation humaine explicite (essai clôturé + reviewed_by_human ou
 *     validated_by / formule `commercializable`) ;
 *   - au moins une formule au statut `commercializable`.
 */
function scoreProgressivePhase2B(dataMap = {}, pilot = {}) {
  const formulas = arr(dataMap.feed_formulas);
  const versions = arr(dataMap.feed_formula_versions);
  const orders = arr(dataMap.feed_production_orders);
  const finished = arr(dataMap.feed_finished_batches).filter((b) => norm(b.quality_status) !== 'rejected' && b.active !== false);
  const trials = arr(dataMap.feed_trials);
  const qc = arr(dataMap.feed_quality_checks);
  const sales = arr(dataMap.sales_orders).filter((s) => {
    const t = norm(`${s.notes || ''} ${s.source || ''} ${s.created_from || ''}`);
    return t.includes('agri_feeds') || t.includes('agri feeds');
  });

  const testedStatuses = ['internal_testing', 'to_improve', 'internally_validated', 'client_testing', 'commercializable'];

  const gates = {
    formulaTested: formulas.some((f) => testedStatuses.includes(norm(f.status || '')))
      || versions.some((v) => testedStatuses.includes(norm(v.status || ''))),
    realCost: orders.some((o) => toNumber(o.real_cost_per_kg) > 0)
      || finished.some((b) => toNumber(b.unit_cost) > 0),
    phase1Comparison: arr(dataMap.feed_phase1_comparisons).length > 0
      || trials.some((t) => t.phase1_comparison || t.compared_to_phase1)
      || finished.some((b) => b.phase1_comparison_id),
    qcMinimum: qc.length > 0,
    humanValidation: trials.some((t) => (t.reviewed_by_human || t.validated_by) && ['validate', 'validated'].includes(norm(t.decision || '')))
      || formulas.some((f) => Boolean(f.human_validation_at) || Boolean(f.validated_by))
      || formulas.some((f) => norm(f.status || '') === 'commercializable'),
    hasCommercializable: formulas.some((f) => norm(f.status || '') === 'commercializable'),
  };

  const gateLabels = {
    formulaTested: 'Au moins une formule testée',
    realCost: 'Coût réel de production calculé',
    phase1Comparison: 'Comparaison avec référence Phase 1',
    qcMinimum: 'Au moins un contrôle qualité enregistré',
    humanValidation: 'Validation humaine enregistrée',
    hasCommercializable: 'Formule au statut commercialisable',
  };

  const blockers = [];
  Object.entries(gates).forEach(([key, ok]) => {
    if (!ok) blockers.push(`Vente progressive bloquée : ${gateLabels[key]} manquant`);
  });

  const met = [];
  const missing = [];
  const warnings = [];
  const used = ['feed_formulas', 'feed_formula_versions', 'feed_production_orders', 'feed_finished_batches', 'feed_quality_checks', 'feed_trials'];
  const missingData = [];

  Object.entries(gates).forEach(([key, ok]) => {
    if (ok) met.push(gateLabels[key]);
    else missing.push(gateLabels[key]);
  });

  if (!gates.qcMinimum) missingData.push('feed_quality_checks');
  if (!gates.phase1Comparison) missingData.push('feed_phase1_comparisons / feed_trials.phase1_comparison');
  if (!gates.humanValidation) missingData.push('feed_trials.reviewed_by_human / feed_formulas.validated_by');
  if (!gates.realCost) missingData.push('feed_production_orders.real_cost_per_kg');

  let score = Math.min(30, Math.round(pilot.score * 0.3));
  score += (gates.formulaTested ? 12 : 0);
  score += (gates.realCost ? 12 : 0);
  score += (gates.phase1Comparison ? 10 : 0);
  score += (gates.qcMinimum ? 10 : 0);
  score += (gates.humanValidation ? 14 : 0);
  score += (gates.hasCommercializable ? 12 : 0);

  if (finished.length >= 1) { score += 5; met.push('Lot(s) produit(s) disponibles'); used.push('feed_finished_batches'); }
  else { warnings.push('Aucun lot produit fini prêt'); missingData.push('feed_finished_batches'); }

  if (sales.length >= 1) { score += 5; met.push(`${sales.length} vente(s) AGRI FEEDS tracée(s)`); }

  return {
    score: clamp(score),
    met,
    missing,
    warnings,
    used,
    missingData,
    blockers,
    gates,
    gateLabels,
  };
}

/* -------------------------------- Mode ------------------------------------ */

function resolveMode(phase1Score, pilotScore, salesScore, salesGates, dataMap = {}) {
  const hasProduction = arr(dataMap.feed_production_orders).length > 0
    || arr(dataMap.feed_finished_batches).length > 0
    || arr(dataMap.feed_formulas).length > 0
    || arr(dataMap.feed_raw_materials).length > 0;

  const salesGatesOk = salesGates
    ? Object.values(salesGates).every(Boolean)
    : false;

  if (
    salesScore >= AGRI_FEEDS_READINESS_THRESHOLDS.progressive_sales_min
    && salesGatesOk
  ) {
    return AGRI_FEEDS_DEPLOYMENT_MODES.PROGRESSIVE_SALES;
  }
  if (
    pilotScore >= AGRI_FEEDS_READINESS_THRESHOLDS.pilot_internal_min
    || hasProduction
  ) {
    return AGRI_FEEDS_DEPLOYMENT_MODES.PILOT_INTERNAL;
  }
  return AGRI_FEEDS_DEPLOYMENT_MODES.REFERENCE;
}

function buildNextActions(mode, phase1, pilot, sales) {
  const actions = [];
  if (mode.id === 'REFERENCE') {
    actions.push(...phase1.missing.slice(0, 3).map((m) => `Référence : ${m}`));
    if (phase1.score >= 35) {
      actions.push('Préparer les matières premières et la première formule (Phase 2A)');
    }
  } else if (mode.id === 'PILOT_INTERNAL') {
    actions.push(...pilot.missing.slice(0, 3).map((m) => `Phase 2A : ${m}`));
    if (sales.blockers.length) actions.push(sales.blockers[0]);
  } else {
    actions.push(...sales.missing.slice(0, 3).map((m) => `Phase 2B : ${m}`));
    actions.push('Suivre réachats clients et retours qualité');
  }
  return Array.from(new Set(actions)).slice(0, 6);
}

/* ------------------------------ API publique ------------------------------ */

/**
 * @param {object} dataMap — collections ERP (+ collections AGRI FEEDS si présentes)
 * @returns {object} readiness structuré (jamais binaire prêt/pas prêt)
 */
export function computeAgriFeedsReadiness(dataMap = {}) {
  const phase1 = scorePhase1Reference(dataMap);
  const pilot = scorePilotPhase2A(dataMap, phase1);
  const sales = scoreProgressivePhase2B(dataMap, pilot);
  const mode = resolveMode(phase1.score, pilot.score, sales.score, sales.gates, dataMap);

  const recommendedMode = mode;

  const readinessScore = recommendedMode.id === 'REFERENCE'
    ? phase1.score
    : recommendedMode.id === 'PILOT_INTERNAL'
      ? Math.round((phase1.score * 0.35) + (pilot.score * 0.65))
      : Math.round((pilot.score * 0.4) + (sales.score * 0.6));

  const perMode = {
    REFERENCE: {
      label: 'Référence Phase 1',
      score: phase1.score,
      met: phase1.met,
      missing: phase1.missing,
      blockers: phase1.blockers,
      used: phase1.used,
      missingData: phase1.missingData,
    },
    PILOT_INTERNAL: {
      label: 'Phase 2A — Production pilote interne',
      score: pilot.score,
      met: pilot.met,
      missing: pilot.missing,
      warnings: pilot.warnings,
      blockers: pilot.blockers,
      used: pilot.used,
      missingData: pilot.missingData,
      breakdown: pilot.breakdown,
    },
    PROGRESSIVE_SALES: {
      label: 'Phase 2B — Vente progressive',
      score: sales.score,
      met: sales.met,
      missing: sales.missing,
      warnings: sales.warnings,
      blockers: sales.blockers,
      used: sales.used,
      missingData: sales.missingData,
      gates: sales.gates,
      gateLabels: sales.gateLabels,
    },
  };

  const conditionsMet = perMode[recommendedMode.id].met || [];
  const conditionsMissing = perMode[recommendedMode.id].missing || [];
  const warnings = [
    ...(perMode.PILOT_INTERNAL.warnings || []),
    ...(recommendedMode.id === 'PROGRESSIVE_SALES' ? (perMode.PROGRESSIVE_SALES.warnings || []) : []),
  ];
  const salesBlockers = sales.blockers || [];
  const pilotBlockers = pilot.blockers || [];
  const phase1Blockers = phase1.blockers || [];
  const orderedBlockers = recommendedMode.id === 'REFERENCE'
    ? [...phase1Blockers, ...salesBlockers]
    : recommendedMode.id === 'PILOT_INTERNAL'
      ? [...salesBlockers, ...pilotBlockers, ...phase1Blockers.slice(0, 1)]
      : [...salesBlockers];
  const blockers = orderedBlockers;
  const dataUsed = Array.from(new Set([
    ...(perMode.REFERENCE.used || []),
    ...(perMode.PILOT_INTERNAL.used || []),
    ...(recommendedMode.id === 'PROGRESSIVE_SALES' ? (perMode.PROGRESSIVE_SALES.used || []) : []),
  ]));
  const dataMissing = Array.from(new Set([
    ...(perMode.REFERENCE.missingData || []),
    ...(perMode.PILOT_INTERNAL.missingData || []),
    ...(perMode.PROGRESSIVE_SALES.missingData || []),
  ]));

  return {
    mode: recommendedMode.id,
    modeLabel: recommendedMode.label,
    modeShortLabel: recommendedMode.shortLabel,
    recommendedMode: recommendedMode.id,
    recommendedModeLabel: recommendedMode.label,
    modeFlags: {
      allowsProduction: recommendedMode.allowsProduction,
      allowsSales: recommendedMode.allowsSales,
      allowsFormulas: recommendedMode.allowsFormulas,
      allowsRawMaterials: recommendedMode.allowsRawMaterials,
    },
    readiness_score: clamp(readinessScore),
    scores: {
      phase1_reference: phase1.score,
      pilot_internal: pilot.score,
      progressive_sales: sales.score,
    },
    per_mode: perMode,
    conditions_met: Array.from(new Set(conditionsMet)).slice(0, 12),
    conditions_missing: Array.from(new Set(conditionsMissing)).slice(0, 12),
    blockers: Array.from(new Set(blockers)).slice(0, 10),
    warnings: Array.from(new Set(warnings)).slice(0, 10),
    data_used: dataUsed,
    data_missing: dataMissing,
    priority_actions: buildNextActions(recommendedMode, phase1, pilot, sales),
    next_actions: buildNextActions(recommendedMode, phase1, pilot, sales),
    human_validation_required: true,
    ai_disclaimer: 'L’IA propose une décision à partir des données ERP. La validation reste humaine.',
    metrics: phase1.metrics,
    note: 'Le passage de mode dépend des données ERP (Phase 1, Phase 2A, Phase 2B), pas d’une date fixe.',
    sales_gates: sales.gates,
    sales_gate_labels: sales.gateLabels,
    pilot_breakdown: pilot.breakdown,
  };
}

export function normalizeAgriFeedsDataMap(dataMap = {}) {
  return {
    ...dataMap,
    alimentation_logs: arr(dataMap.alimentation_logs),
    stock: arr(dataMap.stock || dataMap.stocks),
    stocks: arr(dataMap.stocks || dataMap.stock),
    avicole: arr(dataMap.avicole || dataMap.lots),
    lots: arr(dataMap.lots || dataMap.avicole),
    animaux: arr(dataMap.animaux),
    fournisseurs: arr(dataMap.fournisseurs),
    finances: arr(dataMap.finances || dataMap.transactions),
    transactions: arr(dataMap.transactions || dataMap.finances),
    clients: arr(dataMap.clients),
    sales_orders: arr(dataMap.sales_orders),
    invoices: arr(dataMap.invoices),
    payments: arr(dataMap.payments),
    production_oeufs_logs: arr(dataMap.production_oeufs_logs || dataMap.productionLogs),
    feed_formulas: arr(dataMap.feed_formulas),
    feed_formula_versions: arr(dataMap.feed_formula_versions),
    feed_raw_materials: arr(dataMap.feed_raw_materials),
    feed_raw_batches: arr(dataMap.feed_raw_batches),
    feed_production_orders: arr(dataMap.feed_production_orders),
    feed_finished_batches: arr(dataMap.feed_finished_batches),
    feed_quality_checks: arr(dataMap.feed_quality_checks),
    feed_trials: arr(dataMap.feed_trials),
    feed_phase1_comparisons: arr(dataMap.feed_phase1_comparisons),
    feed_facility_zones: arr(dataMap.feed_facility_zones),
    veterinaires: arr(dataMap.veterinaires),
    sante: arr(dataMap.sante),
    equipements: arr(dataMap.equipements),
    alertes_center: arr(dataMap.alertes_center),
  };
}
