import { AlertTriangle, Sprout, TrendingUp } from 'lucide-react';
import SmartEvolutionChart from '../components/charts/SmartEvolutionChart.jsx';
import { fmtCurrency, fmtNumber, toNumber } from '../utils/format';
import { calculateCultureMetrics } from '../utils/businessCalculations';
import { getRealCultureRows } from './CulturesTabActionsBridge.jsx';

const arr = (value) => Array.isArray(value) ? value : [];
const lower = (value) => String(value || '').trim().toLowerCase();
const rowDate = (row = {}) => row.date_recolte || row.date_recolte_prevue || row.date_debut_campagne || row.date_semis || row.created_at || row.updated_at;
const surfaceOf = (row = {}) => toNumber(row.surface_exploitable ?? row.surface);
const harvested = (row = {}) => toNumber(row.quantite_recoltee ?? row.quantite_disponible ?? row.production_reelle ?? row.production);
const losses = (row = {}) => toNumber(row.pertes ?? row.quantite_perdue ?? row.losses);
const costInputs = (row = {}) => toNumber(row.cout_semences) + toNumber(row.cout_engrais) + toNumber(row.cout_traitement) + toNumber(row.cout_eau);
const costWork = (row = {}) => toNumber(row.cout_main_oeuvre ?? row.cout_entretien ?? row.cout_irrigation);
const costTotal = (row = {}) => toNumber(row.cout_total_reel) || calculateCultureMetrics(row).costTotal || toNumber(row.budget_prevu) || costInputs(row) + costWork(row);
const revenue = (row = {}) => toNumber(row.revenu_reel || row.revenu_estime || calculateCultureMetrics(row).revenueEstimated);
const margin = (row = {}) => toNumber(row.marge_reelle) || revenue(row) - costTotal(row) || calculateCultureMetrics(row).marginEstimated;
const health = (row = {}) => calculateCultureMetrics(row).healthScore;
const isRisk = (row = {}) => health(row) < 80 || ['perdu', 'a_risque', 'malade'].includes(lower(row.statut));
const isFinished = (row = {}) => ['termine', 'terminé', 'recolte', 'récolte'].includes(lower(row.statut));

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
  if (!map.has(key)) map.set(key, { key, mois: monthLabel(key), charges_intrants: 0, charges_entretien: 0, ca: 0, marge: 0, rendement: 0, surface: 0, recolte: 0, pertes: 0, risques: 0, cultures: 0, terminees: 0, taux_reussite: 0, health_total: 0, health_count: 0, sante_moyenne: 0 });
  return map.get(key);
}

function SmallMetric({ label, value, hint, danger = false }) {
  return <div className={`border rounded-xl p-3 ${danger ? 'bg-red-50 border-red-200' : 'bg-[#fffdf8] border-[#d6c3a0]'}`}><p className="text-xs text-[#8a7456]">{label}</p><p className={`text-xl font-black mt-1 ${danger ? 'text-red-600' : 'text-[#2f2415]'}`}>{value}</p>{hint ? <p className="text-[11px] text-[#8a7456] mt-1">{hint}</p> : null}</div>;
}

function buildMonthly(rows = []) {
  const map = new Map();
  getRealCultureRows(arr(rows)).forEach((row) => {
    const bucket = ensure(map, monthKey(rowDate(row)));
    bucket.charges_intrants += costInputs(row);
    bucket.charges_entretien += costWork(row);
    bucket.ca += revenue(row);
    bucket.marge += margin(row);
    bucket.surface += surfaceOf(row);
    bucket.recolte += harvested(row);
    bucket.pertes += losses(row);
    bucket.cultures += 1;
    bucket.risques += isRisk(row) ? 1 : 0;
    bucket.terminees += isFinished(row) ? 1 : 0;
    bucket.health_total += health(row);
    bucket.health_count += 1;
  });
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key)).map((row) => ({
    ...row,
    rendement: row.surface > 0 ? Number((row.recolte / row.surface).toFixed(2)) : 0,
    taux_reussite: row.cultures > 0 ? Number(((row.terminees / row.cultures) * 100).toFixed(1)) : 0,
    taux_perte: row.recolte + row.pertes > 0 ? Number(((row.pertes / (row.recolte + row.pertes)) * 100).toFixed(1)) : 0,
    sante_moyenne: row.health_count ? Number((row.health_total / row.health_count).toFixed(1)) : 0,
  }));
}

function labels(rows) { return rows.map((row) => row.mois); }
function values(rows, key) { return rows.map((row) => toNumber(row[key])); }

