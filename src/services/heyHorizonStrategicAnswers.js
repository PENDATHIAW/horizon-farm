import { runErpHealthEngine } from './erpHealthEngine.js';
import { fmtCurrency, fmtNumber } from '../utils/format.js';

const arr = (v) => (Array.isArray(v) ? v : []);
const n = (v = 0) => Number(v || 0);
const low = (v) => String(v || '').toLowerCase();
const amount = (r = {}) => n(r.montant ?? r.amount ?? r.total ?? r.montant_total);
const paidOf = (order, payments) => n(order.montant_paye) + arr(payments).filter((p) => String(p.order_id || p.sale_id) === String(order.id)).reduce((s, p) => s + amount(p), 0);

function matchQuery(text, patterns) {
  const q = low(text);
  return patterns.some((p) => (typeof p === 'string' ? q.includes(p) : p.test(q)));
}

export function detectStrategicQuery(text = '') {
  if (matchQuery(text, ['client', 'doivent', 'doit', 'créance', 'creance', 'impayé', 'impaye', 'relancer', 'encaisser'])) return 'clients_debt';
  if (matchQuery(text, [/lot.*rentab/, /rentab.*lot/, 'moins rentable', 'peu rentable', 'lot le plus'])) return 'lot_profitability';
  if (matchQuery(text, [/marge.*baiss/, 'pourquoi.*marge', 'baisse.*marge', 'marge baisse'])) return 'margin_drop';
  if (matchQuery(text, [/équipement.*co[uû]t/, /co[uû]t.*équipement/, 'equipement.*cher', 'maintenance.*co[uû]teuse'])) return 'equipment_cost';
  if (matchQuery(text, [/risque.*mois/, 'risques du mois', 'mes risques', 'principal risque'])) return 'monthly_risks';
  return null;
}

export function buildStrategicAnswer(type, dataMap = {}) {
  const sales = arr(dataMap.sales_orders || dataMap.salesOrders);
  const payments = arr(dataMap.payments);
  const finances = arr(dataMap.finances || dataMap.transactions);
  const clients = arr(dataMap.clients);
  const lots = arr(dataMap.avicole || dataMap.lots);
  const animaux = arr(dataMap.animaux);
  const equipements = arr(dataMap.equipements);
  const tasks = arr(dataMap.taches || dataMap.tasks);
  const alertes = arr(dataMap.alertes_center || dataMap.alertes);
  const health = runErpHealthEngine(dataMap);

  switch (type) {
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
        summary: rows.length ? `${rows.length} client(s) avec encaissements en attente — total ${fmtCurrency(rows.reduce((s, r) => s + r.rest, 0))}.` : 'Aucune créance client ouverte détectée.',
        rows: rows.slice(0, 8).map((r) => ({ title: r.name, detail: `Commande ${r.orderId}`, value: fmtCurrency(r.rest), module: 'commercial' })),
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
        summary: worst
          ? `Lot le moins rentable suivi : ${worst.lot.name || worst.lot.nom || worst.lot.id} (${fmtCurrency(worst.margin)}).`
          : unreliable.length
            ? `${unreliable.length} lot(s)/animal(aux) avec marge non fiable — données coûts incomplètes.`
            : 'Complétez coûts aliment, poussins et revenus pour comparer les lots.',
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
        summary: `Marge actuelle ${fmtCurrency(margin)} (recettes ${fmtCurrency(income)} − dépenses ${fmtCurrency(expenses)}). ${profitFindings.length + riskFindings.length} signal(aux) IA expliquent la pression.`,
        rows: [
          ...profitFindings.slice(0, 4).map((f) => ({ title: f.title, detail: f.description, value: f.recommended_action, module: f.module || 'finance_pilotage' })),
          ...riskFindings.slice(0, 3).map((r) => ({ title: r.title, detail: r.detail, value: r.level, module: r.module || 'objectifs_croissance' })),
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
        summary: `${eqRows.length} équipement(s) · ${fmtNumber(txCosts.length)} dépense(s) liées (${fmtCurrency(txTotal)}).`,
        rows: [
          ...eqRows.slice(0, 5),
          ...txCosts.slice(0, 4).map((t) => ({ title: t.libelle || t.title || 'Dépense', detail: t.date || t.created_at || '—', value: fmtCurrency(amount(t)), module: 'finance_pilotage' })),
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
        summary: risks.length ? `${risks.length} risque(s) actif(s), dont ${risks.filter((r) => r.level === 'critique' || r.level === 'eleve').length} élevé(s) ou critique(s).` : 'Aucun risque élevé détecté ce mois.',
        rows: [
          ...risks.map((r) => ({ title: r.title, detail: r.detail, value: r.level, module: r.module || 'objectifs_croissance' })),
          ...preds.map((p) => ({ title: p.title, detail: p.description, value: p.horizon || 'Prévision', module: p.module || 'objectifs_croissance' })),
        ],
        route: 'objectifs_croissance',
        confidence: 90,
      };
    }
    default:
      return null;
  }
}
