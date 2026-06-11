/**
 * Hey Horizon Commercial — réponses rule-based (format SITUATION / CAUSE / ACTION).
 */

import { buildConsolidatedCommercialKpis } from '../utils/commercialKpiConsolidated.js';
import { receivableFromOrders, collectedFromOrders, enrichCommercialOrders } from '../modules/commercial/commercialMetrics.js';
import { remainingForOrder } from '../utils/salesStatuses.js';
import { summarizeSalesMargins } from '../utils/salesMarginEngine.js';
import { buildCommercialRelanceRows } from '../utils/commercialRelances.js';
import { buildAutoCommercialOpportunities } from '../utils/commercialAutoOpportunities.js';
import { buildCommercialPilotageBundle } from '../utils/commercialPilotageMetrics.js';
import { buildClientSegment } from './clientSegmentationEngine.js';
import { fmtCurrency } from '../utils/format.js';
import {
  buildCommercialAnswerPayload,
  CANONICAL_COMMERCIAL_SOURCES,
} from './heyHorizonCommercialPrompt.js';

const arr = (v) => (Array.isArray(v) ? v : []);
const n = (v) => Number(v || 0);
const low = (v) => String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const SRC = CANONICAL_COMMERCIAL_SOURCES;

export function detectCommercialPilotageQuery(text = '') {
  const q = low(text);
  if (!q) return null;

  if (/resume.*commercial|situation commercial|resumer.*commercial|ma situation commercial/.test(q)) return 'summary';
  if (/meilleur.*produit|top produit|produit.*vedette|vend.*mieux/.test(q)) return 'top_products';
  if (/meilleur.*client|top client|client.*strategique/.test(q)) return 'top_clients';
  if (/creance.*relancer|relancer.*client|quelles creances|clients.*relancer/.test(q)) return 'receivables';
  if (/vendre.*aujourd|que dois.*vendre|opportunite/.test(q)) return 'sell_today';
  if (/faire.*aujourd.*commercial|action.*commercial|que dois.*faire/.test(q)) return 'today_actions';
  if (/panier moyen|encaisse|ca commercial/.test(q) && q.length < 40) return 'summary';
  return null;
}

function commercialPropsFromDataMap(dataMap = {}) {
  return {
    orders: arr(dataMap.salesOrdersAll || dataMap.sales_orders || dataMap.salesOrders),
    payments: arr(dataMap.paymentsAll || dataMap.payments),
    clients: arr(dataMap.clients),
    deliveries: arr(dataMap.deliveries),
    invoices: arr(dataMap.invoices),
    stocks: arr(dataMap.stock || dataMap.stocks),
    lots: arr(dataMap.lots || dataMap.avicole),
    cultures: arr(dataMap.cultures),
    animaux: arr(dataMap.animaux || dataMap.animals),
    transactions: arr(dataMap.finances || dataMap.transactions),
    businessPlans: arr(dataMap.business_plans || dataMap.businessPlans),
    alimentationLogs: arr(dataMap.alimentation_logs || dataMap.alimentationLogs),
    productionLogs: arr(dataMap.production_oeufs_logs || dataMap.productionLogs),
    vaccins: arr(dataMap.vaccins || dataMap.sante),
    businessEvents: arr(dataMap.business_events || dataMap.businessEvents),
  };
}

function marginContext(props = {}) {
  return {
    lots: props.lots,
    animaux: props.animaux,
    cultures: props.cultures,
    stocks: props.stocks,
    alimentationLogs: props.alimentationLogs,
    productionLogs: props.productionLogs,
    vaccins: props.vaccins,
    businessEvents: props.businessEvents,
    payments: props.payments,
    transactions: props.transactions,
  };
}

function collectReceivableRows(orders = [], payments = []) {
  const ref = new Date().toISOString().slice(0, 10);
  return arr(orders).map((order) => {
    const rest = remainingForOrder(order, payments);
    const due = order.date_echeance || order.due_date || order.date || '';
    const dueStr = String(due).slice(0, 10);
    const delayDays = dueStr ? Math.max(0, Math.round((new Date(ref) - new Date(dueStr)) / 86400000)) : 0;
    return {
      name: order.client_nom || order.customer_name || 'Client',
      rest,
      id: order.id,
      delayDays,
      clientId: order.client_id,
    };
  }).filter((r) => r.rest > 0);
}

function topProductFromKpis(kpis = {}) {
  const top = arr(kpis.topProducts)[0];
  return top?.name || '—';
}

