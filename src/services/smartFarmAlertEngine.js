/**
 * Moteur d'alertes Smart Farm.
 *
 * Le catalogue SMART_ALERT_RULE_CATALOG décrivait les règles « capteur → action »
 * mais rien ne les évaluait : les capteurs ne généraient aucune alerte. Ce moteur
 * comble le trou — il lit les relevés des capteurs (sensor_devices) et les
 * événements terrain (smartfarm_events) et produit des alertes normalisées qui
 * rejoignent le flux unifié (cloche, panneau, pastilles, notifications).
 *
 * En simulation, les capteurs portent des valeurs de démonstration ; le moteur
 * fonctionne à l'identique une fois de vrais capteurs branchés (même schéma).
 */

const arr = (v) => (Array.isArray(v) ? v : []);
const num = (v) => Number(v ?? 0);
const lower = (v) => String(v ?? '').trim().toLowerCase();

/** Seuils par défaut (surchargés par device.seuils / device.thresholds si présents). */
export const SMARTFARM_THRESHOLDS = Object.freeze({
  temperature_max: 35,   // °C — chaleur critique (poulailler, serre)
  temperature_min: 12,   // °C — froid nocturne
  humidite_air_max: 85,  // % — condensation
  humidite_air_min: 40,  // % — air trop sec
  humidite_sol_min: 18,  // % — sol sec → irrigation
  battery_min: 20,       // % — batterie faible
  offline_minutes: 30,   // min — capteur muet
});

const readingOf = (d = {}) => num(d.last_value ?? d.derniere_valeur ?? d.valeur ?? d.value ?? d.reading);
const batteryOf = (d = {}) => (d.battery_level ?? d.batterie ?? d.battery ?? null);
const typeOf = (d = {}) => lower(d.sensor_type ?? d.type ?? d.sensorType ?? d.famille ?? d.family);
const nameOf = (d = {}) => d.name || d.nom || d.label || d.id;
const minutesSince = (value) => {
  if (!value) return null;
  const t = new Date(value).getTime();
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.floor((Date.now() - t) / 60000));
};
const isOfflineStatus = (d = {}) => ['offline', 'hors_ligne', 'deconnecte', 'déconnecté', 'inactive', 'inactif'].includes(lower(d.status ?? d.statut));

function alert({ code, title, message, severity, moduleKey, entityId, action }) {
  return {
    code,
    title,
    message,
    action_recommandee: action,
    severity,
    moduleKey,
    module_source: 'smartfarm',
    entity_type: 'capteur',
    entity_id: entityId,
    status: 'nouvelle',
    isAuto: true,
    smartfarm_rule: true,
  };
}

