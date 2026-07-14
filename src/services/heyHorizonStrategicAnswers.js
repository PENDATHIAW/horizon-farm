import { runErpHealthEngine } from './erpHealthEngine.js';
import { computeDashboardPeriodGoal } from '../modules/dashboard/dashboardMetrics.js';
import { buildGoalPerformance } from './growthDecisionEngine.js';
import { totalOpenReceivables } from '../utils/assistantDataMap.js';
import { fmtCurrency, fmtNumber } from '../utils/format.js';
import { formatPeriodScopeLabel, normalizePeriodScope } from '../utils/periodScope.js';

const arr = (v) => (Array.isArray(v) ? v : []);
const n = (v = 0) => Number(v || 0);
const low = (v) => String(v || '').toLowerCase();
const amount = (r = {}) => n(r.montant ?? r.amount ?? r.total ?? r.montant_total);
const paidOf = (order, payments) => n(order.montant_paye) + arr(payments).filter((p) => String(p.order_id || p.sale_id) === String(order.id)).reduce((s, p) => s + amount(p), 0);

function matchQuery(text, patterns) {
  const q = low(text);
  return patterns.some((p) => (typeof p === 'string' ? q.includes(p) : p.test(q)));
}

/** Préfixe période pour les réponses stratégiques Hey Horizon. */
export function buildHeyHorizonPeriodContext(dataMap = {}) {
  const scope = normalizePeriodScope(dataMap.periodScope || { mode: 'all' });
  const label = dataMap.periodLabel || formatPeriodScopeLabel(scope);
  if (!label || label === 'Toutes les périodes') {
    const receivable = totalOpenReceivables(
      arr(dataMap.salesOrdersAll || dataMap.sales_orders || dataMap.salesOrders),
      arr(dataMap.paymentsAll || dataMap.payments),
    );
    return receivable > 0 ? `Créances totales ouvertes : ${fmtCurrency(receivable)}. ` : '';
  }
  const salesPeriod = arr(dataMap.sales_orders || dataMap.salesOrders);
  const caPeriod = salesPeriod.reduce((sum, row) => sum + amount(row), 0);
  const receivable = totalOpenReceivables(
    arr(dataMap.salesOrdersAll || dataMap.sales_orders || dataMap.salesOrders),
    arr(dataMap.paymentsAll || dataMap.payments),
  );
  return `Sur ${label} : CA ${fmtCurrency(caPeriod)} · créances totales ${fmtCurrency(receivable)}. `;
}

function withPeriodContext(dataMap, summary) {
  const prefix = buildHeyHorizonPeriodContext(dataMap);
  if (!prefix || !summary) return summary;
  return `${prefix}${summary}`;
}

export function detectStrategicQuery(text = '') {
  if (matchQuery(text, [/objectif.*annuel/, 'objectif de l\'année', 'objectif de l annee', 'objectif année', 'objectif annee', 'bp annuel', 'business plan', /ca.*annuel/, 'où en suis.*année', 'ou en suis.*annee'])) return 'annual_goal';
  if (matchQuery(text, [/objectif.*mois/, 'objectif du mois', 'où en suis', 'ou en suis', 'mon objectif', 'progression objectif', /ca.*objectif/, 'atteint.*objectif', 'objectif période', 'objectif periode'])) return 'month_goal';
  if (matchQuery(text, ['client', 'doivent', 'doit', 'créance', 'creance', 'impayé', 'impaye', 'relancer', 'encaisser'])) return 'clients_debt';
  if (matchQuery(text, [/lot.*rentab/, /rentab.*lot/, 'moins rentable', 'peu rentable', 'lot le plus'])) return 'lot_profitability';
  if (matchQuery(text, [/marge.*baiss/, 'pourquoi.*marge', 'baisse.*marge', 'marge baisse'])) return 'margin_drop';
  if (matchQuery(text, [/équipement.*co[uû]t/, /co[uû]t.*équipement/, 'equipement.*cher', 'maintenance.*co[uû]teuse'])) return 'equipment_cost';
  if (matchQuery(text, [/risque.*mois/, 'risques du mois', 'mes risques', 'principal risque'])) return 'monthly_risks';
  return null;
}

