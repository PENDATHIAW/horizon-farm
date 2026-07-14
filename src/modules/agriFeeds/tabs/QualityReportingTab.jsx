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
      <section className="rounded-3xl border border-line bg-white p-6 space-y-2">
        <p className="text-lg font-semibold text-earth">Infrastructures - zones AGRI FEEDS prévues</p>
        <p className="text-sm text-slate leading-relaxed max-w-3xl">
          Dès la Phase 1, ces espaces sont réservés sur le site. L’activation opérationnelle se fait selon la préparation réelle du site et le passage en Phase 2.
        </p>
        <p className="text-xs rounded-xl border border-line bg-card p-3 text-earth">
          {summary.separationNote}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
          {summary.zones.map((zone) => (
            <div key={zone.id} className="rounded-2xl border border-line bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-sm text-earth">{zone.name}</p>
                <span className="rounded-lg border border-line bg-white px-2 py-1 text-meta font-semibold text-slate">
                  {labelZoneStatus(zone.status)}
                </span>
              </div>
              <p className="text-xs text-slate mt-1">{labelZoneType(zone.zone_type)}</p>
              {zone.notes ? <p className="text-xs text-earth mt-2 leading-relaxed">{zone.notes}</p> : null}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-line bg-white p-6 space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="font-semibold text-earth">Reporting financeur AGRI FEEDS</p>
            <p className="text-sm text-slate leading-relaxed max-w-3xl mt-1">
              Synthèse lisible pour suivre readiness, production, qualité, traçabilité, ventes, créances et actions prioritaires.
            </p>
          </div>
          <button
            type="button"
            onClick={generateReport}
            disabled={busy}
            className="rounded-xl bg-earth text-white px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            Générer rapport
          </button>
        </div>
        {message ? (
          <p className="text-sm rounded-xl border border-line bg-card px-3 py-2">{message}</p>
        ) : null}
        <p className="rounded-2xl border border-line bg-card p-3 text-sm text-earth leading-relaxed">
          {report.executive_summary}
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {report.indicators.map((item) => (
            <div key={item.label} className="rounded-2xl border border-line bg-card p-3">
              <p className="text-xs font-semibold text-slate">{item.label}</p>
              <p className="text-base font-semibold text-earth">{item.value}</p>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate uppercase tracking-normal">Lecture de gestion</p>
          {report.narrative.map((line) => (
            <p key={line} className="rounded-xl border border-line bg-white px-3 py-2 text-sm text-earth">
              {line}
            </p>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <section className="rounded-3xl border border-line bg-white p-6 space-y-3">
          <p className="font-semibold text-earth">Qualité & traçabilité</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-line bg-card p-3">
              <p className="text-xs font-semibold text-slate">Contrôles qualité</p>
              <p className="text-lg font-semibold text-earth">{report.quality.checks_count}</p>
            </div>
            <div className="rounded-2xl border border-line bg-card p-3">
              <p className="text-xs font-semibold text-slate">Réclamations</p>
              <p className="text-lg font-semibold text-earth">{report.quality.complaints_count}</p>
            </div>
            <div className="rounded-2xl border border-line bg-card p-3">
              <p className="text-xs font-semibold text-slate">Lots finis acceptés</p>
              <p className="text-lg font-semibold text-earth">{report.quality.accepted_finished_batches}</p>
            </div>
            <div className="rounded-2xl border border-line bg-card p-3">
              <p className="text-xs font-semibold text-slate">Traçabilité lots</p>
              <p className="text-lg font-semibold text-earth">{Math.round(report.traceability.score)}%</p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-line bg-white p-6 space-y-3">
          <p className="font-semibold text-earth">Permissions sensibles</p>
          <p className="text-sm text-slate leading-relaxed">
            Les actions critiques restent réservées aux profils autorisés. Les décisions importantes nécessitent une confirmation.
          </p>
          <div className="space-y-2 max-h-[360px] overflow-auto pr-1">
            {permissions.map((row) => (
              <div key={row.action} className="rounded-2xl border border-line bg-card p-3">
                <p className="text-sm font-semibold text-earth">{row.label}</p>
                <p className="text-xs text-slate mt-1">{row.roles.join(' · ')}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-3xl border border-line bg-white p-6 space-y-2">
        <p className="font-semibold text-earth">Suivi des décisions</p>
        <p className="text-sm text-slate leading-relaxed max-w-3xl">
          Les rapports, validations, ventes, réclamations et actions sensibles doivent rester documentés pour faciliter le contrôle interne, le reporting financeur et la traçabilité des décisions.
        </p>
      </section>
    </div>
  );
}
