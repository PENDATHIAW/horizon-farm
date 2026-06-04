/**
 * Diagnostic économique facture — comparaison prix, impact marge & trésorerie.
 * Lecture seule : utilise Hey Horizon Core + historique ERP.
 */

import { getHeyHorizonCoreSnapshot } from '../heyHorizonCore/index.js';
import { stockUnitPrice } from '../../utils/stockWorkflows.js';
import { arr, money, n } from '../heyHorizonCore/coreUtils.js';

const lower = (value) => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

function productNeedle(name = '') {
  return lower(name).replace(/[^a-z0-9\s]/g, ' ').trim();
}

function matchesProduct(label = '', needle = '') {
  const a = productNeedle(label);
  const b = productNeedle(needle);
  if (!a || !b) return false;
  return a.includes(b) || b.includes(a) || a.split(' ').some((w) => w.length > 3 && b.includes(w));
}

function extractHistoricalPurchases(dataMap = {}, productName = '', supplierName = '') {
  const transactions = arr(dataMap.finances || dataMap.transactions);
  const stocks = arr(dataMap.stock || dataMap.stocks);
  const needle = productNeedle(productName);

  const fromStock = stocks
    .filter((row) => matchesProduct(`${row.produit || ''} ${row.nom || ''}`, needle))
    .map((row) => ({
      source: 'stock',
      date: row.last_purchase_at || row.updated_at || row.created_at || '',
      prix_unitaire: stockUnitPrice(row),
      quantite: n(row.quantite ?? row.quantity),
      libelle: row.produit || row.nom,
    }))
    .filter((row) => row.prix_unitaire > 0);

  const fromFinance = transactions
    .filter((row) => {
      const type = lower(row.type || row.transaction_type || row.nature);
      if (type && !['sortie', 'expense', 'depense', 'dépense', 'achat', 'charge'].includes(type)) return false;
      const label = `${row.libelle || ''} ${row.label || ''} ${row.description || ''} ${row.notes || ''}`;
      const supplierOk = !supplierName || matchesProduct(label, supplierName) || matchesProduct(row.fournisseur_nom || '', supplierName);
      return supplierOk && matchesProduct(label, needle);
    })
    .map((row) => {
      const qty = n(row.quantite ?? row.quantity) || 1;
      const amount = money(row);
      return {
        source: 'finance',
        date: row.date || row.event_date || row.created_at || '',
        prix_unitaire: qty > 0 ? amount / qty : amount,
        quantite: qty,
        libelle: row.libelle || row.label,
      };
    })
    .filter((row) => row.prix_unitaire > 0);

  return [...fromStock, ...fromFinance]
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .slice(0, 12);
}

function computePriceDelta(currentPrice = 0, history = []) {
  if (!currentPrice || !history.length) {
    return { previous_unit_price: null, delta_pct: null, trend: 'unknown', samples: history.length };
  }
  const previous = history[0]?.prix_unitaire || history.find((h) => h.prix_unitaire > 0)?.prix_unitaire;
  if (!previous) return { previous_unit_price: null, delta_pct: null, trend: 'unknown', samples: history.length };
  const deltaPct = Number((((currentPrice - previous) / previous) * 100).toFixed(1));
  return {
    previous_unit_price: Math.round(previous),
    delta_pct: deltaPct,
    trend: deltaPct > 1 ? 'hausse' : deltaPct < -1 ? 'baisse' : 'stable',
    samples: history.length,
  };
}

function findReferenceSale(dataMap = {}, invoice = {}) {
  const salesOrders = arr(dataMap.sales_orders || dataMap.salesOrders);
  const category = invoice.categories?.[0] || '';
  const productNeedleMap = {
    aliment: 'poulet',
    poussins: 'poulet',
    medicaments: 'poulet',
    materiel: '',
    transport: '',
    intrant: 'poulet',
  };
  const target = productNeedleMap[category] || invoice.produit || 'poulet';
  const recent = salesOrders
    .filter((order) => matchesProduct(`${order.product_name || ''} ${order.produit || ''} ${order.libelle || ''}`, target))
    .slice(0, 20);
  if (!recent.length) return null;
  const order = recent[0];
  const qty = Math.max(1, n(order.quantite ?? order.quantity ?? 1));
  const total = money(order);
  return {
    product_name: order.product_name || order.produit || target,
    unit_sale_price: qty > 0 ? Math.round(total / qty) : total,
    quantity: qty,
    order_id: order.id,
  };
}

