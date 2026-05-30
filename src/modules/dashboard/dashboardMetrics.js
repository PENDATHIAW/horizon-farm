import { buildDecisionCenterPlan } from '../../services/growthDecisionEngine';
import { remainingForOrder } from '../../utils/salesStatuses';
import { buildDashboardTodayActions } from '../../utils/dashboardWorkflows';

const arr = (value) => (Array.isArray(value) ? value : []);
const lower = (value) => String(value || '').trim().toLowerCase();
const money = (row = {}) => Number(row?.montant ?? row?.amount ?? row?.total ?? row?.montant_total ?? 0) || 0;
const paid = (row = {}) => Number(row.montant_paye ?? row.paid_amount ?? row.amount_paid ?? 0) || 0;

const isCriticalStock = (row = {}) => Number(row.quantite || row.quantity || row.stock || 0) <= Number(row.seuil || row.threshold || 0);
const isOpenTask = (row = {}) => !['termine', 'terminé', 'done', 'closed'].includes(lower(row.status || row.statut));
const isOpenAlert = (row = {}) => !['traitee', 'traitée', 'resolue', 'résolue', 'fermee', 'fermée'].includes(lower(row.status || row.statut));

const rowYear = (row = {}) => {
  const raw = row.date || row.date_commande || row.order_date || row.created_at;
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed.getFullYear();
};

export function buildDashboardSummary(props = {}) {
  const payments = arr(props.payments);
  const transactions = arr(props.transactions);
  const salesOrders = arr(props.salesOrders);
  const stocks = arr(props.stocks);
  const taches = arr(props.taches);
  const alertes = arr(props.alertes);
  const animaux = arr(props.animaux);
  const lots = arr(props.lotsData || props.lots);
  const productionLogs = arr(props.productionLogs);

  const ca = salesOrders.reduce((sum, row) => sum + money(row), 0);
  const encaisse = payments.reduce((sum, row) => sum + paid(row), 0);
  const depenses = transactions
    .filter((row) => ['sortie', 'depense', 'dépense', 'achat'].includes(lower(row.type || '')))
    .reduce((sum, row) => sum + money(row), 0);
  const resultat = encaisse - depenses;
  const receivable = salesOrders.reduce((sum, order) => sum + remainingForOrder(order, payments), 0);
  const stockBas = stocks.filter(isCriticalStock).length;
  const tachesOuvertes = taches.filter(isOpenTask).length;
  const alertesOuvertes = alertes.filter(isOpenAlert).length;
  const effectifs = animaux.filter((row) => !['vendu', 'mort', 'sorti'].includes(lower(row.status || row.statut))).length
    + lots.reduce((sum, row) => sum + Number(row.current_count ?? row.effectif ?? 0), 0);
  const production = productionLogs.reduce((sum, row) => sum + Number(row.oeufs_produits || row.eggs_count || 0), 0);

  const plan = buildDecisionCenterPlan({
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
  });

  const actions = buildDashboardTodayActions(props);
  const goalBase = plan.goals?.global || { monthTarget: 0, realized: 0, attainment: 0, annualTarget: 0 };
  const currentYear = new Date().getFullYear();
  const annualRealized = salesOrders
    .filter((row) => rowYear(row) === currentYear)
    .reduce((sum, row) => sum + money(row), 0);
  const annualTarget = Number(goalBase.annualTarget || 0);
  const annualAttainment = annualTarget ? Math.round((annualRealized / annualTarget) * 100) : 0;
  const goal = {
    ...goalBase,
    annualRealized,
    annualAttainment,
    annualRemaining: Math.max(0, annualTarget - annualRealized),
  };

  return {
    ca,
    encaisse,
    depenses,
    resultat,
    receivable,
    stockBas,
    tachesOuvertes,
    alertesOuvertes,
    effectifs,
    production,
    actions,
    goal,
    plan,
    todoCount: actions.length,
  };
}

export const DASHBOARD_MODULE_LABELS = {
  commercial: 'Commercial',
  finance_pilotage: 'Finance',
  achats_stock: 'Achats & Stock',
  elevage: 'Élevage',
  activite_suivi: 'Activité',
  documents_rapports: 'Documents',
  smartfarm: 'Smart Farm',
  sync_activity: 'Sync ERP',
  objectifs_croissance: 'Vision',
  assistant_erp: 'Assistant',
};

export const DASHBOARD_MODULES = [
  { id: 'elevage', label: 'Élevage', hint: 'Animaux · lots · santé', tab: 'Résumé' },
  { id: 'commercial', label: 'Commercial', hint: 'Ventes · clients', tab: 'Résumé' },
  { id: 'achats_stock', label: 'Achats & Stock', hint: 'Inventaire · fournisseurs', tab: 'Résumé' },
  { id: 'finance_pilotage', label: 'Finance', hint: 'Trésorerie · créances', tab: 'Résumé' },
  { id: 'activite_suivi', label: 'Activité', hint: 'Tâches · alertes', tab: 'Résumé' },
  { id: 'objectifs_croissance', label: 'Vision', hint: 'Objectifs · IA', tab: 'À traiter' },
];
