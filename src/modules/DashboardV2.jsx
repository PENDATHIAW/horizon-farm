import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bird,
  CheckCircle2,
  CreditCard,
  DollarSign,
  Egg,
  FileText,
  Package,
  Settings2,
  Sparkles,
  Stethoscope,
  TrendingUp,
} from 'lucide-react';
import Dashboard from './Dashboard.jsx';
import DashboardEvolution from './DashboardEvolution.jsx';
import { readUiSettings } from '../utils/uiPreferences';
import { fmtCurrency } from '../utils/format';

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

function MetricCard({ label, value, unit, icon: Icon, tone = 'emerald', badge, helper }) {
  const tones = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    red: 'bg-red-50 text-red-700 border-red-100',
    teal: 'bg-cyan-50 text-cyan-700 border-cyan-100',
  };

  return (
    <div className="rounded-3xl border border-[#dfe7dd] bg-white p-5 shadow-sm shadow-emerald-900/5 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-900/10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[#6f6a61]">{label}</p>
          <div className="mt-6 flex items-baseline gap-2">
            <span className="text-3xl font-black tracking-tight text-[#1f1f1d]">{value}</span>
            {unit ? <span className="text-sm font-semibold text-[#8a8176]">{unit}</span> : null}
          </div>
        </div>
        <div className={`rounded-xl border p-2.5 ${tones[tone] || tones.emerald}`}>
          <Icon size={18} />
        </div>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-2 text-xs">
        {badge ? <span className={`rounded-lg px-2.5 py-1 font-black ${tones[tone] || tones.emerald}`}>{badge}</span> : null}
        {helper ? <span className="font-medium text-[#8a8176]">{helper}</span> : null}
      </div>
    </div>
  );
}

function ExecutiveOverview({ props }) {
  const stats = useMemo(() => {
    const salesOrders = arr(props.salesOrders);
    const payments = arr(props.payments);
    const stocks = arr(props.stocks);
    const lots = arr(props.lotsData || props.lots);
    const productionLogs = arr(props.productionLogs);

    const revenue = payments.reduce((sum, payment) => sum + amount(payment), 0)
      || salesOrders.reduce((sum, order) => sum + paid(order), 0);
    const receivable = salesOrders.reduce((sum, order) => sum + remaining(order), 0);
    const stockCritical = stocks.filter((stock) => Number(stock.seuil || 0) > 0 && Number(stock.quantite || 0) <= Number(stock.seuil || 0)).length;
    const averageEggs = productionLogs.length
      ? Math.round(productionLogs.reduce((sum, log) => sum + Number(log.quantity || log.quantite || log.eggs_count || 0), 0) / productionLogs.length)
      : lots.reduce((sum, lot) => sum + Number(lot.production_oeufs || lot.eggs_today || 0), 0);
    const activeLots = lots.filter((lot) => !closedStatuses.includes(lower(lot.status || lot.statut || 'actif'))).length || lots.length;

    return { revenue, receivable, stockCritical, averageEggs, activeLots };
  }, [props]);

  return (
    <section className="space-y-5">
      <div className="rounded-[2rem] border border-[#dfe7dd] bg-[#fbfaf7] p-5 md:p-6 shadow-sm shadow-emerald-900/5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> Données à jour
            </div>
            <h1 className="mt-4 text-2xl md:text-3xl font-black tracking-tight text-[#1f1f1d]">
              Bonjour, voici votre tableau de bord Horizon Farm
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-[#6f6a61]">
              Une vue claire de vos ventes, stocks, productions et priorités du jour, avec votre identité Horizon Farm conservée.
            </p>
          </div>
          <div className="rounded-2xl bg-[#0f6b57] px-4 py-3 text-white shadow-lg shadow-emerald-900/20">
            <div className="flex items-center gap-2 text-sm font-black"><Sparkles size={16} /> Horizon Farm Modern ERP</div>
            <p className="mt-1 text-xs text-emerald-50/80">Charte modernisée · Vert premium · Tables lisibles</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Recettes suivies" value={fmtCurrency(stats.revenue)} icon={DollarSign} tone="emerald" badge="Finance" helper="Paiements enregistrés" />
        <MetricCard label="Ponte moyenne" value={stats.averageEggs || 0} unit="œufs/j" icon={Egg} tone="amber" badge={`${stats.activeLots} lot(s)`} helper="Production avicole" />
        <MetricCard label="Stock sous seuil" value={stats.stockCritical} unit="alerte(s)" icon={Package} tone={stats.stockCritical ? 'red' : 'emerald'} badge={stats.stockCritical ? 'À traiter' : 'Stable'} helper="Aliments et intrants" />
        <MetricCard label="Créances clients" value={fmtCurrency(stats.receivable)} icon={CreditCard} tone={stats.receivable ? 'red' : 'teal'} badge={stats.receivable ? 'À relancer' : 'OK'} helper="Reste à payer" />
      </div>
    </section>
  );
}

function TodayAction({ icon: Icon, title, detail, moduleKey, tone = 'amber', onNavigate }) {
  const tones = {
    red: 'border-red-200 bg-red-50 text-red-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    neutral: 'border-[#eadcc2] bg-[#fffdf8] text-[#8a7456]',
  };
  return <button type="button" onClick={() => onNavigate?.(moduleKey)} className={`rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${tones[tone] || tones.neutral}`}>
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

  return <section className="rounded-3xl border border-[#dfe7dd] bg-white p-5 shadow-sm shadow-emerald-900/5 space-y-4">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-[#0f6b57] font-black">Aujourd’hui</p>
        <h2 className="mt-1 text-xl font-black text-[#2f2415]">Ce qu’il faut faire en premier</h2>
        <p className="mt-1 text-sm text-[#8a7456]">Vos actions importantes restent visibles sans surcharger le tableau de bord.</p>
      </div>
      <button type="button" onClick={onToggleExpert} className="rounded-full border border-[#dfe7dd] bg-[#fffdf8] px-3 py-1.5 text-xs font-black text-[#2f2415]"><Settings2 size={13} className="inline" /> {simple ? 'Voir plus de détails' : 'Vue simple'}</button>
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
    <ExecutiveOverview props={props} />
    <TodayFocus props={props} simple={simple} onToggleExpert={toggleExpert} />
    <Dashboard {...props} />
    {!simple ? <DashboardEvolution salesOrders={props.salesOrders || []} payments={props.payments || []} transactions={props.transactions || []} productionLogs={props.productionLogs || []} stocks={props.stocks || []} taches={props.taches || []} alertes={props.alertes || []} onNavigate={props.onNavigate} /> : <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-sm text-[#8a7456]">Vue simple activée. Pour afficher les graphiques détaillés, clique sur “Voir plus de détails”.</div>}
  </div>;
}
