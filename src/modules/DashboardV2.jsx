import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, CloudSun, CreditCard, FileText, Package, Settings2, Stethoscope, Target, TrendingUp } from 'lucide-react';
import DashboardEvolution from './DashboardEvolution.jsx';
import { readUiSettings } from '../utils/uiPreferences';
import { fmtCurrency } from '../utils/format';
import { buildDecisionCenterPlan } from '../services/growthDecisionEngine';
import { remainingForOrder } from '../utils/salesStatuses';
import { buildDashboardTodayActions, sanitizeDashboardMetric } from '../utils/dashboardWorkflows';

const arr = (value) => Array.isArray(value) ? value : [];
const lower = (value) => String(value || '').trim().toLowerCase();
const paid = (row = {}) => Number(row.montant_paye ?? row.paid_amount ?? row.amount_paid ?? 0) || 0;
const remaining = (row = {}, payments = []) => Math.max(0, remainingForOrder(row, payments));

function useUiSettings() {
  const [settings, setSettings] = useState(readUiSettings);
  useEffect(() => {
    const handler = (event) => setSettings(event.detail || readUiSettings());
    window.addEventListener('horizon-farm-ui-settings-changed', handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('horizon-farm-ui-settings-changed', handler);
      window.removeEventListener('storage', handler);
    };
  }, []);
  return settings;
}

