import { AlertTriangle, Banknote, BriefcaseBusiness, CheckCircle2, Users } from 'lucide-react';
import { computeRhCostCenters, analyzeRhQuality } from '../services/rhCostCenterService';
import { fmtCurrency } from '../utils/format';

const moduleLabel = (key = '') => ({
  avicole: 'Avicole', animaux: 'Animaux', cultures: 'Cultures', stock: 'Stock', ventes: 'Ventes', clients: 'Clients', fournisseurs: 'Fournisseurs', sante: 'Santé', rh: 'RH', ferme: 'Ferme', investissements: 'Investissements', finances: 'Finances', comptabilite: 'Comptabilité',
}[key] || key);

function Card({ icon: Icon, label, value, hint, danger = false }) {
  return <div className={`rounded-2xl border p-4 ${danger ? 'border-red-200 bg-red-50' : 'border-[#eadcc2] bg-[#fffdf8]'}`}>
    <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-[#8a7456]"><Icon size={14} /> {label}</p>
    <p className={`mt-2 text-xl font-black ${danger ? 'text-red-600' : 'text-[#2f2415]'}`}>{value}</p>
    {hint ? <p className="mt-1 text-xs text-[#8a7456]">{hint}</p> : null}
  </div>;
}

export default function RHCostCenterPanel({ people = [], teams = [] }) {
  const costs = computeRhCostCenters({ people, teams });
  const quality = analyzeRhQuality({ people, teams });
  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
      <div>
        <p className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><BriefcaseBusiness size={20} /> Coûts RH par équipe & module</p>
        <p className="mt-1 text-sm text-[#8a7456]">Répartit la masse salariale sur les équipes et les modules pour préparer les marges réelles.</p>
      </div>
      <div className={`${quality.issueCount ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'} rounded-2xl border px-4 py-3 text-sm font-bold`}>{quality.issueCount ? `${quality.issueCount} point(s) RH à vérifier` : 'RH cohérente'}</div>
    </div>

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Card icon={Users} label="Actifs" value={costs.activeCount} />
      <Card icon={Banknote} label="Masse brute" value={fmtCurrency(costs.totals.brut)} />
      <Card icon={Banknote} label="Net mensuel" value={fmtCurrency(costs.totals.net)} />
      <Card icon={AlertTriangle} label="À corriger" value={quality.issueCount} danger={quality.issueCount > 0} />
    </div>

    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <div className="rounded-2xl border border-[#eadcc2] overflow-hidden">
        <div className="bg-[#fffdf8] px-4 py-3 border-b border-[#eadcc2]"><p className="font-bold text-[#2f2415]">Répartition par module</p></div>
        <table className="min-w-full text-sm"><thead><tr className="text-left text-xs uppercase text-[#8a7456] border-b border-[#eadcc2]"><th className="py-2 px-3">Module</th><th className="py-2 px-3">Personnes</th><th className="py-2 px-3">Coût mensuel</th><th className="py-2 px-3">Coût annuel</th></tr></thead><tbody>{costs.byModule.map((row) => <tr key={row.module} className="border-b border-[#f0e5d0]"><td className="py-3 px-3 font-bold text-[#2f2415]">{moduleLabel(row.module)}</td><td className="py-3 px-3">{row.people}</td><td className="py-3 px-3 font-bold">{fmtCurrency(row.cout_mensuel)}</td><td className="py-3 px-3">{fmtCurrency(row.cout_annuel)}</td></tr>)}{!costs.byModule.length ? <tr><td colSpan="4" className="py-4 text-center text-[#8a7456]">Aucun coût module.</td></tr> : null}</tbody></table>
      </div>
      <div className="rounded-2xl border border-[#eadcc2] overflow-hidden">
        <div className="bg-[#fffdf8] px-4 py-3 border-b border-[#eadcc2]"><p className="font-bold text-[#2f2415]">Répartition par équipe</p></div>
        <table className="min-w-full text-sm"><thead><tr className="text-left text-xs uppercase text-[#8a7456] border-b border-[#eadcc2]"><th className="py-2 px-3">Équipe</th><th className="py-2 px-3">Personnes</th><th className="py-2 px-3">Modules</th><th className="py-2 px-3">Net</th></tr></thead><tbody>{costs.byTeam.map((row) => <tr key={row.id} className="border-b border-[#f0e5d0]"><td className="py-3 px-3 font-bold text-[#2f2415]">{row.name}</td><td className="py-3 px-3">{row.people}</td><td className="py-3 px-3 text-xs text-[#8a7456]">{row.modules.map(moduleLabel).join(', ')}</td><td className="py-3 px-3 font-bold">{fmtCurrency(row.net)}</td></tr>)}{!costs.byTeam.length ? <tr><td colSpan="4" className="py-4 text-center text-[#8a7456]">Aucune équipe.</td></tr> : null}</tbody></table>
      </div>
    </div>

    {quality.issueCount ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3"><p className="font-bold text-amber-800 mb-2"><AlertTriangle size={15} className="inline" /> Points RH à vérifier</p><div className="flex flex-wrap gap-2">{quality.issues.slice(0, 10).map((issue, index) => <span key={`${issue.id}-${index}`} className="rounded-full bg-white border border-amber-200 px-3 py-1 text-xs font-bold text-amber-700">{issue.type} · {issue.person?.nom || issue.team?.name || issue.id}</span>)}</div></div> : <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 size={16} className="inline" /> Les équipes, modules et rémunérations sont cohérents.</div>}
  </section>;
}
