import { ClipboardCheck, SearchCheck } from 'lucide-react';
import { moduleAuditChecklist } from '../audit/moduleAuditChecklist';

const badgeClass = (priority = '') => {
  if (priority === 'critique') return 'border-red-200 bg-red-50 text-red-700';
  if (priority === 'haute') return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-[#eadcc2] bg-[#fffdf8] text-[#8a7456]';
};

function ListBlock({ title, items = [] }) {
  return <div className="rounded-2xl border border-[#eadcc2] bg-white p-3">
    <p className="text-xs uppercase tracking-wide font-black text-[#8a7456]">{title}</p>
    <ul className="mt-2 space-y-1 text-sm text-[#2f2415]">
      {items.map((item) => <li key={item} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#c9a96a]" /> <span>{item}</span></li>)}
    </ul>
  </div>;
}

export default function ModuleAuditChecklistPanel() {
  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-5">
    <div>
      <p className="inline-flex items-center gap-2 rounded-full border border-[#eadcc2] bg-[#fffdf8] px-3 py-1 text-xs font-black text-[#8a7456]"><ClipboardCheck size={14} /> Référentiel d’audit renforcé</p>
      <h2 className="mt-3 text-2xl font-black text-[#2f2415]">Ce que l’Assistant ERP doit auditer module par module</h2>
      <p className="mt-1 text-sm text-[#8a7456]">Chaque module a maintenant une grille claire : ouvrir, vérifier, comparer et détecter. Ce référentiel doit guider le parcours humain et l’audit automatique.</p>
    </div>

    <div className="grid grid-cols-1 gap-4">
      {moduleAuditChecklist.map((item) => <article key={item.module} className="rounded-3xl border border-[#eadcc2] bg-[#fffdf8] p-4">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-[#2f2415] flex items-center gap-2"><SearchCheck size={18} /> {item.module}</h3>
            <p className="mt-1 text-sm text-[#8a7456]">Audit détaillé attendu pour ce module.</p>
          </div>
          <span className={`rounded-full border px-3 py-1 text-xs font-black ${badgeClass(item.priority)}`}>Priorité {item.priority}</span>
        </div>
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
          <ListBlock title="À ouvrir / tester" items={item.open} />
          <ListBlock title="À vérifier" items={item.verify} />
          <ListBlock title="À comparer avec" items={item.compare} />
          <ListBlock title="Anomalies à détecter" items={item.anomalies} />
        </div>
      </article>)}
    </div>
  </section>;
}
