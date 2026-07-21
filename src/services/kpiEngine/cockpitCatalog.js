/**
 * Cockpit Indicateurs - catalogue de pilotage par activité.
 *
 * Un seul endroit qui produit, pour chaque activité de la ferme (chair, pondeuses,
 * bovins, petits ruminants, stock, commercial, finance), les indicateurs clés AVEC
 * leur repère métier (cible), un statut couleur (bon/vigilance/critique) et la
 * décision qu'ils déclenchent. Objectif : « en 20 secondes, je sais où ça va bien,
 * où ça coince, et quoi faire ».
 *
 * Chaque indicateur : { key, label, value, valueLabel, unit, target, targetLabel,
 * tone, decision, source }. tone ∈ good | warn | bad | neutral. Une valeur non
 * calculable (donnée manquante) reste neutral avec un libellé explicite - on
 * n'invente jamais un chiffre.
 */

const arr = (v) => (Array.isArray(v) ? v : []);
const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const isNum = (v) => v != null && Number.isFinite(Number(v));
const lower = (v) => String(v || '').toLowerCase();
const round = (v, d = 0) => { const p = 10 ** d; return Math.round(num(v) * p) / p; };
const pct = (part, whole) => (num(whole) > 0 ? (num(part) / num(whole)) * 100 : null);

const fmtInt = (v) => Math.round(num(v)).toLocaleString('fr-FR');
const fmtMoney = (v) => `${fmtInt(v)} FCFA`;
const fmtPct = (v, d = 1) => `${round(v, d)} %`;

/**
 * Détermine le statut couleur par rapport à une cible orientée.
 * direction : 'higher' (plus haut = mieux) | 'lower' (plus bas = mieux) | 'range'.
 * seuils : { good, warn } valeurs de bascule ; pour 'range' : { min, max, warnMin, warnMax }.
 */
function toneFor(value, direction, seuils = {}) {
  if (!isNum(value)) return 'neutral';
  const v = num(value);
  if (direction === 'higher') {
    if (v >= num(seuils.good)) return 'good';
    if (v >= num(seuils.warn)) return 'warn';
    return 'bad';
  }
  if (direction === 'lower') {
    if (v <= num(seuils.good)) return 'good';
    if (v <= num(seuils.warn)) return 'warn';
    return 'bad';
  }
  if (direction === 'range') {
    if (v >= num(seuils.min) && v <= num(seuils.max)) return 'good';
    if (v >= num(seuils.warnMin ?? seuils.min) && v <= num(seuils.warnMax ?? seuils.max)) return 'warn';
    return 'bad';
  }
  return 'neutral';
}

const ind = ({ key, label, value, valueLabel, unit = '', target = null, targetLabel = '', direction, seuils, decision = '', source = '' }) => ({
  key,
  label,
  value: isNum(value) ? num(value) : null,
  valueLabel: valueLabel != null ? valueLabel : (isNum(value) ? String(round(value, 2)) : 'donnée à compléter'),
  unit,
  target,
  targetLabel,
  tone: toneFor(value, direction, seuils),
  decision,
  source,
});

// --- Sélecteurs d'activité ---------------------------------------------------

const lotsOfType = (lots, type) => arr(lots).filter((l) => lower(l.type || l.type_lot).includes(type));
const animalsOfSpecies = (animaux, species) => arr(animaux).filter((a) => species.includes(lower(a.espece || a.type)));

const lotCostTotal = (l = {}) => num(l.purchase_cost ?? l.cout_achat ?? l.cout_poussins)
  + num(l.cout_alimentation ?? l.real_feed_cost)
  + num(l.cout_sante ?? l.health_cost ?? l.frais_sante)
  + num(l.autres_charges) + num(l.cout_emballage) + num(l.cout_transport);

const initialOf = (l = {}) => num(l.initial_count ?? l.effectif_initial);
const currentOf = (l = {}) => num(l.current_count ?? l.effectif_actuel);
const mortsOf = (l = {}) => num(l.mortality ?? l.morts);
const soldOf = (l = {}) => num(l.vendus);

