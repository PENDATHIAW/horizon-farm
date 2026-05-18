import { AlertTriangle, CheckCircle2, ShieldCheck, Syringe, TrendingUp } from 'lucide-react';
import { fmtCurrency, fmtNumber, toNumber } from '../utils/format';

const arr = (value) => Array.isArray(value) ? value : [];
const lower = (value) => String(value || '').trim().toLowerCase();
const eventDate = (row = {}) => row.date || row.date_soin || row.date_vaccin || row.created_at || row.updated_at || row.next_due_date || row.prevue || row.effectuee;
const amount = (row = {}) => toNumber(row.montant ?? row.amount ?? row.cout ?? row.cost ?? row.cout_total ?? row.total_cost ?? row.prix ?? 0);
const status = (row = {}) => lower(row.statut || row.status || row.etat);
const severity = (row = {}) => lower(row.severity || row.gravite || row.priority || row.priorite);
const typeText = (row = {}) => lower(`${row.type || ''} ${row.type_intervention || ''} ${row.category || ''} ${row.categorie || ''} ${row.nom || ''} ${row.name || ''} ${row.description || ''}`);
const impactCode = (row = {}) => String(row.impact_business_code || '').trim();
const IMPACT_LABELS = {
  aucun_impact: 'Aucun impact business immédiat',
  perte_evitee: 'Perte évitée / mortalité réduite',
  risque_mortalite: 'Risque mortalité à surveiller',
  croissance_protegee: 'Croissance / prise de poids protégée',
  ponte_protegee: 'Ponte / production œufs protégée',
  vente_reportee: 'Vente reportée ou bloquée',
  cout_sante_direct: 'Coût santé direct à imputer',
  stock_sante_consomme: 'Stock santé consommé',
  'biosécurité_renforcee': 'Biosécurité renforcée',
  alerte_finance_objectifs: 'Impact à suivre en Finance / Objectifs',
};
const impactLabel = (row = {}) => row.impact_business_label || IMPACT_LABELS[impactCode(row)] || 'Non qualifié';
const isPriorityImpact = (row = {}) => ['risque_mortalite', 'vente_reportee', 'alerte_finance_objectifs'].includes(impactCode(row));
const isProtectedImpact = (row = {}) => ['perte_evitee', 'croissance_protegee', 'ponte_protegee', 'biosécurité_renforcee'].includes(impactCode(row));
const isVaccine = (row = {}) => typeText(row).includes('vaccin') || typeText(row).includes('rappel');
const isBiosecurity = (row = {}) => typeText(row).includes('bio') || typeText(row).includes('désinfection') || typeText(row).includes('desinfection') || typeText(row).includes('nettoyage');
const isLate = (row = {}) => ['retard', 'en_retard', 'en retard', 'overdue'].includes(status(row)) || (row.prevue && !row.effectuee && new Date(row.prevue) < new Date());
const isDone = (row = {}) => ['termine', 'terminé', 'fait', 'done', 'realise', 'réalisé', 'complete', 'completed'].includes(status(row));
const isCritical = (row = {}) => ['urgence', 'critique', 'critical', 'high'].includes(severity(row)) || isLate(row) || isPriorityImpact(row);
const targetCount = (row = {}) => toNumber(row.nombre_cibles ?? row.target_count ?? row.animaux_count ?? row.lots_count ?? row.quantity ?? row.quantite ?? 1) || 1;

