import { AlertTriangle, BarChart3, CheckCircle2, FileCheck2, Link as LinkIcon, Package, Receipt, ShieldCheck, Sparkles, Target, TrendingUp, Zap } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, LabelList, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import KpiCard from '../components/KpiCard';
import SectionHeader from '../components/SectionHeader';
import { fmtCurrency, fmtNumber, toNumber } from '../utils/format';

const arr = (value) => Array.isArray(value) ? value : [];
const lower = (value) => String(value || '').trim().toLowerCase();
const money = (value) => fmtCurrency(Number(value || 0));
const pct = (value) => `${Number(value || 0).toFixed(1)}%`;
const amount = (row = {}) => toNumber(row.amount ?? row.montant ?? row.total ?? row.total_amount ?? row.value ?? row.valeur ?? 0);
const rowDate = (row = {}) => row.date || row.created_at || row.updated_at || row.paid_at || row.payment_date || row.order_date || row.date_commande;
const eggCount = (row = {}) => toNumber(row.oeufs_produits ?? row.eggs ?? row.quantity ?? row.quantite);
const brokenEggs = (row = {}) => toNumber(row.oeufs_casses ?? row.broken ?? row.casses ?? row.pertes);
const stockQty = (row = {}) => toNumber(row.quantite ?? row.quantity ?? row.stock);
const stockThreshold = (row = {}) => toNumber(row.seuil ?? row.threshold ?? row.seuil_alerte);
const stockUnitPrice = (row = {}) => toNumber(row.prix_unitaire ?? row.unit_price ?? row.price ?? row.cout_unitaire);

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

function statusOf(row = {}) {
  return lower(row.status || row.statut || row.payment_status || row.statut_paiement);
}

function isUnpaid(row = {}) {
  return ['impaye', 'impayé', 'partiel', 'partial', 'en_retard', 'retard', 'overdue', 'unpaid'].includes(statusOf(row));
}

function isExpense(row = {}) {
  const text = lower(`${row.type || ''} ${row.categorie || ''} ${row.category || ''} ${row.sens || ''}`);
  return ['sortie', 'depense', 'dépense', 'charge', 'achat', 'expense'].some((key) => text.includes(key));
}

function isRevenue(row = {}) {
  const text = lower(`${row.type || ''} ${row.categorie || ''} ${row.category || ''} ${row.sens || ''}`);
  return ['entree', 'entrée', 'revenu', 'recette', 'vente', 'income'].some((key) => text.includes(key));
}

function isLateHealth(row = {}) {
  if (['retard', 'en_retard', 'overdue'].includes(statusOf(row))) return true;
  const due = asDate(row.prevue || row.date_prevue || row.due_date);
  return Boolean(due && !row.effectuee && due < new Date());
}

function isStockCritical(row = {}) {
  const threshold = stockThreshold(row);
  return threshold > 0 && stockQty(row) <= threshold;
}

function isClosed(row = {}) {
  return ['traitee', 'traitée', 'resolue', 'résolue', 'fermee', 'fermée', 'done', 'closed'].includes(statusOf(row));
}

function groupMonthly({ salesOrders = [], payments = [], transactions = [], productionLogs = [], alertes = [] }) {
  const map = new Map();
  const ensure = (key) => {
    if (!map.has(key)) map.set(key, { key, mois: monthLabel(key), commandes: 0, encaissements: 0, depenses: 0, marge: 0, oeufs: 0, pertes: 0, alertes: 0 });
    return map.get(key);
  };
  arr(salesOrders).forEach((row) => { ensure(monthKey(rowDate(row))).commandes += amount(row); });
  arr(payments).forEach((row) => { ensure(monthKey(rowDate(row))).encaissements += amount(row); });
  arr(transactions).forEach((row) => {
    const bucket = ensure(monthKey(rowDate(row)));
    if (isRevenue(row)) bucket.encaissements += amount(row);
    if (isExpense(row)) bucket.depenses += amount(row);
  });
  arr(productionLogs).forEach((row) => {
    const bucket = ensure(monthKey(rowDate(row)));
    bucket.oeufs += eggCount(row);
    bucket.pertes += brokenEggs(row);
  });
  arr(alertes).filter((row) => ['urgence', 'critique'].includes(lower(row.severity || row.gravite))).forEach((row) => {
    ensure(monthKey(rowDate(row))).alertes += 1;
  });
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key)).map((row) => ({ ...row, marge: row.encaissements - row.depenses }));
}

