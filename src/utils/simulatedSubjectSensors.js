/**
 * Capteurs connectés SIMULÉS, rattachés à un sujet réel de la ferme
 * (un bœuf, un lot avicole, une parcelle…).
 *
 * But : montrer concrètement, dans la fiche du sujet, ce qu'on verrait si le
 * matériel du catalogue était réellement posé — un collier GPS sur ce bœuf
 * précis, un capteur climat sur ce lot précis. Les valeurs sont dérivées de
 * l'identifiant du sujet (stables, réalistes). Au branchement réel, elles
 * seront remplacées par les vrais relevés (même forme).
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

/**
 * Capteurs d'un sujet selon le module.
 * Renvoie { devices: [{ label, tech, kind, etat, alert, readings:[{icon,label,value,tone}] }] }
 */
export function subjectSensors(target = {}, mode = 'animaux') {
  const id = target.id || target.boucle_numero || target.tag || target.name || 'sujet';
  const devices = [];

  if (mode === 'animaux') {
    // Collier GPS 4G (surtout ruminants), + boucle RFID d'identité.
    const bat = Math.floor(55 + seed(id, 1) * 44);
    const rHors = seed(id, 2);
    const horsZone = rHors < 0.14;
    const activite = pick(['Au repos', 'Au pâturage', 'Rumination', 'En marche'], seed(id, 3));
    const sync = 2 + Math.floor(seed(id, 4) * 12);
    const collar = {
      label: 'Collier GPS 4G',
      tech: '4G',
      kind: 'gps',
      etat: horsZone ? 'alerte' : bat <= 20 ? 'alerte' : 'ras',
      alert: horsZone ? { severity: 'urgence', message: 'Sortie de zone détectée', action: 'Vérifier l’animal et le parc' }
        : bat <= 20 ? { severity: 'warning', message: 'Batterie faible', action: 'Recharger le collier' } : null,
      readings: [
        { icon: 'pin', label: 'Position', value: horsZone ? 'Hors zone' : 'Dans le parc', tone: horsZone ? 'bad' : 'good' },
        { icon: 'battery', label: 'Batterie', value: `${bat} %`, tone: bat <= 20 ? 'warn' : 'neutral' },
        { icon: 'activity', label: 'Activité', value: activite, tone: 'neutral' },
        { icon: 'clock', label: 'Vu', value: `il y a ${sync} min`, tone: 'neutral' },
      ],
    };
    if (isRuminant(target) || seed(id, 9) > 0.4) devices.push(collar);
    devices.push({
      label: 'Boucle RFID',
      tech: 'RFID',
      kind: 'rfid',
      etat: 'ras',
      alert: null,
      readings: [
        { icon: 'tag', label: 'Identifiant', value: `SN-${String(id).replace(/[^0-9A-Za-z]/g, '').slice(-6).toUpperCase() || '000000'}`, tone: 'neutral' },
        { icon: 'check', label: 'Lecture', value: 'Conforme', tone: 'good' },
      ],
    });
  }

  if (mode === 'avicole') {
    const temp = round(26 + seed(id, 1) * 10, 1);
    const hum = Math.floor(50 + seed(id, 2) * 40);
    const nh3 = Math.floor(5 + seed(id, 3) * 24);
    const tAlert = temp > 33; const hAlert = hum > 85; const gAlert = nh3 > 25;
    devices.push({
      label: 'Capteur climat 4G',
      tech: '4G',
      kind: 'climat',
      etat: (tAlert || hAlert || gAlert) ? 'alerte' : 'ras',
      alert: tAlert ? { severity: 'critique', message: `Chaleur ${temp} °C`, action: 'Ventiler et vérifier l’eau' }
        : gAlert ? { severity: 'warning', message: `Ammoniac ${nh3} ppm`, action: 'Nettoyer la litière et aérer' }
        : hAlert ? { severity: 'warning', message: `Humidité ${hum} %`, action: 'Améliorer la ventilation' } : null,
      readings: [
        { icon: 'temp', label: 'Température', value: `${temp} °C`, tone: tAlert ? 'bad' : 'good' },
        { icon: 'drop', label: 'Humidité', value: `${hum} %`, tone: hAlert ? 'warn' : 'neutral' },
        { icon: 'wind', label: 'NH₃', value: `${nh3} ppm`, tone: gAlert ? 'warn' : 'neutral' },
      ],
    });
  }

  if (mode === 'cultures') {
    const sol = Math.floor(12 + seed(id, 1) * 34);
    const secheresse = sol < 18;
    devices.push({
      label: 'Sonde humidité sol 4G',
      tech: '4G',
      kind: 'sol',
      etat: secheresse ? 'alerte' : 'ras',
      alert: secheresse ? { severity: 'warning', message: `Sol sec ${sol} %`, action: 'Déclencher l’irrigation' } : null,
      readings: [
        { icon: 'sprout', label: 'Humidité sol', value: `${sol} %`, tone: secheresse ? 'warn' : 'good' },
        { icon: 'clock', label: 'Relevé', value: `il y a ${2 + Math.floor(seed(id, 4) * 20)} min`, tone: 'neutral' },
      ],
    });
  }

  return { devices };
}

export default subjectSensors;
