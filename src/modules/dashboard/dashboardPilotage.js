import { getInvestorReadySummary } from '../../services/heyHorizonCore/index.js';
import { fmtCurrency } from '../../utils/format.js';
import { remainingForOrder } from '../../utils/salesStatuses.js';
const arr = (v) => (Array.isArray(v) ? v : []);
const n = (v = 0) => Number(v || 0);
const low = (v) => String(v || '').trim().toLowerCase();
const money = (row = {}) => n(row.montant ?? row.amount ?? row.total ?? row.montant_total);
const paid = (row = {}) => n(row.montant_paye ?? row.paid_amount ?? row.amount_paid ?? row.montant ?? row.amount);
const rowDate = (row = {}) => row.date || row.date_commande || row.created_at || row.date_paiement || '';
const daysSince = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
};

const CLOSED_ALERT = ['traitee', 'traitée', 'resolue', 'résolue', 'fermee', 'fermée', 'annule', 'annulé'];
const isOpenAlert = (row = {}) => !CLOSED_ALERT.includes(low(row.status || row.statut || 'nouvelle'));
const stockQty = (row = {}) => n(row.quantite ?? row.quantity ?? row.stock);
const stockThreshold = (row = {}) => n(row.seuil ?? row.threshold ?? row.stock_min);
const isFeedStock = (row = {}) => /aliment|provende|intrant|granul|maïs|mais|soja|feed/i.test(`${row.produit || row.nom || row.name || ''} ${row.categorie || row.category || ''}`);

function alimentDaysLeft(stocks = [], alimentationLogs = []) {
  const feedRows = arr(stocks).filter(isFeedStock).filter((row) => stockThreshold(row) > 0 || stockQty(row) > 0);
  if (!feedRows.length) return null;
  const critical = feedRows.filter((row) => stockThreshold(row) > 0 && stockQty(row) <= stockThreshold(row));
  if (!critical.length) return null;
  const recentUse = arr(alimentationLogs).slice(0, 14);
  const dailyUse = recentUse.length
    ? recentUse.reduce((sum, row) => sum + n(row.quantite ?? row.quantity ?? row.amount), 0) / Math.max(recentUse.length, 1)
    : 0;
  const minQty = Math.min(...critical.map((row) => stockQty(row)));
  if (dailyUse > 0) return Math.max(1, Math.floor(minQty / dailyUse));
  return 7;
}

function overdueReceivables(salesOrders = [], payments = [], minDays = 30) {
  return arr(salesOrders)
    .map((order) => ({
      order,
      remaining: remainingForOrder(order, payments),
      age: daysSince(rowDate(order)),
    }))
    .filter((row) => row.remaining > 0 && row.age != null && row.age >= minDays);
}

function supplierDebts(fournisseurs = []) {
  return arr(fournisseurs)
    .map((row) => ({
      id: row.id,
      name: row.nom || row.name || 'Fournisseur',
      amount: n(row.dettes ?? row.dette ?? row.solde_du),
    }))
    .filter((row) => row.amount > 0);
}

