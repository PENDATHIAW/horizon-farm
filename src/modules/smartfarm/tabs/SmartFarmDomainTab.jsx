const arr = (value) => (Array.isArray(value) ? value : []);
const DOMAIN = {
  water: { title: 'Relevés d’eau', pattern: /eau|water|debit|niveau|humid|irrig/ },
  energy: { title: 'Énergie', pattern: /energie|energy|electric|courant|tension|power|solaire/ },
  buildings: { title: 'Bâtiments', pattern: /batiment|bâtiment|hangar|poulailler|serre|zone/ },
};
const text = (row = {}) => `${row.type || ''} ${row.metric || ''} ${row.name || ''} ${row.zone || ''} ${row.location || ''}`.toLowerCase();

export default function SmartFarmDomainTab({ data, domain }) {
  const config = DOMAIN[domain] || DOMAIN.buildings;
  const sensors = arr(data.sensors).filter((row) => config.pattern.test(text(row)) || domain === 'buildings');
  const sensorIds = new Set(sensors.map((row) => String(row.id)));
  const events = arr(data.smartfarmEvents).filter((row) => sensorIds.has(String(row.device_id || row.sensor_id)) || config.pattern.test(text(row)));
  return <section className="rounded-2xl border border-[#d6c3a0] bg-white p-5 shadow-sm"><h2 className="font-black text-[#2f2415]">{config.title}</h2><p className="mt-1 text-sm text-[#8a7456]">Données reçues des dispositifs associés, sans saisie parallèle.</p><div className="mt-4 grid gap-3 md:grid-cols-2">{sensors.map((sensor) => { const latest = events.find((event) => String(event.device_id || event.sensor_id) === String(sensor.id)); return <div key={sensor.id} className="border-l-4 border-[#22c55e] bg-[#fffdf8] p-4"><p className="font-black text-[#2f2415]">{sensor.name || sensor.nom || sensor.id}</p><p className="text-xs text-[#8a7456]">{sensor.zone || sensor.location || 'Zone non renseignée'} · {sensor.status || 'statut non renseigné'}</p><p className="mt-2 text-lg font-black text-[#6f6048]">{latest?.value ?? sensor.value ?? '—'} {latest?.unit || sensor.unit || ''}</p></div>; })}{!sensors.length ? <p className="text-sm text-[#8a7456]">Aucun dispositif associé à cette vue.</p> : null}</div></section>;
}
