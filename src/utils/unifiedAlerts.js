/**
 * Flux d'alertes unifié (Phase 1 : un seul flux, plusieurs surfaces).
 *
 * OBJECTIF : supprimer le « mélange ». Avant, la même réalité était recalculée
 * à 4 endroits avec des conditions différentes (cloche, pastilles de nav,
 * notifications, centre d'alertes) → d'où des compteurs incohérents
 * (ex. cloche = 2 mais pastille = 15).
 *
 * Ici, UNE seule fonction produit la liste de référence des alertes ouvertes,
 * curée et pertinente (pas la somme brute de toutes les conditions possibles),
 * chaque alerte normalisée et rattachée à un module. La cloche, le panneau, les
 * pastilles de navigation et (plus tard) les notifications lisent cette liste.
 *
 * Chaque alerte porte, quand c'est possible, un `code` du catalogue central
 * (src/config/catalogueAlertes.js). Les détections sans code catalogue sont
 * marquées `catalogued: false` (le catalogue sera étendu en Phase 2).
 */
import { ALERTES_PAR_CODE } from '../config/catalogueAlertes.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const num = (value) => Number(value || 0);
const lower = (value) => String(value ?? '').trim().toLowerCase();

/** Échelle de gravité, du plus grave au moins grave. */
export const SEVERITY_RANK = Object.freeze({ urgence: 0, critique: 1, warning: 2, info: 3 });

const CLOSED_ALERT_STATUSES = new Set(['traitee', 'traitée', 'resolue', 'résolue', 'fermee', 'fermée', 'done', 'closed', 'expiree', 'expirée']);
const isOpenAlert = (alert = {}) => !CLOSED_ALERT_STATUSES.has(lower(alert.status || alert.statut));
const isRisky = (status = '') => ['risque', 'danger', 'alerte', 'critique', 'urgent'].includes(lower(status));

/** Rattachement d'un module détecteur vers l'id du module de navigation. */
const MODULE_TO_NAV = Object.freeze({
  achats_stock: 'achats_stock',
  stock: 'achats_stock',
  elevage: 'elevage',
  avicole: 'elevage',
  animaux: 'elevage',
  sante: 'elevage',
  cultures: 'cultures',
  commercial: 'commercial',
  clients: 'commercial',
  finance_pilotage: 'finance_pilotage',
  finances: 'finance_pilotage',
  equipements: 'equipements',
  activite_suivi: 'activite_suivi',
  taches: 'activite_suivi',
  gestion_systeme: 'sync_activity',
  sync_activity: 'sync_activity',
  smartfarm: 'smartfarm',
  dashboard: 'dashboard',
});

export function navModuleForAlert(alert = {}) {
  const key = lower(alert.moduleKey || alert.module_source || alert.module);
  return MODULE_TO_NAV[key] || key || 'dashboard';
}

/** Normalise une alerte (persistée ou dérivée) au format unique. */
function normalize(alert = {}, source = 'derived') {
  const code = alert.code || alert.alert_code || '';
  const cat = ALERTES_PAR_CODE[code];
  const severity = lower(alert.severity || alert.gravite || cat?.gravite || 'info');
  const moduleKey = alert.moduleKey || alert.module_source || alert.module || cat?.detecteur || 'dashboard';
  const title = alert.title || alert.titre || cat?.libelle || alert.message || 'Alerte';
  const text = alert.text || alert.message || alert.action_recommandee || cat?.libelle || '';
  const entityId = alert.entity_id ?? alert.entityId ?? alert.id ?? '';
  const issueKey = alert.issue_key
    || alert.alert_dedupe_key
    || `${code || moduleKey}:${alert.entity_type || 'entite'}:${entityId}`;
  return {
    id: alert.id || issueKey,
    code,
    catalogued: Boolean(cat),
    type: title,
    title,
    text,
    message: alert.message || text,
    action_recommandee: alert.action_recommandee || alert.action || '',
    severity: SEVERITY_RANK[severity] != null ? severity : 'info',
    moduleKey,
    module_source: alert.module_source || moduleKey,
    navModule: navModuleForAlert({ moduleKey }),
    entity_type: alert.entity_type || 'entite',
    entity_id: entityId,
    issue_key: issueKey,
    status: alert.status || alert.statut || 'nouvelle',
    source,
  };
}