/** Mes priorités — 3 à 5 actions dirigeant, messages actionnables. */
export function buildDashboardPriorities(summary = {}, props = {}, health = {}) {
  const items = [];
  const salesAll = arr(props.salesOrdersAll?.length ? props.salesOrdersAll : props.salesOrders);
  const paymentsAll = arr(props.paymentsAll?.length ? props.paymentsAll : props.payments);
  const overdue = overdueReceivables(salesAll, paymentsAll, 30);

  if (summary.receivable > 0) {
    const overdueCount = overdue.length;
    items.push({
      id: 'receivables',
      priority: overdueCount ? 5 : 12,
      tone: overdueCount ? 'red' : 'amber',
      title: overdueCount
        ? `${overdueCount} créance(s) dépassent 30 jours`
        : `${salesAll.filter((o) => remainingForOrder(o, paymentsAll) > 0).length} créance(s) à relancer`,
      detail: `${fmtCurrency(summary.receivable)} restant à encaisser`,
      moduleKey: 'commercial',
      tab: 'Clients',
      action: { moduleKey: 'commercial', category: 'Argent' },
    });
  }

  const debts = supplierDebts(props.fournisseurs);
  const debtTotal = debts.reduce((sum, row) => sum + row.amount, 0);
  if (debtTotal > 0) {
    items.push({
      id: 'debts',
      priority: summary.cashNet < debtTotal ? 8 : 18,
      tone: summary.cashNet < debtTotal ? 'red' : 'amber',
      title: debts.length > 1 ? `${debts.length} dettes fournisseurs à régler` : `Dette fournisseur : ${debts[0]?.name || '—'}`,
      detail: `${fmtCurrency(debtTotal)} reste à payer`,
      moduleKey: 'finance_pilotage',
      tab: 'Dettes',
      action: { moduleKey: 'finance_pilotage', category: 'Argent' },
    });
  }

  const feedDays = alimentDaysLeft(props.stocks, props.alimentationLogs);
  const lowStock = n(summary.stockSummary?.lowStockCount || summary.stockBas);
  if (feedDays != null && feedDays <= 7) {
    items.push({
      id: 'feed-stock',
      priority: feedDays <= 3 ? 10 : 22,
      tone: feedDays <= 3 ? 'red' : 'amber',
      title: `Stock aliment estimé inférieur à ${feedDays} jour(s)`,
      detail: 'Réapprovisionner avant rupture',
      moduleKey: 'achats_stock',
      tab: 'Stock',
      action: { moduleKey: 'achats_stock', category: 'Stock' },
    });
  } else if (lowStock > 0) {
    items.push({
      id: 'stock-critical',
      priority: 25,
      tone: 'amber',
      title: `${lowStock} produit(s) sous le seuil`,
      detail: 'Réapprovisionner les intrants critiques',
      moduleKey: 'achats_stock',
      tab: 'Stock',
      action: { moduleKey: 'achats_stock', category: 'Stock' },
    });
  }

  const attainment = n(summary.goal?.periodAttainment ?? summary.goal?.attainment);
  const periodTarget = n(summary.goal?.periodTarget ?? summary.goal?.monthTarget);
  if (periodTarget > 0 && attainment < 80) {
    items.push({
      id: 'goal-late',
      priority: attainment < 50 ? 15 : 28,
      tone: attainment < 50 ? 'red' : 'amber',
      title: `Objectif mensuel atteint à ${attainment} %`,
      detail: `Reste ${fmtCurrency(summary.goal?.periodRemaining ?? Math.max(0, periodTarget - n(summary.goal?.periodRealized)))}`,
      moduleKey: 'objectifs_croissance',
      tab: 'Performance',
      action: { moduleKey: 'objectifs_croissance', category: 'Objectifs' },
    });
  }

  const openAlerts = arr(props.alertes).filter(isOpenAlert);
  const criticalFindings = arr(health.findings).filter((f) => ['critique', 'haute', 'eleve', 'élevé'].includes(low(f.severity)));
  if (openAlerts.length) {
    items.push({
      id: 'alerts',
      priority: 20,
      tone: 'red',
      title: `${openAlerts.length} alerte(s) importante(s) à traiter`,
      detail: openAlerts[0]?.title || openAlerts[0]?.message || 'Consulter Activité & Suivi',
      moduleKey: 'activite_suivi',
      tab: 'Alertes',
      action: { moduleKey: 'activite_suivi', category: 'Urgences terrain' },
    });
  } else if (criticalFindings.length) {
    items.push({
      id: 'health-finding',
      priority: 30,
      tone: 'amber',
      title: criticalFindings[0].title,
      detail: criticalFindings[0].recommended_action || criticalFindings[0].description || 'Voir le détail ERP',
      moduleKey: criticalFindings[0].module || 'centre_ia',
      tab: 'À traiter',
      finding: criticalFindings[0],
      action: { moduleKey: criticalFindings[0].module || 'centre_ia', category: 'Pilotage' },
    });
  }

  const orphanPayments = arr(props.paymentsAll || props.payments).filter(
    (payment) => payment.order_id && !salesAll.some((order) => String(order.id) === String(payment.order_id)),
  );
  if (orphanPayments.length) {
    items.push({
      id: 'orphan-payments',
      priority: 35,
      tone: 'amber',
      title: `${orphanPayments.length} paiement(s) restent à rapprocher`,
      detail: 'Vérifier les ventes liées',
      moduleKey: 'sync_activity',
      tab: 'Résumé',
      action: { moduleKey: 'sync_activity', category: 'Contrôle ERP' },
    });
  }

  return items
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 5)
    .map(({ action, finding, ...item }) => ({ ...item, action, finding }));
}

