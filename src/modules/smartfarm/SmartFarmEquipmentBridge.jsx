import { Camera, Radio, Settings } from 'lucide-react';
import { buildEquipmentSmartFarmSummary, orphanSmartFarmDevices } from '../../services/equipmentSmartFarmBridge.js';

export default function SmartFarmEquipmentBridge({
  equipements = [],
  sensors = [],
  cameras = [],
  onNavigate,
}) {
  const summary = buildEquipmentSmartFarmSummary(equipements, sensors, cameras);
  const linked = summary.filter((row) => row.totalDevices > 0);
  const orphans = orphanSmartFarmDevices(equipements, sensors, cameras);

  return (
    <section className="rounded-2xl border border-[#d6c3a0] bg-[#fffdf8] p-4 space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-black text-[#2f2415] flex items-center gap-2">
            <Settings size={16} className="text-[#9a6b12]" />
            Équipements liés
          </p>
          <p className="text-xs text-[#8a7456]">Matériel associé via « Équipement lié » ou correspondance de zone.</p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate?.('equipements')}
          className="text-xs font-black text-emerald-800"
        >
          Ouvrir Équipements →
        </button>
      </div>

      {linked.length ? (
        <div className="space-y-2">
          {linked.slice(0, 6).map(({ equipment, sensors: ss, cameras: cc, totalDevices }) => (
            <div key={equipment.id} className="rounded-xl border border-[#eadcc2] bg-white px-3 py-2 text-sm flex flex-wrap items-center justify-between gap-2">
              <div>
                <b className="text-[#2f2415]">{equipment.name || equipment.nom || equipment.id}</b>
                <p className="text-xs text-[#8a7456]">{equipment.zone || equipment.location || equipment.type || 'équipement'}</p>
              </div>
              <div className="flex items-center gap-3 text-xs font-bold text-[#7d6a4a]">
                {ss.length ? <span><Radio size={12} className="inline" /> {ss.length}</span> : null}
                {cc.length ? <span><Camera size={12} className="inline" /> {cc.length}</span> : null}
                <span className="text-emerald-800">{totalDevices} device(s)</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Aucun équipement lié. Renseignez « Équipement lié » sur un capteur ou alignez les zones.
        </p>
      )}

      {orphans.length ? (
        <p className="text-xs text-[#8a7456]">
          {orphans.length} capteur/caméra sans équipement — complétez le champ « Équipement lié ».
        </p>
      ) : null}
    </section>
  );
}
