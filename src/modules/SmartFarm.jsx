import { Activity, AlertTriangle, Camera, Droplets, Eye, Gauge, Plus, Radio, RefreshCw, Thermometer, Trash2, Wind } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import ActionIconButton from '../components/ActionIconButton';
import Btn from '../components/Btn';
import DataTable from '../components/DataTable';
import KpiCard from '../components/KpiCard';
import SectionHeader from '../components/SectionHeader';
import CreateModal from '../modals/CreateModal';
import DeleteModal from '../modals/DeleteModal';
import DetailsModal from '../modals/DetailsModal';
import EditModal from '../modals/EditModal';
import { MODULE_FORM_FIELDS } from '../utils/constants';
import { generateSequentialId } from '../utils/ids';

const zoneExamples = ['poulailler', 'batiment pondeuses', 'batiment poulets chair', 'parc bovins', 'parc ovins', 'parc caprins', 'magasin stock', 'parcelle laitues', 'parcelle tomates', 'entree principale', 'bureau'];

export default function SmartFarm({
  meteo,
  online,
  sensors = [],
  cameras = [],
  sensorLoading,
  cameraLoading,
  onCreateSensor,
  onUpdateSensor,
  onDeleteSensor,
  onRefreshSensors,
  onCreateCamera,
  onUpdateCamera,
  onDeleteCamera,
  onRefreshCameras,
}) {
  const [checking, setChecking] = useState(false);
  const [selectedSensor, setSelectedSensor] = useState(null);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);

  const simulatedReadings = useMemo(() => [
    { id: 'METEO-TEMP', zone: meteo?.locationLabel || 'Meteo live', metric: 'Temperature', value: `${meteo?.temp ?? '-'} C`, status: meteo?.riskLevel === 'stable' ? 'stable' : 'surveillance' },
    { id: 'METEO-HUM', zone: meteo?.locationLabel || 'Meteo live', metric: 'Humidite', value: `${meteo?.humidite ?? '-'}%`, status: Number(meteo?.humidite || 0) >= 88 ? 'surveillance' : 'stable' },
    { id: 'METEO-WIND', zone: 'Vent terrain', metric: 'Vent', value: meteo?.windLabel || '0 km/h', status: Number(meteo?.windSpeed || 0) >= 30 ? 'surveillance' : 'stable' },
    { id: 'METEO-RAIN', zone: 'Pluie', metric: 'Pluie / probabilite', value: `${meteo?.pluie ? 'Pluie' : 'Sec'} - ${meteo?.precipitationProbability || 0}%`, status: meteo?.pluie ? 'surveillance' : 'stable' },
  ], [meteo]);

  const configuredSensors = sensors.length ? sensors : [
    { id: 'SIM-SENS-01', name: 'Simulation meteo', type: 'temperature', zone: 'Station ferme', location: meteo?.locationLabel || 'Senegal', status: 'simulation', battery_level: 100 },
  ];
  const configuredCameras = cameras.length ? cameras : [
    { id: 'SIM-CAM-01', name: 'Camera simulation entree', zone: 'entree principale', type: 'simulation', status: 'simulation' },
  ];

  const verifySensors = async () => {
    setChecking(true);
    try {
      await Promise.allSettled([onRefreshSensors?.(), onRefreshCameras?.()]);
      toast.success(online ? 'Smart Farm synchronise avec Supabase' : 'Mode terrain hors ligne: donnees locales conservees');
    } finally {
      setChecking(false);
    }
  };

  const saveSensor = async (payload) => {
    try {
      setSaving(true);
      if (selectedSensor) await onUpdateSensor?.(selectedSensor.id, payload);
      else await onCreateSensor?.(payload);
      toast.success(selectedSensor ? 'Capteur modifie' : 'Capteur ajoute');
      setModal(null);
    } catch (error) {
      toast.error(error.message || 'Erreur capteur');
    } finally {
      setSaving(false);
    }
  };

  const saveCamera = async (payload) => {
    try {
      setSaving(true);
      if (selectedCamera) await onUpdateCamera?.(selectedCamera.id, payload);
      else await onCreateCamera?.(payload);
      toast.success(selectedCamera ? 'Camera modifiee' : 'Camera ajoutee');
      setModal(null);
    } catch (error) {
      toast.error(error.message || 'Erreur camera');
    } finally {
      setSaving(false);
    }
  };

  const deleteSensor = async () => {
    if (!selectedSensor) return;
    try {
      setSaving(true);
      await onDeleteSensor?.(selectedSensor.id);
      toast.success('Capteur supprime');
      setModal(null);
    } catch (error) {
      toast.error(error.message || 'Erreur suppression capteur');
    } finally {
      setSaving(false);
    }
  };

  const deleteCamera = async () => {
    if (!selectedCamera) return;
    try {
      setSaving(true);
      await onDeleteCamera?.(selectedCamera.id);
      toast.success('Camera supprimee');
      setModal(null);
    } catch (error) {
      toast.error(error.message || 'Erreur suppression camera');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Smart Farm"
        sub="Capteurs - cameras - energie - eau - meteo live - architecture IoT prete"
        actions={
          <>
            <Btn icon={RefreshCw} variant="outline" small onClick={verifySensors} disabled={checking}>{checking ? 'Verification...' : 'Verifier / synchroniser'}</Btn>
            <Btn icon={Plus} small onClick={() => { setSelectedSensor(null); setModal('createSensor'); }}>Ajouter capteur</Btn>
            <Btn icon={Camera} variant="outline" small onClick={() => { setSelectedCamera(null); setModal('createCamera'); }}>Ajouter camera</Btn>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Thermometer} label="Temperature live" value={`${meteo?.temp ?? '-'} C`} sub={`Ressenti ${meteo?.apparentTemp ?? '-'} C`} color="bg-amber-500/20 text-amber-400" />
        <KpiCard icon={Droplets} label="Humidite live" value={`${meteo?.humidite ?? '-'}%`} sub={meteo?.condition || 'Meteo'} color="bg-sky-500/20 text-sky-400" />
        <KpiCard icon={Wind} label="Vent terrain" value={`${meteo?.windSpeed ?? 0} km/h`} sub={meteo?.windLabel || 'Direction inconnue'} color="bg-emerald-500/20 text-emerald-400" />
        <KpiCard icon={Camera} label="Cameras" value={`${cameras.length}/${Math.max(cameras.length, 4)}`} sub={cameras.length ? 'configurees' : 'mode simulation'} color="bg-purple-500/20 text-purple-400" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="bg-[#ffffff] border border-[#d6c3a0] rounded-2xl p-5">
          <p className="font-semibold text-[#2f2415] mb-4 flex items-center gap-2"><Radio size={16} className="text-emerald-400" />Mesures terrain live / simulation</p>
          <div className="space-y-3">
            {simulatedReadings.map((reading) => (
              <div key={reading.id} className="flex items-center gap-3 bg-[#fffdf8] border border-[#d6c3a0] rounded-xl p-3">
                <Gauge size={16} className={reading.status === 'stable' ? 'text-emerald-400' : 'text-amber-400'} />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[#2f2415]">{reading.zone}</p>
                  <p className="text-xs text-[#8a7456]">{reading.metric}</p>
                </div>
                <span className="text-sm font-bold text-[#2f2415]">{reading.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#ffffff] border border-[#d6c3a0] rounded-2xl p-5">
          <p className="font-semibold text-[#2f2415] mb-4 flex items-center gap-2"><Activity size={16} className="text-sky-400" />Architecture temps reel</p>
          <div className="space-y-3 text-sm text-[#7d6a4a]">
            <p><strong className="text-[#2f2415]">Oui, on peut integrer de vrais capteurs.</strong> L'ERP est prepare pour ESP32/Arduino, API HTTP, MQTT via passerelle, Edge Functions et Supabase realtime.</p>
            <p>Sans materiel connecte, le module reste en mode simulation propre: meteo live + appareils declares + alertes intelligentes.</p>
            <p>Les capteurs/cameras restent isoles du metier agricole tant qu'ils ne sont pas configures, puis leurs alertes alimentent Dashboard et Alertes.</p>
            <p className="text-xs bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-emerald-700">Zones pretes: {zoneExamples.join(', ')}.</p>
          </div>
        </div>

        <div className="bg-[#ffffff] border border-[#d6c3a0] rounded-2xl p-5">
          <p className="font-semibold text-[#2f2415] mb-4 flex items-center gap-2"><AlertTriangle size={16} className="text-amber-400" />Recommandations terrain</p>
          <div className="space-y-2">
            {(meteo?.recommendations || ['Configurer un capteur reel pour remplacer progressivement les donnees simulation.']).slice(0, 5).map((rec) => (
              <div key={rec} className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-sm text-[#7d6a4a]">{rec}</div>
            ))}
          </div>
        </div>
      </div>

      <DataTable
        title="Capteurs configures"
        rows={configuredSensors}
        columns={[
          { key: 'name', label: 'Capteur', sortable: true, render: (row) => <span className="font-semibold text-[#2f2415]">{row.name}</span> },
          { key: 'type', label: 'Type', sortable: true },
          { key: 'zone', label: 'Zone', sortable: true },
          { key: 'location', label: 'Localisation' },
          { key: 'status', label: 'Statut', sortable: true },
          { key: 'battery_level', label: 'Batterie', render: (row) => `${row.battery_level ?? '-'}%` },
          {
            key: 'actions',
            label: 'Actions',
            render: (row) => row.id?.startsWith('SIM-') ? <span className="text-xs text-[#8a7456]">simulation</span> : (
              <div className="flex gap-1">
                <ActionIconButton icon={Eye} title="Voir" color="sky" onClick={() => { setSelectedSensor(row); setModal('detailsSensor'); }} />
                <ActionIconButton icon={Gauge} title="Modifier" color="amber" onClick={() => { setSelectedSensor(row); setModal('editSensor'); }} />
                <ActionIconButton icon={Trash2} title="Supprimer" color="red" onClick={() => { setSelectedSensor(row); setModal('deleteSensor'); }} />
              </div>
            ),
          },
        ]}
        loading={sensorLoading}
        initialSortKey="name"
      />

      <DataTable
        title="Cameras configurees"
        rows={configuredCameras}
        columns={[
          { key: 'name', label: 'Camera', sortable: true, render: (row) => <span className="font-semibold text-[#2f2415]">{row.name}</span> },
          { key: 'zone', label: 'Zone', sortable: true },
          { key: 'type', label: 'Type', sortable: true },
          { key: 'status', label: 'Statut', sortable: true },
          { key: 'stream_url', label: 'Flux', render: (row) => row.stream_url || 'non connecte API' },
          {
            key: 'actions',
            label: 'Actions',
            render: (row) => row.id?.startsWith('SIM-') ? <span className="text-xs text-[#8a7456]">simulation</span> : (
              <div className="flex gap-1">
                <ActionIconButton icon={Eye} title="Voir" color="sky" onClick={() => { setSelectedCamera(row); setModal('detailsCamera'); }} />
                <ActionIconButton icon={Camera} title="Modifier" color="amber" onClick={() => { setSelectedCamera(row); setModal('editCamera'); }} />
                <ActionIconButton icon={Trash2} title="Supprimer" color="red" onClick={() => { setSelectedCamera(row); setModal('deleteCamera'); }} />
              </div>
            ),
          },
        ]}
        loading={cameraLoading}
        initialSortKey="name"
      />

      <DetailsModal open={modal === 'detailsSensor'} onClose={() => setModal(null)} data={selectedSensor} title="Fiche capteur" />
      <CreateModal open={modal === 'createSensor'} onClose={() => setModal(null)} onSubmit={saveSensor} fields={MODULE_FORM_FIELDS.sensor_devices} initialValues={{ id: generateSequentialId('sensor_devices', sensors), status: 'simulation', battery_level: 100 }} autoId={() => generateSequentialId('sensor_devices', sensors)} loading={saving} title="Ajouter capteur" submitLabel="Ajouter" />
      <EditModal open={modal === 'editSensor'} onClose={() => setModal(null)} onSubmit={saveSensor} fields={MODULE_FORM_FIELDS.sensor_devices} initialValues={selectedSensor || {}} loading={saving} title="Modifier capteur" submitLabel="Enregistrer" />
      <DeleteModal open={modal === 'deleteSensor'} onClose={() => setModal(null)} onConfirm={deleteSensor} itemLabel={selectedSensor?.name || ''} loading={saving} />

      <DetailsModal open={modal === 'detailsCamera'} onClose={() => setModal(null)} data={selectedCamera} title="Fiche camera" />
      <CreateModal open={modal === 'createCamera'} onClose={() => setModal(null)} onSubmit={saveCamera} fields={MODULE_FORM_FIELDS.camera_devices} initialValues={{ id: generateSequentialId('camera_devices', cameras), type: 'simulation', status: 'simulation' }} autoId={() => generateSequentialId('camera_devices', cameras)} loading={saving} title="Ajouter camera" submitLabel="Ajouter" />
      <EditModal open={modal === 'editCamera'} onClose={() => setModal(null)} onSubmit={saveCamera} fields={MODULE_FORM_FIELDS.camera_devices} initialValues={selectedCamera || {}} loading={saving} title="Modifier camera" submitLabel="Enregistrer" />
      <DeleteModal open={modal === 'deleteCamera'} onClose={() => setModal(null)} onConfirm={deleteCamera} itemLabel={selectedCamera?.name || ''} loading={saving} />
    </div>
  );
}

