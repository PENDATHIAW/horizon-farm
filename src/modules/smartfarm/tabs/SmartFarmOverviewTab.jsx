import { Activity, Building2, Droplets, Radio, Zap } from 'lucide-react';
import SmartFarmSimulationPanel from '../SmartFarmSimulationPanel.jsx';
import SmartFarmInstallationsPanel from '../SmartFarmInstallationsPanel.jsx';

const arr = (value) => (Array.isArray(value) ? value : []);
const text = (row = {}) => `${row.type || ''} ${row.metric || ''} ${row.name || ''} ${row.zone || ''}`.toLowerCase();

function Stat({ icon: Icon, label, value }) {
  return <div className="border-l-4 border-leaf bg-card p-4"><Icon size={17} className="text-horizon-dark" /><p className="mt-2 text-xs font-semibold text-slate">{label}</p><p className="text-xl font-semibold text-earth">{value}</p></div>;
}

export default function SmartFarmOverviewTab({ data }) {
  const sensors = arr(data.sensors);
  const water = sensors.filter((row) => /eau|water|debit|niveau|humid/.test(text(row))).length;
  const energy = sensors.filter((row) => /energie|energy|electric|courant|tension|power/.test(text(row))).length;
  return <div className="space-y-6"><SmartFarmInstallationsPanel /><SmartFarmSimulationPanel /><section className="rounded-2xl border border-line bg-white p-6 shadow-card"><div className="grid grid-cols-2 gap-3 lg:grid-cols-5"><Stat icon={Radio} label="Dispositifs" value={sensors.length} /><Stat icon={Droplets} label="Eau" value={water} /><Stat icon={Zap} label="Énergie" value={energy} /><Stat icon={Building2} label="Zones" value={data.zoneCount} /><Stat icon={Activity} label="Signaux critiques" value={data.criticalCount} /></div></section><section className="rounded-2xl border border-line bg-white p-6 shadow-card"><h2 className="font-semibold text-earth">Derniers relevés</h2><div className="mt-3 divide-y divide-line">{arr(data.smartfarmEvents).slice(0, 10).map((event) => <div key={event.id} className="grid gap-1 py-3 sm:grid-cols-[1fr_auto]"><div><p className="font-semibold text-earth">{event.title || event.metric || event.event_type || event.id}</p><p className="text-xs text-slate">{event.zone || event.device_id || 'Zone non renseignée'}</p></div><span className="text-sm font-semibold text-slate">{event.value ?? event.status ?? '-'} {event.unit || ''}</span></div>)}{!arr(data.smartfarmEvents).length ? <p className="py-4 text-sm text-slate">Aucun relevé reçu.</p> : null}</div></section></div>;
}
