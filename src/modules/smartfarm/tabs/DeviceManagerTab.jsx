import { Battery, Camera, Plus, QrCode, Radio, Signal, Wifi } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import GenericCrudModule from '../../../components/GenericCrudModule.jsx';
import { MODULE_FORM_FIELDS } from '../../../utils/constants.js';
import { fmtNumber } from '../../../utils/format.js';
import { generateSequentialId } from '../../../utils/ids.js';
import SmartFarmSafetyBridge from '../../SmartFarmSafetyBridge.jsx';
import SmartFarmZoneOverview from '../../SmartFarmZoneOverview.jsx';
import { SMART_DEVICE_FAMILIES } from '../smartFarmTelemetryCatalog.js';
import { isSmartFarmDeviceCritical, smartDeviceLabel } from '../../../utils/smartFarmWorkflows.js';

const arr = (v) => (Array.isArray(v) ? v : []);
const num = (v) => Number(v || 0);
const statusTone = (device = {}) => {
  const st = String(device.status || device.statut || '').toLowerCase();
  if (['offline', 'hors_ligne', 'panne', 'alerte'].includes(st)) return 'border-red-200 bg-red-50';
  if (isSmartFarmDeviceCritical(device)) return 'border-amber-200 bg-amber-50';
  return 'border-emerald-200 bg-emerald-50';
};