/**
 * Détections dérivées des données (le sous-ensemble PERTINENT, pas la somme
 * brute). Chaque item est actionnable et rattaché à un module.
 */
function derivedDetections(dataMap = {}, { online = true, weather = {} } = {}) {
  const out = [];
  const push = (a) => out.push(a);

  // Élevage — santé, mortalité, animaux malades.
  arr(dataMap.sante)
    .filter((s) => lower(s.statut) === 'retard')
    .forEach((s) => push({ code: 'vaccination_en_retard', moduleKey: 'elevage', entity_type: 'sante', entity_id: s.id, title: `Vaccination en retard : ${s.nom || s.title || s.id}`, message: 'Échéance de vaccination dépassée.', action_recommandee: 'Planifier la vaccination', severity: 'critique' }));
  arr(dataMap.sante)
    .filter((s) => isRisky(s.status || s.statut) && lower(s.statut) !== 'retard')
    .forEach((s) => push({ code: '', moduleKey: 'elevage', entity_type: 'sante', entity_id: s.id, title: `Santé à traiter : ${s.nom || s.title || s.id}`, message: 'Suivi santé à vérifier.', severity: 'warning' }));
  arr(dataMap.animaux)
    .filter((a) => lower(a.health_status) === 'malade')
    .forEach((a) => push({ code: '', moduleKey: 'animaux', entity_type: 'animal', entity_id: a.id, title: `Animal malade : ${a.name || a.nom || a.id}`, message: 'Un animal est signalé malade.', action_recommandee: 'Consulter le vétérinaire', severity: 'critique' }));
  arr(dataMap.avicole)
    .filter((lot) => num(lot.initial_count) > 0 && num(lot.mortality ?? lot.morts) > num(lot.initial_count) * 0.04)
    .forEach((lot) => push({ code: 'mortalite_anormale', moduleKey: 'avicole', entity_type: 'lot_avicole', entity_id: lot.id, title: `Mortalité élevée : ${lot.name || lot.nom || lot.id}`, message: 'Un lot dépasse le seuil critique de mortalité.', action_recommandee: 'Contrôle santé et biosécurité', severity: 'critique' }));

  // Cultures — perdue / à risque.
  arr(dataMap.cultures)
    .filter((c) => lower(c.statut) === 'perdu')
    .forEach((c) => push({ code: '', moduleKey: 'cultures', entity_type: 'culture', entity_id: c.id, title: `Culture perdue : ${c.nom || c.name || c.id}`, message: 'Une culture est marquée perdue.', action_recommandee: 'Analyser la cause', severity: 'critique' }));

  // Achats & stock — rupture / sous seuil.
  arr(dataMap.stock)
    .filter((s) => num(s.seuil) > 0 && num(s.quantite) <= num(s.seuil))
    .forEach((s) => push({ code: 'stock_sous_seuil', moduleKey: 'achats_stock', entity_type: 'stock', entity_id: s.id, title: `${num(s.quantite) <= 0 ? 'Rupture' : 'Stock sous seuil'} : ${s.produit || s.nom || s.name || s.id}`, message: `${s.quantite}/${s.seuil}`, action_recommandee: 'Réapprovisionner', severity: num(s.quantite) <= 0 ? 'urgence' : 'warning' }));

  // Équipements — panne critique.
  arr(dataMap.equipements)
    .filter((e) => ['panne', 'hors_service', 'maintenance'].includes(lower(e.status)))
    .forEach((e) => push({ code: 'panne_equipement_critique', moduleKey: 'equipements', entity_type: 'equipement', entity_id: e.id, title: `Équipement indisponible : ${e.nom || e.name || e.id}`, message: 'Équipement en panne ou en maintenance.', action_recommandee: 'Planifier la réparation', severity: ['panne', 'hors_service'].includes(lower(e.status)) ? 'critique' : 'warning' }));

  // Commercial — créances échues (impayés).
  arr(dataMap.finances)
    .filter((t) => ['impaye', 'impayé', 'partiel'].includes(lower(t.statut)))
    .forEach((t) => push({ code: 'creance_echue', moduleKey: 'commercial', entity_type: 'transaction', entity_id: t.id, title: `Paiement en attente : ${t.libelle || t.title || t.id}`, message: `${num(t.montant)} FCFA`, action_recommandee: 'Relancer le client', severity: 'warning' }));

  // Finance — dépense sans justificatif.
  arr(dataMap.finances)
    .filter((t) => num(t.montant ?? t.amount) > 0 && !t.document_id && !t.proof_url && !t.justificatif_id && lower(t.type || t.categorie).includes('depense'))
    .forEach((t) => push({ code: 'depense_sans_justificatif', moduleKey: 'finance_pilotage', entity_type: 'transaction', entity_id: t.id, title: `Dépense sans preuve : ${t.libelle || t.title || t.id}`, message: `${num(t.montant ?? t.amount)} FCFA`, action_recommandee: 'Joindre un justificatif', severity: 'warning' }));

  // Activité — tâche critique en retard.
  const todayStr = new Date().toISOString().slice(0, 10);
  arr(dataMap.taches)
    .filter((t) => ['critique', 'critical'].includes(lower(t.priority)) && !CLOSED_ALERT_STATUSES.has(lower(t.status || t.statut)) && String(t.due_date || '').slice(0, 10) && String(t.due_date).slice(0, 10) < todayStr)
    .forEach((t) => push({ code: 'tache_critique_en_retard', moduleKey: 'activite_suivi', entity_type: 'tache', entity_id: t.id, title: `Tâche critique en retard : ${t.title || t.id}`, message: t.notes || '', action_recommandee: 'Traiter sans délai', severity: 'critique' }));

  // Terrain — météo à risque.
  if (weather?.riskLevel && lower(weather.riskLevel) !== 'stable') {
    push({ code: '', moduleKey: 'dashboard', entity_type: 'meteo', entity_id: 'meteo', title: 'Météo et terrain', message: weather.impact || 'Vérifier les conditions du terrain.', severity: 'warning' });
  }

  // Système — hors ligne.
  if (!online) {
    push({ code: 'non_synchronise_24h', moduleKey: 'sync_activity', entity_type: 'sync', entity_id: 'offline', title: 'Mode hors ligne', message: 'Les données seront synchronisées au retour du réseau.', severity: 'warning' });
  }

  return out.map((a) => normalize(a, 'derived'));
}

