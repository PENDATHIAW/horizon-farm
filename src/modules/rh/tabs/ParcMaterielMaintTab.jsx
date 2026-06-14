import ModuleListHub from '../../../components/module/ModuleListHub.jsx';
import { fmtNumber } from '../../../utils/format';
import EquipementsV3 from '../../EquipementsV3.jsx';
import { RhMaintenanceQueuePanel } from '../rhModuleUi.jsx';

export default function ParcMaterielMaintTab({
  data,
  eqProps,
  navigateRh,
  onSchedule,
  busyId,
  onNavigateToSmartFarm,
}) {
  return (
    <div className="space-y-6">
      <ModuleListHub
        title="Maintenance & pannes"
        intro="Équipements en maintenance, hors service ou capteurs offline."
        stats={[
          { label: 'À maintenir', value: fmtNumber(data.equipmentRisk.length), tone: data.equipmentRisk.length ? 'warn' : 'good' },
          { label: 'Sans tâche', value: fmtNumber(data.maintenanceQueue.length), tone: data.maintenanceQueue.length ? 'warn' : 'good' },
          { label: 'Équipements', value: fmtNumber(data.equipment.length) },
          { label: 'Capteurs', value: fmtNumber(data.sensors.length) },
        ]}
        rows={data.equipmentRisk.map((row) => ({
          id: row.id,
          title: row.nom || row.name || row.libelle || 'Équipement',
          detail: `${row.status || row.statut || row.etat || '—'} · maintenance`,
          value: row.type || row.categorie || 'Équipement',
          onClick: () => navigateRh('Parc Matériel & Maintenance'),
        }))}
        emptyLabel="Aucun équipement en maintenance."
      />
      <RhMaintenanceQueuePanel
        queue={data.maintenanceQueue}
        onSchedule={onSchedule}
        busyId={busyId}
        navigateRh={navigateRh}
      />
      <EquipementsV3 {...eqProps} />
      <div className="flex flex-col gap-3 rounded-lg border border-[#eadcc2] bg-[#fffdf8] p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[#8a7456]">
          Des anomalies de capteurs ou caméras sont signalées hors-ligne — ouvrez la console Smart Farm.
        </p>
        <button
          type="button"
          onClick={onNavigateToSmartFarm}
          className="rounded bg-[#2f2415] px-4 py-2 text-xs font-bold text-white hover:opacity-90"
        >
          Ouvrir la console Smart Farm
        </button>
      </div>
    </div>
  );
}
