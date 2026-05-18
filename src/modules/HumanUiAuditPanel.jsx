import { FileText, MousePointerClick, Route, Sparkles, Wand2 } from 'lucide-react';
import { humanUiAuditRules, humanUiAuditStepsByModule } from '../audit/humanUiAuditChecklist';
import { formSimulationScenarios } from '../audit/formSimulationScenarios';
import { auditImprovementRules } from '../audit/auditImprovementRules';
import { humanAiTesterMasterPrompt } from '../audit/humanAiTesterMasterPrompt';

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

function SimulationCard({ module }) {
  return <article className="rounded-2xl border border-[#eadcc2] bg-white p-4 space-y-3">
    <div className="flex items-start justify-between gap-3">
      <div>
        <h4 className="font-black text-[#2f2415]">{module.module}</h4>
        <p className="mt-1 text-xs text-[#8a7456]">{module.objective}</p>
      </div>
      <span className={`rounded-full border px-2 py-1 text-xs font-black ${severityClass(module.priority)}`}>{module.priority}</span>
    </div>
    <div className="space-y-3">
      {module.scenarios.map((scenario) => <div key={scenario.id} className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3">
        <p className="font-black text-[#2f2415]">{scenario.id} · {scenario.title}</p>
        <p className="mt-1 text-xs font-bold text-[#8a7456]">Type : {scenario.type}</p>
        <div className="mt-3 grid grid-cols-1 gap-2">
          <MiniList title="Étapes à simuler" items={scenario.steps} />
          <MiniList title="Champs à contrôler" items={scenario.requiredFields} />
          <MiniList title="Saisies invalides à tenter" items={scenario.invalidInputs} />
          <MiniList title="Améliorations attendues" items={scenario.expectedImprovements} />
        </div>
      </div>)}
    </div>
  </article>;
}

export default function HumanUiAuditPanel() {
  const promptLines = humanAiTesterMasterPrompt.split('\n').filter(Boolean).slice(0, 10);
  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-5">
    <div>
      <p className="inline-flex items-center gap-2 rounded-full border border-[#eadcc2] bg-[#fffdf8] px-3 py-1 text-xs font-black text-[#8a7456]"><Route size={14} /> Parcours humain UI complet</p>
      <h2 className="mt-3 text-2xl font-black text-[#2f2415]">Testeur humain AI : parcours, formulaires et améliorations</h2>
      <p className="mt-1 text-sm text-[#8a7456]">Le testeur doit naviguer, remplir les formulaires, tenter des saisies invalides, détecter les anomalies et proposer des corrections + améliorations concrètes.</p>
    </div>

    <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4">
      <h3 className="font-black text-emerald-800 flex items-center gap-2"><FileText size={18} /> Prompt maître chargé</h3>
      <p className="mt-1 text-sm text-emerald-700">Ce prompt force l’agent à simuler les formulaires, produire anomalies.json, improvements.json, coverage-matrix.json et un plan de retest.</p>
      <ul className="mt-3 space-y-1 text-xs text-emerald-800">
        {promptLines.map((line) => <li key={line} className="font-semibold">{line}</li>)}
      </ul>
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

    <div className="rounded-3xl border border-[#eadcc2] bg-[#fffdf8] p-4">
      <h3 className="font-black text-[#2f2415] flex items-center gap-2"><Sparkles size={18} /> Simulations de remplissage obligatoires</h3>
      <p className="mt-1 text-sm text-[#8a7456]">Un module avec formulaire n’est pas considéré testé tant qu’un cas normal, invalide, limite ou régression métier n’a pas été simulé.</p>
      <div className="mt-4 grid grid-cols-1 xl:grid-cols-2 gap-3">
        {formSimulationScenarios.map((module) => <SimulationCard key={module.module} module={module} />)}
      </div>
    </div>

    <div className="rounded-3xl border border-[#eadcc2] bg-white p-4">
      <h3 className="font-black text-[#2f2415] flex items-center gap-2"><Sparkles size={18} /> Règles d’amélioration obligatoires</h3>
      <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
        {auditImprovementRules.map((rule) => <div key={rule.id} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="font-black text-[#2f2415]">{rule.title}</p>
            <span className={`rounded-full border px-2 py-1 text-xs font-black ${severityClass(rule.severity)}`}>{rule.severity}</span>
          </div>
          <p className="mt-2 text-sm text-[#8a7456]">{rule.rule}</p>
          <p className="mt-2 text-sm font-bold text-emerald-700">Amélioration : {rule.improvement}</p>
        </div>)}
      </div>
    </div>
  </section>;
}
