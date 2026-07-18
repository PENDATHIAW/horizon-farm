/**
 * Capteurs connectés SIMULÉS, rattachés à un sujet réel de la ferme
 * (un bœuf, un lot avicole, une parcelle…).
 *
 * But : montrer concrètement, dans la fiche du sujet, ce qu'on verrait si le
 * matériel du catalogue était réellement posé — le collier GPS sur ce bœuf, le
 * capteur climat sur ce lot, la sonde sol sur cette parcelle. Les valeurs sont
 * dérivées de l'identifiant du sujet (stables, réalistes). Au branchement réel,
 * elles seront remplacées par les vrais relevés (même forme).
 */

const clean = (v) => String(v ?? '').toLowerCase();

/** Hash déterministe 0..1 à partir d'une chaîne (valeurs stables par sujet). */
function seed(str = '', salt = 0) {
  let h = 2166136261 ^ salt;
  const s = String(str);
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}
const pick = (arr, r) => arr[Math.floor(r * arr.length) % arr.length];
const round = (n, d = 0) => { const p = 10 ** d; return Math.round(n * p) / p; };

const isRuminant = (a = {}) => {
  const t = clean(`${a.type} ${a.espece} ${a.categorie} ${a.race}`);
  return ['bovin', 'boeuf', 'bœuf', 'vache', 'taureau', 'veau', 'zebu', 'mouton', 'ovin', 'chevre', 'chèvre', 'caprin', 'ruminant']
    .some((k) => t.includes(k));
};

function animalDevices(id, target) {
  const devices = [];
  const bat = Math.floor(55 + seed(id, 1) * 44);
  const horsZone = seed(id, 2) < 0.14;
  const activite = pick(['Au repos', 'Au pâturage', 'Rumination', 'En marche'], seed(id, 3));
  const sync = 2 + Math.floor(seed(id, 4) * 12);
  if (isRuminant(target) || seed(id, 9) > 0.4) {
    devices.push({
      label: 'Collier GPS 4G', tech: '4G', kind: 'gps',
      etat: horsZone || bat <= 20 ? 'alerte' : 'ras',
      alert: horsZone ? { severity: 'urgence', message: 'Sortie de zone détectée', action: 'Vérifier l’animal et le parc' }
        : bat <= 20 ? { severity: 'warning', message: 'Batterie faible', action: 'Recharger le collier' } : null,
      readings: [
        { icon: 'pin', label: 'Position', value: horsZone ? 'Hors zone' : 'Dans le parc', tone: horsZone ? 'bad' : 'good' },
        { icon: 'battery', label: 'Batterie', value: `${bat} %`, tone: bat <= 20 ? 'warn' : 'neutral' },
        { icon: 'activity', label: 'Activité', value: activite, tone: 'neutral' },
        { icon: 'clock', label: 'Vu', value: `il y a ${sync} min`, tone: 'neutral' },
      ],
    });
  }
  const poids = round(180 + seed(id, 5) * 320, 0);
  const gain = round(0.4 + seed(id, 6) * 1.1, 2);
  devices.push({
    label: 'Balance connectée', tech: 'RS485', kind: 'pesee', etat: 'ras', alert: null,
    readings: [
      { icon: 'scale', label: 'Poids', value: `${poids} kg`, tone: 'neutral' },
      { icon: 'activity', label: 'Gain/j', value: `+${gain} kg`, tone: gain >= 0.7 ? 'good' : 'neutral' },
    ],
  });
  devices.push({
    label: 'Boucle RFID', tech: 'RFID', kind: 'rfid', etat: 'ras', alert: null,
    readings: [
      { icon: 'tag', label: 'ID', value: `SN-${String(id).replace(/[^0-9A-Za-z]/g, '').slice(-6).toUpperCase() || '000000'}`, tone: 'neutral' },
      { icon: 'check', label: 'Lecture', value: 'Conforme', tone: 'good' },
    ],
  });
  return devices;
}

