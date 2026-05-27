import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, CloudSun, CreditCard, FileText, MapPin, Package, Settings2, Stethoscope, Target, TrendingUp } from 'lucide-react';
import DashboardEvolution from './DashboardEvolution.jsx';
import { readUiSettings } from '../utils/uiPreferences';
import { fmtCurrency } from '../utils/format';
import { buildDecisionCenterPlan } from '../services/growthDecisionEngine';
import { remainingForOrder } from '../utils/salesStatuses';
import { buildDashboardTodayActions, sanitizeDashboardMetric } from '../utils/dashboardWorkflows';

const arr = (value) => Array.isArray(value) ? value : [];
const lower = (value) => String(value || '').trim().toLowerCase();
const paid = (row = {}) => Number(row.montant_paye ?? row.paid_amount ?? row.amount_paid ?? 0) || 0;
const money = (row = {}) => Number(row?.montant ?? row?.amount ?? row?.total ?? row?.montant_total ?? 0) || 0;
const remaining = (row = {}, payments = []) => Math.max(0, remainingForOrder(row, payments));
const isOverdue = (row = {}) => ['retard', 'en_retard', 'a_faire_retard', 'overdue'].includes(lower(row.statut || row.status || row.etat));
const isCriticalStock = (row = {}) => Number(row.quantite || row.quantity || row.stock || 0) <= Number(row.seuil || row.threshold || 0);
const firstValue = (...values) => values.find((value) => value !== undefined && value !== null && String(value).trim() !== '');
const formatDateTime = () => new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date());

function farmLocationOf(props = {}) {
  const farm = props.farm || props.ferme || props.farmProfile || props.farm_profile || {};
  const meteo = props.meteo || props.weather || {};
  const quartier = firstValue(farm.quartier, farm.neighborhood, farm.district, meteo.quartier, meteo.neighborhood, meteo.district);
  const ville = firstValue(farm.ville, farm.city, farm.localite, farm.locality, meteo.ville, meteo.city, meteo.localite, meteo.locality, meteo.location);
  const pays = firstValue(farm.pays, farm.country, meteo.pays, meteo.country);
  const parts = [quartier, ville, pays].filter(Boolean);
  return parts.length ? parts.join(', ') : firstValue(farm.location, farm.localisation, meteo.localisation, meteo.place, 'Ferme principale');
}

function displayUserOf(props = {}) {
  const user = props.user || props.currentUser || {};
  return firstValue(props.displayUser, props.userName, props.username, user.user_metadata?.login, user.user_metadata?.name, user.email?.split('@')[0], 'Penda');
}

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

