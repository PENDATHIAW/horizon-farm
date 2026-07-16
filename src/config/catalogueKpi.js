import { runKpiEngine } from '../services/kpiEngine/index.js';
import { filterRealOpenAlerts, filterRealOpenTasks } from '../utils/healthFindingLabels.js';

const rows = (value) => (Array.isArray(value) ? value : []);
const nombre = (value) => (Number.isFinite(Number(value)) ? Number(value) : null);
const texte = (value) => String(value || '').trim().toLowerCase();
const source = (data, ...keys) => {
  for (const key of keys) {
    if (Array.isArray(data?.[key])) return rows(data[key]);
  }
  return [];
};
const disponible = (...keys) => (data) => source(data, ...keys).length > 0;
const actif = (row = {}) => !['ferme', 'fermé', 'cloture', 'clôturé', 'termine', 'terminé', 'annule', 'annulé', 'inactif', 'closed', 'done'].includes(texte(row.status || row.statut || row.etat));
const ouvert = (row = {}) => !['resolue', 'résolue', 'resolu', 'résolu', 'fermee', 'fermée', 'terminee', 'terminée', 'done', 'closed', 'cancelled'].includes(texte(row.status || row.statut));
const critique = (row = {}) => ['critique', 'critical', 'urgent', 'haute', 'high'].includes(texte(row.severity || row.gravite || row.priority || row.level));

const kpi = ({ code, libelle, unite, proprietaire, sourceLabel, sensFavorable = 'up', calcul, sourceDisponible, periodeParDefaut = 'instantané', valideur }) => ({
  code,
  libelle,
  unite,
  periodeParDefaut,
  proprietaire,
  valideur,
  source: sourceLabel,
  sensFavorable,
  sourceDisponible,
  formule: { version: 2, calcul },
});