function computeValue({ animaux = [], lots = [], productionLogs = [], sante = [], stocks = [], transactions = [], salesOrders = [], payments = [], alertes = [], taches = [], documents = [], whatsappLogs = [], businessEvents = [] }) {
  const animalRows = arr(animaux);
  const lotRows = arr(lots);
  const prodRows = arr(productionLogs);
  const healthRows = arr(sante);
  const stockRows = arr(stocks);
  const txRows = arr(transactions);
  const orderRows = arr(salesOrders);
  const paymentRows = arr(payments);
  const alertRows = arr(alertes);
  const taskRows = arr(taches);
  const documentRows = arr(documents);
  const whatsappRows = arr(whatsappLogs);
  const eventRows = arr(businessEvents);

  const commandes = orderRows.reduce((sum, row) => sum + amount(row), 0);
  const encaissements = paymentRows.reduce((sum, row) => sum + amount(row), 0) + txRows.filter(isRevenue).reduce((sum, row) => sum + amount(row), 0);
  const depenses = txRows.filter(isExpense).reduce((sum, row) => sum + amount(row), 0);
  const marge = encaissements - depenses;
  const unpaid = [...orderRows, ...paymentRows, ...txRows].filter(isUnpaid);
  const creances = unpaid.reduce((sum, row) => sum + amount(row), 0);

  const criticalStocks = stockRows.filter(isStockCritical);
  const valuedStocks = stockRows.filter((row) => stockUnitPrice(row) > 0);
  const stockValue = valuedStocks.reduce((sum, row) => sum + stockQty(row) * stockUnitPrice(row), 0);
  const criticalStockValue = criticalStocks.reduce((sum, row) => sum + stockQty(row) * stockUnitPrice(row), 0);

  const eggs = prodRows.reduce((sum, row) => sum + eggCount(row), 0);
  const eggLoss = prodRows.reduce((sum, row) => sum + brokenEggs(row), 0);
  const eggLossRate = eggs > 0 ? (eggLoss / eggs) * 100 : 0;
  const lateHealth = healthRows.filter(isLateHealth);
  const sickAnimals = animalRows.filter((row) => lower(row.health_status).includes('malade'));
  const riskyLots = lotRows.filter((row) => toNumber(row.malades ?? row.sick_count) > 0 || ['malade', 'critique', 'sous_traitement'].some((key) => lower(row.health_status).includes(key)));
  const openCriticalAlerts = alertRows.filter((row) => ['urgence', 'critique'].includes(lower(row.severity || row.gravite)) && !isClosed(row));
  const lateTasks = taskRows.filter((row) => ['retard', 'en_retard', 'critique'].includes(statusOf(row)) || lower(row.priority || row.priorite) === 'critique');

  const actionsAuto = alertRows.length + taskRows.length + documentRows.length + whatsappRows.length + eventRows.length;
  const dataRecords = animalRows.length + lotRows.length + prodRows.length + healthRows.length + stockRows.length + txRows.length + orderRows.length + paymentRows.length + alertRows.length + taskRows.length;
  const risksVisible = criticalStocks.length + lateHealth.length + sickAnimals.length + riskyLots.length + unpaid.length + openCriticalAlerts.length + lateTasks.length;
  const dataQuality = dataRecords > 0 ? Math.min(100, ((valuedStocks.length + paymentRows.length + txRows.length + prodRows.length + healthRows.length + alertRows.length + taskRows.length) / Math.max(1, stockRows.length + orderRows.length + txRows.length + prodRows.length + healthRows.length + alertRows.length + taskRows.length)) * 100) : 0;
  const monthly = groupMonthly({ salesOrders, payments, transactions, productionLogs, alertes });

  const visibleCards = [
    { title: 'Risques rendus visibles', value: fmtNumber(risksVisible), detail: 'Stocks critiques, impayés, santé, alertes et tâches sensibles que l’ERP remonte.', icon: AlertTriangle, tone: risksVisible ? 'danger' : 'good', target: 'alertes' },
    { title: 'Argent sécurisé', value: money(encaissements + creances), detail: 'Encaissements suivis + créances identifiées au lieu de rester invisibles.', icon: ShieldCheck, tone: 'good', target: 'finances' },
    { title: 'Actions automatisées', value: fmtNumber(actionsAuto), detail: 'Alertes, tâches, documents, logs WhatsApp et traces créés par les workflows.', icon: Zap, tone: actionsAuto ? 'good' : 'neutral', target: 'taches' },
    { title: 'Décisions immédiates', value: fmtNumber(openCriticalAlerts.length + criticalStocks.length + unpaid.length + lateTasks.length), detail: 'Actions à traiter maintenant : commander, relancer, soigner, corriger, clôturer.', icon: Target, tone: openCriticalAlerts.length ? 'danger' : 'amber', target: 'alertes' },
  ];

  return { commandes, encaissements, depenses, marge, creances, stockValue, criticalStockValue, eggs, eggLoss, eggLossRate, criticalStocks, lateHealth, sickAnimals, riskyLots, unpaid, openCriticalAlerts, lateTasks, actionsAuto, dataRecords, risksVisible, dataQuality, monthly, visibleCards };
}

