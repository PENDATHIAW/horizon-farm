import { Activity, Building2, Droplets, Radio, Zap } from 'lucide-react';

const arr = (value) => (Array.isArray(value) ? value : []);
const text = (row = {}) => `${row.type || ''} ${row.metric || ''} ${row.name || ''} ${row.zone || ''}`.toLowerCase();

function Stat({ icon: Icon, label, value }) {
  return <div className="border-l-4 border-[#22c55e] bg-[#fffdf8] p-4"><Icon size={17} className="text-[#9a6b12]" /><p className="mt-2 text-xs font-bold text-[#8a7456]">{label}</p><p className="text-xl font-black text-[#2f2415]">{value}</p></div>;
}

export default function SmartFarmOverviewTab({ data }) {
  const sensors = arr(data.sensors);
  const water = sensors.filter((row) => /eau|water|debit|niveau|humid/.test(text(row))).length;
  const energy = sensors.filter((row) => /energie|energy|electric|courant|tension|power/.test(text(row))).length;
  return <div className="space-y-5"><section className="rounded-2xl border border-[#d6c3a0] bg-white p-5 shadow-sm"><div className="grid grid-cols-2 gap-3 lg:grid-cols-5"><Stat icon={Radio} label="Dispositifs" value={sensors.length} /><Stat icon={Droplets} label="Eau" value={water} /><Stat icon={Zap} label="Énergie" value={energy} /><Stat icon={Building2} label="Zones" value={data.zoneCount} /><Stat icon={Activity} label="Signaux critiques" value={data.criticalCount} /></div></section><section className="rounded-2xl border border-[#d6c3a0] bg-white p-5 shadow-sm"><h2 className="font-black text-[#2f2415]">Derniers relevés</h2><div className="mt-3 divide-y divide-[#eadcc2]">{arr(data.smartfarmEvents).slice(0, 10).map((event) => <div key={event.id} className="grid gap-1 py-3 sm:grid-cols-[1fr_auto]"><div><p className="font-bold text-[#2f2415]">{event.title || event.metric || event.event_type || event.id}</p><p className="text-xs text-[#8a7456]">{event.zone || event.device_id || 'Zone non renseignée'}</p></div><span className="text-sm font-black text-[#6f6048]">{event.value ?? event.status ?? '—'} {event.unit || ''}</span></div>)}{!arr(data.smartfarmEvents).length ? <p className="py-4 text-sm text-[#8a7456]">Aucun relevé reçu.</p> : null}</div></section></div>;
}
