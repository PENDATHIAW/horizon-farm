import { useMemo, useState } from 'react';
import { facilityZonesSummary, labelZoneStatus, labelZoneType } from '../../../services/agriFeeds/facilityZonesService.js';
import { normalizeAgriFeedsDataMap } from '../../../services/agriFeeds/agriFeedsReadinessEngine.js';
import {
  buildAgriFeedsFinanceurReport,
  buildAgriFeedsPermissionMatrix,
  commitAgriFeedsReport,
  prepareAgriFeedsReportCommit,
} from '../../../services/agriFeeds/agriFeedsReportingService.js';

export default function QualityReportingTab({
  dataMap = {},
  onCreateReport,
  onCreateAuditLog,
  onCreateBusinessEvent,
  userRole = 'manager',
}) {
  const normalized = useMemo(() => normalizeAgriFeedsDataMap(dataMap), [dataMap]);
  const summary = useMemo(() => facilityZonesSummary(normalized), [normalized]);
  const report = useMemo(() => buildAgriFeedsFinanceurReport(normalized), [normalized]);
  const permissions = useMemo(() => buildAgriFeedsPermissionMatrix(), []);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const generateReport = async () => {
    setBusy(true);
    setMessage('');
    try {
      const preview = prepareAgriFeedsReportCommit(report, { actor: userRole || 'ERP Horizon Farm' });
      await commitAgriFeedsReport(preview, { onCreateReport, onCreateAuditLog, onCreateBusinessEvent });
      setMessage('Rapport AGRI FEEDS généré et décision documentée.');
    } catch (err) {
      setMessage(err?.message || 'Génération du rapport impossible.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 space-y-2">
        <p className="text-lg font-black text-[#2f2415]">Infrastructures — zones AGRI FEEDS prévues</p>
        <p className="text-sm text-[#8a7456] leading-relaxed max-w-3xl">
          Dès la Phase 1, ces espaces sont réservés sur le site. L’activation opérationnelle se fait selon la préparation réelle du site et le passage en Phase 2.
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

      <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="font-black text-[#2f2415]">Reporting financeur AGRI FEEDS</p>
            <p className="text-sm text-[#8a7456] leading-relaxed max-w-3xl mt-1">
              Synthèse lisible pour suivre readiness, production, qualité, traçabilité, ventes, créances et actions prioritaires.
            </p>
          </div>
          <button
            type="button"
            onClick={generateReport}
            disabled={busy}
            className="rounded-xl bg-[#2f2415] text-white px-4 py-2 text-sm font-bold disabled:opacity-50"
          >
            Générer rapport
          </button>
        </div>
        {message ? (
          <p className="text-sm rounded-xl border border-[#eadcc2] bg-[#fffdf8] px-3 py-2">{message}</p>
        ) : null}
        <p className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-3 text-sm text-[#2f2415] leading-relaxed">
          {report.executive_summary}
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {report.indicators.map((item) => (
            <div key={item.label} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-3">
              <p className="text-xs font-bold text-[#8a7456]">{item.label}</p>
              <p className="text-base font-black text-[#2f2415]">{item.value}</p>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <p className="text-xs font-black text-[#8a7456] uppercase tracking-wide">Lecture de gestion</p>
          {report.narrative.map((line) => (
            <p key={line} className="rounded-xl border border-[#eadcc2] bg-white px-3 py-2 text-sm text-[#2f2415]">
              {line}
            </p>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 space-y-3">
          <p className="font-black text-[#2f2415]">Qualité & traçabilité</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-3">
              <p className="text-xs font-bold text-[#8a7456]">Contrôles qualité</p>
              <p className="text-lg font-black text-[#2f2415]">{report.quality.checks_count}</p>
            </div>
            <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-3">
              <p className="text-xs font-bold text-[#8a7456]">Réclamations</p>
              <p className="text-lg font-black text-[#2f2415]">{report.quality.complaints_count}</p>
            </div>
            <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-3">
              <p className="text-xs font-bold text-[#8a7456]">Lots finis acceptés</p>
              <p className="text-lg font-black text-[#2f2415]">{report.quality.accepted_finished_batches}</p>
            </div>
            <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-3">
              <p className="text-xs font-bold text-[#8a7456]">Traçabilité lots</p>
              <p className="text-lg font-black text-[#2f2415]">{Math.round(report.traceability.score)}%</p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 space-y-3">
          <p className="font-black text-[#2f2415]">Permissions sensibles</p>
          <p className="text-sm text-[#8a7456] leading-relaxed">
            Les actions critiques restent réservées aux profils autorisés. Les décisions importantes nécessitent une confirmation.
          </p>
          <div className="space-y-2 max-h-[360px] overflow-auto pr-1">
            {permissions.map((row) => (
              <div key={row.action} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-3">
                <p className="text-sm font-black text-[#2f2415]">{row.label}</p>
                <p className="text-xs text-[#8a7456] mt-1">{row.roles.join(' · ')}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 space-y-2">
        <p className="font-black text-[#2f2415]">Suivi des décisions</p>
        <p className="text-sm text-[#8a7456] leading-relaxed max-w-3xl">
          Les rapports, validations, ventes, réclamations et actions sensibles doivent rester documentés pour faciliter le contrôle interne, le reporting financeur et la traçabilité des décisions.
        </p>
      </section>
    </div>
  );
}
