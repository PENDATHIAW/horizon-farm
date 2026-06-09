/**
 * Élevage V3 — recommandations IA basées sur coûts complets.
 */

import { calculateUnifiedAnimalCost, calculateUnifiedLotCost } from '../services/unifiedCostService.js';
import { computeOfficialLayingRate } from './elevageLayingRate.js';
import { mortalityAlertSeverity, shouldAlertEggBreak } from './elevageThresholds.js';
import { isChairLot, isPondeuseLot, isBovinAnimal, mortalityCostOf } from './elevageActivityPnl.js';

const arr = (v) => (Array.isArray(v) ? v : []);
const n = (v) => Number(v || 0);
const lower = (v) => String(v || '').toLowerCase();

function insight(id, title, description, severity = 'info', action = '') {
  return { id, title, description, severity, recommended_action: action, module: 'elevage' };
}

export function buildElevageCostAwareInsights({
  lots = [],
  animaux = [],
  feedLogs = [],
  productionLogs = [],
  healthEvents = [],
  stocks = [],
  findings = [],
} = {}) {
  const insights = [];
  const context = { feedLogs, productionLogs, healthEvents, alimentationLogs: feedLogs, vaccins: healthEvents };

  arr(lots).filter(isPondeuseLot).forEach((lot) => {
    const unified = calculateUnifiedLotCost({ lot, ...context });
    const rate = computeOfficialLayingRate({
      eggsProduced: arr(productionLogs).filter((l) => String(l.lot_id) === String(lot.id)).reduce((s, l) => s + n(l.oeufs_produits), 0),
      activeLayers: n(lot.current_count ?? lot.effectif_actuel),
    });
    if (rate.calculable && rate.rate < 65) {
      insights.push(insight(
        `laying-low-${lot.id}`,
        `Baisse de ponte — ${lot.name || lot.nom || lot.id}`,
        `Taux ${rate.rate}% sous le seuil. Vérifier aliment, stress thermique et santé.`,
        'warning',
        'Ouvrir Production / Santé',
      ));
    }
    const broken = arr(productionLogs).filter((l) => String(l.lot_id) === String(lot.id));
    const totalEggs = broken.reduce((s, l) => s + n(l.oeufs_produits), 0);
    const brokenEggs = broken.reduce((s, l) => s + n(l.oeufs_casses), 0);
    if (totalEggs > 0 && shouldAlertEggBreak((brokenEggs / totalEggs) * 100)) {
      insights.push(insight(`egg-break-${lot.id}`, `Casse œufs élevée — ${lot.name || lot.id}`, `${Math.round((brokenEggs / totalEggs) * 100)}% de casse sur la période.`, 'warning'));
    }
    if (unified.feedingCost > 0 && unified.healthCost > 0 && unified.totalCost > 0) {
      const feedShare = (unified.feedingCost / unified.totalCost) * 100;
      if (feedShare > 75) {
        insights.push(insight(`feed-high-${lot.id}`, `Coût alimentaire élevé — ${lot.name || lot.id}`, `Alimentation = ${Math.round(feedShare)}% du coût total (alim. + santé inclus).`, 'warning', 'Vérifier ration et IC'));
      }
    } else if (!unified.costComplete) {
      insights.push(insight(`margin-unreliable-${lot.id}`, `Marge non fiable — ${lot.name || lot.nom || lot.id}`, 'Coût complet indisponible : renseigner alimentation et santé avant décision.', 'info'));
    }
  });

  arr(lots).filter(isChairLot).forEach((lot) => {
    const init = n(lot.initial_count ?? lot.effectif_initial);
    const mort = n(lot.mortality ?? lot.morts);
    const mortRate = init > 0 ? (mort / init) * 100 : 0;
    const sev = mortalityAlertSeverity(mortRate);
    if (sev) {
      insights.push(insight(`mortality-${lot.id}`, `Mortalité ${sev} — ${lot.name || lot.nom || lot.id}`, `${mortRate.toFixed(1)}% — seuil dépassé.`, sev === 'critique' ? 'critique' : 'warning'));
    }
    const weight = n(lot.weight_avg ?? lot.poids_moyen);
    const target = n(lot.poids_cible ?? lot.poids_objectif ?? 1.5);
    if (weight > 0 && target > 0 && weight < target * 0.85 && n(lot.age_days) > 28) {
      insights.push(insight(`growth-delay-${lot.id}`, `Retard de croissance — ${lot.name || lot.nom || lot.id}`, `Poids moyen ${weight} kg vs cible ${target} kg.`, 'warning'));
    }
    if (lot.ready_to_sell || lower(lot.status || lot.statut).includes('pret_vente')) {
      insights.push(insight(`ready-sell-${lot.id}`, `Lot prêt à vendre — ${lot.name || lot.nom || lot.id}`, 'Effectif et poids proches de l\'objectif — préparer vente Commercial.', 'info', 'Commercial > Ventes'));
    }
  });

  arr(animaux).filter(isBovinAnimal).forEach((animal) => {
    const unified = calculateUnifiedAnimalCost({ animal, ...context });
    const weight = n(animal.poids);
    const target = n(animal.poids_cible ?? animal.poids_objectif);
    if (animal.ready_to_sell || (target > 0 && weight >= target * 0.95)) {
      insights.push(insight(`animal-ready-${animal.id}`, `Animal proche poids cible — ${animal.name || animal.nom || animal.id}`, `${weight} kg / cible ${target || '—'} kg.`, 'info', 'Préparer vente'));
    }
    if (!unified.costComplete && n(animal.purchase_cost ?? animal.prix_achat) > 0) {
      insights.push(insight(`animal-cost-${animal.id}`, `Coût incomplet — ${animal.name || animal.nom || animal.id}`, 'Alimentation ou santé manquante pour une marge fiable.', 'info'));
    }
  });

  const feedStocks = arr(stocks).filter((s) => /aliment|feed|provende|son|mais|maïs/.test(lower(`${s.produit || s.name} ${s.categorie || ''}`)));
  feedStocks.forEach((stock) => {
    const qty = n(stock.quantite ?? stock.quantity);
    const seuil = n(stock.seuil ?? stock.threshold ?? 0);
    if (seuil > 0 && qty <= seuil) {
      insights.push(insight(`feed-stock-${stock.id}`, `Stock aliment insuffisant — ${stock.produit || stock.name}`, `${qty} restant (seuil ${seuil}).`, 'warning', 'Achats & Stock'));
    }
  });

  const healthLate = arr(healthEvents).filter((h) => ['retard', 'en_retard', 'a_faire_retard', 'overdue'].includes(lower(h.statut || h.status)));
  if (healthLate.length) {
    insights.push(insight('health-late', `${healthLate.length} soin(s) en retard`, 'Vaccins ou traitements à planifier rapidement.', 'warning', 'Onglet Santé'));
  }

  const mortalityValue = [...arr(lots), ...arr(animaux)].reduce((s, r) => s + mortalityCostOf(r), 0);
  if (mortalityValue > 0) {
    insights.push(insight('mortality-cost', 'Pertes mortalité enregistrées', `Valeur estimée ${Math.round(mortalityValue).toLocaleString('fr-FR')} F — vérifier causes et assurances.`, 'info'));
  }

  const seen = new Set(insights.map((i) => i.id));
  arr(findings).forEach((f) => {
    if (!seen.has(f.id)) insights.push({ ...f, module: 'elevage' });
  });

  return insights.slice(0, 12);
}