/** Moyenne pondérée sur les seuls éléments dont la valeur est renseignée (> 0). */
function weightedAvg(items, valueFn, weightFn) {
  let wSum = 0; let vSum = 0;
  arr(items).forEach((it) => {
    const v = num(valueFn(it));
    const w = num(weightFn(it));
    if (v > 0 && w > 0) { vSum += v * w; wSum += w; }
  });
  return wSum > 0 ? vSum / wSum : null;
}

// --- POULETS DE CHAIR --------------------------------------------------------

export function computeBroilerCockpit(lots = []) {
  const chair = lotsOfType(lots, 'chair');
  if (!chair.length) return { activity: 'chair', label: 'Poulets de chair', hasData: false, indicators: [] };

  const totalInit = chair.reduce((s, l) => s + initialOf(l), 0);
  const totalMorts = chair.reduce((s, l) => s + mortsOf(l), 0);

  const mortalite = pct(totalMorts, totalInit);
  const viability = totalInit > 0 ? 100 - num(mortalite) : null;
  const icMoyen = weightedAvg(chair, (l) => l.ic, initialOf);
  const poidsMoyen = weightedAvg(chair, (l) => l.weight_avg, initialOf);
  const ageMoyen = weightedAvg(chair, (l) => l.age_days, initialOf);
  const gmq = isNum(poidsMoyen) && num(ageMoyen) > 0 ? (num(poidsMoyen) * 1000) / num(ageMoyen) : null;
  // IEP / EPEF = (viabilité% × poids kg) / (âge j × IC) × 100
  const iep = isNum(viability) && isNum(poidsMoyen) && num(ageMoyen) > 0 && num(icMoyen) > 0
    ? (num(viability) * num(poidsMoyen)) / (num(ageMoyen) * num(icMoyen)) * 100 : null;
  const kgProduits = chair.reduce((s, l) => s + (soldOf(l) || currentOf(l)) * num(l.weight_avg), 0);
  const coutTotal = chair.reduce((s, l) => s + lotCostTotal(l), 0);
  const coutKg = kgProduits > 0 ? coutTotal / kgProduits : null;

  return {
    activity: 'chair',
    label: 'Poulets de chair',
    hasData: true,
    lotsCount: chair.length,
    indicators: [
      ind({ key: 'ic', label: 'Indice de consommation', value: icMoyen, valueLabel: isNum(icMoyen) ? round(icMoyen, 2) : null, target: 1.8, targetLabel: '1,6 - 1,9', direction: 'lower', seuils: { good: 1.9, warn: 2.1 }, decision: 'Ajuster ration / qualité provende si > 2', source: 'avicole.ic' }),
      ind({ key: 'gmq', label: 'GMQ', value: gmq, valueLabel: isNum(gmq) ? `${round(gmq)} g/j` : null, unit: 'g/j', target: 50, targetLabel: '45 - 55 g/j', direction: 'higher', seuils: { good: 45, warn: 38 }, decision: 'Croissance lente : revoir aliment/santé', source: 'avicole.weight_avg/age' }),
      ind({ key: 'mortalite', label: 'Mortalité cumulée', value: mortalite, valueLabel: isNum(mortalite) ? fmtPct(mortalite) : null, unit: '%', target: 5, targetLabel: '< 5 %', direction: 'lower', seuils: { good: 5, warn: 8 }, decision: 'Alerte sanitaire / biosécurité si > 5 %', source: 'avicole.mortality' }),
      ind({ key: 'iep', label: 'IEP (efficacité)', value: iep, valueLabel: isNum(iep) ? round(iep) : null, target: 300, targetLabel: '> 300', direction: 'higher', seuils: { good: 300, warn: 240 }, decision: 'Indice synthétique : comparer les lots, viser > 300', source: 'calcul (viabilité·poids/âge·IC)' }),
      ind({ key: 'poids_moyen', label: 'Poids moyen', value: poidsMoyen, valueLabel: isNum(poidsMoyen) ? `${round(poidsMoyen, 2)} kg` : null, unit: 'kg', target: 1.5, targetLabel: '≈ 1,5 kg', direction: 'higher', seuils: { good: 1.4, warn: 1.2 }, decision: 'Fenêtre de vente selon poids/âge', source: 'avicole.weight_avg' }),
      ind({ key: 'cout_kg', label: 'Coût de revient / kg', value: coutKg, valueLabel: isNum(coutKg) ? `${fmtInt(coutKg)} FCFA/kg` : null, unit: 'FCFA/kg', target: 1400, targetLabel: '≤ prix marché vif', direction: 'lower', seuils: { good: 1400, warn: 1700 }, decision: 'Prix plancher de vente', source: 'coûts lot / kg' }),
    ],
  };
}