function estimateMarginImpact({ invoice = {}, priceDelta = {}, referenceSale = null, dataMap = {} }) {
  const currentUnit = n(invoice.prix_unitaire);
  const salePrice = referenceSale?.unit_sale_price || 0;
  const category = invoice.categories?.[0] || 'intrant';

  if (!salePrice || !currentUnit) {
    return {
      applicable: false,
      reason: salePrice ? 'Prix unitaire facture manquant' : 'Aucune vente de référence trouvée pour estimer la marge',
    };
  }

  const lots = arr(dataMap.lots || dataMap.avicole);
  const broilerLot = lots.find((l) => /chair|broiler|poulet/i.test(lower(`${l.type || ''} ${l.nom || ''}`))) || lots[0];
  const context = {
    stocks: arr(dataMap.stock || dataMap.stocks),
    lots,
    animaux: arr(dataMap.animaux),
    payments: arr(dataMap.payments),
    alimentationLogs: arr(dataMap.alimentation_logs),
    productionLogs: arr(dataMap.production_oeufs_logs),
    businessEvents: arr(dataMap.business_events),
  };

  const baselineCost = category === 'aliment' && broilerLot
    ? n(broilerLot.cout_aliment_unitaire ?? broilerLot.feed_cost_per_bird ?? currentUnit * 0.35)
    : currentUnit * (category === 'aliment' ? 0.35 : category === 'medicaments' ? 0.05 : 0.15);

  const previousUnit = priceDelta.previous_unit_price || currentUnit;
  const costBefore = Math.max(baselineCost, previousUnit * (category === 'aliment' ? 0.35 : 0.15));
  const costAfter = Math.max(baselineCost, currentUnit * (category === 'aliment' ? 0.35 : 0.15));

  const marginBefore = salePrice > 0 ? Number((((salePrice - costBefore) / salePrice) * 100).toFixed(1)) : 0;
  const marginAfter = salePrice > 0 ? Number((((salePrice - costAfter) / salePrice) * 100).toFixed(1)) : 0;

  const recommendedIncrease = marginAfter < 8 && salePrice > 0
    ? Math.max(50, Math.ceil((costAfter - costBefore) / 0.85 / 50) * 50)
    : 0;

  return {
    applicable: true,
    reference_sale: referenceSale,
    cout_production_avant: Math.round(costBefore),
    cout_production_apres: Math.round(costAfter),
    marge_brute_avant_pct: marginBefore,
    marge_brute_apres_pct: marginAfter,
    prix_vente_reference: salePrice,
    prix_vente_conseille: recommendedIncrease ? salePrice + recommendedIncrease : salePrice,
    hausse_prix_conseillee_fcfa: recommendedIncrease,
  };
}

function estimateTreasuryImpact(invoice = {}, dataMap = {}) {
  const snapshot = getHeyHorizonCoreSnapshot(dataMap);
  const amount = n(invoice.montant_total);
  const paid = ['paye', 'payé', 'paid'].includes(lower(invoice.statut_paiement || invoice.payment_status));
  const treasury = snapshot.finance?.treasury || {};

  return {
    montant_facture: amount,
    impact_tresorerie: paid ? 0 : amount,
    statut_paiement: invoice.statut_paiement || invoice.payment_status,
    tresorerie_resultat_courant: treasury.resultat ?? null,
    creances_clients: treasury.creances_clients ?? null,
    alerte_tresorerie: !paid && amount > 0 && (treasury.resultat ?? 0) < amount
      ? 'Cette facture à crédit pèse sur la trésorerie disponible.'
      : null,
  };
}

