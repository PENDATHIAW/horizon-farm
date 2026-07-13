/**
 * Catalogue central unique des KPI.
 *
 * Chaque entrée porte : code, libellé, formule versionnée (fonction de calcul
 * sur la sortie du moteur runKpiEngine), source, période par défaut, unité et
 * module propriétaire. Les composants d'affichage (CarteKPI) lisent ce
 * catalogue et n'implémentent jamais de calcul local.
 *
 * Propriété des chiffres : tout KPI financier consolidé en FCFA est calculé ou
 * validé par Finance ; les données sources gardent leur propriétaire
 * fonctionnel (chiffre d'affaires, encaissements et créances : Commercial ;
 * valeur de stock et coût moyen : Achats & Stock ; dépenses, trésorerie,
 * dettes, coûts et marges : Finance ; ponte et mortalité : Élevage).
 */
import { runKpiEngine } from '../services/kpiEngine/index.js';

const nombre = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);

export const CATALOGUE_KPI = Object.freeze({
  ca: {
    code: 'ca',
    libelle: "Chiffre d'affaires",
    unite: 'FCFA',
    periodeParDefaut: 'mois_en_cours',
    proprietaire: 'commercial',
    valideur: 'finance_pilotage',
    source: 'kpiEngine.commercial (ventes validées)',
    formule: { version: 1, calcul: (kpis) => nombre(kpis?.commercial?.ca) },
  },
  encaissements: {
    code: 'encaissements',
    libelle: 'Encaissements clients',
    unite: 'FCFA',
    periodeParDefaut: 'mois_en_cours',
    proprietaire: 'commercial',
    valideur: 'finance_pilotage',
    source: 'kpiEngine.commercial (paiements clients)',
    formule: { version: 1, calcul: (kpis) => nombre(kpis?.commercial?.collected) },
  },
  creances: {
    code: 'creances',
    libelle: 'Créances clients',
    unite: 'FCFA',
    periodeParDefaut: 'mois_en_cours',
    proprietaire: 'commercial',
    valideur: 'finance_pilotage',
    source: 'kpiEngine.commercial (ventes moins encaissements)',
    formule: { version: 1, calcul: (kpis) => nombre(kpis?.commercial?.receivable) },
  },
  tresorerie: {
    code: 'tresorerie',
    libelle: 'Trésorerie',
    unite: 'FCFA',
    periodeParDefaut: 'mois_en_cours',
    proprietaire: 'finance_pilotage',
    source: 'kpiEngine.finance (encaissements moins décaissements, toutes périodes)',
    formule: { version: 1, calcul: (kpis) => nombre(kpis?.finance?.resultatAllTime ?? kpis?.finance?.grossMargin) },
  },
  depenses: {
    code: 'depenses',
    libelle: 'Dépenses',
    unite: 'FCFA',
    periodeParDefaut: 'mois_en_cours',
    proprietaire: 'finance_pilotage',
    source: 'kpiEngine.finance (transactions de dépense)',
    formule: { version: 1, calcul: (kpis) => nombre(kpis?.finance?.expenses) },
  },
  marge_globale: {
    code: 'marge_globale',
    libelle: 'Marge globale',
    unite: 'FCFA',
    periodeParDefaut: 'mois_en_cours',
    proprietaire: 'finance_pilotage',
    source: 'kpiEngine.finance (encaissé moins dépensé sur la période)',
    formule: { version: 1, calcul: (kpis) => nombre(kpis?.finance?.grossMargin) },
  },
  valeur_stock: {
    code: 'valeur_stock',
    libelle: 'Valeur de stock',
    unite: 'FCFA',
    periodeParDefaut: 'instantane',
    proprietaire: 'achats_stock',
    valideur: 'finance_pilotage',
    source: 'kpiEngine.stock (quantités × coût moyen)',
    formule: { version: 1, calcul: (kpis) => nombre(kpis?.stock?.totalValue ?? kpis?.stock?.valeurTotale) },
  },
  produits_sous_seuil: {
    code: 'produits_sous_seuil',
    libelle: 'Produits sous seuil',
    unite: 'produits',
    periodeParDefaut: 'instantane',
    proprietaire: 'achats_stock',
    source: 'kpiEngine.stock (quantité sous le seuil de la ferme)',
    formule: { version: 1, calcul: (kpis) => nombre(kpis?.stock?.ruptureRows?.length) },
  },
  ponte: {
    code: 'ponte',
    libelle: 'Ponte de la période',
    unite: 'œufs',
    periodeParDefaut: 'jour',
    proprietaire: 'elevage',
    source: 'kpiEngine.livestock (journal de ponte)',
    formule: { version: 1, calcul: (kpis) => nombre(kpis?.livestock?.eggsPeriod) },
  },
  effectif_animaux: {
    code: 'effectif_animaux',
    libelle: 'Effectif animaux',
    unite: 'têtes',
    periodeParDefaut: 'instantane',
    proprietaire: 'elevage',
    source: 'kpiEngine.livestock (animaux et lots actifs)',
    formule: { version: 1, calcul: (kpis) => nombre(kpis?.livestock?.headcount?.total ?? kpis?.livestock?.headcount) },
  },
});

/** Modules propriétaires vers lesquels pointe chaque carte. */
export function moduleProprietaire(code = '') {
  return CATALOGUE_KPI[code]?.proprietaire || 'finance_pilotage';
}

/**
 * Valeur d'un KPI du catalogue : calcule la sortie moteur une fois puis
 * applique la formule versionnée. Jamais de calcul local dans un composant.
 */
export function valeurKpi(code = '', donnees = {}, { periodScope = {}, kpis = null } = {}) {
  const entree = CATALOGUE_KPI[code];
  if (!entree) return { code, valeur: null, entree: null };
  const sortieMoteur = kpis || runKpiEngine(donnees, { module: 'dashboard', periodScope });
  let valeur = null;
  try {
    valeur = entree.formule.calcul(sortieMoteur);
  } catch {
    valeur = null;
  }
  return { code, valeur, entree, versionFormule: entree.formule.version };
}