function avicoleDevices(id) {
  const temp = round(26 + seed(id, 1) * 10, 1);
  const hum = Math.floor(50 + seed(id, 2) * 40);
  const nh3 = Math.floor(5 + seed(id, 3) * 24);
  const tA = temp > 33; const hA = hum > 85; const gA = nh3 > 25;
  const eau = Math.floor(120 + seed(id, 5) * 260);
  const eauBaisse = seed(id, 8) < 0.16;
  const silo = Math.floor(10 + seed(id, 6) * 80);
  const siloBas = silo < 18;
  const camAnomalie = seed(id, 7) < 0.12;
  return [
    {
      label: 'Capteur climat 4G', tech: '4G', kind: 'climat',
      etat: (tA || hA || gA) ? 'alerte' : 'ras',
      alert: tA ? { severity: 'critique', message: `Chaleur ${temp} °C`, action: 'Ventiler et vérifier l’eau' }
        : gA ? { severity: 'warning', message: `Ammoniac ${nh3} ppm`, action: 'Nettoyer la litière et aérer' }
        : hA ? { severity: 'warning', message: `Humidité ${hum} %`, action: 'Améliorer la ventilation' } : null,
      readings: [
        { icon: 'temp', label: 'Temp.', value: `${temp} °C`, tone: tA ? 'bad' : 'good' },
        { icon: 'drop', label: 'Humidité', value: `${hum} %`, tone: hA ? 'warn' : 'neutral' },
        { icon: 'wind', label: 'NH₃', value: `${nh3} ppm`, tone: gA ? 'warn' : 'neutral' },
      ],
    },
    {
      label: 'Compteur d’eau 4G', tech: '4G', kind: 'eau',
      etat: eauBaisse ? 'alerte' : 'ras',
      alert: eauBaisse ? { severity: 'warning', message: 'Consommation d’eau en baisse', action: 'Vérifier abreuvoirs et santé du lot' } : null,
      readings: [
        { icon: 'waves', label: 'Eau bue', value: `${eau} L/j`, tone: eauBaisse ? 'warn' : 'neutral' },
      ],
    },
    {
      label: 'Niveau silo aliment', tech: 'RS485', kind: 'silo',
      etat: siloBas ? 'alerte' : 'ras',
      alert: siloBas ? { severity: 'warning', message: `Silo bas (${silo} %)`, action: 'Commander l’aliment' } : null,
      readings: [
        { icon: 'gauge', label: 'Silo', value: `${silo} %`, tone: siloBas ? 'warn' : 'good' },
      ],
    },
    {
      label: 'Caméra intelligente poulailler', tech: 'Caméra', kind: 'camera',
      etat: camAnomalie ? 'alerte' : 'ras',
      alert: camAnomalie ? { severity: 'warning', message: 'Regroupement anormal détecté', action: 'Vérifier le lot (chaleur, maladie)' } : null,
      readings: [
        { icon: 'camera', label: 'Vision', value: camAnomalie ? 'Anomalie' : 'Comportement OK', tone: camAnomalie ? 'warn' : 'good' },
      ],
    },
  ];
}

function cultureDevices(id) {
  const sol = Math.floor(12 + seed(id, 1) * 34);
  const sec = sol < 18;
  const air = round(24 + seed(id, 2) * 12, 1);
  const pluie = Math.floor(seed(id, 3) * 100);
  const vanneOuverte = sec;
  return [
    {
      label: 'Sonde humidité sol 4G', tech: '4G', kind: 'sol',
      etat: sec ? 'alerte' : 'ras',
      alert: sec ? { severity: 'warning', message: `Sol sec ${sol} %`, action: 'Déclencher l’irrigation' } : null,
      readings: [
        { icon: 'sprout', label: 'Humidité sol', value: `${sol} %`, tone: sec ? 'warn' : 'good' },
        { icon: 'clock', label: 'Relevé', value: `il y a ${2 + Math.floor(seed(id, 4) * 20)} min`, tone: 'neutral' },
      ],
    },
    {
      label: 'Station météo 4G', tech: '4G', kind: 'meteo', etat: 'ras', alert: null,
      readings: [
        { icon: 'cloud', label: 'Air', value: `${air} °C`, tone: 'neutral' },
        { icon: 'drop', label: 'Pluie prévue', value: `${pluie} %`, tone: pluie > 60 ? 'good' : 'neutral' },
      ],
    },
    {
      label: 'Vanne d’irrigation', tech: 'LoRa', kind: 'valve', etat: 'ras', alert: null,
      readings: [
        { icon: 'power', label: 'Vanne', value: vanneOuverte ? 'Ouverte' : 'Fermée', tone: vanneOuverte ? 'good' : 'neutral' },
      ],
    },
  ];
}

/**
 * Capteurs d'un sujet selon le module.
 * Renvoie { devices: [{ label, tech, kind, etat, alert, readings:[{icon,label,value,tone}] }] }
 */
export function subjectSensors(target = {}, mode = 'animaux') {
  const id = target.id || target.boucle_numero || target.tag || target.name || 'sujet';
  if (mode === 'avicole') return { devices: avicoleDevices(id) };
  if (mode === 'cultures') return { devices: cultureDevices(id) };
  return { devices: animalDevices(id, target) };
}

export default subjectSensors;
