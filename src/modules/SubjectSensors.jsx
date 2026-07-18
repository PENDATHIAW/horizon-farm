import {
  Activity, BatteryMedium, Camera, CheckCircle2, Clock, CloudSun, Droplets, Gauge,
  MapPin, Power, Radio, Scale, ScanLine, Sprout, Thermometer, Waves, Wind,
} from 'lucide-react';
import { subjectSensors } from '../utils/simulatedSubjectSensors.js';

const ICONS = {
  pin: MapPin, battery: BatteryMedium, activity: Activity, clock: Clock,
  tag: ScanLine, check: CheckCircle2, temp: Thermometer, drop: Droplets,
  wind: Wind, sprout: Sprout, scale: Scale, waves: Waves, gauge: Gauge,
  camera: Camera, cloud: CloudSun, power: Power,
};
const KIND_ICON = {
  gps: MapPin, rfid: ScanLine, climat: Thermometer, sol: Sprout, pesee: Scale,
  eau: Waves, silo: Gauge, camera: Camera, meteo: CloudSun, valve: Power,
};
const toneCls = (t) => t === 'good' ? 'text-positive' : t === 'bad' ? 'text-urgent' : t === 'warn' ? 'text-horizon-dark' : 'text-earth';

function Reading({ icon, label, value, tone }) {
  const Icon = ICONS[icon] || Radio;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-2.5 py-1">
      <Icon size={13} className="shrink-0 text-slate" aria-hidden="true" />
      <span className="text-meta text-slate">{label}</span>
      <span className={`text-xs font-semibold ${toneCls(tone)}`}>{value}</span>
    </span>
  );
}

/**
 * Capteurs connectés (simulés) d'un sujet, affichés dans sa fiche : on voit le
 * collier sur ce bœuf, le capteur climat sur ce lot, comme si le matériel
 * était réellement posé.
 */
export default function SubjectSensors({ target, mode = 'animaux' }) {
  const { devices } = subjectSensors(target, mode);
  if (!devices.length) return null;

  return (
    <div className="border-b border-line bg-card px-4 py-3">
      <div className="flex items-center gap-2">
        <Radio size={13} className="text-horizon-dark" aria-hidden="true" />
        <p className="text-meta font-semibold uppercase tracking-normal text-slate">Capteurs connectés · simulation</p>
      </div>
      <div className="mt-2 space-y-2">
        {devices.map((device) => {
          const KindIcon = KIND_ICON[device.kind] || Radio;
          const alerted = device.etat === 'alerte';
          return (
            <div key={device.label} className={`rounded-2xl border p-2.5 ${alerted ? (device.alert?.severity === 'warning' ? 'border-vigilance bg-vigilance-bg' : 'border-urgent bg-urgent-bg') : 'border-line bg-white'}`}>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="inline-flex items-center gap-1.5 font-semibold text-earth">
                  <KindIcon size={15} className="text-horizon-dark" aria-hidden="true" />
                  <span className="text-sm">{device.label}</span>
                </span>
                <span className="rounded-full bg-card px-2 py-0.5 text-meta font-semibold text-slate">{device.tech}</span>
                {device.readings.map((r) => <Reading key={r.label} {...r} />)}
              </div>
              {device.alert ? (
                <p className={`mt-1.5 text-xs font-semibold ${device.alert.severity === 'warning' ? 'text-horizon-dark' : 'text-urgent'}`}>
                  {device.alert.message} → {device.alert.action}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
