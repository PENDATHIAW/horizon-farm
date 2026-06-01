/** Relie équipements matériels ↔ capteurs / caméras Smart Farm. */

const arr = (v) => (Array.isArray(v) ? v : []);
const clean = (v) => String(v || '').trim();
const lower = (v) => clean(v).toLowerCase();

function zoneOf(row = {}) {
  return lower(row.zone || row.location || row.emplacement || '');
}

function nameOf(row = {}, fallback = '') {
  return clean(row.name || row.nom || fallback);
}

export function devicesForEquipment(equipment = {}, sensors = [], cameras = []) {
  const eqId = clean(equipment.id);
  const eqZone = zoneOf(equipment);
  const eqName = lower(nameOf(equipment));

  const match = (device) => {
    if (eqId && clean(device.equipment_id) === eqId) return true;
    const dz = zoneOf(device);
    if (eqZone && dz && (dz.includes(eqZone) || eqZone.includes(dz))) return true;
    const dn = lower(nameOf(device));
    if (eqName && dn && (dn.includes(eqName) || eqName.includes(dn))) return true;
    return false;
  };

  return {
    sensors: arr(sensors).filter(match),
    cameras: arr(cameras).filter(match),
  };
}

export function equipmentForDevice(device = {}, equipements = []) {
  const linkedId = clean(device.equipment_id);
  if (linkedId) {
    return arr(equipements).find((eq) => clean(eq.id) === linkedId) || null;
  }
  const dz = zoneOf(device);
  const dn = lower(nameOf(device));
  return arr(equipements).find((eq) => {
    const ez = zoneOf(eq);
    const en = lower(nameOf(eq));
    if (dz && ez && (dz.includes(ez) || ez.includes(dz))) return true;
    if (dn && en && (dn.includes(en) || en.includes(dn))) return true;
    return false;
  }) || null;
}

export function buildEquipmentSmartFarmSummary(equipements = [], sensors = [], cameras = []) {
  return arr(equipements).map((equipment) => {
    const linked = devicesForEquipment(equipment, sensors, cameras);
    return {
      equipment,
      sensors: linked.sensors,
      cameras: linked.cameras,
      totalDevices: linked.sensors.length + linked.cameras.length,
    };
  }).sort((a, b) => b.totalDevices - a.totalDevices || nameOf(a.equipment).localeCompare(nameOf(b.equipment), 'fr'));
}

export function orphanSmartFarmDevices(equipements = [], sensors = [], cameras = []) {
  const orphans = [];
  [...arr(sensors).map((d) => ({ ...d, kind: 'capteur' })), ...arr(cameras).map((d) => ({ ...d, kind: 'camera' }))].forEach((device) => {
    if (!equipmentForDevice(device, equipements)) orphans.push(device);
  });
  return orphans;
}

export default buildEquipmentSmartFarmSummary;