function buildTodayActions(props = {}, kpis = {}, relances = []) {
  const actions = [];
  if (n(kpis.receivable) > 0) {
    actions.push(`Relancer créances (${fmtCurrency(kpis.receivable)})`);
  }
  const urgent = relances.filter((r) => r.priority === 'Urgent').slice(0, 2);
  urgent.forEach((r) => actions.push(`Relancer ${r.clientName}`));
  const auto = buildAutoCommercialOpportunities({
    stocks: props.stocks,
    cultures: props.cultures,
    lots: props.lots,
    animaux: props.animaux,
    salesOrders: props.orders,
  }).slice(0, 2);
  auto.forEach((o) => actions.push(`Proposer ${o.product_name}`));
  if (!actions.length) actions.push('Publier disponibilités et contacter un client dormant');
  return actions.slice(0, 3);
}

export function buildCommercialPilotageAnswer(type = 'summary', dataMap = {}) {
  const props = commercialPropsFromDataMap(dataMap);
  const enriched = enrichCommercialOrders(props.orders, { deliveries: props.deliveries, invoices: props.invoices });
  const kpis = buildConsolidatedCommercialKpis({
    orders: enriched,
    payments: props.payments,
    clients: props.clients,
    deliveries: props.deliveries,
    invoices: props.invoices,
  });
  const ctx = marginContext(props);
  const relanceRows = buildCommercialRelanceRows({
    clients: props.clients,
    orders: enriched,
    payments: props.payments,
  });
  const pilotage = buildCommercialPilotageBundle({
    orders: enriched,
    payments: props.payments,
    clients: props.clients,
    marginContext: ctx,
    chartOptions: { businessPlans: props.businessPlans, rows: enriched },
  });

  if (type === 'summary') {
    const star = topProductFromKpis(kpis);
    const priority = n(kpis.receivable) > 0
      ? `Relancer ${fmtCurrency(kpis.receivable)} de créances`
      : relanceRows[0]?.recommendedAction || 'Pousser les opportunités auto';
    return buildCommercialAnswerPayload({
      type: 'commercial_summary',
      title: 'Situation commerciale',
      situation: `CA ${fmtCurrency(kpis.ca)} · encaissé ${fmtCurrency(kpis.collected)} · créances ${fmtCurrency(kpis.receivable)} · panier ${fmtCurrency(kpis.basketAvg)} · vedette ${star}`,
      cause: n(kpis.receivable) > 0 ? 'Encaissements en retard ou ventes à crédit' : 'Activité commerciale suivie',
      action: priority,
      sources: [SRC.ca, SRC.collected, SRC.receivable, SRC.basketAvg],
      rows: [
        { label: 'CA', value: fmtCurrency(kpis.ca) },
        { label: 'Encaissé', value: fmtCurrency(kpis.collected) },
        { label: 'Créances', value: fmtCurrency(kpis.receivable) },
        { label: 'Panier moyen', value: fmtCurrency(kpis.basketAvg) },
      ],
      route: 'commercial',
      tab: 'Résumé',
    });
  }

  if (type === 'top_products') {
    const marginSummary = summarizeSalesMargins(enriched, ctx);
    const byProduct = {};
    marginSummary.details.forEach((row) => {
      const key = row.product_name || row.produit || 'Produit';
      if (!byProduct[key]) byProduct[key] = { ca: 0, volume: 0, margin: 0 };
      byProduct[key].ca += n(row.chiffre_affaires);
      byProduct[key].volume += n(row.quantity ?? row.quantite);
      if (row.margin_reliable !== false) byProduct[key].margin += n(row.marge_directe);
    });
    const top = Object.entries(byProduct)
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.ca - a.ca)
      .slice(0, 5);
    const leader = top[0];
    return buildCommercialAnswerPayload({
      type: 'commercial_products',
      title: 'Meilleurs produits',
      situation: top.map((p) => `${p.name}: CA ${fmtCurrency(p.ca)}, vol. ${p.volume}`).join(' · ') || 'Aucune vente produit',
      cause: leader ? `${leader.name} domine le CA` : 'Pas encore de ventes enregistrées',
      action: leader ? `Renforcer stock et relances sur ${leader.name}` : 'Publier un premier produit vendable',
      sources: [SRC.ca, SRC.margin],
      rows: top.map((p) => ({ label: p.name, value: fmtCurrency(p.ca), detail: `Vol. ${p.volume}` })),
      route: 'commercial',
      tab: 'Graphiques',
    });
  }

  if (type === 'top_clients') {
    const strategic = pilotage.strategicClients.slice(0, 5);
    const leader = strategic[0];
    return buildCommercialAnswerPayload({
      type: 'commercial_clients',
      title: 'Meilleurs clients',
      situation: strategic.map((c) => `${c.name}: CA ${fmtCurrency(c.ca)}, marge ${fmtCurrency(c.margin)}`).join(' · ') || 'Aucun client actif',
      cause: leader ? `${leader.name} est le client le plus stratégique` : 'Pas de clients avec ventes',
      action: leader ? `Sécuriser la relation ${leader.name} (fréquence ${leader.frequency})` : 'Créer le premier client',
      sources: [SRC.ca, SRC.margin],
      rows: strategic.map((c) => ({
        label: c.name,
        value: fmtCurrency(c.ca),
        detail: `${c.frequency} · marge ${fmtCurrency(c.margin)}`,
      })),
      route: 'commercial',
      tab: 'Clients',
    });
  }

  if (type === 'receivables') {
    const rows = collectReceivableRows(enriched, props.payments)
      .sort((a, b) => b.rest - a.rest || b.delayDays - a.delayDays)
      .slice(0, 8);
    const total = rows.reduce((s, r) => s + r.rest, 0);
    const worst = rows[0];
    const others = rows.slice(1, 3).map((r) => r.name).filter(Boolean);
    return buildCommercialAnswerPayload({
      type: 'commercial_receivables',
      title: 'Créances à relancer',
      situation: rows.length
        ? `Vous avez ${rows.length} client${rows.length > 1 ? 's' : ''} qui vous doivent encore ${fmtCurrency(total)} au total.`
        : 'Aucun client ne vous doit d\'argent pour le moment.',
      cause: worst
        ? `Le plus urgent est ${worst.name}, avec ${fmtCurrency(worst.rest)} sur la commande ${worst.id}${worst.delayDays > 0 ? `, en retard de ${worst.delayDays} jour${worst.delayDays > 1 ? 's' : ''}` : ''}.`
        : '',
      action: worst
        ? (others.length
          ? `Je commencerais par relancer ${worst.name}${others.length ? `, puis ${others.join(' et ')}` : ''}.`
          : `Je vous suggère de relancer ${worst.name} aujourd'hui.`)
        : '',
      sources: [],
      rows: rows.map((r) => ({
        label: r.name,
        value: fmtCurrency(r.rest),
        detail: `${r.id}`,
      })),
      route: 'commercial',
      tab: 'Relances',
    });
  }

  if (type === 'sell_today') {
    const auto = buildAutoCommercialOpportunities({
      stocks: props.stocks,
      cultures: props.cultures,
      lots: props.lots,
      animaux: props.animaux,
      salesOrders: enriched,
    }).slice(0, 5);
    const urgent = auto.filter((o) => o.urgency === 'critique' || o.urgency === 'haute');
    const pick = urgent[0] || auto[0];
    return buildCommercialAnswerPayload({
      type: 'commercial_opportunities',
      title: 'À vendre aujourd\'hui',
      situation: auto.length
        ? auto.map((o) => `${o.product_name} (${o.quantity} ${o.unit || ''})`).join(' · ')
        : 'Aucune opportunité auto détectée',
      cause: pick?.reason || 'Stocks et productions à inventorier',
      action: pick ? pick.recommendation : 'Vérifier stock et lots prêts',
      sources: ['buildAutoCommercialOpportunities'],
      rows: auto.map((o) => ({
        label: o.product_name,
        value: fmtCurrency(o.estimated_value),
        detail: o.urgency,
      })),
      route: 'commercial',
      tab: 'Opportunités',
    });
  }

  if (type === 'today_actions') {
    const actions = buildTodayActions(props, kpis, relanceRows);
    const lead = actions[0] || 'Publier vos disponibilités et contacter un client régulier';
    const follow = actions.slice(1);
    return buildCommercialAnswerPayload({
      type: 'commercial_today',
      title: 'Priorités du jour',
      situation: `Aujourd'hui, je commencerais par ${lead.charAt(0).toLowerCase() + lead.slice(1)}.`,
      cause: follow.length
        ? `Ensuite : ${follow.map((item) => item.charAt(0).toLowerCase() + item.slice(1)).join(', puis ')}.`
        : '',
      action: '',
      sources: [],
      rows: actions.map((a, i) => ({ label: `Action ${i + 1}`, value: a })),
      route: 'commercial',
      tab: 'Résumé',
    });
  }

  return buildCommercialPilotageAnswer('summary', dataMap);
}
