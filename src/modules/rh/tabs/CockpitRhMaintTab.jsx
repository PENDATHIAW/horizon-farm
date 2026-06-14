import { emitHorizonForm } from '../../../services/formModalManager';
import { fmtCurrency, fmtNumber } from '../../../utils/format';
import {
  RhCoherencePanel,
  RhIaPanel,
  RhMaintenanceQueuePanel,
  RhQuickAccessSection,
  RhStat,
} from '../rhModuleUi.jsx';

export default function CockpitRhMaintTab({
  data,
  navigateRh,
  onApply,
  onSchedule,
  busyId,
}) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
        <RhStat label="Santé RH" value={`${data.healthScore}/100`} tone={data.healthScore >= 75 ? 'good' : 'warn'} />
        <RhStat label="Équipe active" value={fmtNumber(data.payroll.headcount)} tone="good" />
        <RhStat label="Masse salariale" value={fmtCurrency(data.payroll.gross)} tone="warn" />
        <RhStat label="Équipements" value={fmtNumber(data.equipment.length)} />
        <RhStat label="Maintenance" value={fmtNumber(data.equipmentRisk.length)} tone={data.equipmentRisk.length ? 'warn' : 'good'} />
        <RhStat label="Signaux IA" value={fmtNumber(data.healthFindings.length)} tone={data.healthFindings.length ? 'warn' : 'good'} />
      </div>
      <RhIaPanel
        findings={data.healthFindings}
        predictions={data.healthPredictions}
        onApply={onApply}
        busyId={busyId}
        navigateRh={navigateRh}
      />
      <RhMaintenanceQueuePanel
        queue={data.maintenanceQueue}
        onSchedule={onSchedule}
        busyId={busyId}
        navigateRh={navigateRh}
      />
      <RhCoherencePanel
        rows={data.coherenceRows}
        onApply={onApply}
        busyId={busyId}
        navigateRh={navigateRh}
      />
      <RhQuickAccessSection
        navigateRh={navigateRh}
        onMaintenanceForm={() => {
          emitHorizonForm('equipements', 'equipment_action', 'Maintenance équipement', {
            date: new Date().toISOString().slice(0, 10),
            action_type: 'maintenance',
          });
          navigateRh('Parc Matériel & Maintenance');
        }}
      />
    </div>
  );
}
