import { graviteAlerte } from '../../config/catalogueAlertes.js';
import { STATUTS_TACHE_OUVERTE } from '../../i18n/fr/shared.js';

const texte = (value) => String(value || '').trim();
const bas = (value) => texte(value).toLowerCase();
const dateDe = (event = {}) => texte(event.event_date || event.created_at || event.date).slice(0, 10);
const OUVERTES = new Set(STATUTS_TACHE_OUVERTE);
const ALERTES_ACTIVES = new Set(['nouvelle', 'ouverte', 'active', 'open', 'en_cours']);

const estOuverte = (task = {}) => !texte(task.status) || OUVERTES.has(bas(task.status));
const estAlerteActive = (alert = {}) => !texte(alert.status) || ALERTES_ACTIVES.has(bas(alert.status));
const echeance = (task = {}) => texte(task.due_date || task.echeance).slice(0, 10);
const graviteDe = (alert = {}) => bas(graviteAlerte(alert.code || alert.alert_code, alert.severity));

export function filtrerEvenements(evenements = [], filtres = {}) {
  const { module, entiteId, type, recherche, limite = 30 } = filtres;
  const query = texte(recherche).toLowerCase();
  return (Array.isArray(evenements) ? evenements : [])
    .filter((event) => !module || [event.module_source, event.source_module, event.related_module].map(texte).includes(module))
    .filter((event) => !entiteId || [event.entity_id, event.source_record_id, event.related_record_id].map(texte).includes(texte(entiteId)))
    .filter((event) => !type || texte(event.event_type) === texte(type))
    .filter((event) => !query || [event.title, event.description, event.event_type].some((field) => texte(field).toLowerCase().includes(query)))
    .sort((a, b) => dateDe(b).localeCompare(dateDe(a)))
    .slice(0, limite);
}

export function filtrerTaches(taches = [], filtres = {}) {
  const { assigne, statut = 'ouvertes', priorite, actionsCorrectives, module, limite = 20 } = filtres;
  return (Array.isArray(taches) ? taches : [])
    .filter((task) => (statut === 'ouvertes' ? estOuverte(task) : statut === 'toutes' ? true : bas(task.status) === bas(statut)))
    .filter((task) => !assigne || bas(task.assigned_to) === bas(assigne))
    .filter((task) => !priorite || bas(task.priority) === bas(priorite))
    .filter((task) => !actionsCorrectives || texte(task.alert_id))
    .filter((task) => !module || bas(task.module_lie) === bas(module))
    .sort((a, b) => (echeance(a) || '9999').localeCompare(echeance(b) || '9999'))
    .slice(0, limite);
}

export function filtrerAlertes(alertes = [], filtres = {}) {
  const { gravite, statut = 'actives', module, sansResponsable, limite = 20 } = filtres;
  const rank = { critique: 0, critical: 0, warning: 1, info: 2 };
  return (Array.isArray(alertes) ? alertes : [])
    .filter((alert) => (statut === 'actives' ? estAlerteActive(alert) : statut === 'toutes' ? true : bas(alert.status) === bas(statut)))
    .filter((alert) => !gravite || graviteDe(alert) === bas(gravite))
    .filter((alert) => !module || bas(alert.module_source) === bas(module))
    .filter((alert) => !sansResponsable || !texte(alert.assigned_to))
    .sort((a, b) => (rank[graviteDe(a)] ?? 3) - (rank[graviteDe(b)] ?? 3))
    .slice(0, limite);
}