export function buildStrategicAnswer(type, dataMap = {}) {
  const sales = arr(dataMap.salesOrdersAll || dataMap.sales_orders || dataMap.salesOrders);
  const payments = arr(dataMap.paymentsAll || dataMap.payments);
  const finances = arr(dataMap.finances || dataMap.transactions);

  const lots = arr(dataMap.avicole || dataMap.lots);

  const equipements = arr(dataMap.equipements);


  const health = runErpHealthEngine(dataMap);

  switch (type) {
    case 'annual_goal': {
      const salesAll = arr(dataMap.salesOrdersAll || dataMap.sales_orders || dataMap.salesOrders);
      const performance = buildGoalPerformance(dataMap, { periodScope: { mode: 'all' } });
      const global = performance?.global || {};
      const activityYear = performance?.activityYear;
      const goal = computeDashboardPeriodGoal(salesAll, { mode: 'all' }, {
        annualTarget: global.annualTarget,
      }, activityYear);
      const attainment = Number(goal.periodAttainment ?? goal.annualAttainment ?? 0);
      const realized = Number(goal.periodRealized ?? goal.annualRealized ?? 0);
      const target = Number(goal.periodTarget ?? goal.annualTarget ?? 0);
      const remaining = Number(goal.periodRemaining ?? goal.annualRemaining ?? 0);
      const year1Label = activityYear?.year1Label || 'Année 1';
      const activities = arr(performance?.activities).filter((a) => a.target > 0).slice(0, 5);
      return {
        type,
        title: year1Label,
        summary: withPeriodContext(
          dataMap,
          `CA ${year1Label} : ${fmtCurrency(realized)} / ${fmtCurrency(target)} (${attainment}%). Reste ${fmtCurrency(remaining)} sur le BP. Démarrage ${activityYear?.startDate || '-'}.`,
        ),
        rows: [
          {
            title: 'CA Année 1',
            detail: `${attainment}% du BP`,
            value: fmtCurrency(realized),
            module: 'objectifs_croissance',
          },
          {
            title: 'Encaissements',
            detail: `Taux encaissement ${global.cashRate ?? 0}%`,
            value: fmtCurrency(global.encaisse ?? 0),
            module: 'finance_pilotage',
          },
          {
            title: 'Marge',
            detail: `Dépenses ${fmtCurrency(global.depenses ?? 0)}`,
            value: fmtCurrency(global.marge ?? 0),
            module: 'finance_pilotage',
          },
          ...activities.map((a) => ({
            title: a.label || a.activity,
            detail: `Objectif activité ${fmtCurrency(a.target)}`,
            value: `${a.attainment ?? 0}%`,
            module: 'objectifs_croissance',
          })),
        ],
        route: 'objectifs_croissance',
        confidence: 93,
      };
    }
    case 'month_goal': {
      const scope = normalizePeriodScope(dataMap.periodScope || { mode: 'all' });
      const salesAll = arr(dataMap.salesOrdersAll || dataMap.sales_orders || dataMap.salesOrders);
      const performance = buildGoalPerformance(dataMap, { periodScope: scope });
      const global = performance?.global || {};
      const goal = computeDashboardPeriodGoal(salesAll, scope, {
        annualTarget: global.annualTarget,
      });
      const primaryLabel = goal.periodLabel || 'Objectif';
      const primaryAttainment = Number(goal.periodAttainment ?? 0);
      const primaryRealized = Number(goal.periodRealized ?? 0);
      const primaryTarget = Number(goal.periodTarget ?? 0);
      const primaryRemaining = Number(goal.periodRemaining ?? 0);
      const activities = arr(performance?.activities).filter((a) => a.target > 0).slice(0, 5);
      return {
        type,
        title: primaryLabel,
        summary: withPeriodContext(
          dataMap,
          `${primaryLabel} : ${fmtCurrency(primaryRealized)} / ${fmtCurrency(primaryTarget)} (${primaryAttainment}%). Reste ${fmtCurrency(primaryRemaining)}.${goal.periodSubtitle ? ` Période ERP : ${goal.periodSubtitle}.` : ''}`,
        ),
        rows: [
          {
            title: 'CA période',
            detail: `${primaryAttainment}% de l'objectif`,
            value: fmtCurrency(primaryRealized),
            module: 'dashboard',
          },
          {
            title: 'Encaissements',
            detail: `Taux encaissement ${global.cashRate ?? 0}%`,
            value: fmtCurrency(global.encaisse ?? 0),
            module: 'finance_pilotage',
          },
          {
            title: 'Marge période',
            detail: `Dépenses ${fmtCurrency(global.depenses ?? 0)}`,
            value: fmtCurrency(global.marge ?? 0),
            module: 'finance_pilotage',
          },
          ...activities.map((a) => ({
            title: a.label || a.activity,
            detail: `Objectif ${fmtCurrency(a.target)}`,
            value: `${a.attainment ?? 0}%`,
            module: 'objectifs_croissance',
          })),
        ],
        route: 'objectifs_croissance',
        confidence: 94,
      };
    }
    case 'clients_debt': {
      const rows = sales.map((order) => {
        const total = amount(order);
        const paid = paidOf(order, payments);
        const rest = Math.max(0, total - paid);
        return { name: order.client_nom || order.customer_name || 'Client', rest, orderId: order.id };
      }).filter((r) => r.rest > 0).sort((a, b) => b.rest - a.rest);
      return {
        type,
        title: 'Clients à relancer',
        summary: rows.length
          ? withPeriodContext(
            dataMap,
            `${rows.length} client(s) avec encaissements en attente - total ${fmtCurrency(rows.reduce((s, r) => s + r.rest, 0))}.${dataMap.periodFiltered ? ' Créances sur l’historique complet (hors filtre période ventes).' : ''}`,
          )
          : withPeriodContext(dataMap, 'Aucune créance client ouverte détectée.'),
        rows: rows.slice(0, 8).map((r) => ({ title: r.name, detail: `Commande ${r.orderId}`, value: fmtCurrency(r.rest), module: 'commercial', orderId: r.orderId })),
        route: 'commercial',
        confidence: 92,
      };
    }
    case 'lot_profitability': {
      const unreliable = health.findings.filter((f) => f.category === 'rentabilite' && f.margin_reliable === false);
      const lotRows = lots.map((lot) => {
        const feed = n(lot.cout_aliment ?? lot.feed_cost);
        const chicks = n(lot.cout_poussins ?? lot.chick_cost);
        const revenue = n(lot.revenu ?? lot.revenue ?? lot.ca);
        const cost = feed + chicks + n(lot.cout_vaccins);
        const margin = revenue - cost;
        const reliable = feed > 0 && (revenue > 0 || chicks > 0);
        return { lot, margin, reliable, cost, revenue };
      }).filter((r) => r.reliable).sort((a, b) => a.margin - b.margin);
      const worst = lotRows[0];
      return {
        type,
        title: 'Rentabilité des lots',
        summary: withPeriodContext(
          dataMap,
          worst
            ? `Lot le moins rentable suivi : ${worst.lot.name || worst.lot.nom || worst.lot.id} (${fmtCurrency(worst.margin)}).`
            : unreliable.length
              ? `${unreliable.length} lot(s)/animal(aux) avec marge non fiable - données coûts incomplètes.`
              : 'Complétez coûts aliment, poussins et revenus pour comparer les lots.',
        ),
        rows: [
          ...lotRows.slice(0, 5).map((r) => ({ title: r.lot.name || r.lot.nom || r.lot.id, detail: `Coûts ${fmtCurrency(r.cost)} · CA ${fmtCurrency(r.revenue)}`, value: fmtCurrency(r.margin), module: 'elevage' })),
          ...unreliable.slice(0, 3).map((f) => ({ title: f.title, detail: f.description, value: 'Non fiable', module: 'elevage' })),
        ],
        route: 'elevage',
        confidence: worst ? 85 : 70,
      };
    }
    case 'margin_drop': {
      const income = finances.filter((t) => ['entree', 'entrée', 'recette', 'vente'].includes(low(t.type))).reduce((s, t) => s + amount(t), 0);
      const expenses = finances.filter((t) => ['sortie', 'depense', 'dépense', 'achat', 'charge'].includes(low(t.type))).reduce((s, t) => s + amount(t), 0);
      const margin = income - expenses;
      const profitFindings = health.findings.filter((f) => f.category === 'rentabilite' || f.category === 'coherence');
      const riskFindings = health.risks.filter((r) => r.level === 'eleve' || r.level === 'critique');
      return {
        type,
        title: 'Pourquoi la marge baisse ?',
        summary: withPeriodContext(
          dataMap,
          `Marge actuelle ${fmtCurrency(margin)} (recettes ${fmtCurrency(income)} − dépenses ${fmtCurrency(expenses)}). ${profitFindings.length + riskFindings.length} signal(aux) d’analyse expliquent la pression.`,
        ),
        rows: [
          ...profitFindings.slice(0, 4).map((f) => ({ title: f.title, detail: f.description, value: f.recommended_action, module: f.module || 'finance_pilotage' })),
          ...riskFindings.slice(0, 3).map((r) => ({ title: r.title, detail: r.detail, value: r.level, module: r.module || 'centre_ia' })),
        ],
        route: 'finance_pilotage',
        confidence: 88,
      };
    }
    case 'equipment_cost': {
      const txCosts = finances.filter((t) => /equipement|maintenance|tracteur|pompe|groupe|vehicule|carburant/.test(low(`${t.categorie || ''} ${t.libelle || ''} ${t.type || ''}`)));
      const eqRows = equipements.map((eq) => ({
        title: eq.name || eq.nom || eq.id,
        detail: eq.type || eq.status || 'Équipement',
        value: fmtCurrency(n(eq.purchase_cost ?? eq.cout_achat) + n(eq.fuel_cost)),
        cost: n(eq.purchase_cost) + n(eq.fuel_cost),
        module: 'rh',
      })).sort((a, b) => b.cost - a.cost);
      const txTotal = txCosts.reduce((s, t) => s + amount(t), 0);
      return {
        type,
        title: 'Coûts équipements',
        summary: withPeriodContext(
          dataMap,
          `${eqRows.length} équipement(s) · ${fmtNumber(txCosts.length)} dépense(s) liées (${fmtCurrency(txTotal)}).`,
        ),
        rows: [
          ...eqRows.slice(0, 5),
          ...txCosts.slice(0, 4).map((t) => ({ title: t.libelle || t.title || 'Dépense', detail: t.date || t.created_at || '-', value: fmtCurrency(amount(t)), module: 'finance_pilotage' })),
        ],
        route: 'rh',
        confidence: 86,
      };
    }
    case 'monthly_risks': {
      const risks = health.risks.slice(0, 8);
      const preds = health.predictions.slice(0, 4);
      return {
        type,
        title: 'Risques du mois',
        summary: withPeriodContext(
          dataMap,
          risks.length ? `${risks.length} risque(s) actif(s), dont ${risks.filter((r) => r.level === 'critique' || r.level === 'eleve').length} élevé(s) ou critique(s).` : 'Aucun risque élevé détecté ce mois.',
        ),
        rows: [
          ...risks.map((r) => ({ title: r.title, detail: r.detail, value: r.level, module: r.module || 'centre_ia' })),
          ...preds.map((p) => ({ title: p.title, detail: p.description, value: p.horizon || 'Prévision', module: p.module || 'centre_ia' })),
        ],
        route: 'centre_ia',
        confidence: 90,
      };
    }
    default:
      return null;
  }
}