export const CATALOGUE_KPI = Object.freeze({
  ca: kpi({ code: 'ca', libelle: "Chiffre d'affaires", unite: 'FCFA', periodeParDefaut: 'mois en cours', proprietaire: 'commercial', valideur: 'finance_pilotage', sourceLabel: 'kpiEngine.commercial', sourceDisponible: disponible('sales_orders', 'salesOrders'), calcul: (moteur) => nombre(moteur?.commercial?.ca) }),
  encaissements: kpi({ code: 'encaissements', libelle: 'Encaissements clients', unite: 'FCFA', periodeParDefaut: 'mois en cours', proprietaire: 'commercial', valideur: 'finance_pilotage', sourceLabel: 'kpiEngine.commercial', sourceDisponible: disponible('payments'), calcul: (moteur) => nombre(moteur?.commercial?.collected) }),
  creances: kpi({ code: 'creances', libelle: 'Créances clients', unite: 'FCFA', periodeParDefaut: 'mois en cours', proprietaire: 'commercial', valideur: 'finance_pilotage', sourceLabel: 'kpiEngine.commercial', sensFavorable: 'down', sourceDisponible: disponible('sales_orders', 'salesOrders'), calcul: (moteur) => nombre(moteur?.commercial?.receivable) }),
  tresorerie: kpi({ code: 'tresorerie', libelle: 'Trésorerie', unite: 'FCFA', periodeParDefaut: 'à date', proprietaire: 'finance_pilotage', sourceLabel: 'kpiEngine.finance', sourceDisponible: disponible('finances', 'transactions', 'payments'), calcul: (moteur) => nombre(moteur?.finance?.cashNet ?? moteur?.finance?.treasuryAvailable ?? moteur?.finance?.resultatAllTime ?? moteur?.finance?.grossMargin) }),
  depenses: kpi({ code: 'depenses', libelle: 'Dépenses', unite: 'FCFA', periodeParDefaut: 'mois en cours', proprietaire: 'finance_pilotage', sourceLabel: 'kpiEngine.finance', sensFavorable: 'down', sourceDisponible: disponible('finances', 'transactions'), calcul: (moteur) => nombre(moteur?.finance?.expenses) }),
  marge_globale: kpi({ code: 'marge_globale', libelle: 'Marge globale', unite: 'FCFA', periodeParDefaut: 'mois en cours', proprietaire: 'finance_pilotage', sourceLabel: 'kpiEngine.finance', sourceDisponible: disponible('finances', 'transactions', 'payments'), calcul: (moteur) => nombre(moteur?.finance?.grossMargin) }),
  valeur_stock: kpi({ code: 'valeur_stock', libelle: 'Valeur de stock', unite: 'FCFA', proprietaire: 'achats_stock', valideur: 'finance_pilotage', sourceLabel: 'kpiEngine.stock', sourceDisponible: disponible('stock', 'stocks'), calcul: (moteur) => nombre(moteur?.stock?.totalValue ?? moteur?.stock?.valeurTotale) }),
  produits_sous_seuil: kpi({ code: 'produits_sous_seuil', libelle: 'Produits sous seuil', unite: 'produits', proprietaire: 'achats_stock', sourceLabel: 'kpiEngine.stock', sensFavorable: 'down', sourceDisponible: disponible('stock', 'stocks'), calcul: (moteur) => nombre(moteur?.stock?.ruptureRows?.filter((row) => row.critical).length) }),
  stocks_total: kpi({ code: 'stocks_total', libelle: 'Références en stock', unite: 'produits', proprietaire: 'achats_stock', sourceLabel: 'stock', sourceDisponible: disponible('stock', 'stocks'), calcul: (_moteur, data) => source(data, 'stock', 'stocks').length }),
  ponte: kpi({ code: 'ponte', libelle: 'Ponte de la période', unite: 'œufs', periodeParDefaut: 'aujourd’hui', proprietaire: 'elevage', sourceLabel: 'kpiEngine.livestock', sourceDisponible: disponible('production_oeufs_logs', 'productionLogs'), calcul: (moteur) => nombre(moteur?.livestock?.eggsPeriod) }),
  effectif_animaux: kpi({ code: 'effectif_animaux', libelle: 'Effectif animaux', unite: 'têtes', proprietaire: 'elevage', sourceLabel: 'kpiEngine.livestock', sourceDisponible: (data) => source(data, 'animaux').length + source(data, 'avicole', 'lots').length > 0, calcul: (moteur) => nombre(moteur?.livestock?.headcount?.total ?? moteur?.livestock?.headcount) }),
  cultures_actives: kpi({ code: 'cultures_actives', libelle: 'Cultures actives', unite: 'parcelles', proprietaire: 'cultures', sourceLabel: 'cultures', sourceDisponible: disponible('cultures'), calcul: (_moteur, data) => source(data, 'cultures').filter(actif).length }),
  commandes_ouvertes: kpi({ code: 'commandes_ouvertes', libelle: 'Commandes ouvertes', unite: 'commandes', proprietaire: 'commercial', sourceLabel: 'sales_orders', sourceDisponible: disponible('sales_orders', 'salesOrders'), calcul: (_moteur, data) => source(data, 'sales_orders', 'salesOrders').filter(ouvert).length }),
  fournisseurs_actifs: kpi({ code: 'fournisseurs_actifs', libelle: 'Fournisseurs actifs', unite: 'fournisseurs', proprietaire: 'achats_stock', sourceLabel: 'fournisseurs', sourceDisponible: disponible('fournisseurs'), calcul: (_moteur, data) => source(data, 'fournisseurs').filter(actif).length }),
  alertes_urgentes: kpi({ code: 'alertes_urgentes', libelle: 'Alertes urgentes', unite: 'alertes', proprietaire: 'activite_suivi', sourceLabel: 'alertes_center', sensFavorable: 'down', sourceDisponible: disponible('alertes_center', 'alertes'), calcul: (_moteur, data) => filterRealOpenAlerts(source(data, 'alertes_center', 'alertes')).filter(critique).length }),
  taches_ouvertes: kpi({ code: 'taches_ouvertes', libelle: 'Tâches ouvertes', unite: 'tâches', proprietaire: 'activite_suivi', sourceLabel: 'taches', sensFavorable: 'down', sourceDisponible: disponible('taches', 'tasks'), calcul: (_moteur, data) => filterRealOpenTasks(source(data, 'taches', 'tasks')).length }),
  evenements_jour: kpi({ code: 'evenements_jour', libelle: 'Mouvements du jour', unite: 'événements', proprietaire: 'activite_suivi', sourceLabel: 'business_events', sourceDisponible: disponible('business_events', 'businessEvents'), calcul: (_moteur, data) => { const day = new Date().toISOString().slice(0, 10); return source(data, 'business_events', 'businessEvents').filter((row) => String(row.event_date || row.created_at || row.date || '').slice(0, 10) === day).length; } }),
  documents_total: kpi({ code: 'documents_total', libelle: 'Documents disponibles', unite: 'documents', proprietaire: 'documents_rapports', sourceLabel: 'kpiEngine.documents', sourceDisponible: disponible('documents'), calcul: (moteur) => nombre(moteur?.documents?.documentCount) }),
  membres_equipe: kpi({ code: 'membres_equipe', libelle: 'Membres actifs', unite: 'personnes', proprietaire: 'equipe', sourceLabel: 'farm_rh_directory', sourceDisponible: disponible('farm_rh_directory', 'team', 'equipe'), calcul: (_moteur, data) => source(data, 'farm_rh_directory', 'team', 'equipe').filter(actif).length }),
  equipements_disponibles: kpi({ code: 'equipements_disponibles', libelle: 'Équipements disponibles', unite: 'équipements', proprietaire: 'equipements', sourceLabel: 'equipements', sourceDisponible: disponible('equipements'), calcul: (_moteur, data) => source(data, 'equipements').filter((row) => actif(row) && !['panne', 'maintenance', 'hors_service'].includes(texte(row.status || row.statut))).length }),
  capteurs_actifs: kpi({ code: 'capteurs_actifs', libelle: 'Capteurs actifs', unite: 'capteurs', proprietaire: 'smartfarm', sourceLabel: 'sensor_devices', sourceDisponible: disponible('sensor_devices', 'sensors'), calcul: (_moteur, data) => source(data, 'sensor_devices', 'sensors').filter(actif).length }),
  opportunites_financement: kpi({ code: 'opportunites_financement', libelle: 'Financements ouverts', unite: 'opportunités', proprietaire: 'financements', sourceLabel: 'funding_opportunities', sourceDisponible: disponible('funding_opportunities'), calcul: (_moteur, data) => source(data, 'funding_opportunities').filter(ouvert).length }),
});

export function moduleProprietaire(code = '') {
  return CATALOGUE_KPI[code]?.proprietaire || 'finance_pilotage';
}

export function valeurKpi(code = '', donnees = {}, { periodScope = {}, kpis = null } = {}) {
  const entree = CATALOGUE_KPI[code];
  if (!entree) return { code, valeur: null, disponible: false, entree: null };
  const isAvailable = typeof entree.sourceDisponible === 'function' ? entree.sourceDisponible(donnees) : true;
  if (!isAvailable && !kpis) return { code, valeur: null, disponible: false, entree, versionFormule: entree.formule.version };
  const sortieMoteur = kpis || runKpiEngine(donnees, { module: 'dashboard', periodScope });
  let valeur;
  try {
    valeur = entree.formule.calcul(sortieMoteur, donnees);
  } catch {
    valeur = null;
  }
  return { code, valeur, disponible: valeur != null, entree, versionFormule: entree.formule.version };
}