// --- PONDEUSES ---------------------------------------------------------------

export function computeLayerCockpit(lots = [], { productionLogs = [] } = {}) {
  const pondeuses = lotsOfType(lots, 'pondeuse');
  if (!pondeuses.length) return { activity: 'pondeuses', label: 'Pondeuses', hasData: false, indicators: [] };

  const totalCurrent = pondeuses.reduce((s, l) => s + currentOf(l), 0);
  const totalInit = pondeuses.reduce((s, l) => s + initialOf(l), 0);
  const totalMorts = pondeuses.reduce((s, l) => s + mortsOf(l), 0);
  const tauxPonte = weightedAvg(pondeuses, (l) => l.taux_ponte, currentOf);
  const icPonte = weightedAvg(pondeuses, (l) => l.ic, currentOf);
  const mortalite = pct(totalMorts, totalInit);

  // Coût / œuf : coûts récurrents (aliment+santé+charges, hors capital poules) sur
  // la production d'œufs de la période si disponible, sinon estimation par ponte/jour.
  const recurringCost = pondeuses.reduce((s, l) => s + num(l.cout_alimentation ?? l.real_feed_cost) + num(l.cout_sante ?? l.health_cost) + num(l.autres_charges) + num(l.cout_emballage) + num(l.cout_transport), 0);
  const eggsLogged = arr(productionLogs).reduce((s, r) => s + num(r.oeufs_produits ?? r.oeufs ?? r.quantite), 0);
  const eggsFromRate = pondeuses.reduce((s, l) => s + num(l.productionJour), 0) * 30;
  const eggsBasis = eggsLogged > 0 ? eggsLogged : eggsFromRate;
  const coutOeuf = eggsBasis > 0 ? recurringCost / eggsBasis : null;

  return {
    activity: 'pondeuses',
    label: 'Pondeuses',
    hasData: true,
    lotsCount: pondeuses.length,
    indicators: [
      ind({ key: 'taux_ponte', label: 'Taux de ponte', value: tauxPonte, valueLabel: isNum(tauxPonte) ? fmtPct(tauxPonte) : null, unit: '%', target: 85, targetLabel: 'moy. > 75 %, pic > 90 %', direction: 'higher', seuils: { good: 80, warn: 65 }, decision: 'Baisse = signal sanitaire/alimentaire', source: 'avicole.taux_ponte' }),
      ind({ key: 'ic_ponte', label: 'Indice de consommation', value: icPonte, valueLabel: isNum(icPonte) ? round(icPonte, 2) : null, target: 2.2, targetLabel: '≈ 2,2', direction: 'lower', seuils: { good: 2.3, warn: 2.6 }, decision: 'Efficacité alimentaire de la ponte', source: 'avicole.ic' }),
      ind({ key: 'cout_oeuf', label: 'Coût de revient / œuf', value: coutOeuf, valueLabel: isNum(coutOeuf) ? `${round(coutOeuf, 1)} FCFA` : null, unit: 'FCFA', target: 55, targetLabel: '< prix unitaire vente', direction: 'lower', seuils: { good: 60, warn: 80 }, decision: 'Prix plancher plateau', source: 'coûts récurrents / œufs' }),
      ind({ key: 'mortalite', label: 'Mortalité cumulée', value: mortalite, valueLabel: isNum(mortalite) ? fmtPct(mortalite) : null, unit: '%', target: 5, targetLabel: '< 1 %/mois', direction: 'lower', seuils: { good: 6, warn: 12 }, decision: 'Réforme / diagnostic si élevé', source: 'avicole.mortality' }),
      ind({ key: 'effectif', label: 'Effectif en ponte', value: totalCurrent, valueLabel: fmtInt(totalCurrent), unit: 'poules', direction: 'neutral', decision: 'Capital vivant à amortir', source: 'avicole.current_count' }),
    ],
  };
}

