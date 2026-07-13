/**
 * Catalogue métier Smart Farm - familles d'objets, alertes et intégrations recommandées.
 * Source de vérité UI (onglet Automatisation) et moteurs d'alerte.
 */

export const SMART_DEVICE_FAMILIES = [
  {
    key: 'temperature_air',
    label: 'Température air',
    sensorType: 'temperature',
    zones: ['poulailler', 'magasin', 'serre'],
    protocols: ['LoRaWAN', 'Wi-Fi', '4G'],
    alertExamples: ['Chaleur critique > 35°C', 'Froid nocturne < 12°C'],
    modules: ['avicole', 'elevage', 'stock'],
  },
  {
    key: 'humidite_air',
    label: 'Humidité air',
    sensorType: 'humidite',
    zones: ['poulailler', 'serre'],
    protocols: ['LoRaWAN', 'Wi-Fi'],
    alertExamples: ['Humidité > 85% (condensation)', 'Humidité < 40% (poussière)'],
    modules: ['avicole', 'cultures'],
  },
  {
    key: 'humidite_sol',
    label: 'Humidité / tension hydrique sol',
    sensorType: 'eau',
    zones: ['parcelle', 'irrigation'],
    protocols: ['LoRaWAN', '4G'],
    alertExamples: ['Sol < 18% → irrigation', 'Sol saturé → stop vanne'],
    modules: ['cultures', 'smartfarm'],
  },
  {
    key: 'station_meteo',
    label: 'Station météo locale',
    sensorType: 'air',
    zones: ['ferme', 'parcelle'],
    protocols: ['Wi-Fi', '4G'],
    alertExamples: ['Vent fort', 'Pluie imminente', 'Risque chaleur'],
    modules: ['cultures', 'dashboard'],
  },
  {
    key: 'vanne_irrigation',
    label: 'Vanne / irrigation connectée',
    sensorType: 'porte',
    zones: ['irrigation', 'parcelle'],
    protocols: ['LoRaWAN', '4G'],
    alertExamples: ['Vanne bloquée OFF', 'Fuite détectée'],
    modules: ['cultures'],
    automation: true,
  },
  {
    key: 'collier_iot',
    label: 'Collier / balise bétail',
    sensorType: 'mouvement',
    zones: ['parc', 'enclos'],
    protocols: ['LoRaWAN', '4G'],
    alertExamples: ['Animal immobile', 'Sortie de zone'],
    modules: ['elevage', 'animaux'],
  },
  {
    key: 'passerelle',
    label: 'Passerelle capteurs',
    sensorType: 'autre',
    zones: ['ferme'],
    protocols: ['Ethernet', '4G', 'Wi-Fi'],
    alertExamples: ['Gateway offline', 'Signal RSSI faible'],
    modules: ['smartfarm'],
  },
];

/** Règles d'alerte automatiques (événement → action ERP). */
export const SMART_ALERT_RULE_CATALOG = [
  {
    id: 'temp_high_avicole',
    label: 'Chaleur poulailler',
    trigger: 'temperature > seuil_max (zone avicole)',
    triggerLabel: 'température poulailler au-dessus du seuil',
    severity: 'warning',
    actions: ['alerte_center', 'tache_ventilation', 'whatsapp_optionnel'],
    targetModule: 'elevage',
  },
  {
    id: 'humidity_soil_low',
    label: 'Sol sec - irrigation',
    trigger: 'humidite_sol < 18% pendant 2h',
    triggerLabel: 'humidité du sol inférieure à 18 % pendant 2 h',
    severity: 'warning',
    actions: ['alerte_center', 'tache_irrigation', 'vanne_on_si_automatise'],
    targetModule: 'cultures',
  },
  {
    id: 'sensor_offline',
    label: 'Capteur hors ligne',
    trigger: 'status offline ou last_seen > 30 min',
    triggerLabel: 'capteur hors ligne depuis plus de 30 min',
    severity: 'warning',
    actions: ['alerte_center', 'tache_maintenance', 'equipements'],
    targetModule: 'rh',
  },
  {
    id: 'battery_low',
    label: 'Batterie faible',
    trigger: 'battery_level <= 20%',
    triggerLabel: 'niveau de batterie inférieur ou égal à 20 %',
    severity: 'info',
    actions: ['alerte_center', 'tache_remplacement_batterie'],
    targetModule: 'smartfarm',
  },
  {
    id: 'human_detected',
    label: 'Intrusion / humain détecté',
    trigger: 'event_type humain_detecte ou intrusion',
    triggerLabel: 'mouvement ou intrusion détectée',
    severity: 'urgence',
    actions: ['alerte_center', 'tache_securite', 'notification_immediate'],
    targetModule: 'smartfarm',
  },
  {
    id: 'door_open_stock',
    label: 'Porte magasin ouverte',
    trigger: 'capteur porte OPEN hors plage horaire',
    triggerLabel: 'porte ouverte en dehors des horaires autorisés',
    severity: 'warning',
    actions: ['alerte_center', 'tache_securite'],
    targetModule: 'achats_stock',
  },
  {
    id: 'water_leak',
    label: 'Fuite ou surconsommation eau',
    trigger: 'débit eau anormal vs baseline',
    triggerLabel: 'consommation d’eau anormale',
    severity: 'haute',
    actions: ['alerte_center', 'tache_maintenance', 'finances_charge'],
    targetModule: 'finance_pilotage',
  },
];

const SMART_ACTION_LABELS = {
  alerte_center: 'créer une alerte',
  tache_ventilation: 'planifier une ventilation',
  tache_irrigation: 'planifier une irrigation',
  tache_maintenance: 'créer une tâche de maintenance',
  tache_remplacement_batterie: 'prévoir le remplacement de batterie',
  tache_securite: 'alerter l’équipe sécurité',
  whatsapp_optionnel: 'proposer une relance WhatsApp',
  vanne_on_si_automatise: 'ouvrir la vanne si automatisée',
  equipements: 'mettre à jour les équipements',
  notification_immediate: 'envoyer une notification immédiate',
  finances_charge: 'enregistrer une charge',
};

export function formatSmartFarmAction(actionKey = '') {
  return SMART_ACTION_LABELS[actionKey] || String(actionKey || '').replace(/_/g, ' ');
}

export function formatSmartFarmTrigger(rule = {}) {
  return rule.triggerLabel || String(rule.trigger || '').replace(/_/g, ' ');
}

/** Modèles de scénarios Si… Alors… (commande matériel à venir). */
export const SMART_AUTOMATION_TEMPLATES = [
  {
    id: 'irrigation_soil',
    title: 'Irrigation sol sec',
    condition: 'SI humidité sol parcelle < 18% pendant 2h',
    action: 'ALORS vanne irrigation ON + tâche suivi Activité & Suivi',
    status: 'template',
  },
  {
    id: 'ventilation_heat',
    title: 'Ventilation chaleur',
    condition: 'SI température poulailler > 32°C pendant 30 min',
    action: 'ALORS alerte urgente + tâche ventilation',
    status: 'template',
  },
  {
    id: 'night_intrusion',
    title: 'Intrusion nocturne',
    condition: 'SI humain détecté entre 22h et 6h',
    action: 'ALORS alerte critique + notification responsable',
    status: 'template',
  },
];

export const SMARTFARM_EVENT_TYPES = [
  'temperature', 'humidite', 'humidite_sol', 'intrusion', 'mouvement',
  'humain_detecte', 'capteur_offline', 'batterie_faible',
  'vanne_ouverte', 'vanne_fermee', 'fuite_eau', 'signal_faible',
];
