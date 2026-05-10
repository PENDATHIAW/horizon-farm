import { AlertTriangle, CheckCircle2, FileText, MessageCircle, ShieldCheck, TrendingUp } from 'lucide-react';
import { fmtCurrency, fmtNumber, toNumber } from '../utils/format';

const arr = (value) => Array.isArray(value) ? value : [];
const lower = (value) => String(value || '').trim().toLowerCase();
const amount = (row = {}) => toNumber(row.montant_total ?? row.total ?? row.amount ?? row.montant ?? row.total_amount ?? 0);
const paid = (row = {}) => toNumber(row.montant_paye ?? row.paid_amount ?? row.paid ?? 0);
const stockQty = (row = {}) => toNumber(row.quantite ?? row.quantity ?? row.stock);
const stockThreshold = (row = {}) => toNumber(row.seuil ?? row.threshold ?? row.seuil_alerte);
const isOpen = (row = {}) => !['termine', 'terminé', 'done', 'closed', 'fermee', 'fermée', 'traitee', 'traitée', 'annule', 'annulé'].includes(lower(row.status || row.statut));
const isCritical = (row = {}) => ['critique', 'urgence', 'critical', 'urgent'].includes(lower(row.severity || row.gravite || row.priority || row.priorite));
const isLateTask = (row = {}) => ['retard', 'en_retard', 'overdue'].includes(lower(row.status || row.statut)) || ['critique', 'urgent'].includes(lower(row.priority || row.priorite));
const isStockCritical = (row = {}) => stockThreshold(row) > 0 && stockQty(row) <= stockThreshold(row);

function Metric({ icon: Icon, label, value, hint, danger = false }) {
  return (
    <div className={`rounded-2xl border p-4 ${danger ? 'bg-red-50 border-red-200' : 'bg-[#fffdf8] border-[#d6c3a0]'}`}>
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[#8a7456]">
        <Icon size={15} /> {label}
      </div>
      <p className={`mt-2 text-2xl font-black ${danger ? 'text-red-600' : 'text-[#2f2415]'}`}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-[#8a7456]">{hint}</p> : null}
    </div>
  );
}

export default function ImpactFarmValueBridge({
  alertes = [],
  taches = [],
  documents = [],
  whatsappLogs = [],
  businessEvents = [],
  stocks = [],
  salesOrders = [],
  payments = [],
}) {
  const openAlerts = arr(alertes).filter(isOpen).length;
  const criticalAlerts = arr(alertes).filter((row) => isOpen(row) && isCritical(row)).length;
  const sensitiveTasks = arr(taches).filter((row) => isOpen(row) && isLateTask(row)).length;
  const criticalStocks = arr(stocks).filter(isStockCritical).length;
  const docsCount = arr(documents).length;
  const whatsappPrepared = arr(whatsappLogs).length;
  const eventsCount = arr(businessEvents).length;
  const salesValue = arr(salesOrders).reduce((sum, row) => sum + amount(row), 0);
  const paidValue = arr(payments).reduce((sum, row) => sum + amount(row) + paid(row), 0);
  const valueProtected = paidValue || salesValue;
  const automations = docsCount + whatsappPrepared + eventsCount + openAlerts + sensitiveTasks;

  const interpretation = criticalAlerts > 0 || criticalStocks > 0
    ? `${fmtNumber(criticalAlerts + criticalStocks)} risque(s) prioritaire(s) sont visibles grâce à l’ERP.`
    : automations > 0
      ? `${fmtNumber(automations)} action(s), traces ou documents sont suivis par l’ERP.`
      : 'La valeur ERP augmentera avec les alertes, tâches, documents, ventes et événements réellement enregistrés.';

  return (
    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><ShieldCheck size={20} /> Valeur opérationnelle ERP</p>
          <p className="mt-1 text-sm text-[#8a7456]">Ce bloc mesure ce que l’ERP rend visible, sécurise ou automatise à partir des données réelles déjà présentes.</p>
        </div>
        <div className="rounded-2xl bg-[#2f2415] px-4 py-3 text-white">
          <p className="text-xs opacity-80">Valeur suivie</p>
          <p className="text-xl font-black">{fmtCurrency(valueProtected)}</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Metric icon={AlertTriangle} label="Alertes ouvertes" value={fmtNumber(openAlerts)} hint={`${fmtNumber(criticalAlerts)} critique(s)`} danger={criticalAlerts > 0} />
        <Metric icon={CheckCircle2} label="Tâches sensibles" value={fmtNumber(sensitiveTasks)} hint="retard / critique" danger={sensitiveTasks > 0} />
        <Metric icon={TrendingUp} label="Stocks critiques" value={fmtNumber(criticalStocks)} hint="sous seuil" danger={criticalStocks > 0} />
        <Metric icon={FileText} label="Documents" value={fmtNumber(docsCount)} hint="preuves / rapports" />
        <Metric icon={MessageCircle} label="WhatsApp logs" value={fmtNumber(whatsappPrepared)} hint="messages préparés" />
        <Metric icon={ShieldCheck} label="Actions ERP" value={fmtNumber(automations)} hint="suivi automatisé" />
      </div>

      <div className="mt-4 rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-sm text-[#7d6a4a]">
        <b className="text-[#2f2415]">Lecture :</b> {interpretation}
      </div>
    </section>
  );
}