function StatusPill({ children, tone = 'neutral' }) {
  const classes = tone === 'bad' ? 'border-red-200 bg-red-50 text-red-700' : tone === 'warn' ? 'border-amber-200 bg-amber-50 text-amber-700' : tone === 'good' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-[#eadcc2] bg-[#fffdf8] text-[#8a7456]';
  return <span className={`rounded-full border px-3 py-1 text-xs font-black ${classes}`}>{children}</span>;
}

function NotebookRow({ label, value, status, tone = 'neutral', onClick }) {
  const content = <><span className="text-sm text-[#8a7456]">{label}</span><span className="font-black text-[#2f2415]">{value}</span>{status ? <StatusPill tone={tone}>{status}</StatusPill> : null}</>;
  const cls = "grid grid-cols-1 gap-2 border-b border-[#eadcc2]/70 py-4 last:border-b-0 md:grid-cols-[210px_1fr_auto] md:items-center";
  if (onClick) return <button type="button" onClick={onClick} className={`${cls} w-full text-left hover:bg-[#fffdf8]`}>{content}</button>;
  return <div className={cls}>{content}</div>;
}

function buildNotebookRows(props, plan, actions, payments, transactions, salesOrders) {
  const stocks = arr(props.stocks || props.stock);
  const sante = arr(props.sante || props.vaccins);
  const lots = arr(props.lotsData || props.lots || props.avicole);
  const productionLogs = arr(props.productionLogs || props.production_oeufs_logs);
  const criticalStocks = stocks.filter(isCriticalStock);
  const overdueHealth = sante.filter(isOverdue);
  const eggs = productionLogs.reduce((sum, row) => sum + Number(row.oeufs_produits || row.eggs_count || row.oeufs || 0), 0);
  const receivable = salesOrders.reduce((sum, order) => sum + remaining(order, payments), 0);
  const urgentAction = actions[0];
  const goal = plan.goals.global;
  const cashIn = Math.max(payments.reduce((sum, row) => sum + paid(row), 0), transactions.filter((row) => lower(row.type) === 'entree' || lower(row.type) === 'entrée').reduce((sum, row) => sum + money(row), 0));
  const cashOut = transactions.filter((row) => ['sortie', 'depense', 'dépense'].includes(lower(row.type))).reduce((sum, row) => sum + money(row), 0);

  return [
    {
      label: 'Priorité',
      value: urgentAction ? sanitizeDashboardMetric(urgentAction.title, 'Action à traiter') : 'Aucune urgence',
      status: urgentAction ? urgentAction.category : 'OK',
      tone: urgentAction?.tone === 'red' ? 'bad' : urgentAction?.tone === 'amber' ? 'warn' : 'good',
      moduleKey: urgentAction?.moduleKey,
    },
    {
      label: 'Santé',
      value: `${overdueHealth.length} soin(s) en retard`,
      status: overdueHealth.length ? 'À traiter' : 'OK',
      tone: overdueHealth.length ? 'warn' : 'good',
      moduleKey: 'sante',
    },
    {
      label: 'Production',
      value: `${lots.length} lot(s) · ${eggs.toLocaleString('fr-FR')} œufs`,
      status: lots.length || eggs ? 'Suivi' : 'Vide',
      tone: lots.length || eggs ? 'good' : 'neutral',
      moduleKey: 'avicole',
    },
    {
      label: 'Stock',
      value: `${criticalStocks.length} produit(s) sous seuil`,
      status: criticalStocks.length ? 'Bas' : 'OK',
      tone: criticalStocks.length ? 'warn' : 'good',
      moduleKey: 'stock',
    },
    {
      label: 'Commercial',
      value: `${fmtCurrency(receivable)} à encaisser`,
      status: receivable > 0 ? 'Relance' : 'OK',
      tone: receivable > 0 ? 'warn' : 'good',
      moduleKey: 'ventes',
    },
    {
      label: 'Pilotage',
      value: `${goal.attainment ?? 0}% objectif mensuel`,
      status: fmtCurrency(cashIn - cashOut),
      tone: goal.attainment >= 90 ? 'good' : goal.attainment >= 50 ? 'warn' : 'bad',
      moduleKey: 'centre_ia',
    },
  ];
}

function FarmNotebook({ props, simple, onToggleExpert }) {
  const actions = useMemo(() => buildDashboardTodayActions(props).slice(0, simple ? 4 : 6), [props, simple]);
  const plan = useMemo(() => buildDecisionCenterPlan({
    animaux: props.animaux || [], avicole: props.lotsData || props.lots || [], lots: props.lotsData || props.lots || [], cultures: props.cultures || [], stock: props.stocks || [], clients: props.clients || [], sales_orders: props.salesOrders || [], payments: props.payments || [], finances: props.transactions || [], production_oeufs_logs: props.productionLogs || [], alimentation_logs: props.alimentationLogs || [], meteo: props.meteo || {},
  }), [props]);
  const payments = arr(props.payments);
  const transactions = arr(props.transactions);
  const salesOrders = arr(props.salesOrders);
  const rows = useMemo(() => buildNotebookRows(props, plan, actions, payments, transactions, salesOrders), [props, plan, actions, payments, transactions, salesOrders]);
  const goal = plan.goals.global;
  const remainingAmount = Math.max(0, goal.monthTarget - goal.realized);
  const displayUser = displayUserOf(props);
  const location = farmLocationOf(props);
  const dateTime = useMemo(formatDateTime, []);

  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm"><div className="flex flex-col gap-3 border-b border-[#eadcc2] pb-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs uppercase tracking-[0.25em] text-[#9a6b12] font-black">Accueil</p><h1 className="mt-1 text-2xl font-black text-[#2f2415]">Bonjour {displayUser}</h1><div className="mt-2 flex flex-col gap-1 text-sm text-[#8a7456] sm:flex-row sm:flex-wrap sm:items-center sm:gap-3"><span className="capitalize">{dateTime}</span><span className="hidden sm:inline">·</span><span className="inline-flex items-center gap-1"><MapPin size={14} aria-hidden="true" /> {location}</span></div></div><button type="button" onClick={onToggleExpert} className="rounded-full border border-[#d6c3a0] bg-[#fffdf8] px-3 py-1.5 text-xs font-black text-[#2f2415]"><Settings2 size={13} className="inline" /> {simple ? 'Détails' : 'Simple'}</button></div><div className="divide-y divide-[#eadcc2]/70">{rows.map((row) => <NotebookRow key={row.label} {...row} onClick={row.moduleKey ? () => props.onNavigate?.(row.moduleKey) : undefined} />)}</div><div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4"><Mini label="Objectif" value={fmtCurrency(goal.monthTarget)} /><Mini label="Réalisé" value={fmtCurrency(goal.realized)} /><Mini label="Atteinte" value={`${goal.attainment}%`} tone={goal.attainment >= 90 ? 'good' : goal.attainment >= 50 ? 'warn' : 'bad'} /><Mini label="Reste" value={fmtCurrency(remainingAmount)} tone={remainingAmount > 0 ? 'warn' : 'good'} /></div></section>;
}

const actionIcons = { money: CreditCard, alert: AlertTriangle, stock: Package, health: Stethoscope, smart: CloudSun, task: CheckCircle2, document: FileText, sync: TrendingUp };

function TodayAction({ iconKey, category, title, detail, moduleKey, tone = 'amber', onNavigate }) {
  const Icon = actionIcons[iconKey] || AlertTriangle;
  const tones = { red: 'border-red-200 bg-red-50 text-red-700', amber: 'border-amber-200 bg-amber-50 text-amber-800', emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700', neutral: 'border-[#eadcc2] bg-[#fffdf8] text-[#8a7456]' };
  return <button type="button" onClick={() => onNavigate?.(moduleKey)} className={`rounded-2xl border p-4 text-left transition hover:shadow-sm ${tones[tone] || tones.neutral}`}><div className="flex items-start gap-3"><div className="rounded-xl bg-white/70 p-2"><Icon size={17} /></div><div className="min-w-0"><span className="rounded-full bg-white/75 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide opacity-80">{category}</span><p className="mt-2 font-black text-[#2f2415]">{sanitizeDashboardMetric(title, 'Action')}</p>{detail ? <p className="mt-1 text-xs opacity-80">{sanitizeDashboardMetric(detail, '')}</p> : null}</div></div></button>;
}

function TodayFocus({ props, simple }) {
  const actions = useMemo(() => buildDashboardTodayActions(props).slice(0, simple ? 4 : 6), [props, simple]);
  if (!actions.length) return null;
  return <section className="space-y-3"><div className="flex items-center justify-between"><h2 className="text-lg font-black text-[#2f2415]">Actions</h2></div><div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">{actions.map((action) => <TodayAction key={`${action.moduleKey}-${action.title}`} {...action} onNavigate={props.onNavigate} />)}</div></section>;
}

export default function DashboardV2(props) {
  const settings = useUiSettings();
  const simple = settings.complexity !== 'expert';
  const toggleExpert = () => {
    const next = { ...settings, complexity: simple ? 'expert' : 'simple' };
    localStorage.setItem('horizon_farm_ui_settings', JSON.stringify(next));
    window.dispatchEvent(new CustomEvent('horizon-farm-ui-settings-changed', { detail: next }));
  };

  return <div className="space-y-6"><FarmNotebook props={props} simple={simple} onToggleExpert={toggleExpert} />{!simple ? <><TodayFocus props={props} simple={simple} /><DashboardEvolution salesOrders={props.salesOrders || []} payments={props.payments || []} transactions={props.transactions || []} productionLogs={props.productionLogs || []} stocks={props.stocks || []} taches={props.taches || []} alertes={props.alertes || []} onNavigate={props.onNavigate} /></> : null}</div>;
}
