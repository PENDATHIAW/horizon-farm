import { useMemo } from 'react';
import { MapPinned, ShieldCheck } from 'lucide-react';
import { facilityZonesSummary, labelZoneStatus, labelZoneType } from '../../../services/agriFeeds/facilityZonesService.js';
import { normalizeAgriFeedsDataMap } from '../../../services/agriFeeds/agriFeedsReadinessEngine.js';

export default function QualityReportingTab({ dataMap = {} }) {
  const normalized = useMemo(() => normalizeAgriFeedsDataMap(dataMap), [dataMap]);
  const summary = useMemo(() => facilityZonesSummary(normalized), [normalized]);

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 space-y-2">
        <p className="text-lg font-black text-[#2f2415] flex items-center gap-2">
          <MapPinned size={20} /> Infrastructures — zones AGRI FEEDS prévues
        </p>
        <p className="text-sm text-[#8a7456] leading-relaxed max-w-3xl">
          Dès la Phase 1, ces espaces sont réservés sur le site (Thiès ou Dokhoba selon décision).
          Statut actuel : prévu. Activation opérationnelle en Phase 2.
        </p>
        <p className="text-xs rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3 text-[#2f2415]">
          {summary.separationNote}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
          {summary.zones.map((zone) => (
            <div key={zone.id} className="rounded-2xl border border-[#d6c3a0] bg-[#fffdf8] p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="font-black text-sm text-[#2f2415]">{zone.name}</p>
                <span className="rounded-lg border border-[#d6c3a0] bg-white px-2 py-0.5 text-[10px] font-black text-[#8a7456]">
                  {labelZoneStatus(zone.status)}
                </span>
              </div>
              <p className="text-xs text-[#8a7456] mt-1">{labelZoneType(zone.zone_type)}</p>
              {zone.notes ? <p className="text-xs text-[#2f2415] mt-2 leading-relaxed">{zone.notes}</p> : null}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 space-y-2">
        <p className="font-black text-[#2f2415] flex items-center gap-2">
          <ShieldCheck size={18} /> Qualité & reporting
        </p>
        <p className="text-sm text-[#8a7456] leading-relaxed max-w-2xl">
          Contrôles qualité réception / production, QR lots, réclamations et rapports
          financeur seront enrichis aux étapes 3 à 6. Les zones ci-dessus constituent
          le socle d’infrastructure Phase 1.
        </p>
      </section>
    </div>
  );
}
