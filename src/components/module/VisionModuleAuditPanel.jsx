import { useMemo } from 'react';
import { ClipboardCheck, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { runVisionModuleAudit } from '../../services/visionModuleAuditEngine.js';
import { MODULE_REGISTRY } from '../../config/modules.config.js';

const tone = (status) => (status === 'ok' ? 'good' : status === 'bad' ? 'bad' : 'warn');

function Badge({ children, status = 'neutral' }) {
  const cls = status === 'good' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : status === 'bad' ? 'border-red-200 bg-red-50 text-red-700' : status === 'warn' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-[#eadcc2] bg-[#fffdf8] text-[#8a7456]';
  return <span className={`rounded-full border px-3 py-1 text-xs font-black ${cls}`}>{children}</span>;
}

export default function VisionModuleAuditPanel({ dataMap = {}, onNavigate }) {
  const audit = useMemo(() => runVisionModuleAudit(dataMap), [dataMap]);

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm">
        <p className="text-xs uppercase tracking-[0.25em] text-[#9a6b12] font-black">Audit vision 2026–2027</p>
        <h2 className="mt-1 text-xl font-black text-[#2f2415]">Conformité module par module</h2>
        <p className="mt-2 text-sm text-[#8a7456]">Analyse automatique : onglets cibles, données, cohérence IA, risques, interconnexions, écarts et améliorations.</p>
        <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-6">
          <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4"><p className="text-xs text-[#8a7456]">Score global</p><p className="text-xl font-black text-[#2f2415]">{audit.globalScore}/100</p></div>
          <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4"><p className="text-xs text-[#8a7456]">Santé ERP</p><p className="text-xl font-black text-[#2f2415]">{audit.healthScore}/100</p></div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><p className="text-xs text-emerald-700">Conformes</p><p className="text-xl font-black text-emerald-800">{audit.summary.ok}</p></div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><p className="text-xs text-amber-700">À valider</p><p className="text-xl font-black text-amber-800">{audit.summary.warn}</p></div>
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4"><p className="text-xs text-red-700">À corriger</p><p className="text-xl font-black text-red-800">{audit.summary.bad}</p></div>
          <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4"><p className="text-xs text-[#8a7456]">Issues IA</p><p className="text-xl font-black text-[#2f2415]">{audit.summary.totalIssues}</p></div>
        </div>
      </section>

      {audit.modules.map((mod) => (
        <article key={mod.moduleId} className="rounded-3xl border border-[#d6c3a0] bg-[#fffdf8] p-5 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h3 className="flex items-center gap-2 text-lg font-black text-[#2f2415]">
                {mod.status === 'ok' ? <CheckCircle2 size={18} className="text-emerald-600" /> : <AlertTriangle size={18} className="text-amber-600" />}
                {mod.label}
              </h3>
              <p className="mt-1 text-sm text-[#8a7456]">{mod.tabsCount} onglets · {mod.findingsCount} finding(s) · {mod.risksCount} risque(s)</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge status={tone(mod.status)}>{mod.statusLabel} · {mod.score}/100</Badge>
              <button type="button" onClick={() => onNavigate?.(mod.moduleId)} className="rounded-xl border border-[#d6c3a0] bg-white px-3 py-1.5 text-xs font-black text-[#2f2415]">Ouvrir module</button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">{mod.tabs.map((tab) => <Badge key={tab}>{tab}</Badge>)}</div>
          {mod.issues.length ? (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-black uppercase tracking-wide text-[#8a7456]">Incohérences / alertes</p>
              {mod.issues.slice(0, 5).map((issue) => (
                <div key={`${mod.moduleId}-${issue.title}`} className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">
                  <b className="text-[#2f2415]">{issue.title}</b>
                  <p className="text-xs text-amber-800">{issue.detail}</p>
                </div>
              ))}
            </div>
          ) : null}
          {mod.lostFeatures.length || mod.redundancies.length || mod.improvements.length ? (
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              {mod.lostFeatures.length ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm"><p className="font-black text-red-800">Manques</p><ul className="mt-1 list-disc pl-4 text-red-700">{mod.lostFeatures.map((x) => <li key={x}>{x}</li>)}</ul></div> : null}
              {mod.redundancies.length ? <div className="rounded-xl border border-[#eadcc2] bg-white p-3 text-sm"><p className="font-black text-[#2f2415]">Redondances</p><ul className="mt-1 list-disc pl-4 text-[#8a7456]">{mod.redundancies.map((x) => <li key={x}>{x}</li>)}</ul></div> : null}
              {mod.improvements.length ? <div className="rounded-xl border border-[#eadcc2] bg-white p-3 text-sm"><p className="font-black text-[#2f2415]">Améliorations</p><ul className="mt-1 list-disc pl-4 text-[#8a7456]">{mod.improvements.slice(0, 4).map((x) => <li key={x}>{x}</li>)}</ul></div> : null}
            </div>
          ) : null}
        </article>
      ))}

      <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm">
        <h3 className="flex items-center gap-2 font-black text-[#2f2415]"><ClipboardCheck size={18} /> Cartographie interconnexions</h3>
        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
          {Object.entries(audit.interconnectionMap).map(([event, targets]) => (
            <div key={event} className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3 text-sm">
              <b className="uppercase text-[#9a6b12]">{event}</b>
              <p className="text-[#8a7456]">{targets.map((t) => MODULE_REGISTRY[t]?.label || t).join(' → ')}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
