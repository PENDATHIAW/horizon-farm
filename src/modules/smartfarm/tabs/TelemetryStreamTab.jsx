import { Activity, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { useMemo, useState } from 'react';
import SmartEvolutionChart from '../../../components/charts/SmartEvolutionChart.jsx';
import { fmtNumber } from '../../../utils/format.js';

const arr = (v) => (Array.isArray(v) ? v : []);
const num = (v) => Number(v || 0);
const low = (v) => String(v || '').toLowerCase();

function bucketEventsByHour(events = []) {
  const buckets = new Map();
  arr(events).forEach((ev) => {
    const raw = ev.created_at || ev.event_date;
    if (!raw) return;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return;
    const key = `${d.toISOString().slice(0, 13)}:00`;
    if (!buckets.has(key)) buckets.set(key, { label: d.toLocaleString('fr-FR', { hour: '2-digit', day: '2-digit', month: 'short' }), temp: [], humidity: [], soil: [] });
    const bucket = buckets.get(key);
    const type = low(ev.event_type);
    const val = num(ev.event_value);
    if (type.includes('temp') || type === 'temperature') bucket.temp.push(val);
    if (type.includes('humid') && !type.includes('sol')) bucket.humidity.push(val);
    if (type.includes('sol') || type === 'humidite_sol') bucket.soil.push(val);
  });
  const sorted = [...buckets.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-24);
  const avg = (list) => list.length ? list.reduce((s, x) => s + x, 0) / list.length : 0;
  return {
    labels: sorted.map(([, b]) => b.label),
    temp: sorted.map(([, b]) => Math.round(avg(b.temp) * 10) / 10),
    humidity: sorted.map(([, b]) => Math.round(avg(b.humidity) * 10) / 10),
    soil: sorted.map(([, b]) => Math.round(avg(b.soil) * 10) / 10),
  };
}

function liveSensorSeries(sensors = []) {
  const tempSensors = arr(sensors).filter((s) => low(s.type).includes('temp'));
  const humSensors = arr(sensors).filter((s) => low(s.type).includes('humid') || low(s.type) === 'air');
  const soilSensors = arr(sensors).filter((s) => low(s.type).includes('eau') || low(s.type).includes('sol'));
  const label = (list) => list.map((s) => s.name || s.id).slice(0, 3).join(', ') || '—';
  return {
    tempNow: tempSensors.length ? num(tempSensors[0].value ?? tempSensors[0].last_value) : null,
    humNow: humSensors.length ? num(humSensors[0].value ?? humSensors[0].last_value) : null,
    soilNow: soilSensors.length ? num(soilSensors[0].value ?? soilSensors[0].last_value) : null,
    tempLabel: label(tempSensors),
    humLabel: label(humSensors),
    soilLabel: label(soilSensors),
  };
}

export default function TelemetryStreamTab({ data, handlers, realtime }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const events = data.smartfarmEvents;
  const series = useMemo(() => bucketEventsByHour(events), [events, refreshKey]);
  const live = useMemo(() => liveSensorSeries(data.sensors), [data.sensors]);
  const connected = data.realtimeConnected ?? realtime?.connected;
  const lastPulse = data.lastPulse ?? realtime?.lastPulse;

  const refreshFlux = async () => {
    setRefreshKey((k) => k + 1);
    await realtime?.refreshEvents?.();
    await handlers.onRefreshSmartfarmEvents?.();
  };

  const hasChart = series.labels.length > 1 && (series.temp.some(Boolean) || series.humidity.some(Boolean) || series.soil.some(Boolean));

  const chartLabels = hasChart ? series.labels : ['Actuel'];
  const tempData = hasChart ? series.temp : [live.tempNow || data.meteo?.temp || 0];
  const humData = hasChart ? series.humidity : [live.humNow || data.meteo?.humidite || data.meteo?.humidity || 0];
  const soilData = hasChart ? series.soil : [live.soilNow || 0];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
          <p className="text-xs text-[#8a7456]">Température air</p>
          <p className="mt-1 text-xl font-black text-[#2f2415]">{live.tempNow != null ? `${live.tempNow}°` : data.meteo?.temp != null ? `${data.meteo.temp}°` : '—'}</p>
          <p className="text-xs text-[#8a7456]">{live.tempLabel}</p>
        </div>
        <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
          <p className="text-xs text-[#8a7456]">Humidité air</p>
          <p className="mt-1 text-xl font-black text-[#2f2415]">{live.humNow != null ? `${live.humNow}%` : data.meteo?.humidite != null ? `${data.meteo.humidite}%` : '—'}</p>
          <p className="text-xs text-[#8a7456]">{live.humLabel}</p>
        </div>
        <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
          <p className="text-xs text-[#8a7456]">Humidité sol</p>
          <p className="mt-1 text-xl font-black text-[#2f2415]">{live.soilNow != null ? `${live.soilNow}%` : '—'}</p>
          <p className="text-xs text-[#8a7456]">{live.soilLabel}</p>
        </div>
        <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
          <p className="text-xs text-[#8a7456]">Événements (24h)</p>
          <p className="mt-1 text-xl font-black text-[#2f2415]">{fmtNumber(events.length)}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-bold">
          {connected ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-800">
              <Wifi size={14} /> Realtime connecté
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-amber-800">
              <WifiOff size={14} /> Realtime en attente
            </span>
          )}
          {lastPulse ? (
            <span className="text-[#8a7456]">Dernier signal · {String(lastPulse).slice(0, 19).replace('T', ' ')}</span>
          ) : null}
        </div>
        <button
          type="button"
          onClick={refreshFlux}
          className="inline-flex items-center gap-2 rounded-lg border border-[#d6c3a0] bg-white px-3 py-2 text-xs font-black text-[#2f2415]"
        >
          <RefreshCw size={14} /> Rafraîchir le flux
        </button>
      </div>

      <SmartEvolutionChart
        moduleName="Smart Farm"
        title="Température / humidité / sol"
        subtitle="Croisement air ambiant et tension hydrique — base évapotranspiration parcelle."
        months={chartLabels}
        leftUnit="%"
        rightUnit="°C"
        series={[
          { name: 'Température air', type: 'line', unit: '°C', axis: 'right', data: tempData },
          { name: 'Humidité air', type: 'line', unit: '%', data: humData },
          { name: 'Humidité sol', type: 'bar', unit: '%', data: soilData },
        ]}
      />

      <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm">
        <h3 className="flex items-center gap-2 text-lg font-black text-[#2f2415]">
          <Activity size={20} /> Flux temps réel
        </h3>
        <p className="mt-1 text-sm text-[#8a7456]">Derniers signaux IoT — chaque ligne peut générer une alerte automatique.</p>
        <div className="mt-4 space-y-2 max-h-80 overflow-y-auto">
          {events.length ? events.slice(0, 30).map((ev) => (
            <div key={ev.id} className="flex flex-col gap-1 rounded-xl border border-[#eadcc2] bg-[#fffdf8] px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between">
              <div>
                <b className="text-[#2f2415]">{ev.event_type || 'signal'}</b>
                <p className="text-xs text-[#8a7456]">{ev.zone || '—'} · {ev.message || ev.device_id || ''}</p>
              </div>
              <span className="text-xs font-bold text-[#7d6a4a]">{String(ev.created_at || '').slice(0, 19).replace('T', ' ')}</span>
            </div>
          )) : (
            <p className="text-sm text-[#8a7456]">Aucun événement — les signaux capteurs apparaîtront ici dès qu’ils seront reçus.</p>
          )}
        </div>
      </section>

      <p className="text-xs text-[#8a7456]">
        Les alertes automatiques sont envoyées vers Activité & Suivi lorsque les seuils ou événements critiques sont détectés.
        <button type="button" className="ml-2 font-bold text-emerald-700 underline" onClick={() => handlers.onNavigate?.('activite_suivi')}>
          Ouvrir le cockpit
        </button>
      </p>
    </div>
  );
}
