import { fmtCurrency, fmtNumber } from '../../utils/format';
import { runErpHealthEngine } from '../../services/erpHealthEngine.js';
import { filterRealOpenTasks } from '../../utils/healthFindingLabels.js';
import { remainingForOrder } from '../../utils/salesStatuses.js';
import { computeFinancePeriodSummary } from '../dashboard/dashboardMetrics.js';
import { isOpportunityOpen, saleAmount } from '../commercial/commercialMetrics.js';

export const arr = (v) => (Array.isArray(v) ? v : []);
export const low = (v) => String(v || '').toLowerCase();
export const n = (v = 0) => Number(v || 0);
export const amount = (r = {}) => n(r.montant ?? r.amount ?? r.total ?? r.montant_total ?? r.valeur ?? r.value);
export const label = (r = {}) => r.title || r.nom || r.name || r.libelle || r.description || r.produit || r.id || 'Élément';
export const dateOf = (r = {}) => r.date || r.event_date || r.created_at || r.updated_at || '—';
export const isIncome = (r = {}) => ['entree', 'entrée', 'income', 'recette', 'vente'].includes(low(r.type || r.nature || r.sens));
export const isExpense = (r = {}) => ['sortie', 'expense', 'depense', 'dépense', 'achat', 'charge'].includes(low(r.type || r.nature || r.sens));
export const isOpen = (r = {}) => !['termine', 'terminé', 'closed', 'clos', 'resolu', 'résolu', 'done'].includes(low(r.status || r.statut || r.state));
export const isRisk = (r = {}) => ['retard', 'critique', 'urgent', 'malade', 'panne', 'hors_service', 'impaye', 'partiel', 'a_risque'].some((x) => low(`${r.status || ''} ${r.statut || ''} ${r.priority || ''} ${r.severity || ''} ${r.health_status || ''}`).includes(x));
export const stockQty = (r = {}) => n(r.quantite ?? r.quantity ?? r.stock);
export const stockThreshold = (r = {}) => n(r.seuil ?? r.threshold ?? r.stock_min ?? r.minimum_stock);
export const score = (good, total) => (total ? Math.round((good / total) * 100) : 100);