/** Évalue un capteur selon son type et ses seuils. */
function evaluateDevice(device = {}) {
  const out = [];
  const id = device.id || device.device_id || nameOf(device);
  const label = nameOf(device);
  const th = { ...SMARTFARM_THRESHOLDS, ...(device.seuils || device.thresholds || {}) };
  const type = typeOf(device);
  const reading = readingOf(device);
  const zone = device.zone || device.emplacement || device.location || '';

  // Capteur hors ligne (tous types).
  const offlineMin = minutesSince(device.last_seen ?? device.derniere_reception ?? device.updated_at);
  if (isOfflineStatus(device) || (offlineMin != null && offlineMin > th.offline_minutes)) {
    out.push(alert({ code: 'sensor_offline', title: `Capteur hors ligne : ${label}`, message: offlineMin != null ? `Aucun relevé depuis ${offlineMin} min.` : 'Capteur signalé hors ligne.', severity: 'warning', moduleKey: 'smartfarm', entityId: id, action: 'Vérifier alimentation et couverture réseau du capteur' }));
  }

  // Batterie faible.
  const battery = batteryOf(device);
  if (battery != null && num(battery) > 0 && num(battery) <= th.battery_min) {
    out.push(alert({ code: 'battery_low', title: `Batterie faible : ${label}`, message: `Batterie à ${num(battery)} %.`, severity: 'info', moduleKey: 'smartfarm', entityId: id, action: 'Prévoir le remplacement de la batterie' }));
  }

  // Température (poulailler / serre / magasin).
  if (type.includes('temp') && reading) {
    if (reading > th.temperature_max) out.push(alert({ code: 'temp_high', title: `Chaleur critique : ${label}`, message: `${reading}°C ${zone ? `(${zone}) ` : ''}> seuil ${th.temperature_max}°C.`, severity: 'critique', moduleKey: 'elevage', entityId: id, action: 'Ventiler, brumiser et vérifier l’abreuvement' }));
    else if (reading < th.temperature_min) out.push(alert({ code: 'temp_low', title: `Froid critique : ${label}`, message: `${reading}°C ${zone ? `(${zone}) ` : ''}< seuil ${th.temperature_min}°C.`, severity: 'warning', moduleKey: 'elevage', entityId: id, action: 'Renforcer le chauffage et couper les courants d’air' }));
  }

  // Humidité de l'air.
  if ((type.includes('humid') && (type.includes('air') || !type.includes('sol'))) && reading) {
    if (reading > th.humidite_air_max) out.push(alert({ code: 'humidity_high', title: `Humidité élevée : ${label}`, message: `${reading}% ${zone ? `(${zone}) ` : ''}> ${th.humidite_air_max}% (condensation).`, severity: 'warning', moduleKey: 'elevage', entityId: id, action: 'Améliorer la ventilation et la litière' }));
    else if (reading < th.humidite_air_min) out.push(alert({ code: 'humidity_low', title: `Air trop sec : ${label}`, message: `${reading}% ${zone ? `(${zone}) ` : ''}< ${th.humidite_air_min}% (poussière).`, severity: 'info', moduleKey: 'elevage', entityId: id, action: 'Humidifier légèrement et limiter la poussière' }));
  }

  // Humidité du sol → irrigation.
  if (type.includes('sol') && reading && reading < th.humidite_sol_min) {
    out.push(alert({ code: 'humidity_soil_low', title: `Sol sec : ${label}`, message: `Humidité sol ${reading}% < ${th.humidite_sol_min}%.`, severity: 'warning', moduleKey: 'cultures', entityId: id, action: 'Déclencher l’irrigation de la parcelle' }));
  }

  return out;
}

const EVENT_RULES = {
  intrusion: { code: 'intrusion', severity: 'urgence', moduleKey: 'smartfarm', title: 'Intrusion détectée', action: 'Vérifier la zone et alerter l’équipe sécurité' },
  humain_detecte: { code: 'intrusion', severity: 'urgence', moduleKey: 'smartfarm', title: 'Présence détectée hors horaires', action: 'Vérifier la zone et alerter l’équipe sécurité' },
  fuite_eau: { code: 'water_leak', severity: 'critique', moduleKey: 'finance_pilotage', title: 'Fuite / surconsommation d’eau', action: 'Couper l’arrivée d’eau et inspecter le réseau' },
  vanne_ouverte: { code: 'valve_stuck', severity: 'warning', moduleKey: 'cultures', title: 'Vanne d’irrigation restée ouverte', action: 'Fermer la vanne ou vérifier l’automatisation' },
  capteur_offline: { code: 'sensor_offline', severity: 'warning', moduleKey: 'smartfarm', title: 'Capteur hors ligne', action: 'Vérifier alimentation et réseau du capteur' },
  batterie_faible: { code: 'battery_low', severity: 'info', moduleKey: 'smartfarm', title: 'Batterie faible', action: 'Prévoir le remplacement de la batterie' },
};

/** Événements terrain récents non résolus → alertes. */
function evaluateEvents(events = []) {
  const closed = new Set(['traitee', 'traitée', 'resolue', 'résolue', 'fermee', 'fermée', 'done', 'closed']);
  return arr(events)
    .filter((e) => !closed.has(lower(e.status ?? e.statut)))
    .map((e) => {
      const rule = EVENT_RULES[lower(e.event_type ?? e.type_evenement ?? e.type)];
      if (!rule) return null;
      return alert({
        code: rule.code,
        title: `${rule.title}${e.zone ? ` — ${e.zone}` : ''}`,
        message: e.message || e.description || e.title || rule.title,
        severity: rule.severity,
        moduleKey: rule.moduleKey,
        entityId: e.entity_id || e.source_id || e.id,
        action: rule.action,
      });
    })
    .filter(Boolean);
}

/** Toutes les alertes Smart Farm à partir des capteurs et des événements. */
export function buildSmartFarmAlerts(sensorDevices = [], smartfarmEvents = []) {
  const fromDevices = arr(sensorDevices).flatMap(evaluateDevice);
  const fromEvents = evaluateEvents(smartfarmEvents);
  return [...fromDevices, ...fromEvents];
}

export default buildSmartFarmAlerts;