// --- BOVINS / PETITS RUMINANTS (embouche) ------------------------------------

function ruminantCockpit(animaux, { species, activity, label } = {}) {
  const herd = animalsOfSpecies(animaux, species).filter((a) => !['vendu', 'mort'].includes(lower(a.status || a.statut)));
  if (!herd.length) return { activity, label, hasData: false, indicators: [] };

  const gmqValues = herd.map((a) => num(a.gmq ?? a.gmq_reel)).filter((v) => v > 0);
  const gmq = gmqValues.length ? gmqValues.reduce((s, v) => s + v, 0) / gmqValues.length : null;
  const progressValues = herd.map((a) => {
    const cible = num(a.poids_cible ?? a.poids_objectif ?? a.target_weight);
    const actuel = num(a.poids_actuel ?? a.poids);
    return cible > 0 ? (actuel / cible) * 100 : null;
  }).filter(isNum);
  const progression = progressValues.length ? progressValues.reduce((s, v) => s + v, 0) / progressValues.length : null;
  const pretsVente = herd.filter((a) => {
    const cible = num(a.poids_cible ?? a.poids_objectif ?? a.target_weight);
    const actuel = num(a.poids_actuel ?? a.poids);
    return cible > 0 && actuel >= cible;
  }).length;

  return {
    activity,
    label,
    hasData: true,
    headcount: herd.length,
    indicators: [
      ind({ key: 'gmq', label: 'GMQ moyen', value: gmq, valueLabel: isNum(gmq) ? `${round(gmq, 2)} kg/j` : null, unit: 'kg/j', target: 1, targetLabel: '0,8 - 1,2 kg/j', direction: 'higher', seuils: { good: 0.8, warn: 0.5 }, decision: 'Efficacité de l\'engraissement', source: 'animaux.gmq' }),
      ind({ key: 'progression', label: 'Progression poids cible', value: progression, valueLabel: isNum(progression) ? fmtPct(progression, 0) : null, unit: '%', target: 100, targetLabel: '100 % = prêt', direction: 'higher', seuils: { good: 90, warn: 60 }, decision: 'Déclencher la vente à 100 %', source: 'animaux.poids/cible' }),
      ind({ key: 'prets_vente', label: 'Sujets prêts à la vente', value: pretsVente, valueLabel: fmtInt(pretsVente), unit: 'têtes', direction: 'neutral', decision: 'Créer les opportunités de vente', source: 'animaux.poids≥cible' }),
      ind({ key: 'effectif', label: 'Effectif actif', value: herd.length, valueLabel: fmtInt(herd.length), unit: 'têtes', direction: 'neutral', decision: 'Capital en engraissement', source: 'animaux' }),
    ],
  };
}

export function computeCattleCockpit(animaux = []) {
  return ruminantCockpit(animaux, { species: ['bovin', 'boeuf', 'vache', 'veau', 'taureau'], activity: 'bovins', label: 'Bovins (embouche)' });
}
export function computeSmallRuminantCockpit(animaux = []) {
  return ruminantCockpit(animaux, { species: ['ovin', 'mouton', 'caprin', 'chevre', 'chèvre', 'belier'], activity: 'petits_ruminants', label: 'Petits ruminants' });
}