/** Synthèse narrative — règles métier simples, sans LLM. */
export function buildDashboardNarrative(summary = {}, props = {}) {
  const lines = [];
  const salesAll = arr(props.salesOrdersAll?.length ? props.salesOrdersAll : props.salesOrders);
  const paymentsAll = arr(props.paymentsAll?.length ? props.paymentsAll : props.payments);
  const periods = summary.financePeriods || {};
  const deltaCa = periods.deltaEncaisseVsPrevious;
  const attainment = n(summary.goal?.periodAttainment ?? summary.goal?.attainment);

  if (summary.ca > 0) {
    if (attainment >= 100) lines.push('Les ventes dépassent l\'objectif de la période.');
    else if (attainment >= 70) lines.push('Les ventes progressent vers l\'objectif.');
    else if (attainment > 0) lines.push('Les ventes restent en retard sur le plan.');
    else lines.push('Les ventes sont enregistrées — objectif à calibrer.');
  } else {
    lines.push('Aucune vente sur la période sélectionnée.');
  }

  if (deltaCa != null) {
    if (deltaCa > 0) lines.push('Les encaissements augmentent par rapport au mois précédent.');
    else if (deltaCa < 0) lines.push('Les encaissements reculent par rapport au mois précédent.');
    else lines.push('Les encaissements sont stables.');
  } else if (summary.encaisse > 0) {
    lines.push('Les encaissements sont suivis dans l\'ERP.');
  }

  if (summary.receivable > 0) {
    const overdue = overdueReceivables(salesAll, paymentsAll, 30).length;
    lines.push(overdue
      ? `Les créances restent élevées (${overdue} dépassent 30 jours).`
      : 'Des créances clients restent à encaisser.');
  } else if (paymentsAll.some((row) => paid(row) > 0)) {
    lines.push('Les encaissements couvrent les ventes enregistrées.');
  }

  const feedDays = alimentDaysLeft(props.stocks, props.alimentationLogs);
  if (feedDays != null && feedDays <= 7) {
    lines.push(`Le stock d'aliment nécessite une attention (${feedDays} jour(s) estimés).`);
  } else if (n(summary.stockSummary?.lowStockCount) > 0) {
    lines.push(`${summary.stockSummary.lowStockCount} produit(s) stock sont sous le seuil.`);
  }

  if (summary.resultat < 0 && summary.encaisse > 0) {
    lines.push('Le résultat trésorerie est négatif sur la période.');
  } else if (summary.cashNet >= 0 && summary.encaisse > 0) {
    lines.push('La trésorerie disponible reste positive.');
  }

  return {
    title: 'Cette période',
    lines: lines.slice(0, 4),
  };
}

const STARTUP_STEPS = [
  {
    id: 'config',
    step: 1,
    label: 'Configuration initiale',
    hint: 'Stock, parcelles ou objectifs',
    module: 'achats_stock',
    tab: 'Stock',
    done: (props) => arr(props.stocks).some((row) => stockQty(row) > 0)
      || arr(props.cultures).length > 0
      || arr(props.businessPlans).length > 0,
  },
  {
    id: 'animals',
    step: 2,
    label: 'Premiers animaux',
    hint: 'Bande avicole ou cheptel bovin',
    module: 'elevage',
    tab: 'Résumé',
    done: (props) => arr(props.animaux).length > 0 || arr(props.lotsData || props.lots).length > 0,
  },
  {
    id: 'production',
    step: 3,
    label: 'Première production',
    hint: 'Ramassage ou production enregistrée',
    module: 'elevage',
    tab: 'Production',
    done: (props) => arr(props.productionLogs).some((row) => n(row.oeufs_produits ?? row.eggs_count ?? row.quantite) > 0),
  },
  {
    id: 'sale',
    step: 4,
    label: 'Première vente',
    hint: 'Enregistrer une commande client',
    module: 'commercial',
    tab: 'Ventes',
    done: (props) => arr(props.salesOrdersAll || props.salesOrders).some((row) => money(row) > 0),
  },
  {
    id: 'payment',
    step: 5,
    label: 'Premier encaissement',
    hint: 'Tracer un paiement reçu',
    module: 'commercial',
    tab: 'Clients',
    done: (props) => arr(props.paymentsAll || props.payments).some((row) => paid(row) > 0),
  },
  {
    id: 'profit',
    step: 6,
    label: 'Premier cycle rentable',
    hint: 'Encaissements supérieurs aux dépenses',
    module: 'finance_pilotage',
    tab: 'Trésorerie',
    done: (_props, summary) => n(summary?.financePeriods?.resultatAllTime ?? summary?.resultat) > 0,
  },
];