export default function CulturesEvolution({ rows = [], onNavigate }) {
  const realRows = getRealCultureRows(arr(rows));
  const monthly = buildMonthly(rows);
  const totalSurface = realRows.reduce((sum, row) => sum + surfaceOf(row), 0);
  const totalHarvest = realRows.reduce((sum, row) => sum + harvested(row), 0);
  const totalLosses = realRows.reduce((sum, row) => sum + losses(row), 0);
  const totalMargin = realRows.reduce((sum, row) => sum + margin(row), 0);
  const risks = realRows.filter(isRisk).length;
  const avgYield = totalSurface > 0 ? totalHarvest / totalSurface : 0;
  const priority = risks > 0 ? { module: 'cultures', label: 'Traiter les cultures à risque', icon: AlertTriangle } : { module: 'ventes', label: 'Valoriser les récoltes', icon: TrendingUp };
  const PriorityIcon = priority.icon;
  const interpretation = risks > 0 ? `${fmtNumber(risks)} culture(s) ou campagne(s) à risque.` : totalHarvest > 0 ? `Récoltes suivies : ${fmtNumber(totalHarvest)} unité(s) récoltées.` : 'Compléter les récoltes et coûts pour calculer les rendements.';

  return <div className="space-y-5">
    <div className="bg-white border border-[#d6c3a0] rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-start gap-3"><div className="w-10 h-10 rounded-xl bg-[#fff3d8] text-[#9a6b12] flex items-center justify-center"><Sprout size={18} /></div><div><p className="font-black text-[#2f2415]">Évolution Cultures interactive</p><p className="text-xs text-[#8a7456] mt-1">Coûts, CA, marge, récoltes, rendement, pertes et risques par mois.</p></div></div>
        <button type="button" onClick={() => onNavigate?.(priority.module)} className="hidden md:inline-flex items-center gap-2 rounded-xl bg-[#c9a96a] px-3 py-2 text-sm font-bold text-white hover:bg-[#b6975f]"><PriorityIcon size={15} />{priority.label}</button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <SmallMetric label="Cultures" value={fmtNumber(realRows.length)} hint="fiches réelles" />
        <SmallMetric label="Surface" value={fmtNumber(totalSurface)} hint="m² / ha selon saisie" />
        <SmallMetric label="Récolte" value={fmtNumber(totalHarvest)} hint={`${fmtNumber(totalLosses)} pertes`} />
        <SmallMetric label="Rendement" value={Number(avgYield || 0).toFixed(2)} hint="récolte / surface" />
        <SmallMetric label="Marge" value={fmtCurrency(totalMargin)} hint="réelle/estimée" danger={totalMargin < 0} />
        <SmallMetric label="Risques" value={fmtNumber(risks)} hint="santé < 80%" danger={risks > 0} />
      </div>
    </div>

    <SmartEvolutionChart title="Cultures — économie mensuelle" subtitle="Barres : charges intrants, entretien/main-d’œuvre, CA et marge. Courbes : rendement et santé moyenne." months={labels(monthly)} leftUnit="FCFA" rightUnit="%" series={[{ name: 'Charges intrants', type: 'bar', unit: 'FCFA', data: values(monthly, 'charges_intrants') }, { name: 'Charges entretien', type: 'bar', unit: 'FCFA', data: values(monthly, 'charges_entretien') }, { name: 'CA récoltes', type: 'bar', unit: 'FCFA', data: values(monthly, 'ca') }, { name: 'Marge', type: 'bar', unit: 'FCFA', data: values(monthly, 'marge') }, { name: 'Rendement', type: 'line', axis: 'right', data: values(monthly, 'rendement') }, { name: 'Santé moyenne', type: 'line', axis: 'right', unit: '%', data: values(monthly, 'sante_moyenne') }]} />

    <SmartEvolutionChart title="Cultures — performance opérationnelle" subtitle="Surface, récoltes, pertes, cultures à risque et taux de réussite par mois." months={labels(monthly)} leftUnit="" rightUnit="%" series={[{ name: 'Surface suivie', type: 'bar', data: values(monthly, 'surface') }, { name: 'Quantité récoltée', type: 'bar', data: values(monthly, 'recolte') }, { name: 'Pertes', type: 'bar', data: values(monthly, 'pertes') }, { name: 'Cultures à risque', type: 'bar', data: values(monthly, 'risques') }, { name: 'Taux perte', type: 'line', axis: 'right', unit: '%', data: values(monthly, 'taux_perte') }, { name: 'Taux réussite', type: 'line', axis: 'right', unit: '%', data: values(monthly, 'taux_reussite') }]} />

    <div className="bg-[#fffdf8] border border-[#d6c3a0] rounded-2xl p-4 text-sm text-[#7d6a4a] flex items-start gap-3"><TrendingUp size={18} className="text-[#9a6b12] mt-0.5" /><div><b className="text-[#2f2415]">Interprétation :</b> {interpretation}</div></div>
    <div className={`${risks ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'} border rounded-2xl p-4 text-sm flex items-start justify-between gap-3`}><div className="flex items-start gap-2"><PriorityIcon size={18} className="mt-0.5" /><div><b>Action recommandée :</b> {priority.label}.</div></div><button type="button" onClick={() => onNavigate?.(priority.module)} className="shrink-0 rounded-xl bg-white/70 border border-current/10 px-3 py-1.5 text-xs font-bold">Ouvrir</button></div>
  </div>;
}
