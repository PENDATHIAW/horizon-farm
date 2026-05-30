import { BarChart3, CheckCircle2, Database, ShieldAlert } from 'lucide-react';
import { auditManifest } from '../audit/auditManifest';
import { moduleAuditChecklist } from '../audit/moduleAuditChecklist';

const arr = (v) => Array.isArray(v) ? v : [];
const priorityClass = (priority = '') => {
  if (priority === 'critique') return 'border-red-200 bg-red-50 text-red-700';
  if (priority === 'haute') return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-[#eadcc2] bg-[#fffdf8] text-[#8a7456]';
};

const manifestByModule = Object.fromEntries(auditManifest.map((item) => [item.module, item]));

function coverageScore(item, manifest, dataMap = {}) {
  const checklistCount = arr(item.open).length + arr(item.verify).length + arr(item.compare).length + arr(item.anomalies).length;
  const expectedData = arr(manifest?.data);
  const dataPresent = expectedData.filter((key) => arr(dataMap?.[key]).length > 0).length;
  const dataScore = expectedData.length ? Math.round((dataPresent / expectedData.length) * 100) : 100;
  return { checklistCount, expectedData, dataPresent, dataScore };
}

export default function AuditCoverageMatrixPanel({ dataMap = {} }) {
  const totalModules = moduleAuditChecklist.length;
  const criticalModules = moduleAuditChecklist.filter((item) => item.priority === 'critique').length;
  const totalChecks = moduleAuditChecklist.reduce((sum, item) => sum + arr(item.open).length + arr(item.verify).length + arr(item.compare).length + arr(item.anomalies).length, 0);
  const modulesWithoutManifest = moduleAuditChecklist.filter((item) => !manifestByModule[item.module]).map((item) => item.module);

  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-5">
    <div>
      <p className="inline-flex items-center gap-2 rounded-full border border-[#eadcc2] bg-[#fffdf8] px-3 py-1 text-xs font-black text-[#8a7456]"><BarChart3 size={14} /> Couverture d’audit</p>
      <h2 className="mt-3 text-2xl font-black text-[#2f2415]">Matrice de couverture module par module</h2>
      <p className="mt-1 text-sm text-[#8a7456]">Cette matrice vérifie que l’audit n’est pas superficiel : chaque module doit avoir des contrôles, des données attendues et des comparaisons inter-modules.</p>
    </div>

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Mini icon={CheckCircle2} label="Modules couverts" value={totalModules} />
      <Mini icon={ShieldAlert} label="Critiques" value={criticalModules} danger />
      <Mini icon={BarChart3} label="Points de contrôle" value={totalChecks} />
      <Mini icon={Database} label="Sans manifest" value={modulesWithoutManifest.length} danger={modulesWithoutManifest.length > 0} />
    </div>

    {modulesWithoutManifest.length ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
      <b>À aligner :</b> {modulesWithoutManifest.join(', ')} doivent être alignés avec le référentiel technique auditManifest pour éviter les angles morts.
    </div> : null}

    <div className="overflow-x-auto rounded-2xl border border-[#eadcc2]">
      <table className="min-w-full text-sm">
        <thead className="bg-[#fffdf8] text-[#8a7456]">
          <tr>
            <th className="text-left p-3">Module</th>
            <th className="text-left p-3">Priorité</th>
            <th className="text-left p-3">Contrôles</th>
            <th className="text-left p-3">Données attendues</th>
            <th className="text-left p-3">Données présentes</th>
            <th className="text-left p-3">Couverture données</th>
          </tr>
        </thead>
        <tbody>
          {moduleAuditChecklist.map((item) => {
            const manifest = manifestByModule[item.module];
            const score = coverageScore(item, manifest, dataMap);
            return <tr key={item.module} className="border-t border-[#eadcc2] bg-white">
              <td className="p-3 font-black text-[#2f2415]">{item.module}</td>
              <td className="p-3"><span className={`rounded-full border px-2 py-1 text-xs font-black ${priorityClass(item.priority)}`}>{item.priority}</span></td>
              <td className="p-3 text-[#2f2415]">{score.checklistCount}</td>
              <td className="p-3 text-[#8a7456]">{score.expectedData.length ? score.expectedData.join(', ') : '—'}</td>
              <td className="p-3 text-[#2f2415]">{score.dataPresent}/{score.expectedData.length || 0}</td>
              <td className="p-3 font-black text-[#2f2415]">{score.dataScore}%</td>
            </tr>;
          })}
        </tbody>
      </table>
    </div>
  </section>;
}

function Mini({ icon: Icon, label, value, danger = false }) {
  return <div className={`rounded-2xl border p-4 ${danger ? 'border-red-200 bg-red-50' : 'border-[#eadcc2] bg-[#fffdf8]'}`}>
    <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-[#8a7456]"><Icon size={14} /> {label}</p>
    <p className={`mt-2 text-lg font-black ${danger ? 'text-red-600' : 'text-[#2f2415]'}`}>{value}</p>
  </div>;
}