function ValueCard({ card, onNavigate }) {
  const tones = { good: 'border-emerald-200 bg-emerald-50', danger: 'border-red-200 bg-red-50', amber: 'border-amber-200 bg-amber-50', neutral: 'border-[#d6c3a0] bg-white' };
  const Icon = card.icon;
  return <button type="button" onClick={() => onNavigate?.(card.target)} className={`text-left rounded-2xl border p-5 hover:border-[#b6975f] transition-all ${tones[card.tone] || tones.neutral}`}><div className="flex items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-wide font-semibold text-[#8a7456]">{card.title}</p><p className="text-3xl font-black text-[#2f2415] mt-2">{card.value}</p></div><div className="w-11 h-11 rounded-xl bg-white/80 text-[#2f2415] flex items-center justify-center"><Icon size={20} /></div></div><p className="text-sm text-[#7d6a4a] mt-3">{card.detail}</p></button>;
}

function ProofCard({ label, value, hint }) {
  return <div className="bg-[#fffdf8] border border-[#d6c3a0] rounded-xl p-4"><p className="text-xs text-[#8a7456]">{label}</p><p className="text-2xl font-black text-[#2f2415] mt-1">{value}</p>{hint ? <p className="text-xs text-[#8a7456] mt-1">{hint}</p> : null}</div>;
}

function ChartCard({ title, subtitle, children }) {
  return <div className="bg-white border border-[#d6c3a0] rounded-2xl p-5"><div className="mb-4"><h3 className="font-black text-[#2f2415]">{title}</h3><p className="text-sm text-[#8a7456] mt-1">{subtitle}</p></div><div className="h-72">{children}</div></div>;
}

function MoneyLabel({ x, y, value }) {
  if (!value) return null;
  return <text x={x} y={y - 6} textAnchor="middle" fontSize={11} fill="#2f2415">{Number(value).toLocaleString('fr-FR')}</text>;
}

