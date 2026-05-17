import { MousePointerClick, Route, Wand2 } from 'lucide-react';
import { humanUiAuditRules, humanUiAuditStepsByModule } from '../audit/humanUiAuditChecklist';

const severityClass = (severity = '') => {
  if (severity === 'critique') return 'border-red-200 bg-red-50 text-red-700';
  if (severity === 'haute') return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-[#eadcc2] bg-[#fffdf8] text-[#8a7456]';
};

function MiniList({ title, items = [] }) {
  return <div className="rounded-2xl border border-[#eadcc2] bg-white p-3">
    <p className="text-xs uppercase tracking-wide font-black text-[#8a7456]">{title}</p>
    <ul className="mt-2 space-y-1 text-sm text-[#2f2415]">
      {items.map((item) => <li key={item} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#c9a96a]" /> <span>{item}</span></li>)}
    </ul>
  </div>;
}

export default function HumanUiAuditPanel() {
  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-5">
    <div>
      <p className="inline-flex items-center gap-2 rounded-full border border-[#eadcc2] bg-[#fffdf8] px-3 py-1 text-xs font-black text-[#8a7456]"><Route size={14} /> Parcours humain UI complet</p>
      <h2 className="mt-3 text-2xl font-black text-[#2f2415]">Ce que l’audit doit vérifier visuellement dans chaque module</h2>
      <p className="mt-1 text-sm text-[#8a7456]">Le testeur doit naviguer de haut en bas, cliquer les boutons, ouvrir les onglets, contrôler les graphiques et distinguer corrections obligatoires et améliorations.</p>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      {humanUiAuditRules.map((rule) => <article key={rule.id} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-black text-[#2f2415] flex items-center gap-2"><MousePointerClick size={16} /> {rule.title}</h3>
          <span className={`rounded-full border px-2 py-1 text-xs font-black ${severityClass(rule.severity)}`}>{rule.severity}</span>
        </div>
        <p className="mt-2 text-sm text-[#8a7456]">{rule.rule}</p>
        <div className="mt-3 grid grid-cols-1 gap-3">
          <MiniList title="À contrôler" items={rule.checks} />
          <MiniList title="Anomalies à détecter" items={rule.anomalies || []} />
        </div>
      </article>)}
    </div>

    <div className="rounded-3xl border border-[#eadcc2] bg-[#fffdf8] p-4">
      <h3 className="font-black text-[#2f2415] flex items-center gap-2"><Wand2 size={18} /> Parcours spécifiques à ne jamais oublier</h3>
      <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
        {Object.entries(humanUiAuditStepsByModule).map(([module, steps]) => <MiniList key={module} title={module} items={steps} />)}
      </div>
    </div>
  </section>;
}