// --- STOCK -------------------------------------------------------------------

export function computeStockCockpit(stocks = [], { alimentationLogs = [] } = {}) {
  const rows = arr(stocks);
  if (!rows.length) return { activity: 'stock', label: 'Stock / intrants', hasData: false, indicators: [] };

  // Conso journalière : champ dédié sinon dérivée des logs d'alimentation (30 j).
  const usageByStock = new Map();
  arr(alimentationLogs).forEach((l) => {
    const id = String(l.stock_id || l.produit_id || '');
    if (!id) return;
    usageByStock.set(id, (usageByStock.get(id) || 0) + num(l.quantite ?? l.quantite_kg));
  });
  const dailyUse = (row) => {
    const explicit = num(row.consommation_jour ?? row.daily_use ?? row.usage_daily);
    if (explicit > 0) return explicit;
    const logged = usageByStock.get(String(row.id)) || 0;
    return logged > 0 ? logged / 30 : 0;
  };
  const qtyOf = (r) => num(r.quantite ?? r.quantity ?? r.stock);
  const thresholdOf = (r) => num(r.seuil ?? r.threshold ?? r.stock_min ?? r.minimum_stock);

  const coverage = rows.map((r) => {
    const use = dailyUse(r);
    return { id: r.id, name: r.nom || r.produit || r.name, daysLeft: use > 0 ? Math.floor(qtyOf(r) / use) : null, critical: thresholdOf(r) > 0 && qtyOf(r) <= thresholdOf(r) };
  });
  const finite = coverage.map((c) => c.daysLeft).filter((d) => isNum(d));
  const minDays = finite.length ? Math.min(...finite) : null;
  const ruptures = coverage.filter((c) => c.critical).length;
  const valeurImmobilisee = rows.reduce((s, r) => s + qtyOf(r) * num(r.prix_unitaire ?? r.cout_unitaire ?? r.cmup ?? r.prix_achat), 0);

  return {
    activity: 'stock',
    label: 'Stock / intrants',
    hasData: true,
    itemsCount: rows.length,
    coverage: coverage.filter((c) => c.critical || isNum(c.daysLeft)).sort((a, b) => (num(a.daysLeft) - num(b.daysLeft))).slice(0, 15),
    indicators: [
      ind({ key: 'couverture', label: 'Couverture de stock (min)', value: minDays, valueLabel: isNum(minDays) ? `${minDays} j` : null, unit: 'jours', target: 7, targetLabel: '≥ 7 jours', direction: 'higher', seuils: { good: 7, warn: 3 }, decision: 'Anticiper l\'appro avant rupture', source: 'stock / conso (logs)' }),
      ind({ key: 'ruptures', label: 'Ruptures / sous le seuil', value: ruptures, valueLabel: fmtInt(ruptures), unit: 'articles', target: 0, targetLabel: '0', direction: 'lower', seuils: { good: 0, warn: 2 }, decision: 'Réappro immédiat', source: 'stock.seuil' }),
      ind({ key: 'valeur_immobilisee', label: 'Valeur du stock', value: valeurImmobilisee, valueLabel: fmtMoney(valeurImmobilisee), unit: 'FCFA', direction: 'neutral', decision: 'Trésorerie immobilisée', source: 'stock.qté×prix' }),
    ],
  };
}

// --- COMMERCIAL --------------------------------------------------------------

const orderTotal = (o = {}) => num(o.montant_total ?? o.total ?? o.amount ?? o.montant);
const orderRemaining = (o = {}) => num(o.reste_a_payer ?? Math.max(0, orderTotal(o) - num(o.total_paye ?? o.montant_paye)));
const daysSince = (dateStr, ref) => {
  const d = new Date(dateStr); const r = ref ? new Date(ref) : new Date();
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((r - d) / 86400000);
};