/**
 * Liste de référence unique des alertes ouvertes.
 * Fusionne les alertes persistées (alertes_center) et les détections dérivées,
 * déduplique par issue_key (le persisté gagne), trie par gravité.
 */
export function buildUnifiedAlerts(dataMap = {}, { online = true, weather = {} } = {}) {
  const persisted = arr(dataMap.alertes_center)
    .filter(isOpenAlert)
    .map((a) => normalize(a, 'persisted'));
  const derived = derivedDetections(dataMap, { online, weather });

  const byKey = new Map();
  [...persisted, ...derived].forEach((alert) => {
    if (!byKey.has(alert.issue_key)) byKey.set(alert.issue_key, alert);
  });

  return Array.from(byKey.values())
    .sort((a, b) => (SEVERITY_RANK[a.severity] ?? 9) - (SEVERITY_RANK[b.severity] ?? 9))
    .slice(0, 30);
}

/** Nombre d'alertes ouvertes par module de navigation. */
export function alertModuleCounts(alerts = []) {
  const counts = {};
  arr(alerts).forEach((alert) => {
    const nav = alert.navModule || navModuleForAlert(alert);
    counts[nav] = (counts[nav] || 0) + 1;
  });
  return counts;
}

/** Pastille de navigation par module : vrai si au moins une alerte ouverte. */
export function alertModuleFlags(alerts = []) {
  const counts = alertModuleCounts(alerts);
  const flags = {};
  Object.keys(counts).forEach((nav) => { flags[nav] = counts[nav] > 0; });
  return flags;
}