/** Parcours progressif mode lancement — 6 étapes. */
export function buildDashboardStartupJourney(props = {}, summary = {}) {
  const steps = STARTUP_STEPS.map((def) => ({
    id: def.id,
    step: def.step,
    label: def.label,
    hint: def.hint,
    module: def.module,
    tab: def.tab,
    completed: def.done(props, summary),
  }));
  const completedCount = steps.filter((row) => row.completed).length;
  const nextStep = steps.find((row) => !row.completed) || steps[steps.length - 1];
  return {
    steps,
    completedCount,
    total: steps.length,
    progressPct: Math.round((completedCount / steps.length) * 100),
    nextStep,
    remaining: steps.filter((row) => !row.completed),
  };
}

/** Score exploitation — finances, production, ventes, conformité, qualité données. */
export function buildExploitationScore(summary = {}, health = {}, props = {}) {
  const healthScore = n(health.score ?? 100);
  const financeScore = (() => {
    let score = 50;
    if (summary.cashNet >= 0) score += 20;
    if (summary.receivable <= summary.encaisse * 0.35 || summary.receivable === 0) score += 15;
    if (summary.resultat >= 0) score += 15;
    return Math.min(100, score);
  })();
  const productionScore = (() => {
    const head = summary.headcount || {};
    let score = 0;
    if (n(head.total) > 0) score += 40;
    if (n(head.effectifPondeuses) > 0 || n(head.effectifChair) > 0) score += 30;
    if (n(summary.production) > 0) score += 30;
    return Math.min(100, score);
  })();
  const salesScore = (() => {
    const attainment = n(summary.goal?.periodAttainment ?? summary.goal?.attainment);
    if (summary.ca <= 0) return 20;
    if (attainment >= 90) return 100;
    if (attainment >= 70) return 80;
    if (attainment >= 40) return 55;
    return 35;
  })();
  const complianceScore = (() => {
    const missing = arr(props.transactions).filter(
      (row) => money(row) > 0 && !row.document_id && !row.proof_url && !row.justificatif_id,
    ).length;
    if (missing === 0) return 100;
    if (missing <= 2) return 75;
    if (missing <= 5) return 50;
    return 30;
  })();
  const dataScore = healthScore;

  const dimensions = [
    { id: 'finance', label: 'Finances', score: financeScore, weight: 0.25 },
    { id: 'production', label: 'Production', score: productionScore, weight: 0.2 },
    { id: 'ventes', label: 'Ventes', score: salesScore, weight: 0.2 },
    { id: 'conformite', label: 'Conformité', score: complianceScore, weight: 0.15 },
    { id: 'qualite', label: 'Qualité données', score: dataScore, weight: 0.2 },
  ];
  const score = Math.round(dimensions.reduce((sum, row) => sum + row.score * row.weight, 0));
  const weakPoints = dimensions
    .filter((row) => row.score < 70)
    .sort((a, b) => a.score - b.score)
    .slice(0, 3)
    .map((row) => `${row.label} (${row.score}/100)`);

  return {
    score,
    label: score >= 80 ? 'Exploitation solide' : score >= 60 ? 'En progression' : 'À renforcer',
    dimensions,
    weakPoints,
    healthScore,
  };
}