export function computeCommercialCockpit(salesOrders = [], payments = [], { referenceDate = '' } = {}) {
  const orders = arr(salesOrders);
  if (!orders.length) return { activity: 'commercial', label: 'Commercial', hasData: false, indicators: [] };

  const ca = orders.reduce((s, o) => s + orderTotal(o), 0);
  const encaisse = arr(payments).reduce((s, p) => s + num(p.montant ?? p.amount ?? p.montant_paye), 0)
    || orders.reduce((s, o) => s + num(o.total_paye ?? o.montant_paye), 0);
  const creances = orders.reduce((s, o) => s + orderRemaining(o), 0);
  const tauxRecouvrement = pct(encaisse, ca);
  const impayes = orders.filter((o) => orderRemaining(o) > 0);
  const creancesVieilles = impayes.filter((o) => {
    const d = daysSince(o.date || o.date_vente || o.created_at, referenceDate);
    return isNum(d) && d > 30;
  });
  const partCreancesVieilles = pct(
    creancesVieilles.reduce((s, o) => s + orderRemaining(o), 0),
    creances,
  );
  // DSO simplifié : créances / (CA/jours de la période observée) ; approx sur 90 j.
  const dso = ca > 0 ? (creances / (ca / 90)) : null;

  return {
    activity: 'commercial',
    label: 'Commercial',
    hasData: true,
    indicators: [
      ind({ key: 'ca', label: 'Chiffre d\'affaires', value: ca, valueLabel: fmtMoney(ca), unit: 'FCFA', direction: 'neutral', decision: 'Volume d\'activité', source: 'ventes' }),
      ind({ key: 'taux_recouvrement', label: 'Taux de recouvrement', value: tauxRecouvrement, valueLabel: isNum(tauxRecouvrement) ? fmtPct(tauxRecouvrement) : null, unit: '%', target: 95, targetLabel: '> 95 %', direction: 'higher', seuils: { good: 90, warn: 75 }, decision: 'Relancer les impayés', source: 'paiements / CA' }),
      ind({ key: 'creances', label: 'Créances en cours', value: creances, valueLabel: fmtMoney(creances), unit: 'FCFA', direction: 'neutral', decision: 'À recouvrer (relances)', source: 'ventes.reste_a_payer' }),
      ind({ key: 'dso', label: 'Délai moyen d\'encaissement (DSO)', value: dso, valueLabel: isNum(dso) ? `${round(dso)} j` : null, unit: 'jours', target: 15, targetLabel: '< 15 j', direction: 'lower', seuils: { good: 15, warn: 30 }, decision: 'Réduire le délai de paiement', source: 'créances / CA quotidien' }),
      ind({ key: 'creances_30j', label: 'Part créances > 30 j', value: partCreancesVieilles, valueLabel: isNum(partCreancesVieilles) ? fmtPct(partCreancesVieilles) : null, unit: '%', target: 0, targetLabel: '≈ 0 %', direction: 'lower', seuils: { good: 10, warn: 30 }, decision: 'Escalade relance J+30', source: 'ventes échues' }),
    ],
  };
}

// --- FINANCE -----------------------------------------------------------------

