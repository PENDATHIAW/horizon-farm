import { AlertTriangle, Camera, CloudSun, Radio, WifiOff } from 'lucide-react';
import Btn from '../components/Btn';

const arr = (value) => Array.isArray(value) ? value : [];
const norm = (value = '') => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const zoneOf = (row = {}) => row.zone || row.location || row.emplacement || row.parcelle || 'Zone non renseignée';
const statusOf = (row = {}) => norm(row.status || row.statut || 'ok');
const isProblem = (row = {}) => ['alerte', 'offline', 'hors_ligne', 'maintenance', 'batterie_faible', 'panne'].includes(statusOf(row)) || Number(row.battery_level || 100) <= 20;

function weatherRiskLevel(meteo = {}) {
  const temp = Number(meteo?.temp ?? meteo?.temperature ?? 0);
  const humidity = Number(meteo?.humidite ?? meteo?.humidity ?? 0);
  const wind = Number(meteo?.windSpeed ?? meteo?.wind_speed ?? 0);
  const rainProb = Number(meteo?.precipitationProbability ?? meteo?.rain_probability ?? 0);
  if (temp >= 38 || humidity >= 88) return 'haute';
  if (wind >= 30 || meteo?.pluie || rainProb >= 70) return 'moyenne';
  return 'stable';
}

function buildZones(sensors = [], cameras = []) {
  const map = new Map();
  const ensure = (zone) => {
    const key = zone || 'Zone non renseignée';
    const item = map.get(key) || { zone: key, sensors: 0, cameras: 0, problems: 0, offline: 0, lowBattery: 0 };
    map.set(key, item);
    return item;
  };
  arr(sensors).forEach((sensor) => {
    const item = ensure(zoneOf(sensor));
    item.sensors += 1;
    if (isProblem(sensor)) item.problems += 1;
    if (['offline', 'hors_ligne'].includes(statusOf(sensor))) item.offline += 1;
    if (Number(sensor.battery_level || 100) <= 20) item.lowBattery += 1;
  });
  arr(cameras).forEach((camera) => {
    const item = ensure(zoneOf(camera));
    item.cameras += 1;
    if (isProblem(camera)) item.problems += 1;
    if (['offline', 'hors_ligne'].includes(statusOf(camera))) item.offline += 1;
  });
  return Array.from(map.values()).sort((a, b) => b.problems - a.problems || a.zone.localeCompare(b.zone));
}

function Mini({ icon: Icon, label, value, danger = false }) {
  return <div className={`rounded-xl border px-3 py-2 ${danger ? 'border-amber-200 bg-amber-50' : 'border-[#eadcc2] bg-white'}`}><Icon size={14} className={danger ? 'text-amber-700' : 'text-[#9a6b12]'} /><b className="block text-[#2f2415]">{value}</b><span className="text-xs text-[#8a7456]">{label}</span></div>;
}

export default function SmartFarmZoneOverview({ sensors = [], cameras = [], meteo = null, online = true, onCreateSensor, onCreateCamera }) {
  const zones = buildZones(sensors, cameras);
  const problemZones = zones.filter((zone) => zone.problems > 0);
  const weatherRisk = weatherRiskLevel(meteo);
  const weatherText = weatherRisk === 'haute' ? 'Météo à traiter' : weatherRisk === 'moyenne' ? 'Météo à surveiller' : 'Météo stable';

  return <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
    <article className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 xl:col-span-1">
      <p className="font-black text-[#2f2415]">Couverture terrain</p>
      <p className="mt-1 text-sm text-[#8a7456]">Vue simple des zones surveillées avant le détail des appareils.</p>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <Mini icon={Radio} label="Capteurs" value={arr(sensors).length} />
        <Mini icon={Camera} label="Caméras" value={arr(cameras).length} />
        <Mini icon={AlertTriangle} label="Zones à risque" value={problemZones.length} danger={problemZones.length > 0} />
        <Mini icon={CloudSun} label="Météo" value={weatherText} danger={weatherRisk !== 'stable'} />
      </div>
      {!online ? <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"><WifiOff size={14} className="inline" /> Hors ligne : données locales conservées.</div> : null}
      <div className="mt-3 flex flex-wrap gap-2"><Btn small variant="outline" onClick={() => onCreateSensor?.()}>Ajouter capteur</Btn><Btn small variant="outline" onClick={() => onCreateCamera?.()}>Ajouter caméra</Btn></div>
    </article>

    <article className="rounded-2xl border border-[#eadcc2] bg-white p-4 xl:col-span-2">
      <p className="font-black text-[#2f2415]">Zones surveillées</p>
      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
        {zones.length ? zones.slice(0, 6).map((zone) => <div key={zone.zone} className={`rounded-xl border px-3 py-2 ${zone.problems ? 'border-amber-200 bg-amber-50' : 'border-[#eadcc2] bg-[#fffdf8]'}`}>
          <div className="flex items-start justify-between gap-2"><b className="text-[#2f2415]">{zone.zone}</b>{zone.problems ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">{zone.problems} alerte(s)</span> : <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">ok</span>}</div>
          <p className="mt-1 text-xs text-[#8a7456]">{zone.sensors} capteur(s) · {zone.cameras} caméra(s) · {zone.offline} hors ligne · {zone.lowBattery} batterie faible</p>
        </div>) : <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] px-3 py-2 text-[#8a7456]">Aucune zone configurée. Ajoute au moins un capteur ou une caméra.</div>}
      </div>
    </article>
  </div>;
}
