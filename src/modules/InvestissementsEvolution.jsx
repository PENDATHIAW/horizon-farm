import { AlertTriangle, CheckCircle2, TrendingUp, Wallet } from 'lucide-react';
import SmartEvolutionChart from '../components/charts/SmartEvolutionChart.jsx';
import { fmtCurrency, fmtNumber, toNumber } from '../utils/format';

const arr = (value) => Array.isArray(value) ? value : [];
const lower = (value) => String(value || '').trim().toLowerCase();
const amount = (row = {}) => toNumber(row.montant ?? row.amount ?? row.total ?? row.montant_total ?? row.total_amount ?? row.budget_prevu ?? row.cout_total ?? 0);
const lineTotal = (row = {}) => toNumber(row.total ?? row.montant_total ?? row.amount ?? toNumber(row.quantite) * toNumber(row.prix_unitaire));
const rowDate = (row = {}) => row.date || row.date_debut || row.created_at || row.updated_at || row.start_date;
const status = (row = {}) => lower(row.statut || row.status || row.etat);
const isDone = (row = {}) => ['termine', 'terminé', 'clos', 'cloture', 'clôturé', 'effectif', 'paid'].includes(status(row));
const isRisk = (row = {}) => ['risque', 'a_risque', 'retard', 'bloque', 'bloqué'].includes(status(row)) || lower(row.risk_level || row.priorite).includes('haut');
const isActive = (row = {}) => !isDone(row) && !['annule', 'annulé', 'cancelled'].includes(status(row));
const isRevenue = (row = {}) => lower(row.type).includes('entree') || lower(row.type).includes('revenu') || lower(row.sens) === 'credit';
const isExpense = (row = {}) => lower(row.type).includes('sortie') || lower(row.type).includes('depense') || lower(row.type).includes('dépense') || lower(row.type).includes('charge') || lower(row.sens) === 'debit';