/** Score préparation investisseur — réutilise getInvestorReadySummary. */
export function buildDashboardInvestorReadiness(props = {}) {
  const dataMap = {
    sales_orders: props.salesOrdersAll || props.salesOrders || [],
    salesOrders: props.salesOrdersAll || props.salesOrders || [],
    payments: props.paymentsAll || props.payments || [],
    paymentsAll: props.paymentsAll || props.payments || [],
    finances: props.transactionsAll || props.transactions || [],
    transactions: props.transactionsAll || props.transactions || [],
    stock: props.stocks || [],
    stocks: props.stocks || [],
    animaux: props.animaux || [],
    avicole: props.lotsData || props.lots || [],
    lots: props.lotsData || props.lots || [],
    business_plans: props.businessPlans || [],
    businessPlans: props.businessPlans || [],
    investissements: props.investissements || [],
    documents: props.documents || [],
    clients: props.clients || [],
    alertes_center: props.alertes || [],
    taches: props.taches || [],
    production_oeufs_logs: props.productionLogs || [],
    alimentation_logs: props.alimentationLogs || [],
    meteo: props.meteo || {},
  };
  const ready = getInvestorReadySummary(dataMap);
  const checks = [
    { id: 'bp', label: 'Business plan', ok: n(ready.highlights?.business_plans) > 0 },
    { id: 'forecast', label: 'Prévisions', ok: n(ready.highlights?.business_plans) > 0 || n(props.businessPlans?.length) > 0 },
    { id: 'sales', label: 'Activité ventes', ok: n(ready.highlights?.ca_cumul) > 0 },
    { id: 'documents', label: 'Documents', ok: arr(props.documents).length >= 3 },
    { id: 'data', label: 'Données ERP', ok: n(ready.highlights?.health_score) >= 70 },
  ];
  return {
    score: ready.readiness_score,
    label: ready.readiness_label,
    gaps: ready.gaps.slice(0, 3),
    checks,
    highlights: ready.highlights,
  };
}

/** Bloc agricole synthétique — aviculture, bovins, cultures. */
export function buildFarmOverview(summary = {}) {
  const head = summary.headcount || {};
  const culture = summary.cultureSummary || {};
  return {
    aviculture: {
      label: 'Aviculture',
      birds: n(head.activeAvicole),
      lots: n(head.activeLots),
      detail: `${n(head.effectifChair).toLocaleString('fr-FR')} chair · ${n(head.effectifPondeuses).toLocaleString('fr-FR')} pondeuses`,
      hasData: n(head.activeAvicole) > 0,
    },
    bovins: {
      label: 'Bovins / animaux',
      count: n(head.activeAnimals),
      detail: `${n(head.activeAnimals).toLocaleString('fr-FR')} sujet(s) actif(s)`,
      hasData: n(head.activeAnimals) > 0,
    },
    cultures: {
      label: 'Cultures',
      parcels: n(culture.parcelCount),
      active: n(culture.activeCultures),
      surfaceM2: n(culture.surfaceM2),
      detail: culture.hasData
        ? `${n(culture.parcelCount)} parcelle(s) · ${n(culture.activeCultures)} culture(s) active(s)`
        : 'Parcelles à configurer',
      hasData: Boolean(culture.hasData),
    },
    production: {
      eggsPeriod: n(summary.production),
      hasData: n(summary.production) > 0 || n(summary.eggProduction?.eggsAllTime) > 0,
    },
    overallTone: (head.total > 0 || culture.hasData) ? 'good' : 'warn',
  };
}

/** Rapport météo — composant existant via AppLayout + hook useLiveWeather. */
export function buildDashboardWeatherReport(meteo = {}, weatherLoading = false) {
  const hasData = Boolean(meteo && (meteo.temp != null || meteo.temperature != null));
  return {
    componentExisting: true,
    location: 'AppLayout header + useLiveWeather hook',
    dashboardStrip: hasData,
    absent: false,
    futureCost: hasData ? null : 'Réutiliser useLiveWeather (déjà branché) — coût marginal nul',
    loading: weatherLoading,
    temp: meteo.temp ?? meteo.temperature ?? null,
    condition: meteo.condition || meteo.weather || null,
    riskLevel: meteo.riskLevel || meteo.risk_level || 'stable',
    impact: meteo.impact || null,
  };
}
