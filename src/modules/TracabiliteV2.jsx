import ActionTraceHealth from './ActionTraceHealth.jsx';
import Tracabilite from './Tracabilite.jsx';
import AdminTraceCoveragePanel from './AdminTraceCoveragePanel.jsx';
import { buildTraceCoverage } from '../utils/traceabilityWorkflows';
import { mergeAuditLogsIntoTraceFeed } from '../services/traceAuditFeedService';
import { AlertTriangle, CheckCircle2, ExternalLink, GitBranch } from 'lucide-react';
import Btn from '../components/Btn';
import { useMemo } from 'react';

export default function TracabiliteV2(props) {
  const mergedEvents = useMemo(
    () => mergeAuditLogsIntoTraceFeed(props.events || [], props.auditLogs || []),
    [props.events, props.auditLogs],
  );
  const coverage = buildTraceCoverage(mergedEvents);
  return <div className="space-y-6">
    <ActionTraceHealth
      tasks={props.tasks || []}
      alertes={props.alertes || []}
      events={mergedEvents}
      online={props.online ?? true}
      onNavigate={props.onNavigate}
    />
    <AdminTraceCoveragePanel events={mergedEvents} auditLogs={props.auditLogs || []} onNavigate={props.onNavigate} />
    <TraceCoveragePanel coverage={coverage} onNavigate={props.onNavigate} />
    <Tracabilite {...props} events={mergedEvents} />
  </div>;
}

function TraceCoveragePanel({ coverage, onNavigate }) {
  const missing = coverage.missingSource.slice(0, 4);
  return <section className="rounded-3xl border border-line bg-white p-6 shadow-card space-y-4">
    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
      <div>
        <p className="text-xs uppercase tracking-normal text-slate font-semibold flex items-center gap-2"><GitBranch size={15} /> Qualité des traces</p>
        <h3 className="text-xl font-semibold text-earth mt-1">Chaque fait important doit avoir une source</h3>
        <p className="text-sm text-slate mt-1">Ventes, paiements, soins, récoltes, pertes et actions admin restent utiles seulement si l’on peut revenir à la fiche d’origine.</p>
      </div>
      <div className={`rounded-2xl border p-3 text-sm ${coverage.sensitiveMissing.length ? 'border-vigilance bg-vigilance-bg text-horizon-dark' : 'border-positive bg-positive-bg text-positive'}`}>
        {coverage.sensitiveMissing.length ? <AlertTriangle size={15} className="inline" /> : <CheckCircle2 size={15} className="inline" />} {coverage.coverageRate}% sourcées
      </div>
    </div>
    {missing.length ? <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
      {missing.map((event) => <div key={event.id || `${event.event_type}-${event.title}`} className="rounded-xl border border-vigilance bg-vigilance-bg p-3 text-sm text-horizon-dark">
        <p className="font-semibold text-earth">{event.title}</p>
        <p className="text-xs mt-1">{event.module_source} · source à compléter</p>
      </div>)}
    </div> : <div className="rounded-xl border border-positive bg-positive-bg p-3 text-sm text-positive">Les faits importants visibles ont une source exploitable.</div>}
    <div className="flex justify-end"><Btn small variant="outline" onClick={() => onNavigate?.('sync_activity')}><ExternalLink size={14} /> Vérifier anomalies</Btn></div>
  </section>;
}
