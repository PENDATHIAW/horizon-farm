import { AlertTriangle, ShieldCheck, Syringe, TrendingUp } from 'lucide-react';
import SmartEvolutionChart from '../components/charts/SmartEvolutionChart.jsx';
import { fmtCurrency, fmtNumber, toNumber } from '../utils/format';

const arr = (value) => Array.isArray(value) ? value : [];
const lower = (value) => String(value || '').trim().toLowerCase();
const eventDate = (row = {}) => row.date || row.date_soin || row.date_vaccin || row.created_at || row.updated_at || row.next_due_date;
const amount = (row = {}) => toNumber(row.montant ?? row.amount ?? row.cout ?? row.cost ?? row.cout_total ?? row.total_cost ?? row.prix ?? 0);
const severity = (row = {}) => lower(row.severity || row.gravite || row.priority || row.priorite);
const status = (row = {}) => lower(row.statut || row.status || row.etat);
const type = (row = {}) => lower(`${row.type || ''} ${row.category || ''} ${row.categorie || ''} ${row.nom || ''} ${row.name || ''} ${row.description || ''}`);
const isVaccine = (row = {}) => type(row).includes('vaccin') || type(row).includes('rappel');
const isBiosecurity = (row = {}) => type(row).includes('bio') || type(row).includes('désinfection') || type(row).includes('desinfection') || type(row).includes('nettoyage');
const isCare = (row = {}) => !isVaccine(row) && !isBiosecurity(row);
const isLate = (row = {}) => ['retard', 'en_retard', 'overdue'].includes(status(row));
const isDone = (row = {}) => ['termine', 'terminé', 'fait', 'done', 'realise', 'réalisé', 'complete', 'completed'].includes(status(row));
const isCritical = (row = {}) => ['urgence', 'critique', 'critical', 'high'].includes(severity(row)) || isLate(row);
const targetCount = (row = {}) => toNumber(row.nombre_cibles ?? row.target_count ?? row.animaux_count ?? row.lots_count ?? row.quantity ?? row.quantite ?? 1) || 1;

function asDate(value) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function monthKey(value) {
  const date = asDate(value);
  if (!date) return 'Sans date';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key) {
  if (key === 'Sans date') return key;
  const [year, month] = key.split('-');
  return `${month}/${String(year).slice(-2)}`;
}

function ensure(map, key) {
  if (!map.has(key)) map.set(key, { key, mois: monthLabel(key), cout_vaccins: 0, cout_soins: 0, cout_biosecurite: 0, total_couts: 0, soins: 0, vaccins: 0, bios: 0, retards: 0, critiques: 0, cibles: 0, conformite: 0, taux_retard: 0 });
  return map.get(key);
}

function SmallMetric({ label, value, hint, danger = false }) {
  return <div className={`border rounded-xl p-3 ${danger ? 'bg-red-50 border-red-200' : 'bg-[#fffdf8] border-[#d6c3a0]'}`}><p className="text-xs text-[#8a7456]">{label}</p><p className={`text-xl font-black mt-1 ${danger ? 'text-red-600' : 'text-[#2f2415]'}`}>{value}</p>{hint ? <p className="text-[11px] text-[#8a7456] mt-1">{hint}</p> : null}</div>;
}

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
    bucket.cibles += targetCount(event);
  });
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key)).map((row) => {
    const totalActions = row.soins + row.vaccins + row.bios;
    const doneOrNotLate = Math.max(0, totalActions - row.retards);
    return { ...row, conformite: totalActions ? Number(((doneOrNotLate / totalActions) * 100).toFixed(1)) : 0, taux_retard: totalActions ? Number(((row.retards / totalActions) * 100).toFixed(1)) : 0 };
  });
}

function labels(rows) { return rows.map((row) => row.mois); }
function values(rows, key) { return rows.map((row) => toNumber(row[key])); }

