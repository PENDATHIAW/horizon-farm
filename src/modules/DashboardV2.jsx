import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, CreditCard, FileText, Package, Settings2, Stethoscope, TrendingUp } from 'lucide-react';
import Dashboard from './Dashboard.jsx';
import DashboardEvolution from './DashboardEvolution.jsx';
import { readUiSettings } from '../utils/uiPreferences';
import { fmtCurrency } from '../utils/format';

const arr = (value) => Array.isArray(value) ? value : [];
const lower = (value) => String(value || '').trim().toLowerCase();
const openStatuses = ['nouvelle', 'ouvert', 'ouverte', 'a_faire', 'à faire', 'retard', 'en_cours', 'urgent'];
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
      unpaidOrders.length ? { icon: CreditCard, title: 'Encaisser les commandes ouvertes', detail: `${unpaidOrders.length} commande(s), ${fmtCurrency(receivable)} à récupérer`, moduleKey: 'ventes', tone: 'red' } : null,
      openAlerts.length ? { icon: AlertTriangle, title: 'Traiter les alertes actives', detail: `${openAlerts.length} alerte(s) visible(s) dans le Centre Alertes`, moduleKey: 'alertes', tone: 'red' } : null,
      stockCritical.length ? { icon: Package, title: 'Réapprovisionner le stock critique', detail: `${stockCritical.length} produit(s) sous seuil`, moduleKey: 'stock', tone: 'amber' } : null,
      healthLate.length ? { icon: Stethoscope, title: 'Rattraper les soins/vaccins', detail: `${healthLate.length} action(s) santé en retard ou à faire`, moduleKey: 'sante', tone: 'amber' } : null,
      openTasks.length ? { icon: CheckCircle2, title: 'Fermer les tâches ouvertes', detail: `${openTasks.length} tâche(s) à planifier ou terminer`, moduleKey: 'taches', tone: 'amber' } : null,
      docsMissing.length ? { icon: FileText, title: 'Compléter les justificatifs', detail: `${docsMissing.length} transaction(s) potentiellement sans preuve`, moduleKey: 'documents', tone: 'neutral' } : null,
      orphanPayments ? { icon: TrendingUp, title: 'Vérifier les paiements orphelins', detail: `${orphanPayments} paiement(s) lié(s) à une commande absente`, moduleKey: 'sync_activity', tone: 'amber' } : null,
    ].filter(Boolean).slice(0, simple ? 4 : 6);
  }, [props]);

  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-[#9a6b12] font-black">Aujourd’hui</p>
        <h2 className="mt-1 text-xl font-black text-[#2f2415]">Ce qu’il faut faire en premier</h2>
        <p className="mt-1 text-sm text-[#8a7456]">Priorités calculées depuis les modules ERP actifs.</p>
      </div>
      <button type="button" onClick={onToggleExpert} className="rounded-full border border-[#d6c3a0] bg-[#fffdf8] px-3 py-1.5 text-xs font-black text-[#2f2415]"><Settings2 size={13} className="inline" /> {simple ? 'Voir mode expert' : 'Mode simple'}</button>
    </div>
    {actions.length ? <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">{actions.map((action) => <TodayAction key={`${action.moduleKey}-${action.title}`} {...action} onNavigate={props.onNavigate} />)}</div> : <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"><CheckCircle2 size={16} className="inline" /> Rien de critique détecté. Continue le suivi des ventes, du stock et des preuves.</div>}
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
    <TodayFocus props={props} simple={simple} onToggleExpert={toggleExpert} />
    <Dashboard {...props} />
    {!simple ? <DashboardEvolution salesOrders={props.salesOrders || []} payments={props.payments || []} transactions={props.transactions || []} productionLogs={props.productionLogs || []} stocks={props.stocks || []} taches={props.taches || []} alertes={props.alertes || []} onNavigate={props.onNavigate} /> : <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-sm text-[#8a7456]">Mode simple actif : les graphiques avancés du Dashboard sont masqués. Active le mode expert dans Paramètres pour les afficher.</div>}
  </div>;
}