export function Stat({ label: statLabel, value, tone = 'neutral' }) {
  const cls = tone === 'good' ? 'text-emerald-600' : tone === 'warn' ? 'text-amber-600' : tone === 'bad' ? 'text-red-600' : 'text-[#2f2415]';
  return <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4"><p className="text-xs text-[#8a7456]">{statLabel}</p><p className={`mt-1 text-xl font-black ${cls}`}>{value}</p></div>;
}
export function Section({ icon: Icon, title, children, action }) {
  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm"><div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><h2 className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><Icon size={20} /> {title}</h2>{action}</div>{children}</section>;
}
export function Pill({ children, tone = 'neutral' }) {
  const cls = tone === 'good' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : tone === 'warn' ? 'border-amber-200 bg-amber-50 text-amber-700' : tone === 'bad' ? 'border-red-200 bg-red-50 text-red-700' : 'border-[#eadcc2] bg-[#fffdf8] text-[#8a7456]';
  return <span className={`rounded-full border px-3 py-1 text-xs font-black ${cls}`}>{children}</span>;
}
export function Row({ title, detail, value, tone = 'neutral', onClick, actions }) {
  return (
    <div className="grid w-full grid-cols-1 gap-2 border-b border-[#eadcc2]/70 py-4 last:border-b-0 md:grid-cols-[260px_1fr_auto] md:items-center">
      <button type="button" onClick={onClick} className="text-left font-black text-[#2f2415] hover:text-emerald-700">{title}</button>
      <span className="text-sm text-[#8a7456]">{detail}</span>
      <div className="flex flex-wrap items-center gap-2">{actions || <Pill tone={tone}>{value}</Pill>}</div>
    </div>
  );
}
export function Empty({ children }) {
  return <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-5 text-sm text-[#8a7456]">{children}</div>;
}
export function Btn({ children, onClick }) {
  return <button type="button" onClick={onClick} className="rounded-xl border border-[#d6c3a0] bg-[#fffdf8] px-3 py-2 text-xs font-black text-[#2f2415] hover:bg-[#dcfce7]">{children}</button>;
}

export const VISION_TABLE_COLS = ['Sujet', 'Détail', 'Statut', 'Actions'];
export const PRIORITY_TABLE_COLS = ['Priorité', 'Détail', 'Statut', 'Actions'];
export const VISION_TABLE_COLS_3 = ['Sujet', 'Détail', 'Actions'];

const TABLE_GRID_4 = 'md:grid-cols-[minmax(160px,1.1fr)_minmax(180px,2fr)_minmax(96px,0.75fr)_auto]';
const TABLE_GRID_3 = 'md:grid-cols-[minmax(160px,1.2fr)_minmax(200px,2fr)_auto]';

export function TableHeader({ columns = VISION_TABLE_COLS }) {
  const gridCls = columns.length === 3 ? TABLE_GRID_3 : TABLE_GRID_4;
  return (
    <div className={`hidden md:grid gap-3 border-b-2 border-[#d6c3a0] bg-[#fffdf8] px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.14em] text-[#8a7456] ${gridCls}`}>
      {columns.map((col) => <span key={col}>{col}</span>)}
    </div>
  );
}

export function VisionKpi({ label, value, tone = 'neutral', detail, onClick }) {
  const toneCls = tone === 'good' ? 'text-emerald-700' : tone === 'warn' ? 'text-amber-700' : tone === 'bad' ? 'text-red-600' : 'text-[#2f2415]';
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag type={onClick ? 'button' : undefined} onClick={onClick} className={`rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-left ${onClick ? 'transition hover:border-[#c9a96a] hover:bg-white' : ''}`}>
      <p className="text-[11px] font-bold uppercase tracking-wide text-[#8a7456]">{label}</p>
      <p className={`mt-1 text-xl font-black ${toneCls}`}>{value}</p>
      {detail ? <p className="mt-1 text-[10px] leading-snug text-[#8a7456]">{detail}</p> : null}
    </Tag>
  );
}

export function DataRow({ title, detail, status, tone = 'neutral', onClick, actions, columns = 4 }) {
  const gridCls = columns === 3 ? TABLE_GRID_3 : TABLE_GRID_4;
  return (
    <div className={`grid grid-cols-1 gap-2 border-b border-[#eadcc2]/70 px-4 py-3 last:border-b-0 ${gridCls} md:items-center`}>
      <button type="button" onClick={onClick} className="text-left font-black text-[#2f2415] hover:text-emerald-700">{title}</button>
      <span className="text-sm text-[#8a7456]">{detail}</span>
      {columns === 4 ? (
        <div className="flex items-center">{status ? <Pill tone={tone}>{status}</Pill> : <span className="text-xs text-[#8a7456]">—</span>}</div>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">{actions || (columns === 3 && status ? <Pill tone={tone}>{status}</Pill> : null)}</div>
    </div>
  );
}

export function DataTable({ columns = VISION_TABLE_COLS, children }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#eadcc2] bg-white">
      <TableHeader columns={columns} />
      <div>{children}</div>
    </div>
  );
}

export function TabIntro({ title, detail, action }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-[#eadcc2] bg-[#fffdf8] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-black text-[#2f2415]">{title}</p>
        {detail ? <p className="mt-0.5 text-xs text-[#8a7456]">{detail}</p> : null}
      </div>
      {action || null}
    </div>
  );
}

export function riskLevelLabel(level = '') {
  const map = { critique: 'Critique', eleve: 'Élevé', haute: 'Élevé', moyen: 'Moyen', moyenne: 'Moyen', faible: 'Faible', basse: 'Faible' };
  return map[low(level)] || level || '—';
}

function mapEngineRisk(r) {
  const tone = r.level === 'critique' || r.level === 'eleve' ? 'bad' : r.level === 'moyen' ? 'warn' : 'good';
  return {
    id: r.id,
    domain: r.domain || 'IA',
    title: r.title,
    cause: r.detail,
    impact: `Indice ${r.score}/100`,
    action: r.level === 'critique' ? 'Traiter immédiatement' : 'Surveiller',
    module: r.module,
    severity: riskLevelLabel(r.level),
    probability: r.level === 'critique' || r.level === 'eleve' ? 'Élevée' : 'Moyenne',
    financialImpact: '—',
    owner: '—',
    due: '—',
    resolutionStatus: 'ouverte',
    tone,
    engineRisk: true,
  };
}

function mapEnginePrediction(p) {
  return {
    id: p.id,
    title: p.title,
    description: p.description,
    recommended_action: p.recommended_action,
    module: p.module,
    severity: p.severity,
    days_left: p.days_left,
    horizon: p.days_left != null ? `${p.days_left} j` : '—',
    type: p.type,
  };
}

export function buildRisks(data) {
  const risks = [];
  data.openAlerts.forEach((r) => risks.push({ id: `alert-${r.id || label(r)}`, domain: 'Alerte', title: label(r), cause: r.message || r.description || 'Alerte ouverte', impact: 'Risque opérationnel non clôturé', action: 'Traiter ou transformer en tâche', module: 'activite_suivi', navTab: 'Alertes', severity: low(r.severity).includes('critique') ? 'Critique' : 'Moyenne', probability: 'Élevée', financialImpact: r.amount ? fmtCurrency(r.amount) : '—', owner: r.responsable || '—', due: dateOf(r), resolutionStatus: r.status || 'ouverte', tone: low(r.severity).includes('critique') ? 'bad' : 'warn' }));
  data.openTasks.filter(isRisk).forEach((r) => risks.push({ id: `task-${r.id || label(r)}`, domain: 'Tâche', title: label(r), cause: r.description || 'Tâche prioritaire', impact: 'Retard possible sur exploitation', action: 'Planifier ou clôturer', module: 'activite_suivi', navTab: 'Tâches', severity: 'Moyenne', probability: 'Moyenne', financialImpact: '—', owner: r.assigned_to || '—', due: r.due_date || '—', resolutionStatus: r.status || 'ouverte', tone: 'warn' }));
  data.stocks.filter((r) => stockThreshold(r) > 0 && stockQty(r) <= stockThreshold(r)).forEach((r) => risks.push({ id: `stock-${r.id || label(r)}`, domain: 'Stock', title: label(r), cause: `${fmtNumber(stockQty(r))} disponible · seuil ${fmtNumber(stockThreshold(r))}`, impact: 'Rupture ou arrêt activité', action: 'Réapprovisionner', module: 'achats_stock', navTab: 'Stock', severity: stockQty(r) <= 0 ? 'Critique' : 'Moyenne', probability: 'Élevée', financialImpact: fmtCurrency(stockQty(r) * n(r.prix_unitaire)), owner: '—', due: '—', resolutionStatus: 'ouverte', tone: stockQty(r) <= 0 ? 'bad' : 'warn' }));
  data.animaux.filter(isRisk).forEach((r) => risks.push({ id: `animal-${r.id || label(r)}`, domain: 'Élevage', title: label(r), cause: r.health_status || r.status || 'Suivi santé', impact: 'Perte, contagion ou vente bloquée', action: 'Vérifier fiche santé', module: 'elevage', navTab: 'Santé', severity: 'Critique', probability: 'Élevée', financialImpact: '—', owner: '—', due: '—', resolutionStatus: 'ouverte', tone: 'bad' }));
  if (data.treasuryResult < 0) risks.push({ id: 'cash-negative', domain: 'Finance', title: 'Trésorerie en tension', cause: 'Encaissements < charges sur la période', impact: 'Tension de liquidité', action: 'Accélérer encaissements', module: 'finance_pilotage', navTab: 'Trésorerie', severity: 'Critique', probability: 'Certaine', financialImpact: fmtCurrency(Math.abs(data.treasuryResult)), owner: '—', due: '—', resolutionStatus: 'ouverte', tone: 'bad' });
  if (data.receivable > 0) risks.push({ id: 'receivable', domain: 'Commercial', title: 'Encaissements à suivre', cause: `${fmtCurrency(data.receivable)} restant à encaisser`, impact: 'Cash bloqué chez les clients', action: 'Relancer clients', module: 'commercial', navTab: 'Clients', severity: 'Moyenne', probability: 'Moyenne', financialImpact: fmtCurrency(data.receivable), owner: '—', due: '—', resolutionStatus: 'ouverte', tone: 'warn' });
  if (data.missingProof > 0) risks.push({ id: 'missing-proof', domain: 'Documents', title: 'Preuves manquantes', cause: `${data.missingProof} opération(s) sans justificatif`, impact: 'Dossiers financeurs fragilisés', action: 'Ajouter preuves', module: 'documents_rapports', navTab: 'Preuves', severity: 'Moyenne', probability: 'Certaine', financialImpact: '—', owner: '—', due: '—', resolutionStatus: 'ouverte', tone: 'warn' });
  return risks.slice(0, 40);
}

export function buildVisionData(props = {}) {
  const { dataMap = {}, animaux = [], lots = [], cultures = [], stocks = [], clients = [], salesOrders = [], payments = [], finances = [], transactions = [], investissements = [], businessPlans = [], documents = [], alertes = [], taches = [], opportunities = [], salesOpportunities = [] } = props;
  const periodFiltered = Boolean(props.periodFiltered);
  const allAnimals = arr(animaux).length ? arr(animaux) : arr(dataMap.animaux);
  const allLots = arr(lots).length ? arr(lots) : arr(dataMap.lots || dataMap.avicole);
  const allCultures = arr(cultures).length ? arr(cultures) : arr(dataMap.cultures);
  const allStocks = arr(stocks).length ? arr(stocks) : arr(dataMap.stocks || dataMap.stock);
  const allClients = arr(clients).length ? arr(clients) : arr(dataMap.clients);
  const salesPeriod = arr(salesOrders).length ? arr(salesOrders) : arr(dataMap.salesOrders || dataMap.sales_orders);
  const salesAll = arr(props.salesOrdersAll).length ? arr(props.salesOrdersAll) : salesPeriod;
  const sales = periodFiltered ? salesPeriod : salesAll;
  const payPeriod = arr(payments).length ? arr(payments) : arr(dataMap.payments);
  const payAll = arr(props.paymentsAll).length ? arr(props.paymentsAll) : payPeriod;
  const pay = periodFiltered ? payPeriod : payAll;
  const txPeriod = [...arr(finances), ...arr(transactions), ...arr(dataMap.finances), ...arr(dataMap.transactions)].filter(Boolean);
  const txAll = arr(props.transactionsAll).length ? arr(props.transactionsAll) : txPeriod;
  const tx = periodFiltered ? txPeriod : txAll;
  const plans = arr(businessPlans).length ? arr(businessPlans) : arr(dataMap.business_plans);
  const invest = arr(investissements).length ? arr(investissements) : arr(dataMap.investissements);
  const docs = arr(documents).length ? arr(documents) : arr(dataMap.documents);
  const opps = [...arr(opportunities), ...arr(salesOpportunities), ...arr(dataMap.sales_opportunities)].filter(Boolean);
  const openOpportunities = opps.filter(isOpportunityOpen);
  const pipelineTotal = openOpportunities.reduce((sum, row) => sum + saleAmount(row), 0);
  const financePeriods = computeFinancePeriodSummary(pay, tx, props.periodScope || {});
  const treasuryResult = periodFiltered ? financePeriods.resultatPeriod : financePeriods.resultatAllTime;
  const encaisseDisplay = periodFiltered ? financePeriods.encaissePeriod : financePeriods.encaisseAllTime;
  const openAlerts = arr(alertes).length ? arr(alertes).filter(isOpen) : arr(dataMap.alertes_center || dataMap.alertes).filter(isOpen);
  const rawTasks = arr(taches).length ? arr(taches) : arr(dataMap.taches || dataMap.tasks);
  const openTasks = filterRealOpenTasks(rawTasks.filter(isOpen));
  const income = tx.filter(isIncome).reduce((s, r) => s + amount(r), 0);
  const expenses = tx.filter((r) => isExpense(r) || (!isIncome(r) && amount(r) > 0)).reduce((s, r) => s + amount(r), 0);
  const salesAmount = sales.reduce((s, r) => s + amount(r), 0);
  const collected = pay.reduce((s, r) => s + amount(r), 0);
  const stockValue = allStocks.reduce((s, r) => s + stockQty(r) * n(r.prix_unitaire ?? r.unit_price ?? r.price), 0);
  const investmentValue = invest.reduce((s, r) => s + amount(r), 0);
  const missingProof = tx.filter((r) => amount(r) > 0 && !r.document_id && !r.proof_url && !r.justificatif_id).length;
  const receivable = salesAll.reduce((sum, order) => sum + remainingForOrder(order, payAll), 0);
  const grossMargin = income - expenses;
  const base = { animaux: allAnimals, lots: allLots, cultures: allCultures, stocks: allStocks, clients: allClients, sales, payments: pay, income, expenses, balance: income - expenses, treasuryResult, encaisseDisplay, financePeriods, margin: grossMargin, grossMargin, netMargin: grossMargin, salesAmount, collected, stockValue, investmentValue, receivable, estimatedValue: stockValue + investmentValue + Math.max(0, grossMargin), productionCount: allAnimals.length + allLots.length + allCultures.length, goals: [...plans, ...invest], opportunities: opps, openOpportunities, pipelineTotal, documents: docs, missingProof, openAlerts, openTasks, debts: expenses, receivables: receivable, periodFiltered, periodLabel: props.periodLabel || '', openAlertsCount: openAlerts.length, openTasksCount: openTasks.length, criticalStockCount: allStocks.filter((r) => stockThreshold(r) > 0 && stockQty(r) <= stockThreshold(r)).length };
  const risks = buildRisks(base);
  const priorities = [
    ...openAlerts.slice(0, 5).map((r) => ({ id: `a-${r.id || label(r)}`, title: label(r), detail: r.message || 'Alerte ouverte', value: 'Alerte', tone: 'warn', tab: 'Risques', sourceModule: r.module_source || 'activite_suivi', record: r })),
    ...openTasks.filter(isRisk).slice(0, 5).map((r) => ({ id: `t-${r.id || label(r)}`, title: label(r), detail: 'Tâche prioritaire', value: 'Action', tone: 'warn', tab: 'Risques', sourceModule: r.module_lie || 'activite_suivi', record: r })),
    ...(missingProof ? [{ id: 'proofs', title: 'Preuves manquantes', detail: `${missingProof} justificatif(s)`, value: 'Financeurs', tone: 'warn', tab: 'Financeurs', navModule: 'objectifs_croissance', sourceModule: 'documents_rapports' }] : []),
    ...(grossMargin < 0 || treasuryResult < 0 ? [{ id: 'cash', title: 'Trésorerie en tension', detail: periodFiltered ? 'Encaissements < charges sur la période' : 'Résultat cumulé négatif', value: 'Finance', tone: 'bad', tab: 'Risques', sourceModule: 'finance_pilotage', navTab: 'Trésorerie' }] : []),
  ];
  const riskCount = risks.length;
  const totalObjects = allAnimals.length + allLots.length + allCultures.length + openAlerts.length + openTasks.length + allStocks.length + 1;

  const engineInput = {
    ...dataMap,
    animaux: allAnimals,
    avicole: allLots,
    lots: allLots,
    cultures: allCultures,
    stock: allStocks,
    stocks: allStocks,
    clients: allClients,
    sales_orders: sales,
    salesOrders: sales,
    payments: pay,
    finances: tx,
    transactions: tx,
    documents: docs,
    alertes_center: openAlerts,
    taches: openTasks,
    business_plans: plans,
    investissements: invest,
    fournisseurs: arr(dataMap.fournisseurs),
    sante: arr(dataMap.sante),
    alimentation_logs: arr(dataMap.alimentation_logs),
    production_oeufs_logs: arr(dataMap.production_oeufs_logs),
  };
  const health = runErpHealthEngine(engineInput);
  const kpiEngines = runKpiEngine(engineInput, { module: props.moduleId || 'centre_ia', periodScope: props.periodScope || {} });
  const engineRisks = health.risks.map(mapEngineRisk);
  const mergedRisks = [...engineRisks, ...risks.filter((r) => !engineRisks.some((e) => e.domain === r.domain && e.title === r.title))].slice(0, 50);
  const predictions = health.predictions.map(mapEnginePrediction);
  const groupedPriorities = (health.operationalPriorities || []).map((group) => ({
    id: group.id || group.issue_key,
    issue_key: group.issue_key,
    title: group.title,
    detail: `${group.detail || group.action || '—'} · ${group.linkedCount || 0} lien(s)`,
    value: group.linkedCount > 1 ? 'Groupe' : 'Priorité',
    tone: group.tone || 'warn',
    tab: group.tab || 'À traiter',
    sourceModule: group.module,
    isGrouped: true,
    isEngine: true,
  }));
  const enginePriorities = health.findings.slice(0, 12).map((f) => ({
    id: f.id,
    title: f.title,
    detail: f.recommended_action || f.description || '—',
    value: 'IA',
    tone: f.severity === 'critique' || f.severity === 'haute' ? 'bad' : 'warn',
    tab: 'À traiter',
    sourceModule: f.module || 'objectifs_croissance',
    finding: f,
    isEngine: true,
  }));
  const mergedPriorities = [...groupedPriorities, ...enginePriorities, ...priorities.filter((p) => !enginePriorities.some((e) => e.id === p.id) && !groupedPriorities.some((g) => g.issue_key && g.issue_key === p.id))].slice(0, 18);
  const unreliableMargins = health.findings.filter((f) => f.category === 'rentabilite' || f.margin_reliable === false).length;
  const iaOpportunities = health.findings
    .filter((f) => f.recommended_action && !['critique', 'haute'].includes(f.severity))
    .slice(0, 6)
    .map((f) => ({
      id: f.id,
      title: f.title,
      notes: f.recommended_action,
      montant_estime: 0,
      probability: Math.round((f.confidence_score || 0.8) * 100),
      module: f.module,
    }));

  return {
    ...base,
    priorities: mergedPriorities,
    risks: mergedRisks,
    riskCount: mergedRisks.length,
    globalScore: health.score || score(totalObjects - riskCount, totalObjects),
    healthScore: health.score,
    predictions,
    healthFindings: health.findings,
    issueGroups: health.issueGroups || [],
    kpiEngines,
    engineRisks: health.risks,
    unreliableMargins,
    iaOpportunities,
  };
}