export function computeFinanceCockpit(transactions = [], { salesOrders = [] } = {}) {
  const tx = arr(transactions);
  const isIn = (t) => ['entree', 'recette', 'revenu', 'encaissement'].some((k) => lower(`${t.type} ${t.categorie}`).includes(k));
  const isOut = (t) => ['sortie', 'depense', 'charge', 'achat'].some((k) => lower(`${t.type} ${t.categorie}`).includes(k));
  const entrees = tx.filter(isIn).reduce((s, t) => s + num(t.montant ?? t.amount), 0);
  const sorties = tx.filter(isOut).reduce((s, t) => s + num(t.montant ?? t.amount), 0);
  const resultatCash = entrees - sorties;
  const caBase = entrees || arr(salesOrders).reduce((s, o) => s + orderTotal(o), 0);

  const chargeByCat = (keys) => tx.filter((t) => isOut(t) && keys.some((k) => lower(`${t.categorie} ${t.libelle}`).includes(k)))
    .reduce((s, t) => s + num(t.montant ?? t.amount), 0);
  const partAliment = pct(chargeByCat(['aliment', 'provende']), caBase);
  const partRh = pct(chargeByCat(['salaire', 'main', 'rh', 'personnel']), caBase);
  const partSante = pct(chargeByCat(['sante', 'santé', 'veto', 'vaccin']), caBase);

  return {
    activity: 'finance',
    label: 'Finance / trésorerie',
    hasData: tx.length > 0,
    indicators: [
      ind({ key: 'resultat_cash', label: 'Résultat cash (période)', value: resultatCash, valueLabel: fmtMoney(resultatCash), unit: 'FCFA', target: 0, targetLabel: '> 0', direction: 'higher', seuils: { good: 1, warn: 0 }, decision: 'Entrées - sorties : pilotage trésorerie', source: 'finances' }),
      ind({ key: 'part_aliment', label: 'Poids de l\'aliment / CA', value: partAliment, valueLabel: isNum(partAliment) ? fmtPct(partAliment) : null, unit: '%', target: 60, targetLabel: '< 65 %', direction: 'lower', seuils: { good: 65, warn: 75 }, decision: 'Levier de coût n°1', source: 'charges aliment / CA' }),
      ind({ key: 'part_rh', label: 'Poids RH / CA', value: partRh, valueLabel: isNum(partRh) ? fmtPct(partRh) : null, unit: '%', target: 15, targetLabel: '< 20 %', direction: 'lower', seuils: { good: 20, warn: 30 }, decision: 'Dimensionnement équipe', source: 'charges RH / CA' }),
      ind({ key: 'part_sante', label: 'Poids santé / CA', value: partSante, valueLabel: isNum(partSante) ? fmtPct(partSante) : null, unit: '%', target: 5, targetLabel: '< 8 %', direction: 'lower', seuils: { good: 8, warn: 15 }, decision: 'Prévention vs curatif', source: 'charges santé / CA' }),
    ],
  };
}

// --- CATALOGUE COMPLET -------------------------------------------------------

/**
 * Construit le catalogue de pilotage complet, une section par activité.
 * @returns { sections: [...], generatedAt, summary }
 */
export function buildCockpitCatalog(data = {}) {
  const lots = data.avicole || data.lots || [];
  const animaux = data.animaux || [];
  const stocks = data.stock || data.stocks || [];
  const salesOrders = data.sales_orders || data.salesOrders || [];
  const payments = data.payments || [];
  const transactions = data.finances || data.transactions || [];
  const productionLogs = data.production_oeufs_logs || data.productionLogs || [];
  const alimentationLogs = data.alimentation_logs || data.alimentationLogs || [];

  const sections = [
    computeBroilerCockpit(lots),
    computeLayerCockpit(lots, { productionLogs }),
    computeCattleCockpit(animaux),
    computeSmallRuminantCockpit(animaux),
    computeStockCockpit(stocks, { alimentationLogs }),
    computeCommercialCockpit(salesOrders, payments, { referenceDate: data.referenceDate }),
    computeFinanceCockpit(transactions, { salesOrders }),
  ].filter((s) => s.hasData);

  const allIndicators = sections.flatMap((s) => s.indicators);
  const summary = {
    sections: sections.length,
    indicators: allIndicators.length,
    good: allIndicators.filter((i) => i.tone === 'good').length,
    warn: allIndicators.filter((i) => i.tone === 'warn').length,
    bad: allIndicators.filter((i) => i.tone === 'bad').length,
    attention: allIndicators.filter((i) => i.tone === 'bad' || i.tone === 'warn').map((i) => ({ activity: sectionOf(sections, i), label: i.label, valueLabel: i.valueLabel, decision: i.decision })),
  };

  return { sections, summary, generatedAt: new Date().toISOString() };
}

function sectionOf(sections, indicator) {
  const s = sections.find((sec) => sec.indicators.includes(indicator));
  return s ? s.activity : '';
}

export default buildCockpitCatalog;
