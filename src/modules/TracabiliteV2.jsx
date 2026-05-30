import ActionTraceHealth from './ActionTraceHealth.jsx';
import Tracabilite from './Tracabilite.jsx';
import { buildTraceCoverage } from '../utils/traceabilityWorkflows';
import { AlertTriangle, CheckCircle2, ExternalLink, GitBranch } from 'lucide-react';
import Btn from '../components/Btn';

export default function TracabiliteV2(props) {
  const coverage = buildTraceCoverage(props.events || []);
  return <div className="space-y-6">
    <ActionTraceHealth
      tasks={props.tasks || []}
      alertes={props.alertes || []}
      events={props.events || []}
      online={props.online ?? true}
      onNavigate={props.onNavigate}
    />
    <TraceCoveragePanel coverage={coverage} onNavigate={props.onNavigate} />
    <Tracabilite {...props} />
  </div>;
}

function TraceCoveragePanel({ coverage, onNavigate }) {
  const missing = coverage.missingSource.slice(0, 4);
  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
      <div>
        <p className="text-xs uppercase tracking-widest text-[#8a7456] font-black flex items-center gap-2"><GitBranch size={15} /> Qualité des traces</p>
        <h3 className="text-xl font-black text-[#2f2415] mt-1">Chaque fait important doit avoir une source</h3>
        <p className="text-sm text-[#8a7456] mt-1">Ventes, paiements, soins, récoltes, pertes et actions admin restent utiles seulement si l’on peut revenir à la fiche d’origine.</p>
      </div>
      <div className={`rounded-2xl border p-3 text-sm ${coverage.sensitiveMissing.length ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
        {coverage.sensitiveMissing.length ? <AlertTriangle size={15} className="inline" /> : <CheckCircle2 size={15} className="inline" />} {coverage.coverageRate}% sourcées
      </div>
    </div>
    {missing.length ? <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
      {missing.map((event) => <div key={event.id || `${event.event_type}-${event.title}`} className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        <p className="font-black text-[#2f2415]">{event.title}</p>
        <p className="text-xs mt-1">{event.module_source} · source à compléter</p>
      </div>)}
    </div> : <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">Les faits importants visibles ont une source exploitable.</div>}
    <div className="flex justify-end"><Btn small variant="outline" onClick={() => onNavigate?.('sync_activity')}><ExternalLink size={14} /> Vérifier anomalies</Btn></div>
  </section>;
}