export default function SanteEvolution({ rows = [], onNavigate }) {
  const monthly = buildMonthly(rows);
  const totalCost = monthly.reduce((sum, row) => sum + row.total_couts, 0);
  const late = arr(rows).filter(isLate).length;
  const critical = arr(rows).filter(isCritical).length;
  const done = arr(rows).filter(isDone).length;
  const actions = arr(rows).length;
  const conformance = actions ? Number((((actions - late) / actions) * 100).toFixed(1)) : 0;
  const targets = arr(rows).reduce((sum, row) => sum + targetCount(row), 0);
  const priority = critical > 0 || late > 0 ? { module: 'sante', label: 'Traiter les retards santé', icon: AlertTriangle } : { module: 'sante', label: 'Planifier le prochain rappel', icon: ShieldCheck };
  const PriorityIcon = priority.icon;
  const interpretation = late > 0 ? `${fmtNumber(late)} action(s) santé/vaccin en retard.` : critical > 0 ? `${fmtNumber(critical)} cas critique(s) à surveiller.` : 'Situation sanitaire maîtrisée : maintenir le calendrier de suivi.';

  return <div className="space-y-5">
    <div className="bg-white border border-[#d6c3a0] rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-start gap-3"><div className="w-10 h-10 rounded-xl bg-[#fff3d8] text-[#9a6b12] flex items-center justify-center"><Syringe size={18} /></div><div><p className="font-black text-[#2f2415]">Évolution Santé & Vaccins interactive</p><p className="text-xs text-[#8a7456] mt-1">Coûts, conformité sanitaire, retards, actions réalisées et cibles concernées.</p></div></div>
        <button type="button" onClick={() => onNavigate?.(priority.module)} className="hidden md:inline-flex items-center gap-2 rounded-xl bg-[#c9a96a] px-3 py-2 text-sm font-bold text-white hover:bg-[#b6975f]"><PriorityIcon size={15} />{priority.label}</button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <SmallMetric label="Coût santé" value={fmtCurrency(totalCost)} hint="soins + vaccins + bio" />
        <SmallMetric label="Actions" value={fmtNumber(actions)} hint={`${fmtNumber(done)} réalisées`} />
        <SmallMetric label="Retards" value={fmtNumber(late)} hint="à traiter" danger={late > 0} />
        <SmallMetric label="Critiques" value={fmtNumber(critical)} hint="urgence/retard" danger={critical > 0} />
        <SmallMetric label="Conformité" value={`${conformance}%`} hint="hors retard" danger={conformance < 80 && actions > 0} />
        <SmallMetric label="Cibles" value={fmtNumber(targets)} hint="animaux/lots" />
      </div>
    </div>

    <SmartEvolutionChart title="Santé — coûts mensuels" subtitle="Barres : vaccins, soins, biosécurité. Courbes : conformité et taux de retard." months={labels(monthly)} leftUnit="FCFA" rightUnit="%" series={[{ name: 'Coûts vaccins', type: 'bar', unit: 'FCFA', data: values(monthly, 'cout_vaccins') }, { name: 'Coûts soins', type: 'bar', unit: 'FCFA', data: values(monthly, 'cout_soins') }, { name: 'Coûts biosécurité', type: 'bar', unit: 'FCFA', data: values(monthly, 'cout_biosecurite') }, { name: 'Conformité sanitaire', type: 'line', axis: 'right', unit: '%', data: values(monthly, 'conformite') }, { name: 'Taux retard', type: 'line', axis: 'right', unit: '%', data: values(monthly, 'taux_retard') }]} />

    <SmartEvolutionChart title="Santé — performance sanitaire mensuelle" subtitle="Actions réalisées ou à traiter : soins, vaccins, biosécurité, retards, critiques et cibles concernées." months={labels(monthly)} leftUnit="" rightUnit="%" series={[{ name: 'Soins', type: 'bar', data: values(monthly, 'soins') }, { name: 'Vaccins', type: 'bar', data: values(monthly, 'vaccins') }, { name: 'Biosécurité', type: 'bar', data: values(monthly, 'bios') }, { name: 'Retards', type: 'bar', data: values(monthly, 'retards') }, { name: 'Critiques', type: 'bar', data: values(monthly, 'critiques') }, { name: 'Cibles concernées', type: 'line', data: values(monthly, 'cibles') }, { name: 'Conformité', type: 'line', axis: 'right', unit: '%', data: values(monthly, 'conformite') }]} />

    <div className="bg-[#fffdf8] border border-[#d6c3a0] rounded-2xl p-4 text-sm text-[#7d6a4a] flex items-start gap-3"><TrendingUp size={18} className="text-[#9a6b12] mt-0.5" /><div><b className="text-[#2f2415]">Interprétation :</b> {interpretation}</div></div>
    <div className={`${late || critical ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'} border rounded-2xl p-4 text-sm flex items-start justify-between gap-3`}><div className="flex items-start gap-2"><PriorityIcon size={18} className="mt-0.5" /><div><b>Action recommandée :</b> {priority.label}.</div></div><button type="button" onClick={() => onNavigate?.(priority.module)} className="shrink-0 rounded-xl bg-white/70 border border-current/10 px-3 py-1.5 text-xs font-bold">Ouvrir</button></div>
  </div>;
}
