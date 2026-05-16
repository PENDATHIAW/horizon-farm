import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, CreditCard, FileText, Package, Settings2, Stethoscope, Target, TrendingUp } from 'lucide-react';
import Dashboard from './Dashboard.jsx';
import DashboardEvolution from './DashboardEvolution.jsx';
import { readUiSettings } from '../utils/uiPreferences';
import { fmtCurrency } from '../utils/format';
import { buildDecisionCenterPlan } from '../services/growthDecisionEngine';

const arr = (value) => Array.isArray(value) ? value : [];
const lower = (value) => String(value || '').trim().toLowerCase();
const closedStatuses = ['termine', 'terminé', 'done', 'traitee', 'traitée', 'resolue', 'résolue', 'fermee', 'fermée', 'annule', 'annulé'];
const amount = (row = {}) => Number(row.montant_total ?? row.total ?? row.amount ?? row.montant ?? 0) || 0;
const paid = (row = {}) => Number(row.montant_paye ?? row.paid_amount ?? row.amount_paid ?? 0) || 0;
const remaining = (row = {}) => Math.max(0, Number(row.reste_a_payer ?? row.remaining_amount ?? row.amount_due ?? (amount(row) - paid(row)) ?? 0) || 0);

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

function MonthlyObjectiveStatus({ props }) {
  const plan = useMemo(() => buildDecisionCenterPlan({
    animaux: props.animaux || [],
    avicole: props.lotsData || props.lots || [],
    lots: props.lotsData || props.lots || [],
    cultures: props.cultures || [],
    stock: props.stocks || [],
    clients: props.clients || [],
    sales_orders: props.salesOrders || [],
    payments: props.payments || [],
    finances: props.transactions || [],
    production_oeufs_logs: props.productionLogs || [],
    alimentation_logs: props.alimentationLogs || [],
    meteo: props.meteo || {},
  }), [props]);
  const goal = plan.goals.global;
  const remainingAmount = Math.max(0, goal.monthTarget - goal.realized);
  const tone = goal.attainment >= 90 ? 'good' : goal.attainment >= 50 ? 'warn' : 'bad';
  const activitiesBehind = plan.goals.activities.filter((item) => item.attainment < 50 && item.target > 0).slice(0, 3);
  const message = goal.attainment >= 90
    ? 'Le mois est bien engagé. Continuer à sécuriser les ventes et les encaissements.'
    : goal.realized > 0
      ? 'Le mois avance, mais il reste du CA à aller chercher. Le Centre décisionnel indique quoi vendre et à qui vendre.'
      : 'Aucun CA réalisé visible ce mois-ci. Priorité : vérifier ventes, précommandes et opportunités immédiates.';

  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-[#9a6b12] font-black flex items-center gap-2"><Target size={15} /> Objectif du mois</p>
        <h2 className="mt-1 text-2xl font-black text-[#2f2415]">Situation actuelle · {plan.goals.currentMonth}</h2>
        <p className="mt-1 text-sm text-[#8a7456]">{message}</p>
      </div>
      <button type="button" onClick={() => props.onNavigate?.('centre_ia')} className="rounded-xl bg-[#2f2415] px-4 py-2 text-sm font-black text-white hover:bg-[#3d2f1d]">Voir Centre décisionnel</button>
    </div>
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
      <Mini label="Objectif mensuel" value={fmtCurrency(goal.monthTarget)} />
      <Mini label="CA réalisé" value={fmtCurrency(goal.realized)} />
      <Mini label="Taux d’atteinte" value={`${goal.attainment}%`} tone={tone} />
      <Mini label="Reste à vendre" value={fmtCurrency(remainingAmount)} tone={remainingAmount > 0 ? 'warn' : 'good'} />
    </div>
    {activitiesBehind.length ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"><b>Activités à pousser :</b> {activitiesBehind.map((item) => `${item.label} (${item.attainment}%)`).join(' · ')}</div> : <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">Aucune activité prioritaire en retard critique selon les objectifs actuels.</div>}
  </section>;
}

function TodayAction({ icon: Icon, title, detail, moduleKey, tone = 'amber', onNavigate }) {
  const tones = {
    red: 'border-red-200 bg-red-50 text-red-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    neutral: 'border-[#eadcc2] bg-[#fffdf8] text-[#8a7456]',
  };
  return <button type="button" onClick={() => onNavigate?.(moduleKey)} className={`rounded-2xl border p-4 text-left transition hover:shadow-sm ${tones[tone] || tones.neutral}`}>
    <div className="flex items-start gap-3">
      <div className="rounded-xl bg-white/70 p-2"><Icon size={17} /></div>
      <div className="min-w-0">
        <p className="font-black text-[#2f2415]">{title}</p>
        <p className="mt-1 text-xs opacity-80">{detail}</p>
      </div>
    </div>
  </button>;
}

function TodayFocus({ props, simple, onToggleExpert }) {
  const actions = useMemo(() => {
    const salesOrders = arr(props.salesOrders);
    const stocks = arr(props.stocks);
    const sante = arr(props.vaccins);
    const alertes = arr(props.alertes);
    const taches = arr(props.taches);
    const documents = arr(props.documents);
    const payments = arr(props.payments);
    const unpaidOrders = salesOrders.filter((order) => remaining(order) > 0 || ['non_paye', 'non payé', 'partiel'].includes(lower(order.statut_paiement || order.payment_status)));
    const receivable = unpaidOrders.reduce((sum, order) => sum + remaining(order), 0);
    const stockCritical = stocks.filter((stock) => Number(stock.seuil || 0) > 0 && Number(stock.quantite || 0) <= Number(stock.seuil || 0));
    const healthLate = sante.filter((row) => ['retard', 'a faire', 'a_faire', 'en retard'].some((term) => lower(row.statut || row.status).includes(term)));
    const openAlerts = alertes.filter((alert) => !closedStatuses.includes(lower(alert.status || alert.statut || 'nouvelle')));
    const openTasks = taches.filter((task) => !closedStatuses.includes(lower(task.status || task.statut || 'a_faire')));
    const docsMissing = arr(props.transactions).filter((trx) => !documents.some((doc) => String(doc.related_id || doc.transaction_id || doc.entity_id || '') === String(trx.id || ''))).slice(0, 99);
    const orphanPayments = payments.filter((payment) => payment.order_id && !salesOrders.some((order) => String(order.id) === String(payment.order_id))).length;
    return [
      unpaidOrders.length ? { icon: CreditCard, title: 'Encaisser les ventes en attente', detail: `${unpaidOrders.length} vente(s), ${fmtCurrency(receivable)} à récupérer`, moduleKey: 'ventes', tone: 'red' } : null,
      openAlerts.length ? { icon: AlertTriangle, title: 'Traiter les alertes', detail: `${openAlerts.length} alerte(s) à regarder`, moduleKey: 'alertes', tone: 'red' } : null,
      stockCritical.length ? { icon: Package, title: 'Revoir le stock faible', detail: `${stockCritical.length} produit(s) sous le seuil`, moduleKey: 'stock', tone: 'amber' } : null,
      healthLate.length ? { icon: Stethoscope, title: 'Rattraper les soins/vaccins', detail: `${healthLate.length} soin(s) ou vaccin(s) à faire`, moduleKey: 'sante', tone: 'amber' } : null,
      openTasks.length ? { icon: CheckCircle2, title: 'Terminer les tâches ouvertes', detail: `${openTasks.length} tâche(s) à suivre`, moduleKey: 'taches', tone: 'amber' } : null,
      docsMissing.length ? { icon: FileText, title: 'Ajouter les justificatifs', detail: `${docsMissing.length} justificatif(s) à compléter`, moduleKey: 'documents', tone: 'neutral' } : null,
      orphanPayments ? { icon: TrendingUp, title: 'Vérifier les ventes supprimées', detail: `${orphanPayments} ancien(s) paiement(s) à contrôler`, moduleKey: 'sync_activity', tone: 'amber' } : null,
    ].filter(Boolean).slice(0, simple ? 4 : 6);
  }, [props, simple]);

  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-[#9a6b12] font-black">Aujourd’hui</p>
        <h2 className="mt-1 text-xl font-black text-[#2f2415]">Ce qu’il faut faire en premier</h2>
        <p className="mt-1 text-sm text-[#8a7456]">Voici les actions importantes à regarder aujourd’hui.</p>
      </div>
      <button type="button" onClick={onToggleExpert} className="rounded-full border border-[#d6c3a0] bg-[#fffdf8] px-3 py-1.5 text-xs font-black text-[#2f2415]"><Settings2 size={13} className="inline" /> {simple ? 'Voir plus de détails' : 'Vue simple'}</button>
    </div>
    {actions.length ? <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">{actions.map((action) => <TodayAction key={`${action.moduleKey}-${action.title}`} {...action} onNavigate={props.onNavigate} />)}</div> : <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"><CheckCircle2 size={16} className="inline" /> Rien d’urgent pour le moment. Continue simplement ton suivi habituel.</div>}
  </section>;
}

export default function DashboardV2(props) {
  const settings = useUiSettings();
  const simple = settings.complexity !== 'expert';
  const toggleExpert = () => {
    const next = { ...settings, complexity: simple ? 'expert' : 'simple' };
    localStorage.setItem('horizon_farm_ui_settings', JSON.stringify(next));
    window.dispatchEvent(new CustomEvent('horizon-farm-ui-settings-changed', { detail: next }));
  };

  return <div className="space-y-6">
    <MonthlyObjectiveStatus props={props} />
    <TodayFocus props={props} simple={simple} onToggleExpert={toggleExpert} />
    <Dashboard {...props} />
    {!simple ? <DashboardEvolution salesOrders={props.salesOrders || []} payments={props.payments || []} transactions={props.transactions || []} productionLogs={props.productionLogs || []} stocks={props.stocks || []} taches={props.taches || []} alertes={props.alertes || []} onNavigate={props.onNavigate} /> : <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-sm text-[#8a7456]">Vue simple activée. Pour afficher les graphiques détaillés, clique sur “Voir plus de détails”.</div>}
  </div>;
}