function buildRecommendation({ invoice = {}, priceDelta = {}, margin = {}, treasury = {} }) {
  const lines = [];
  const severity = priceDelta.trend === 'hausse' && (priceDelta.delta_pct || 0) >= 5 ? 'warning' : 'info';
  const product = invoice.produit || invoice.lignes?.[0]?.produit || 'produit';

  if (priceDelta.trend === 'hausse' && priceDelta.delta_pct != null) {
    lines.push(`Hausse détectée : ${product} a augmenté de ${Math.abs(priceDelta.delta_pct)} % (dernier prix : ${priceDelta.previous_unit_price?.toLocaleString('fr-FR')} FCFA → ${Math.round(invoice.prix_unitaire || 0).toLocaleString('fr-FR')} FCFA).`);
  } else if (priceDelta.trend === 'baisse' && priceDelta.delta_pct != null) {
    lines.push(`Baisse détectée : ${product} a baissé de ${Math.abs(priceDelta.delta_pct)} % par rapport au dernier achat.`);
  } else if (!priceDelta.previous_unit_price) {
    lines.push(`Premier achat repéré ou historique insuffisant pour ${product}.`);
  }

  if (margin.applicable && priceDelta.trend === 'hausse') {
    lines.push(`Si le prix de vente du ${margin.reference_sale?.product_name || 'produit'} ne change pas, la marge estimée passe de ${margin.marge_brute_avant_pct} % à ${margin.marge_brute_apres_pct} %.`);
    if (margin.hausse_prix_conseillee_fcfa > 0) {
      lines.push(`Recommandation : augmenter le prix de vente de ${margin.hausse_prix_conseillee_fcfa.toLocaleString('fr-FR')} FCFA ou renégocier le fournisseur.`);
    }
  }

  if (treasury.alerte_tresorerie) {
    lines.push(treasury.alerte_tresorerie);
  }

  if (invoice.stockable) {
    lines.push('Produit stockable — réception stock recommandée après validation (workflow Achats & Stock).');
  } else {
    lines.push('Charge non stockable — enregistrement dépense finance après validation.');
  }

  const headline = severity === 'warning' && priceDelta.delta_pct
    ? `⚠️ Hausse détectée : ${product} +${Math.abs(priceDelta.delta_pct)} %`
    : priceDelta.trend === 'baisse'
      ? `✓ Baisse prix : ${product} ${Math.abs(priceDelta.delta_pct || 0)} %`
      : `Diagnostic facture — ${invoice.fournisseur || 'fournisseur'}`;

  return {
    severity,
    headline,
    summary: lines.join(' '),
    bullets: lines,
    action: margin.hausse_prix_conseillee_fcfa > 0
      ? `Ajuster prix vente +${margin.hausse_prix_conseillee_fcfa.toLocaleString('fr-FR')} FCFA`
      : invoice.stockable
        ? 'Valider réception stock'
        : 'Valider dépense',
    recommended_alert: severity === 'warning'
      ? {
          title: headline,
          description: lines[0] || 'Variation de prix significative',
          severity: 'warning',
          module: invoice.stockable ? 'achats_stock' : 'finance_pilotage',
        }
      : null,
  };
}

/**
 * Analyse l'impact économique d'une facture parsée.
 */
export function analyzeMarginImpact(invoice = {}, dataMap = {}) {
  const history = extractHistoricalPurchases(dataMap, invoice.produit, invoice.fournisseur);
  const priceDelta = computePriceDelta(n(invoice.prix_unitaire), history);
  const referenceSale = findReferenceSale(dataMap, invoice);
  const margin = estimateMarginImpact({ invoice, priceDelta, referenceSale, dataMap });
  const treasury = estimateTreasuryImpact(invoice, dataMap);
  const recommendation = buildRecommendation({ invoice, priceDelta, margin, treasury });

  return {
    price_comparison: {
      ...priceDelta,
      history_samples: history.slice(0, 5),
    },
    margin_impact: margin,
    treasury_impact: treasury,
    recommendation,
    core_snapshot: {
      inventory: getHeyHorizonCoreSnapshot(dataMap).inventory?.stock || null,
      finance: getHeyHorizonCoreSnapshot(dataMap).finance?.treasury || null,
    },
  };
}

export default analyzeMarginImpact;