function asDate(value) { const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? null : parsed; }
function monthKey(value) { const date = asDate(value); if (!date) return 'Sans date'; return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; }
function monthLabel(key) { if (key === 'Sans date') return key; const [year, month] = key.split('-'); return `${month}/${String(year).slice(-2)}`; }
function ensure(map, key) { if (!map.has(key)) map.set(key, { key, mois: monthLabel(key), cout_vaccins: 0, cout_soins: 0, cout_biosecurite: 0, total_couts: 0, soins: 0, vaccins: 0, bios: 0, retards: 0, critiques: 0, cibles: 0, conformite: 0, impacts_prioritaires: 0, impacts_protection: 0, impact_non_qualifie: 0 }); return map.get(key); }
function buildMonthly(rows = []) {
  const map = new Map();
  arr(rows).forEach((event) => {
    const bucket = ensure(map, monthKey(eventDate(event)));
    const cost = amount(event);
    if (isVaccine(event)) { bucket.cout_vaccins += cost; bucket.vaccins += 1; }
    else if (isBiosecurity(event)) { bucket.cout_biosecurite += cost; bucket.bios += 1; }
    else { bucket.cout_soins += cost; bucket.soins += 1; }
    bucket.total_couts += cost;
    if (isLate(event)) bucket.retards += 1;
    if (isCritical(event)) bucket.critiques += 1;
    if (isPriorityImpact(event)) bucket.impacts_prioritaires += 1;
    if (isProtectedImpact(event)) bucket.impacts_protection += 1;
    if (!impactCode(event) && !event.impact_business_label) bucket.impact_non_qualifie += 1;
    bucket.cibles += targetCount(event);
  });
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key)).map((row) => {
    const totalActions = row.soins + row.vaccins + row.bios;
    const doneOrNotLate = Math.max(0, totalActions - row.retards);
    return { ...row, conformite: totalActions ? Number(((doneOrNotLate / totalActions) * 100).toFixed(1)) : 0 };
  });
}
function topImpacts(rows = []) {
  const map = new Map();
  arr(rows).forEach((row) => {
    const name = impactLabel(row);
    if (!name || name === 'Non qualifié') return;
    map.set(name, (map.get(name) || 0) + 1);
  });
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
}
function Metric({ icon: Icon, label, value, hint, danger = false }) {
  return <div className={`rounded-2xl border p-4 ${danger ? 'border-red-200 bg-red-50 text-red-700' : 'border-[#eadcc2] bg-[#fffdf8] text-[#7d6a4a]'}`}><Icon size={17} /><p className="mt-2 text-xl font-black text-[#2f2415]">{value}</p><p className="font-bold text-[#2f2415]">{label}</p>{hint ? <p className="mt-1 text-xs">{hint}</p> : null}</div>;
}
function Bar({ label, value, max, hint }) {
  const pct = max > 0 ? Math.max(3, Math.min(100, (value / max) * 100)) : 0;
  return <div className="space-y-1"><div className="flex items-center justify-between gap-3 text-xs"><span className="font-bold text-[#2f2415]">{label}</span><span className="text-[#8a7456]">{hint || fmtNumber(value)}</span></div><div className="h-3 rounded-full bg-[#f2eadb] overflow-hidden"><div className="h-full rounded-full bg-[#c9a96a]" style={{ width: `${pct}%` }} /></div></div>;
}
function EvolutionCharts({ monthly = [] }) {
  const maxCost = Math.max(...monthly.map((row) => row.total_couts), 0);
  const maxActions = Math.max(...monthly.map((row) => row.soins + row.vaccins + row.bios), 0);
  const maxImpacts = Math.max(...monthly.map((row) => row.impacts_prioritaires + row.impacts_protection + row.impact_non_qualifie), 0);
  return <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
    <div className="rounded-2xl border border-[#d6c3a0] bg-white p-4 space-y-3"><p className="font-black text-[#2f2415]">Graphe des coûts santé</p>{monthly.length ? monthly.map((row) => <Bar key={`cost-${row.key}`} label={row.mois} value={row.total_couts} max={maxCost} hint={fmtCurrency(row.total_couts)} />) : <p className="text-sm text-[#8a7456]">Aucune donnée à afficher.</p>}</div>
    <div className="rounded-2xl border border-[#d6c3a0] bg-white p-4 space-y-3"><p className="font-black text-[#2f2415]">Graphe des actions santé</p>{monthly.length ? monthly.map((row) => <Bar key={`actions-${row.key}`} label={row.mois} value={row.soins + row.vaccins + row.bios} max={maxActions} hint={`${row.soins + row.vaccins + row.bios} action(s) · ${row.retards} retard(s)`} />) : <p className="text-sm text-[#8a7456]">Aucune donnée à afficher.</p>}</div>
    <div className="rounded-2xl border border-[#d6c3a0] bg-white p-4 space-y-3"><p className="font-black text-[#2f2415]">Impacts business santé</p>{monthly.length ? monthly.map((row) => <Bar key={`impact-${row.key}`} label={row.mois} value={row.impacts_prioritaires + row.impacts_protection + row.impact_non_qualifie} max={maxImpacts} hint={`${row.impacts_protection} protégé(s) · ${row.impacts_prioritaires} à suivre`} />) : <p className="text-sm text-[#8a7456]">Aucune donnée à afficher.</p>}</div>
  </div>;
}
function MonthlyLine({ row }) {
  return <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4"><div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div><p className="font-black text-[#2f2415]">{row.mois}</p><p className="mt-1 text-xs text-[#8a7456]">{row.soins} soin(s) · {row.vaccins} vaccin(s) · {row.bios} biosécurité</p></div><div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs text-[#7d6a4a]"><span><b className="block text-[#2f2415]">{fmtCurrency(row.total_couts)}</b> Coût</span><span><b className={row.retards ? 'block text-red-600' : 'block text-emerald-700'}>{row.retards}</b> Retards</span><span><b className={row.critiques ? 'block text-red-600' : 'block text-emerald-700'}>{row.critiques}</b> Urgences</span><span><b className="block text-emerald-700">{row.impacts_protection}</b> Impacts protégés</span><span><b className="block text-[#2f2415]">{row.conformite}%</b> Suivi</span></div></div></div>;
}
export default function SanteEvolution({ rows = [], onNavigate }) {
  const safeRows = arr(rows);
  const monthly = buildMonthly(safeRows).slice(-8);
  const totalCost = safeRows.reduce((sum, row) => sum + amount(row), 0);
  const late = safeRows.filter(isLate).length;
  const critical = safeRows.filter(isCritical).length;
  const done = safeRows.filter(isDone).length;
  const vaccines = safeRows.filter(isVaccine).length;
  const bios = safeRows.filter(isBiosecurity).length;
  const actions = safeRows.length;
  const targets = safeRows.reduce((sum, row) => sum + targetCount(row), 0);
  const conformance = actions ? Number((((actions - late) / actions) * 100).toFixed(1)) : 0;
  const priorityImpacts = safeRows.filter(isPriorityImpact).length;
  const protectedImpacts = safeRows.filter(isProtectedImpact).length;
  const missingImpact = safeRows.filter((row) => !impactCode(row) && !row.impact_business_label).length;
  const impacts = topImpacts(safeRows);
  const priority = critical > 0 || late > 0 || priorityImpacts > 0 ? { module: 'sante', label: 'Traiter les retards/impacts santé', icon: AlertTriangle } : { module: 'sante', label: 'Planifier le prochain rappel', icon: ShieldCheck };
  const PriorityIcon = priority.icon;
  const interpretation = late > 0 ? `${fmtNumber(late)} action(s) santé/vaccin en retard.` : priorityImpacts > 0 ? `${fmtNumber(priorityImpacts)} impact(s) business santé à suivre.` : critical > 0 ? `${fmtNumber(critical)} cas urgent(s) à surveiller.` : actions ? 'Situation sanitaire suivie : maintenir le calendrier.' : 'Aucune donnée santé à analyser pour le moment.';
  return <div className="space-y-5">
    <div className="rounded-2xl border border-[#d6c3a0] bg-white p-4"><div className="flex items-start justify-between gap-3 mb-4"><div className="flex items-start gap-3"><div className="w-10 h-10 rounded-xl bg-[#fff3d8] text-[#9a6b12] flex items-center justify-center"><Syringe size={18} /></div><div><p className="font-black text-[#2f2415]">Évolution santé & vaccins</p><p className="text-xs text-[#8a7456] mt-1">Graphes, coûts, retards, soins, vaccins, biosécurité, impacts business et animaux/lots concernés.</p></div></div><button type="button" onClick={() => onNavigate?.(priority.module)} className="hidden md:inline-flex items-center gap-2 rounded-xl bg-[#c9a96a] px-3 py-2 text-sm font-bold text-white hover:bg-[#b6975f]"><PriorityIcon size={15} />{priority.label}</button></div><div className="grid grid-cols-2 lg:grid-cols-9 gap-3"><Metric icon={TrendingUp} label="Coût santé" value={fmtCurrency(totalCost)} hint="soins + vaccins + biosécurité" /><Metric icon={CheckCircle2} label="Actions" value={fmtNumber(actions)} hint={`${fmtNumber(done)} réalisées`} /><Metric icon={AlertTriangle} label="Retards" value={fmtNumber(late)} hint="à traiter" danger={late > 0} /><Metric icon={ShieldCheck} label="Urgences" value={fmtNumber(critical)} hint="retards inclus" danger={critical > 0} /><Metric icon={Syringe} label="Vaccins" value={fmtNumber(vaccines)} hint={`${fmtNumber(bios)} biosécurité`} /><Metric icon={ShieldCheck} label="Cibles" value={fmtNumber(targets)} hint={`${conformance}% suivi`} danger={conformance < 80 && actions > 0} /><Metric icon={TrendingUp} label="Impacts protégés" value={fmtNumber(protectedImpacts)} hint="pertes/croissance/ponte" /><Metric icon={AlertTriangle} label="Impacts à suivre" value={fmtNumber(priorityImpacts)} hint="mortalité/vente/objectifs" danger={priorityImpacts > 0} /><Metric icon={ShieldCheck} label="Non qualifiés" value={fmtNumber(missingImpact)} hint="anciens soins" danger={missingImpact > 0} /></div></div>
    {impacts.length ? <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-sm text-[#7d6a4a]"><b className="text-[#2f2415]">Impacts dominants :</b> {impacts.map(([name, count]) => `${name} (${fmtNumber(count)})`).join(' · ')}</div> : null}
    <EvolutionCharts monthly={monthly} />
    <div className="rounded-2xl border border-[#d6c3a0] bg-white p-4 space-y-3"><p className="font-black text-[#2f2415]">Lecture par période</p>{monthly.length ? monthly.map((row) => <MonthlyLine key={row.key} row={row} />) : <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-sm text-[#8a7456]">Aucune donnée mensuelle à afficher pour le moment.</div>}</div>
    <div className="bg-[#fffdf8] border border-[#d6c3a0] rounded-2xl p-4 text-sm text-[#7d6a4a] flex items-start gap-3"><TrendingUp size={18} className="text-[#9a6b12] mt-0.5" /><div><b className="text-[#2f2415]">Lecture rapide :</b> {interpretation}</div></div>
    <div className={`${late || critical || priorityImpacts ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'} border rounded-2xl p-4 text-sm flex items-start justify-between gap-3`}><div className="flex items-start gap-2"><PriorityIcon size={18} className="mt-0.5" /><div><b>Action recommandée :</b> {priority.label}.</div></div><button type="button" onClick={() => onNavigate?.(priority.module)} className="shrink-0 rounded-xl bg-white/70 border border-current/10 px-3 py-1.5 text-xs font-bold">Ouvrir</button></div>
  </div>;
}
