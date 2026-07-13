import { useMemo } from 'react';
import { ClipboardCheck, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { runVisionModuleAudit } from '../../services/visionModuleAuditEngine.js';
import { MODULE_REGISTRY } from '../../config/modules.config.js';

const tone = (status) => (status === 'ok' ? 'good' : status === 'bad' ? 'bad' : 'warn');

function Badge({ children, status = 'neutral' }) {
  const cls = status === 'good' ? 'border-positive bg-positive-bg text-positive' : status === 'bad' ? 'border-urgent bg-urgent-bg text-urgent' : status === 'warn' ? 'border-vigilance bg-vigilance-bg text-horizon-dark' : 'border-line bg-card text-slate';
  return <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${cls}`}>{children}</span>;
}

export default function VisionModuleAuditPanel({ dataMap = {}, onNavigate }) {
  const audit = useMemo(() => runVisionModuleAudit(dataMap), [dataMap]);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-line bg-white p-6 shadow-card">
        <p className="text-xs uppercase tracking-normal text-horizon-dark font-semibold">Audit vision 2026–2027</p>
        <h2 className="mt-1 text-xl font-semibold text-earth">Conformité module par module</h2>
        <p className="mt-2 text-sm text-slate">Analyse automatique : onglets cibles, données, cohérence des analyses, risques, interconnexions, écarts et améliorations.</p>
        <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-6">
          <div className="rounded-2xl border border-line bg-card p-4"><p className="text-xs text-slate">Score global</p><p className="text-xl font-semibold text-earth">{audit.globalScore}/100</p></div>
          <div className="rounded-2xl border border-line bg-card p-4"><p className="text-xs text-slate">Santé ERP</p><p className="text-xl font-semibold text-earth">{audit.healthScore}/100</p></div>
          <div className="rounded-2xl border border-positive bg-positive-bg p-4"><p className="text-xs text-positive">Conformes</p><p className="text-xl font-semibold text-positive">{audit.summary.ok}</p></div>
          <div className="rounded-2xl border border-vigilance bg-vigilance-bg p-4"><p className="text-xs text-horizon-dark">À valider</p><p className="text-xl font-semibold text-horizon-dark">{audit.summary.warn}</p></div>
          <div className="rounded-2xl border border-urgent bg-urgent-bg p-4"><p className="text-xs text-urgent">À corriger</p><p className="text-xl font-semibold text-urgent">{audit.summary.bad}</p></div>
          <div className="rounded-2xl border border-line bg-card p-4"><p className="text-xs text-slate">Issues IA</p><p className="text-xl font-semibold text-earth">{audit.summary.totalIssues}</p></div>
        </div>
      </section>

      {audit.modules.map((mod) => (
        <article key={mod.moduleId} className="rounded-3xl border border-line bg-card p-6 shadow-card">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h3 className="flex items-center gap-2 text-lg font-semibold text-earth">
                {mod.status === 'ok' ? <CheckCircle2 size={18} className="text-positive" /> : <AlertTriangle size={18} className="text-horizon-dark" />}
                {mod.label}
              </h3>
              <p className="mt-1 text-sm text-slate">{mod.tabsCount} onglets · {mod.findingsCount} finding(s) · {mod.risksCount} risque(s)</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge status={tone(mod.status)}>{mod.statusLabel} · {mod.score}/100</Badge>
              <button type="button" onClick={() => onNavigate?.(mod.moduleId)} className="rounded-xl border border-line bg-white px-3 py-2 text-xs font-semibold text-earth">Ouvrir module</button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">{mod.tabs.map((tab) => <Badge key={tab}>{tab}</Badge>)}</div>
          {mod.issues.length ? (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-normal text-slate">Incohérences / alertes</p>
              {mod.issues.slice(0, 5).map((issue) => (
                <div key={`${mod.moduleId}-${issue.title}`} className="rounded-xl border border-vigilance bg-vigilance-bg p-3 text-sm">
                  <b className="text-earth">{issue.title}</b>
                  <p className="text-xs text-horizon-dark">{issue.detail}</p>
                </div>
              ))}
            </div>
          ) : null}
          {mod.lostFeatures.length || mod.redundancies.length || mod.improvements.length ? (
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              {mod.lostFeatures.length ? <div className="rounded-xl border border-urgent bg-urgent-bg p-3 text-sm"><p className="font-semibold text-urgent">Manques</p><ul className="mt-1 list-disc pl-4 text-urgent">{mod.lostFeatures.map((x) => <li key={x}>{x}</li>)}</ul></div> : null}
              {mod.redundancies.length ? <div className="rounded-xl border border-line bg-white p-3 text-sm"><p className="font-semibold text-earth">Redondances</p><ul className="mt-1 list-disc pl-4 text-slate">{mod.redundancies.map((x) => <li key={x}>{x}</li>)}</ul></div> : null}
              {mod.improvements.length ? <div className="rounded-xl border border-line bg-white p-3 text-sm"><p className="font-semibold text-earth">Améliorations</p><ul className="mt-1 list-disc pl-4 text-slate">{mod.improvements.slice(0, 4).map((x) => <li key={x}>{x}</li>)}</ul></div> : null}
            </div>
          ) : null}
        </article>
      ))}

      <section className="rounded-3xl border border-line bg-white p-6 shadow-card">
        <h3 className="flex items-center gap-2 font-semibold text-earth"><ClipboardCheck size={18} /> Cartographie interconnexions</h3>
        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
          {Object.entries(audit.interconnectionMap).map(([event, targets]) => (
            <div key={event} className="rounded-xl border border-line bg-card p-3 text-sm">
              <b className="uppercase text-horizon-dark">{event}</b>
              <p className="text-slate">{targets.map((t) => MODULE_REGISTRY[t]?.label || t).join(' → ')}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