export default function ImpactBusiness({ animaux = [], lots = [], productionLogs = [], sante = [], stocks = [], transactions = [], salesOrders = [], payments = [], alertes = [], taches = [], documents = [], whatsappLogs = [], businessEvents = [], onNavigate }) {
  const impact = computeValue({ animaux, lots, productionLogs, sante, stocks, transactions, salesOrders, payments, alertes, taches, documents, whatsappLogs, businessEvents });
  const hasMonthly = impact.monthly.length > 0;

  return (
    <div className="space-y-6">
      <SectionHeader title="Impact & Valeur ERP" sub="Ce que Horizon Farm rend visible, sécurise, automatise et aide à décider." />

      <div className="rounded-2xl border border-[#d6c3a0] bg-white p-5">
        <div className="flex items-start gap-3"><div className="w-11 h-11 rounded-xl bg-[#f0e8d8] text-[#7d6a4a] flex items-center justify-center"><Sparkles size={20} /></div><div><h3 className="font-black text-[#2f2415]">Pourquoi ce module existe</h3><p className="text-sm text-[#7d6a4a] mt-1 max-w-4xl">Il montre la valeur concrète de l’ERP : ce qu’il permet de voir plus tôt, l’argent qu’il aide à suivre, les risques qu’il remonte, les actions qu’il automatise et les décisions qu’il accélère. Les montants affichés viennent des données enregistrées ; quand une donnée manque, elle n’est pas inventée.</p></div></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">{impact.visibleCards.map((card) => <ValueCard key={card.title} card={card} onNavigate={onNavigate} />)}</div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard icon={Receipt} label="CA encaissé" value={money(impact.encaissements)} color="bg-emerald-500/20 text-emerald-500" />
        <KpiCard icon={AlertTriangle} label="Créances" value={money(impact.creances)} color="bg-red-500/20 text-red-500" />
        <KpiCard icon={Package} label="Stock valorisé" value={money(impact.stockValue)} color="bg-amber-500/20 text-amber-500" />
        <KpiCard icon={TrendingUp} label="Marge réelle" value={money(impact.marge)} color="bg-sky-500/20 text-sky-500" />
        <KpiCard icon={FileCheck2} label="Qualité données" value={pct(impact.dataQuality)} color="bg-purple-500/20 text-purple-500" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ChartCard title="Évolution financière réelle" subtitle="Commandes, encaissements et dépenses par mois, avec étiquettes visibles.">
          {hasMonthly ? <ResponsiveContainer width="100%" height="100%"><BarChart data={impact.monthly} margin={{ top: 24, right: 16, left: 8, bottom: 8 }}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="mois" /><YAxis tickFormatter={(v) => `${Math.round(v / 1000)}k`} /><Tooltip formatter={(value) => money(value)} /><Legend /><Bar dataKey="commandes" name="Commandes"><LabelList content={<MoneyLabel />} /></Bar><Bar dataKey="encaissements" name="Encaissements"><LabelList content={<MoneyLabel />} /></Bar><Bar dataKey="depenses" name="Dépenses"><LabelList content={<MoneyLabel />} /></Bar></BarChart></ResponsiveContainer> : <p className="text-sm text-[#8a7456]">Aucune donnée datée disponible.</p>}
        </ChartCard>

        <ChartCard title="Marge et alertes critiques" subtitle="La marge réelle est rapprochée des alertes critiques du mois.">
          {hasMonthly ? <ResponsiveContainer width="100%" height="100%"><LineChart data={impact.monthly} margin={{ top: 24, right: 16, left: 8, bottom: 8 }}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="mois" /><YAxis yAxisId="left" tickFormatter={(v) => `${Math.round(v / 1000)}k`} /><YAxis yAxisId="right" orientation="right" allowDecimals={false} /><Tooltip formatter={(value, name) => name === 'Alertes critiques' ? value : money(value)} /><Legend /><Line yAxisId="left" type="monotone" dataKey="marge" name="Marge réelle" strokeWidth={3}><LabelList content={<MoneyLabel />} /></Line><Line yAxisId="right" type="monotone" dataKey="alertes" name="Alertes critiques" strokeWidth={3}><LabelList dataKey="alertes" position="top" /></Line></LineChart></ResponsiveContainer> : <p className="text-sm text-[#8a7456]">Aucune donnée datée disponible.</p>}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ChartCard title="Production et pertes visibles" subtitle="L’ERP rend les pertes visibles au lieu de les laisser disparaître dans le quotidien.">
          {hasMonthly ? <ResponsiveContainer width="100%" height="100%"><BarChart data={impact.monthly} margin={{ top: 24, right: 16, left: 8, bottom: 8 }}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="mois" /><YAxis /><Tooltip /><Legend /><Bar dataKey="oeufs" name="Œufs"><LabelList dataKey="oeufs" position="top" /></Bar><Bar dataKey="pertes" name="Pertes"><LabelList dataKey="pertes" position="top" /></Bar></BarChart></ResponsiveContainer> : <p className="text-sm text-[#8a7456]">Aucune production datée disponible.</p>}
        </ChartCard>

        <div className="bg-white border border-[#d6c3a0] rounded-2xl p-5">
          <div className="flex items-start gap-3 mb-4"><div className="w-10 h-10 rounded-xl bg-[#e8f7ef] text-emerald-600 flex items-center justify-center"><CheckCircle2 size={18} /></div><div><h3 className="font-black text-[#2f2415]">Décisions que l’ERP aide à prendre</h3><p className="text-sm text-[#8a7456] mt-1">Chaque ligne doit mener à une action concrète.</p></div></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <ProofCard label="Commander" value={fmtNumber(impact.criticalStocks.length)} hint="stocks sous seuil" />
            <ProofCard label="Relancer" value={fmtNumber(impact.unpaid.length)} hint="impayés / paiements partiels" />
            <ProofCard label="Soigner / surveiller" value={fmtNumber(impact.lateHealth.length + impact.sickAnimals.length + impact.riskyLots.length)} hint="santé et lots à risque" />
            <ProofCard label="Traiter vite" value={fmtNumber(impact.openCriticalAlerts.length + impact.lateTasks.length)} hint="alertes et tâches critiques" />
          </div>
        </div>
      </div>

      <div className="bg-white border border-[#d6c3a0] rounded-2xl p-5">
        <div className="flex items-start gap-3 mb-4"><div className="w-10 h-10 rounded-xl bg-[#fff3d8] text-[#9a6b12] flex items-center justify-center"><BarChart3 size={18} /></div><div><h3 className="font-black text-[#2f2415]">Résumé digestible de la plus-value</h3><p className="text-sm text-[#8a7456] mt-1">Ce que Horizon Farm apporte aujourd’hui par rapport à une gestion sans ERP.</p></div></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <ProofCard label="Visibilité" value={fmtNumber(impact.risksVisible)} hint="risques et points d’attention remontés" />
          <ProofCard label="Sécurité financière" value={money(impact.encaissements + impact.creances)} hint="encaissé + créances suivies" />
          <ProofCard label="Automatisation" value={fmtNumber(impact.actionsAuto)} hint="traces, tâches, alertes, docs, WhatsApp" />
          <ProofCard label="Données exploitées" value={fmtNumber(impact.dataRecords)} hint="lignes ERP utilisées" />
        </div>
      </div>

      <div className="bg-white border border-[#d6c3a0] rounded-2xl p-5">
        <div className="flex items-start gap-3 mb-4"><div className="w-10 h-10 rounded-xl bg-[#e8f7ef] text-emerald-600 flex items-center justify-center"><LinkIcon size={18} /></div><div><h3 className="font-black text-[#2f2415]">À améliorer pour augmenter la valeur de l’ERP</h3><p className="text-sm text-[#8a7456] mt-1">Plus les données sont complètes, plus Horizon Farm devient puissant.</p></div></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <ProofCard label="Prix stock manquants" value={fmtNumber(Math.max(0, arr(stocks).length - arr(stocks).filter((row) => stockUnitPrice(row) > 0).length))} hint="à compléter pour valoriser le stock" />
          <ProofCard label="Alertes ouvertes" value={fmtNumber(impact.openCriticalAlerts.length)} hint="à traiter pour réduire le risque" />
          <ProofCard label="Tâches critiques" value={fmtNumber(impact.lateTasks.length)} hint="à clôturer ou réaffecter" />
        </div>
      </div>
    </div>
  );
}