function DeviceCard({ device, kind, onEdit }) {
  const battery = num(device.battery_level ?? device.batterie);
  const rssi = device.rssi ?? device.signal_rssi ?? device.raw_payload?.rssi;
  const protocol = device.protocol || device.link_protocol || device.raw_payload?.protocol || '—';
  return (
    <button
      type="button"
      onClick={() => onEdit?.(device, kind)}
      className={`rounded-2xl border p-4 text-left transition hover:shadow-sm ${statusTone(device)}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-black text-[#2f2415]">{smartDeviceLabel(device, kind)}</p>
          <p className="text-xs text-[#8a7456]">{device.zone || device.location || 'Zone'} · {device.type || kind}</p>
        </div>
        {kind === 'camera' ? <Camera size={18} className="text-[#8a7456]" /> : <Radio size={18} className="text-[#8a7456]" />}
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
        <span className="rounded-full border border-[#eadcc2] bg-white px-2 py-0.5 text-[#7d6a4a]">
          <Signal size={12} className="inline" /> {protocol}
        </span>
        {battery > 0 ? (
          <span className="rounded-full border border-[#eadcc2] bg-white px-2 py-0.5 text-[#7d6a4a]">
            <Battery size={12} className="inline" /> {battery}%
          </span>
        ) : null}
        {rssi != null && rssi !== '' ? (
          <span className="rounded-full border border-[#eadcc2] bg-white px-2 py-0.5 text-[#7d6a4a]">
            RSSI {rssi}
          </span>
        ) : null}
        <span className="rounded-full border border-[#eadcc2] bg-white px-2 py-0.5 text-[#7d6a4a]">
          {device.status || device.statut || '—'}
        </span>
      </div>
    </button>
  );
}

export default function DeviceManagerTab({
  data,
  handlers,
  sensorProps,
  cameraProps,
  navigateSmartFarm,
}) {
  const [detail, setDetail] = useState(null);

  const quickPair = async () => {
    try {
      const id = generateSequentialId('sensor_devices', data.sensors);
      await handlers.onCreateSensor?.({
        id,
        name: `Sonde ${id}`,
        type: 'temperature',
        zone: 'terrain',
        status: 'simulation',
        source_type: 'reel',
        module_lie: 'smartfarm',
        battery_level: 100,
      });
      await handlers.onRefreshSensors?.();
      toast.success('Sonde ajoutée — complétez la fiche ou scannez le QR terrain');
      navigateSmartFarm?.('Objets connectés');
    } catch (e) {
      toast.error(e.message || 'Appairage impossible');
    }
  };

  const devices = [
    ...arr(data.sensors).map((d) => ({ device: d, kind: 'capteur' })),
    ...arr(data.cameras).map((d) => ({ device: d, kind: 'camera' })),
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
          <p className="text-xs text-[#8a7456]">Objets connectés</p>
          <p className="mt-1 text-xl font-black text-[#2f2415]">{fmtNumber(devices.length)}</p>
        </div>
        <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
          <p className="text-xs text-[#8a7456]">Signaux critiques</p>
          <p className={`mt-1 text-xl font-black ${data.criticalCount ? 'text-amber-700' : 'text-emerald-700'}`}>{fmtNumber(data.criticalCount)}</p>
        </div>
        <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
          <p className="text-xs text-[#8a7456]">Zones</p>
          <p className="mt-1 text-xl font-black text-[#2f2415]">{fmtNumber(data.zoneCount)}</p>
        </div>
        <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
          <p className="text-xs text-[#8a7456]">Réseau</p>
          <p className="mt-1 text-xl font-black text-[#2f2415]">
            <Wifi size={16} className="inline" /> {data.online ? 'En ligne' : 'Hors ligne'}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={quickPair} className="inline-flex items-center gap-2 rounded-xl bg-[#2f2415] px-4 py-2 text-xs font-black text-white">
          <QrCode size={14} /> Appairer une sonde
        </button>
        <button type="button" onClick={() => setDetail('sensor')} className="inline-flex items-center gap-2 rounded-xl border border-[#d6c3a0] bg-white px-4 py-2 text-xs font-black text-[#2f2415]">
          <Plus size={14} /> Gérer capteurs
        </button>
        <button type="button" onClick={() => setDetail('camera')} className="inline-flex items-center gap-2 rounded-xl border border-[#d6c3a0] bg-white px-4 py-2 text-xs font-black text-[#2f2415]">
          <Plus size={14} /> Gérer caméras
        </button>
        <button type="button" onClick={() => handlers.onNavigate?.('activite_suivi', { tab: 'À traiter maintenant' })} className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-800">
          Voir alertes IoT
        </button>
        <button type="button" onClick={() => handlers.onNavigate?.('rh', { tab: 'Parc Matériel & Maintenance' })} className="inline-flex items-center gap-2 rounded-xl border border-[#eadcc2] bg-[#fffdf8] px-4 py-2 text-xs font-black text-[#7d6a4a]">
          Parc mécanique →
        </button>
      </div>

      <SmartFarmZoneOverview
        sensors={data.sensors}
        cameras={data.cameras}
        meteo={data.meteo}
        online={data.online}
        onCreateSensor={handlers.onCreateSensor}
        onCreateCamera={handlers.onCreateCamera}
      />

      <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm">
        <h3 className="text-lg font-black text-[#2f2415]">Grille des objets</h3>
        <p className="mt-1 text-sm text-[#8a7456]">Batterie, protocole (LoRaWAN, 4G, Wi-Fi) et statut de liaison.</p>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {devices.length ? devices.map(({ device, kind }) => (
            <DeviceCard key={`${kind}-${device.id}`} device={device} kind={kind} onEdit={() => setDetail(kind === 'camera' ? 'camera' : 'sensor')} />
          )) : (
            <p className="text-sm text-[#8a7456]">Aucun objet connecté — appairez une sonde ou ajoutez un capteur.</p>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm">
        <h3 className="text-lg font-black text-[#2f2415]">Familles recommandées</h3>
        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
          {SMART_DEVICE_FAMILIES.slice(0, 6).map((fam) => (
            <div key={fam.key} className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3 text-sm">
              <b className="text-[#2f2415]">{fam.label}</b>
              <p className="text-xs text-[#8a7456] mt-1">{fam.protocols.join(' · ')} — {fam.alertExamples[0]}</p>
            </div>
          ))}
        </div>
      </section>

      <SmartFarmSafetyBridge
        meteo={data.meteo}
        sensors={data.sensors}
        cameras={data.cameras}
        tasks={data.tasks}
        onCreateAlert={handlers.onCreateAlert}
        onRefreshAlertes={handlers.onRefreshAlertes}
        onCreateTask={handlers.onCreateTask}
        onRefreshTasks={handlers.onRefreshTasks}
        onCreateBusinessEvent={handlers.onCreateBusinessEvent}
        onRefreshBusinessEvents={handlers.onRefreshBusinessEvents}
      />

      {detail === 'sensor' ? (
        <GenericCrudModule
          {...sensorProps}
          moduleKey="sensor_devices"
          title="Capteurs terrain"
          sub="Température, humidité, eau, mouvement — reliés aux alertes"
          fields={MODULE_FORM_FIELDS.sensor_devices}
          columns={['id', 'name', 'type', 'zone', 'status', 'value', 'battery_level']}
          addLabel="Ajouter capteur"
          exportTitle="Capteurs Smart Farm"
          kpis={[
            { icon: Radio, label: 'Capteurs', value: data.sensors.length, color: 'bg-emerald-500/20 text-emerald-600' },
            { icon: Radio, label: 'Critiques', value: data.criticalCount, color: 'bg-amber-500/20 text-amber-600' },
          ]}
        />
      ) : null}

      {detail === 'camera' ? (
        <GenericCrudModule
          {...cameraProps}
          moduleKey="camera_devices"
          title="Caméras terrain"
          sub="Surveillance, intrusion, preuves"
          fields={MODULE_FORM_FIELDS.camera_devices}
          columns={['id', 'name', 'zone', 'type', 'status']}
          addLabel="Ajouter caméra"
          exportTitle="Caméras Smart Farm"
          kpis={[]}
        />
      ) : null}
    </div>
  );
}
