import {
  Activity, BatteryMedium, Camera, Clock, CloudSun, Droplets, Fish, Flower2, Gauge,
  Power, Radio, Refrigerator, Scale, ShieldAlert, Snowflake, Sprout, Thermometer,
  Waves, Wind, Zap,
} from 'lucide-react';
import { buildFarmInstallations, installationsSummary } from '../../config/smartFarmInstallations.js';

const READING_ICON = {
  camera: Camera, power: Power, gauge: Gauge, waves: Waves, zap: Zap, battery: BatteryMedium,
  temp: Thermometer, drop: Droplets, wind: Wind, scale: Scale, activity: Activity,
  sprout: Sprout, cloud: CloudSun, clock: Clock,
};
const ZONE_ICON = {
  shield: ShieldAlert, water: Waves, energy: Zap, cold: Refrigerator,
  greenhouse: Flower2, bee: Snowflake, fish: Fish,
};
const KIND_ICON = {
  camera: Camera, valve: Power, silo: Gauge, eau: Waves, energy: Zap, battery: BatteryMedium,
  cold: Snowflake, climat: Thermometer, pesee: Scale,
};
const toneCls = (t) => t === 'good' ? 'text-positive' : t === 'bad' ? 'text-urgent' : t === 'warn' ? 'text-horizon-dark' : 'text-earth';

function DeviceCard({ device }) {
  const KindIcon = KIND_ICON[device.kind] || Radio;
  const alerted = device.etat === 'alerte';
  return (
    <div className={`rounded-2xl border p-3 ${alerted ? (device.alert?.severity === 'warning' ? 'border-vigilance bg-vigilance-bg' : 'border-urgent bg-urgent-bg') : 'border-line bg-white'}`}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="inline-flex items-center gap-1.5 font-semibold text-earth">
          <KindIcon size={15} className="text-horizon-dark" aria-hidden="true" />
          <span className="text-sm">{device.label}</span>
        </span>
        <span className="rounded-full bg-card px-2 py-0.5 text-meta font-semibold text-slate">{device.tech}</span>
        {device.readings.map((r) => {
          const Icon = READING_ICON[r.icon] || Radio;
          return (
            <span key={r.label} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-2.5 py-1">
              <Icon size={13} className="shrink-0 text-slate" aria-hidden="true" />
              <span className="text-meta text-slate">{r.label}</span>
              <span className={`text-xs font-semibold ${toneCls(r.tone)}`}>{r.value}</span>
            </span>
          );
        })}
      </div>
      {device.alert ? (
        <p className={`mt-1.5 text-xs font-semibold ${device.alert.severity === 'warning' ? 'text-horizon-dark' : 'text-urgent'}`}>
          {device.alert.message} → {device.alert.action}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Installations Smart Farm par zone (simulation) : caméras, forage, énergie,
 * chambre froide, serre, rucher, bassins — les appareils affichés là où ils
 * sont réellement posés dans la ferme.
 */
export default function SmartFarmInstallationsPanel() {
  const zones = buildFarmInstallations();
  const s = installationsSummary(zones);
  return (
    <section className="space-y-4 rounded-3xl border border-line bg-card p-5 shadow-card">
      <div>
        <div className="flex items-center gap-2">
          <Radio size={18} className="text-horizon-dark" />
          <h2 className="text-lg font-semibold text-earth">Installations par zone : aperçu en simulation</h2>
        </div>
        <p className="text-sm text-slate">
          {s.devices} appareils sur {s.zones} zones (sécurité, eau, énergie, froid, serre, rucher, bassins).
          {s.alertes ? ` ${s.alertes} en alerte.` : ''} Posés là où ils vivent, comme s’ils étaient installés.
        </p>
      </div>
      <div className="space-y-5">
        {zones.map((z) => {
          const ZoneIcon = ZONE_ICON[z.icon] || Radio;
          const alertes = z.devices.filter((d) => d.etat === 'alerte').length;
          return (
            <div key={z.zone} className="space-y-2">
              <p className="flex items-center gap-2 text-label font-semibold uppercase text-earth">
                <ZoneIcon size={15} className="text-horizon-dark" aria-hidden="true" />
                {z.zone}
                {alertes ? <span className="rounded-full bg-urgent-bg px-2 py-0.5 text-meta font-semibold text-urgent">{alertes}</span> : null}
              </p>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {z.devices.map((d) => <DeviceCard key={d.label} device={d} />)}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