function asDate(value) { const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? null : parsed; }
function monthKey(value) { const date = asDate(value); if (!date) return 'Sans date'; return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; }
function monthLabel(key) { if (key === 'Sans date') return key; const [year, month] = key.split('-'); return `${month}/${String(year).slice(-2)}`; }
function ensure(map, key) { if (!map.has(key)) map.set(key, { key, mois: monthLabel(key), investi: 0, depenses: 0, revenus: 0, marge: 0, roi: 0, actifs: 0, termines: 0, risques: 0, retards: 0, actifs_crees: 0, projets: 0 }); return map.get(key); }
function SmallMetric({ label, value, hint, danger = false }) { return <div className={`border rounded-xl p-3 ${danger ? 'bg-red-50 border-red-200' : 'bg-[#fffdf8] border-[#d6c3a0]'}`}><p className="text-xs text-[#8a7456]">{label}</p><p className={`text-xl font-black mt-1 ${danger ? 'text-red-600' : 'text-[#2f2415]'}`}>{value}</p>{hint ? <p className="text-[11px] text-[#8a7456] mt-1">{hint}</p> : null}</div>; }
function buildMonthly({ rows = [], businessPlans = [], bpInvestmentLines = [], bpRecurringCosts = [], bpRevenueProjections = [], transactions = [] }) {
  const map = new Map();
  arr(rows).forEach((row) => { const bucket = ensure(map, monthKey(rowDate(row))); const value = amount(row); bucket.investi += value; bucket.depenses += value; bucket.projets += 1; if (isActive(row)) bucket.actifs += 1; if (isDone(row)) bucket.termines += 1; if (isRisk(row)) bucket.risques += 1; if (status(row).includes('retard')) bucket.retards += 1; });
  arr(businessPlans).forEach((row) => { const bucket = ensure(map, monthKey(rowDate(row))); bucket.projets += 1; if (isActive(row)) bucket.actifs += 1; if (isDone(row)) bucket.termines += 1; if (isRisk(row)) bucket.risques += 1; });
  arr(bpInvestmentLines).forEach((row) => { const bucket = ensure(map, monthKey(rowDate(row))); const value = lineTotal(row); bucket.investi += value; bucket.depenses += value; if (row.asset_created_at || row.asset_id) bucket.actifs_crees += 1; if (isDone(row)) bucket.termines += 1; });
  arr(bpRecurringCosts).forEach((row) => { const bucket = ensure(map, monthKey(rowDate(row))); bucket.depenses += lineTotal(row); });
  arr(bpRevenueProjections).forEach((row) => { const bucket = ensure(map, monthKey(rowDate(row))); bucket.revenus += lineTotal(row); });
  arr(transactions).forEach((row) => { const text = `${row.module_lie || ''} ${row.categorie || ''} ${row.category || ''} ${row.libelle || ''}`.toLowerCase(); if (!text.includes('invest')) return; const bucket = ensure(map, monthKey(rowDate(row))); if (isRevenue(row)) bucket.revenus += amount(row); if (isExpense(row)) { bucket.depenses += amount(row); bucket.investi += amount(row); } });
  return [...map.values()].sort((a,b)=>a.key.localeCompare(b.key)).map((row)=>({ ...row, marge: row.revenus - row.depenses, roi: row.investi > 0 ? Number((((row.revenus - row.depenses) / row.investi) * 100).toFixed(1)) : 0 }));
}
function labels(rows) { return rows.map((row)=>row.mois); }
function values(rows, key) { return rows.map((row)=>toNumber(row[key])); }
export default function InvestissementsEvolution({ rows = [], businessPlans = [], bpInvestmentLines = [], bpRecurringCosts = [], bpRevenueProjections = [], bpRisks = [], transactions = [], onNavigate }) {
  const monthly = buildMonthly({ rows, businessPlans, bpInvestmentLines, bpRecurringCosts, bpRevenueProjections, transactions });
  const invested = monthly.reduce((sum,row)=>sum+row.investi,0);
  const expenses = monthly.reduce((sum,row)=>sum+row.depenses,0);
  const revenues = monthly.reduce((sum,row)=>sum+row.revenus,0);
  const margin = revenues - expenses;
  const risks = arr(bpRisks).filter(isRisk).length + monthly.reduce((sum,row)=>sum+row.risques,0);
  const assetsCreated = monthly.reduce((sum,row)=>sum+row.actifs_crees,0);
  const activeProjects = arr(rows).filter(isActive).length + arr(businessPlans).filter(isActive).length;
  const roi = invested > 0 ? Number(((margin / invested) * 100).toFixed(1)) : 0;
  const priority = risks > 0 ? { module: 'investissements', label: 'Traiter les risques investissement', icon: AlertTriangle } : assetsCreated === 0 && invested > 0 ? { module: 'investissements', label: 'Créer les actifs métier', icon: Wallet } : { module: 'comptabilite', label: 'Contrôler le ROI comptable', icon: CheckCircle2 };
  const PriorityIcon = priority.icon;
  const interpretation = risks > 0 ? `${fmtNumber(risks)} risque(s) d’investissement à traiter.` : invested > 0 ? `ROI estimé : ${roi}% sur ${fmtCurrency(invested)} investi.` : 'Aucun investissement daté exploitable pour le moment.';
  return <div className="space-y-5">
    <div className="bg-white border border-[#d6c3a0] rounded-2xl p-4"><div className="flex items-start gap-3 mb-4"><div className="w-10 h-10 rounded-xl bg-[#fff3d8] text-[#9a6b12] flex items-center justify-center"><TrendingUp size={18}/></div><div><p className="font-black text-[#2f2415]">Évolution Investissements interactive</p><p className="text-xs text-[#8a7456] mt-1">Investi, dépenses, revenus, ROI, avancement projets et actifs créés.</p></div></div><div className="grid grid-cols-2 lg:grid-cols-6 gap-3"><SmallMetric label="Investi" value={fmtCurrency(invested)} /><SmallMetric label="Dépenses" value={fmtCurrency(expenses)} /><SmallMetric label="Revenus" value={fmtCurrency(revenues)} /><SmallMetric label="Marge / ROI" value={`${fmtCurrency(margin)} · ${roi}%`} danger={margin < 0}/><SmallMetric label="Projets actifs" value={fmtNumber(activeProjects)} /><SmallMetric label="Risques" value={fmtNumber(risks)} danger={risks > 0}/></div></div>
    <SmartEvolutionChart title="Investissements — performance financière" subtitle="Barres : investi, dépenses, revenus, marge. Courbe : ROI estimé." months={labels(monthly)} leftUnit="FCFA" rightUnit="%" series={[{name:'Montant investi',type:'bar',unit:'FCFA',data:values(monthly,'investi')},{name:'Dépenses liées',type:'bar',unit:'FCFA',data:values(monthly,'depenses')},{name:'Revenus générés',type:'bar',unit:'FCFA',data:values(monthly,'revenus')},{name:'Marge liée',type:'bar',unit:'FCFA',data:values(monthly,'marge')},{name:'ROI estimé',type:'line',axis:'right',unit:'%',data:values(monthly,'roi')}]} />
    <SmartEvolutionChart title="Investissements — avancement et risques" subtitle="Projets actifs/terminés, risques, retards et actifs métier créés." months={labels(monthly)} leftUnit="" rightUnit="" series={[{name:'Projets actifs',type:'bar',data:values(monthly,'actifs')},{name:'Projets terminés',type:'bar',data:values(monthly,'termines')},{name:'Risques ouverts',type:'bar',data:values(monthly,'risques')},{name:'Retards',type:'bar',data:values(monthly,'retards')},{name:'Actifs créés',type:'bar',data:values(monthly,'actifs_crees')}]} />
    <div className="bg-[#fffdf8] border border-[#d6c3a0] rounded-2xl p-4 text-sm text-[#7d6a4a] flex items-start gap-3"><TrendingUp size={18} className="text-[#9a6b12] mt-0.5"/><div><b className="text-[#2f2415]">Interprétation :</b> {interpretation}</div></div>
    <div className={`${risks || margin < 0 ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'} border rounded-2xl p-4 text-sm flex items-start justify-between gap-3`}><div className="flex items-start gap-2"><PriorityIcon size={18} className="mt-0.5"/><div><b>Action recommandée :</b> {priority.label}.</div></div><button type="button" onClick={() => onNavigate?.(priority.module)} className="shrink-0 rounded-xl bg-white/70 border border-current/10 px-3 py-1.5 text-xs font-bold">Ouvrir</button></div>
  </div>;
}
