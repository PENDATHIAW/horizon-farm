import { Archive, Check, FileClock, LockKeyhole, Send } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { buildReportPreview, REPORT_STATES, transitionReport } from '../../../utils/reportLifecycle.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const statusLabel = {
  [REPORT_STATES.PREVIEW]: 'Aperçu',
  [REPORT_STATES.VALIDATED]: 'Validé',
  [REPORT_STATES.FROZEN]: 'Gelé',
  [REPORT_STATES.PUBLISHED]: 'Publié',
};

function stateOf(report = {}) {
  return String(report.status || report.statut || '').toLowerCase();
}

function ActionButton({ icon: Icon, children, onClick, disabled = false }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} className="inline-flex items-center gap-1.5 rounded-lg border border-[#d6c3a0] bg-white px-3 py-2 text-xs font-black text-[#2f2415] disabled:cursor-not-allowed disabled:opacity-45">
      <Icon size={14} /> {children}
    </button>
  );
}

export default function ReportLifecyclePanel({ reports = [], dataMap = {}, user = null, onCreateReport, onUpdateReport, onCreateBusinessEvent, onRefreshReports }) {
  const [busy, setBusy] = useState('');
  const [channel, setChannel] = useState('Portail financeur');
  const actor = String(user?.full_name || user?.user_metadata?.full_name || user?.email || user?.id || '').trim();
  const rows = useMemo(() => arr(reports).slice().sort((a, b) => String(b.generated_at || b.created_at || '').localeCompare(String(a.generated_at || a.created_at || ''))), [reports]);

  const saveTransition = async (report, action) => {
    const key = `${report.id}:${action}`;
    const transition = transitionReport(report, action, { actor, channel, reports: rows, dataMap });
    if (!transition.ok) return toast.error(transition.error);
    setBusy(key);
    try {
      if (transition.mode === 'create') await onCreateReport?.(transition.record);
      else await onUpdateReport?.(report.id, transition.patch);
      await onCreateBusinessEvent?.({
        event_type: `rapport_${action}`,
        module_source: 'documents_rapports',
        entity_type: 'rapport',
        entity_id: transition.record?.id || report.id,
        title: action === 'correct' ? `Nouvelle version de ${report.title}` : `${report.title} · ${action}`,
        event_date: new Date().toISOString().slice(0, 10),
        severity: 'info',
      });
      await onRefreshReports?.();
      toast.success(action === 'correct' ? 'Nouvelle version créée' : 'Rapport mis à jour');
    } catch (error) {
      toast.error(error?.message || 'Mise à jour impossible');
    } finally {
      setBusy('');
    }
  };

  const createPreview = async () => {
    const report = buildReportPreview({ reports: rows, dataMap });
    setBusy('new');
    try {
      await onCreateReport?.(report);
      await onCreateBusinessEvent?.({
        event_type: 'rapport_apercu_genere',
        module_source: 'documents_rapports',
        entity_type: 'rapport',
        entity_id: report.id,
        title: report.title,
        event_date: new Date().toISOString().slice(0, 10),
        severity: 'info',
      });
      await onRefreshReports?.();
      toast.success('Aperçu généré depuis les données sources');
    } catch (error) {
      toast.error(error?.message || 'Génération impossible');
    } finally {
      setBusy('');
    }
  };

  return (
    <section className="rounded-2xl border border-[#d6c3a0] bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 font-black text-[#2f2415]"><FileClock size={19} /> Cycle des rapports</h2>
          <p className="mt-1 text-sm text-[#8a7456]">Collecte automatique, aperçu daté, validation, gel puis publication.</p>
        </div>
        <button type="button" disabled={busy === 'new' || !onCreateReport} onClick={createPreview} className="rounded-lg bg-[#22c55e] px-4 py-2 text-sm font-black text-[#052e16] disabled:opacity-50">
          {busy === 'new' ? 'Génération...' : 'Générer un aperçu'}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <label className="text-xs font-bold text-[#8a7456]" htmlFor="report-publication-channel">Canal</label>
        <select id="report-publication-channel" value={channel} onChange={(event) => setChannel(event.target.value)} className="rounded-lg border border-[#d6c3a0] bg-white px-3 py-2 text-sm">
          <option>Portail financeur</option>
          <option>Partage interne</option>
          <option>Courriel sécurisé</option>
        </select>
        {!actor ? <span className="text-xs font-bold text-amber-700">Un compte utilisateur identifié est requis pour valider.</span> : null}
      </div>

      <div className="mt-5 space-y-3">
        {rows.length ? rows.map((report) => {
          const state = stateOf(report);
          return (
            <article key={report.id} className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-4">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="font-black text-[#2f2415]">{report.title || report.id}</p>
                  <p className="text-xs text-[#8a7456]">Version {report.version_number || 1} · {String(report.generated_at || report.created_at || '').slice(0, 16).replace('T', ' ')} · {statusLabel[state] || state || 'Brouillon'}</p>
                  <p className="mt-1 text-sm text-[#6f6048]">{report.summary || 'Chiffres collectés depuis les sources métier.'}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {state === REPORT_STATES.PREVIEW ? <ActionButton icon={Check} disabled={!actor || busy === `${report.id}:validate`} onClick={() => saveTransition(report, 'validate')}>Valider</ActionButton> : null}
                  {state === REPORT_STATES.VALIDATED ? <ActionButton icon={LockKeyhole} disabled={busy === `${report.id}:freeze`} onClick={() => saveTransition(report, 'freeze')}>Geler</ActionButton> : null}
                  {state === REPORT_STATES.FROZEN ? <ActionButton icon={Send} disabled={busy === `${report.id}:publish`} onClick={() => saveTransition(report, 'publish')}>Publier</ActionButton> : null}
                  {[REPORT_STATES.FROZEN, REPORT_STATES.PUBLISHED].includes(state) ? <ActionButton icon={Archive} disabled={busy === `${report.id}:correct`} onClick={() => saveTransition(report, 'correct')}>Créer une correction</ActionButton> : null}
                </div>
              </div>
            </article>
          );
        }) : <p className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-sm text-[#8a7456]">Aucun rapport. Le premier aperçu sera calculé depuis les ventes validées, paiements, finances, stocks, tâches, alertes et preuves.</p>}
      </div>
    </section>
  );
}