function Mini({ label, value, tone = 'neutral' }) {
  const cls = tone === 'good' ? 'text-emerald-600' : tone === 'bad' ? 'text-red-600' : tone === 'warn' ? 'text-amber-600' : 'text-[#2f2415]';
  return <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4"><p className="text-xs text-[#8a7456]">{label}</p><p className={`mt-1 text-lg font-black ${cls}`}>{value}</p></div>;
}

function UnifiedPilotageStatus({ props }) {
  const plan = useMemo(() => buildDecisionCenterPlan({
    animaux: props.animaux || [], avicole: props.lotsData || props.lots || [], lots: props.lotsData || props.lots || [], cultures: props.cultures || [], stock: props.stocks || [], clients: props.clients || [], sales_orders: props.salesOrders || [], payments: props.payments || [], finances: props.transactions || [], production_oeufs_logs: props.productionLogs || [], alimentation_logs: props.alimentationLogs || [], meteo: props.meteo || {},
  }), [props]);
  const goal = plan.goals.global;
  const salesOrders = arr(props.salesOrders);
  const payments = arr(props.payments);
  const transactions = arr(props.transactions);
  const cashIn = Math.max(payments.reduce((sum, row) => sum + paid(row), 0), transactions.filter((row) => lower(row.type) === 'entree' || lower(row.type) === 'entrée').reduce((sum, row) => sum + Number(row.montant || row.amount || 0), 0));
  const cashOut = transactions.filter((row) => ['sortie', 'depense', 'dépense'].includes(lower(row.type))).reduce((sum, row) => sum + Number(row.montant || row.amount || 0), 0);
  const receivable = salesOrders.reduce((sum, order) => sum + remaining(order, payments), 0);
  const remainingAmount = Math.max(0, goal.monthTarget - goal.realized);
  const tone = goal.attainment >= 90 ? 'good' : goal.attainment >= 50 ? 'warn' : 'bad';
  const activitiesBehind = plan.goals.activities.filter((item) => item.attainment < 50 && item.target > 0).slice(0, 3);
  const message = goal.attainment >= 90 ? 'Le mois est bien engagé. Continuer à sécuriser les ventes, le cash et les routines terrain.' : goal.realized > 0 ? 'Le mois avance, mais il reste du CA et du cash à aller chercher.' : 'Aucun CA réalisé visible ce mois-ci. Priorité : ventes, encaissements et opportunités immédiates.';

  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4"><div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div><p className="text-xs uppercase tracking-[0.25em] text-[#9a6b12] font-black flex items-center gap-2"><Target size={15} /> Pilotage ferme · objectif du mois</p><h2 className="mt-1 text-2xl font-black text-[#2f2415]">Situation actuelle · {plan.goals.currentMonth}</h2><p className="mt-1 text-sm text-[#8a7456]">{message}</p></div><button type="button" onClick={() => props.onNavigate?.('centre_ia')} className="rounded-xl bg-[#2f2415] px-4 py-2 text-sm font-black text-white hover:bg-[#3d2f1d]">Voir Centre décisionnel</button></div><div className="grid grid-cols-2 xl:grid-cols-6 gap-3"><Mini label="Objectif mensuel" value={fmtCurrency(goal.monthTarget)} /><Mini label="CA réalisé" value={fmtCurrency(goal.realized)} /><Mini label="Taux d’atteinte" value={`${goal.attainment}%`} tone={tone} /><Mini label="Reste à vendre" value={fmtCurrency(remainingAmount)} tone={remainingAmount > 0 ? 'warn' : 'good'} /><Mini label="Cash net" value={fmtCurrency(cashIn - cashOut)} tone={cashIn - cashOut >= 0 ? 'good' : 'bad'} /><Mini label="À encaisser" value={fmtCurrency(receivable)} tone={receivable > 0 ? 'warn' : 'good'} /></div>{activitiesBehind.length ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"><b>Activités à pousser :</b> {activitiesBehind.map((item) => `${item.label} (${item.attainment}%)`).join(' · ')}</div> : <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">Aucune activité prioritaire en retard critique selon les objectifs actuels.</div>}</section>;
}

const actionIcons = { money: CreditCard, alert: AlertTriangle, stock: Package, health: Stethoscope, smart: CloudSun, task: CheckCircle2, document: FileText, sync: TrendingUp };

function TodayAction({ iconKey, category, title, detail, moduleKey, tone = 'amber', onNavigate }) {
  const Icon = actionIcons[iconKey] || AlertTriangle;
  const tones = { red: 'border-red-200 bg-red-50 text-red-700', amber: 'border-amber-200 bg-amber-50 text-amber-800', emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700', neutral: 'border-[#eadcc2] bg-[#fffdf8] text-[#8a7456]' };
  return <button type="button" onClick={() => onNavigate?.(moduleKey)} className={`rounded-2xl border p-4 text-left transition hover:shadow-sm ${tones[tone] || tones.neutral}`}><div className="flex items-start gap-3"><div className="rounded-xl bg-white/70 p-2"><Icon size={17} /></div><div className="min-w-0"><span className="rounded-full bg-white/75 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide opacity-80">{category}</span><p className="mt-2 font-black text-[#2f2415]">{sanitizeDashboardMetric(title, 'Action à vérifier')}</p><p className="mt-1 text-xs opacity-80">{sanitizeDashboardMetric(detail, 'Détail non renseigné')}</p></div></div></button>;
}

function TodayFocus({ props, simple, onToggleExpert }) {
  const actions = useMemo(() => buildDashboardTodayActions(props).slice(0, simple ? 4 : 6), [props, simple]);

  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs uppercase tracking-[0.25em] text-[#9a6b12] font-black">Aujourd’hui</p><h2 className="mt-1 text-xl font-black text-[#2f2415]">Ce qu’il faut faire en premier</h2><p className="mt-1 text-sm text-[#8a7456]">Voici les actions importantes à regarder aujourd’hui.</p></div><button type="button" onClick={onToggleExpert} className="rounded-full border border-[#d6c3a0] bg-[#fffdf8] px-3 py-1.5 text-xs font-black text-[#2f2415]"><Settings2 size={13} className="inline" /> {simple ? 'Voir plus de détails' : 'Vue simple'}</button></div>{actions.length ? <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">{actions.map((action) => <TodayAction key={`${action.moduleKey}-${action.title}`} {...action} onNavigate={props.onNavigate} />)}</div> : <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"><CheckCircle2 size={16} className="inline" /> Rien d’urgent pour le moment. Continue simplement ton suivi habituel.</div>}</section>;
}

export default function DashboardV2(props) {
  const settings = useUiSettings();
  const simple = settings.complexity !== 'expert';
  const toggleExpert = () => {
    const next = { ...settings, complexity: simple ? 'expert' : 'simple' };
    localStorage.setItem('horizon_farm_ui_settings', JSON.stringify(next));
    window.dispatchEvent(new CustomEvent('horizon-farm-ui-settings-changed', { detail: next }));
  };

  return <div className="space-y-6"><TodayFocus props={props} simple={simple} onToggleExpert={toggleExpert} /><UnifiedPilotageStatus props={props} />{!simple ? <DashboardEvolution salesOrders={props.salesOrders || []} payments={props.payments || []} transactions={props.transactions || []} productionLogs={props.productionLogs || []} stocks={props.stocks || []} taches={props.taches || []} alertes={props.alertes || []} onNavigate={props.onNavigate} /> : <div className="flex flex-col gap-3 rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-sm text-[#8a7456] sm:flex-row sm:items-center sm:justify-between"><span>Vue simple activée. Les graphiques détaillés sont masqués pour garder l’accueil lisible.</span><button type="button" onClick={toggleExpert} className="w-fit rounded-xl border border-[#d6c3a0] bg-white px-3 py-2 text-xs font-black text-[#2f2415]"><Settings2 size={13} className="inline" /> Voir plus de détails</button></div>}</div>;
}
