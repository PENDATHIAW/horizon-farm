/**
 * Réponses agricoles — lecture seule via moteurs canoniques uniquement.
 * consolidateFinance · buildConsolidatedCommercialKpis · summarizeSalesMargins
 * buildObjectifsCroissanceData · computeFarmHeadcount · computeCultureSummary · computeStockSummary
 */

import { consolidateFinance } from '../utils/financeConsolidationEngine.js';
import { buildFinancePilotageInput } from '../utils/financePilotageCore.js';
import { buildConsolidatedCommercialKpis } from '../utils/commercialKpiConsolidated.js';
import { summarizeSalesMargins } from '../utils/salesMarginEngine.js';
import { buildObjectifsCroissanceData } from './objectifsGrowthEngine.js';
import {
  computeFarmHeadcount,
  computeCultureSummary,
  computeStockSummary,
} from '../modules/dashboard/dashboardMetrics.js';
import { buildCarnetDomainCards } from '../modules/dashboard/carnetHorizon.js';
import { fmtCurrency } from '../utils/format.js';
import { detectCommercialPilotageQuery, buildCommercialPilotageAnswer } from './heyHorizonCommercialAnswers.js';
import { detectInvestorQuery, buildInvestorPilotageAnswer } from './assistantInvestorAnswers.js';
import { UNIVERSAL_INTENT_FAMILIES } from './assistantUniversalIntents.js';

const arr = (v) => (Array.isArray(v) ? v : []);
const n = (v) => Number(v || 0);
const lower = (v) => String(v || '').toLowerCase();

function propsFromDataMap(dataMap = {}) {
  return {
    transactionsAll: arr(dataMap.finances || dataMap.transactions),
    salesOrdersAll: arr(dataMap.salesOrdersAll || dataMap.sales_orders || dataMap.salesOrders),
    paymentsAll: arr(dataMap.paymentsAll || dataMap.payments),
    stocks: arr(dataMap.stock || dataMap.stocks),
    animaux: arr(dataMap.animaux || dataMap.animals),
    lots: arr(dataMap.lots || dataMap.avicole),
    cultures: arr(dataMap.cultures),
    clients: arr(dataMap.clients),
    deliveries: arr(dataMap.deliveries),
    invoices: arr(dataMap.invoices),
    sante: arr(dataMap.vaccins || dataMap.sante),
    businessPlans: arr(dataMap.business_plans || dataMap.businessPlans),
    businessEvents: arr(dataMap.business_events || dataMap.businessEvents),
    alimentationLogs: arr(dataMap.alimentation_logs || dataMap.alimentationLogs),
    productionLogs: arr(dataMap.production_oeufs_logs || dataMap.productionLogs),
    investissements: arr(dataMap.investissements),
    taches: arr(dataMap.taches),
    periodScope: dataMap.periodScope,
  };
}

function loadCanonicalSnapshot(dataMap = {}) {
  const props = propsFromDataMap(dataMap);
  const financeInput = buildFinancePilotageInput(props);
  const finance = consolidateFinance(financeInput);
  const commercialKpis = buildConsolidatedCommercialKpis({
    orders: props.salesOrdersAll,
    payments: props.paymentsAll,
    clients: props.clients,
    deliveries: props.deliveries,
    invoices: props.invoices,
  });
  const margins = summarizeSalesMargins({
    orders: props.salesOrdersAll,
    lots: props.lots,
    animaux: props.animaux,
    cultures: props.cultures,
    stocks: props.stocks,
    payments: props.paymentsAll,
    transactions: props.transactionsAll,
  });
  const growth = buildObjectifsCroissanceData(props);
  const headcount = computeFarmHeadcount({
    animaux: props.animaux,
    lots: props.lots,
    cultures: props.cultures,
  });
  const cultureSummary = computeCultureSummary(props.cultures);
  const stockSummary = computeStockSummary(props.stocks);
  const carnetCards = buildCarnetDomainCards({
    dataMap,
    salesOrdersAll: props.salesOrdersAll,
    paymentsAll: props.paymentsAll,
    transactionsAll: props.transactionsAll,
    businessEvents: props.businessEvents,
    animaux: props.animaux,
    cultures: props.cultures,
    stocks: props.stocks,
    clients: props.clients,
    lots: props.lots,
    periodScope: props.periodScope,
  });

  return {
    props,
    finance,
    commercialKpis,
    margins,
    growth,
    headcount,
    cultureSummary,
    stockSummary,
    carnetCards,
  };
}

function countBovins(animaux = []) {
  return arr(animaux).filter((row) => {
    const s = lower(row.species || row.espece || row.type || row.categorie);
    return s.includes('bovin') || s.includes('vache') || s.includes('boeuf');
  }).length;
}

function countUnderTreatment(animaux = [], sante = [], speciesFilter = null) {
  const treatedIds = new Set(
    arr(sante)
      .filter((row) => !['termine', 'terminé', 'cloture', 'clôturé'].includes(lower(row.statut || row.status)))
      .map((row) => row.animal_id || row.entity_id || row.animal),
  );
  return arr(animaux).filter((row) => {
    if (!treatedIds.has(row.id)) return false;
    if (!speciesFilter) return true;
    const s = lower(row.species || row.espece || row.type);
    return s.includes(speciesFilter);
  });
}

function findStockByKeyword(stocks = [], keywords = []) {
  return arr(stocks).filter((row) => {
    const label = lower(row.nom || row.name || row.produit || row.libelle);
    return keywords.some((kw) => label.includes(kw));
  });
}

function stockQty(row = {}) {
  return n(row.quantite ?? row.quantity ?? row.stock);
}

/**
 * Construit une réponse SCA compacte pour une intention universelle.
 * @returns {{ situation: string, cause: string, action: string, sources: string[], title: string, confidence: number } | null}
 */
export function buildAgriculturalAnswer(intent = '', dataMap = {}) {
  if (!intent) return null;

  const snap = loadCanonicalSnapshot(dataMap);
  const { finance, commercialKpis, growth, headcount, cultureSummary, stockSummary, carnetCards, props } = snap;

  const fmt = (v) => Number(v || 0).toLocaleString('fr-FR');
  const treasury = n(finance.cashNet);
  const receivables = n(finance.creancesReelles);
  const payables = n(finance.payablesTotal ?? finance.dettesFournisseurs);
  const margin = n(finance.margeReelle);
  const ca = n(commercialKpis.ca ?? finance.caConsolide);
  const monthTarget = n(growth?.monthlyTarget ?? growth?.objectifMois);
  const monthRealized = n(growth?.monthlyRealized ?? growth?.caMois);
  const monthPct = monthTarget > 0 ? Math.round((monthRealized / monthTarget) * 100) : null;

  const elevageAlerts = arr(carnetCards).find((c) => /elevage|élevage/i.test(c.domain || c.title || ''));
  const cultureAlerts = arr(carnetCards).find((c) => /culture/i.test(c.domain || c.title || ''));

  switch (intent) {
    case 'greeting':
      return {
        title: 'Bonjour',
        situation: 'Horizon est prêt à suivre votre exploitation.',
        cause: 'Les données ERP sont chargées.',
        action: 'Posez une question ou décrivez une action terrain.',
        sources: ['Carnet Horizon'],
        confidence: 99,
      };

    case 'headcount_total':
      return {
        title: 'Effectif',
        situation: `${fmt(headcount.total)} animaux au total (${fmt(headcount.activeAnimals)} unitaires · ${fmt(headcount.activeAvicole)} avicoles).`,
        cause: 'Effectifs issus des fiches animaux et lots actifs.',
        action: headcount.activeAvicole > 0 ? 'Surveillez les lots signalés dans le carnet.' : 'Mettez à jour les fiches animaux si un mouvement vient d\'avoir lieu.',
        sources: ['computeFarmHeadcount'],
        confidence: 95,
      };

    case 'headcount_bovins': {
      const bovins = countBovins(props.animaux);
      return {
        title: 'Bovins',
        situation: `${fmt(bovins)} bovins actifs.`,
        cause: 'Comptage des fiches animaux bovins non clôturées.',
        action: bovins > 0 ? 'Consultez Élevage pour le détail par animal.' : 'Aucun bovin actif enregistré.',
        sources: ['computeFarmHeadcount', 'animaux'],
        confidence: 92,
      };
    }

    case 'headcount_poulets':
      return {
        title: 'Poulets',
        situation: `${fmt(headcount.effectifChair + headcount.effectifPondeuses)} poulets (${fmt(headcount.effectifChair)} chair · ${fmt(headcount.effectifPondeuses)} pondeuses).`,
        cause: `${fmt(headcount.activeLots)} lot(s) avicoles actifs.`,
        action: elevageAlerts?.action || 'Poursuivez le suivi zootechnique habituel.',
        sources: ['computeFarmHeadcount'],
        confidence: 95,
      };

    case 'headcount_ovins':
    case 'headcount_caprins': {
      const label = intent === 'headcount_ovins' ? 'ovins' : 'caprins';
      const count = arr(props.animaux).filter((row) => lower(row.species || row.espece || '').includes(label.slice(0, -1))).length;
      return {
        title: label.charAt(0).toUpperCase() + label.slice(1),
        situation: `${fmt(count)} ${label} actifs.`,
        cause: 'Fiches animaux ERP.',
        action: count > 0 ? 'Ouvrez Élevage pour le détail.' : `Aucun ${label.slice(0, -1)} actif enregistré.`,
        sources: ['animaux'],
        confidence: 90,
      };
    }

    case 'elevage_status':
      return {
        title: 'Élevage',
        situation: `${fmt(headcount.total)} animaux · ${fmt(headcount.activeLots)} lots actifs.`,
        cause: elevageAlerts?.headline || 'Synthèse des effectifs et alertes carnet.',
        action: elevageAlerts?.action || 'Consultez le carnet élevage pour les priorités.',
        sources: ['computeFarmHeadcount', 'buildCarnetDomainCards'],
        confidence: 90,
      };

    case 'lots_surveillance': {
      const alertText = elevageAlerts?.headline || 'Aucun lot critique signalé.';
      return {
        title: 'Lots à surveiller',
        situation: alertText,
        cause: 'Alertes issues du carnet dirigeant.',
        action: elevageAlerts?.action || 'Poursuivez le suivi sanitaire et alimentaire.',
        sources: ['buildCarnetDomainCards'],
        confidence: 88,
      };
    }

    case 'animals_under_treatment': {
      const bovinsTreated = countUnderTreatment(props.animaux, props.sante, 'bovin');
      const allTreated = countUnderTreatment(props.animaux, props.sante);
      const rows = bovinsTreated.length ? bovinsTreated : allTreated;
      const names = rows.slice(0, 5).map((r) => r.nom || r.name || r.id).join(', ');
      return {
        title: 'Traitements',
        situation: rows.length
          ? `${rows.length} animal(aux) sous traitement${names ? ` : ${names}` : ''}.`
          : 'Aucun animal sous traitement actif.',
        cause: 'Fiches santé / vaccins non clôturées.',
        action: rows.length ? 'Vérifiez les dates de traitement dans Élevage → Santé.' : 'Aucune action sanitaire en cours.',
        sources: ['sante', 'animaux'],
        confidence: 88,
      };
    }

    case 'parcelles_status':
      return {
        title: 'Parcelles',
        situation: `${fmt(cultureSummary.parcelCount)} parcelles · ${fmt(cultureSummary.activeCultures)} cultures actives · ${fmt(cultureSummary.surfaceM2)} m².`,
        cause: cultureAlerts?.headline || 'Parcelles et cultures actives ERP.',
        action: cultureAlerts?.action || 'Consultez Cultures pour le détail par parcelle.',
        sources: ['computeCultureSummary'],
        confidence: 92,
      };

    case 'rendement':
    case 'recoltes':
    case 'campagnes':
      return {
        title: 'Cultures',
        situation: `${fmt(cultureSummary.activeCultures)} cultures en cours sur ${fmt(cultureSummary.parcelCount)} parcelles.`,
        cause: 'Données cultures et parcelles ERP.',
        action: 'Ouvrez Cultures pour les rendements et récoltes détaillés.',
        sources: ['computeCultureSummary'],
        confidence: 85,
      };

    case 'cultures_difficulte':
      return {
        title: 'Cultures en difficulté',
        situation: cultureAlerts?.headline || 'Aucune culture critique signalée.',
        cause: 'Alertes carnet cultures.',
        action: cultureAlerts?.action || 'Surveillez les parcelles à faible avancement.',
        sources: ['buildCarnetDomainCards', 'computeCultureSummary'],
        confidence: 85,
      };

    case 'stock_overview':
    case 'stock_remain':
      return {
        title: 'Stock',
        situation: `${fmt(stockSummary.availableProducts)} produits disponibles · ${fmt(stockSummary.lowStockCount)} sous seuil.`,
        cause: `Valeur stock ${fmtCurrency(stockSummary.stockValue)}.`,
        action: stockSummary.lowStockCount > 0 ? 'Réapprovisionnez les produits sous seuil.' : 'Stocks dans les normes.',
        sources: ['computeStockSummary'],
        confidence: 93,
      };

    case 'stock_aliment':
    case 'stock_maiz': {
      const keywords = intent === 'stock_maiz' ? ['mais', 'maïs', 'grain'] : ['aliment', 'feed', 'provende'];
      const rows = findStockByKeyword(props.stocks, keywords);
      const total = rows.reduce((sum, row) => sum + stockQty(row), 0);
      const label = rows[0]?.nom || rows[0]?.name || (intent === 'stock_maiz' ? 'maïs' : 'aliment');
      return {
        title: intent === 'stock_maiz' ? 'Maïs' : 'Aliment',
        situation: rows.length
          ? `${fmt(total)} ${rows[0]?.unite || rows[0]?.unit || 'unités'} de ${label} en stock.`
          : `Aucun ${intent === 'stock_maiz' ? 'maïs' : 'aliment'} trouvé en stock.`,
        cause: stockSummary.lowStockCount > 0 ? `${fmt(stockSummary.lowStockCount)} produit(s) sous seuil globalement.` : 'Niveaux issus des fiches stock ERP.',
        action: total <= 0 ? 'Planifiez un achat ou une réception.' : 'Vérifiez la consommation prévue sur le mois.',
        sources: ['computeStockSummary', 'stocks'],
        confidence: 90,
      };
    }

    case 'stock_ruptures':
      return {
        title: 'Ruptures',
        situation: `${fmt(stockSummary.lowStockCount)} produit(s) sous seuil.`,
        cause: 'Seuils stock ERP.',
        action: stockSummary.lowStockCount > 0 ? 'Priorisez les achats sur les références critiques.' : 'Pas de rupture signalée.',
        sources: ['computeStockSummary'],
        confidence: 92,
      };

    case 'stock_dlc':
      return {
        title: 'DLC',
        situation: 'Les dates de péremption sont dans Achats & Stock.',
        cause: 'Pas de moteur DLC dédié — consultation fiches stock.',
        action: 'Ouvrez Achats & Stock → onglet produits pour filtrer les DLC proches.',
        sources: ['stocks'],
        confidence: 80,
      };

    case 'ventes':
      return {
        title: 'Ventes',
        situation: `CA ${fmtCurrency(ca)} · Encaissé ${fmtCurrency(commercialKpis.collected)}.`,
        cause: `${fmt(commercialKpis.unpaidOrders || commercialKpis.openOrders || 0)} commande(s) avec solde.`,
        action: n(commercialKpis.receivable) > 0 ? 'Relancez les créances prioritaires.' : 'Poursuivez le rythme commercial.',
        sources: ['buildConsolidatedCommercialKpis'],
        confidence: 92,
      };

    case 'treasury':
      return buildInvestorPilotageAnswer('treasury', dataMap) || {
        title: 'Trésorerie',
        situation: `Trésorerie ${fmtCurrency(treasury)}.`,
        cause: `Créances ${fmtCurrency(receivables)} · Dettes ${fmtCurrency(payables)}.`,
        action: treasury < 0 ? 'Reporter les sorties non urgentes.' : 'Conserver une marge de sécurité.',
        sources: ['consolidateFinance'],
        confidence: 94,
      };

    case 'dettes':
      return {
        title: 'Dettes',
        situation: `Dettes fournisseurs ${fmtCurrency(payables)}.`,
        cause: 'Écritures finance ERP.',
        action: payables > treasury ? 'Arbitrez les paiements cette semaine.' : 'Dettes sous contrôle.',
        sources: ['consolidateFinance'],
        confidence: 92,
      };

    case 'creances':
    case 'receivables':
    case 'relances': {
      const commercialType = intent === 'relances' ? 'receivables' : (detectCommercialPilotageQuery(intent === 'receivables' ? 'clients à relancer' : 'créances') || 'receivables');
      const commercial = buildCommercialPilotageAnswer(commercialType, dataMap);
      if (commercial?.situation) return commercial;
      return {
        title: 'Créances',
        situation: `Créances clients ${fmtCurrency(receivables)}.`,
        cause: `${fmt(commercialKpis.unpaidOrders || 0)} commande(s) impayée(s).`,
        action: receivables > 0 ? 'Relancez les clients en retard.' : 'Pas de créance ouverte.',
        sources: ['consolidateFinance', 'buildConsolidatedCommercialKpis'],
        confidence: 91,
      };
    }

    case 'top_client':
    case 'top_product':
    case 'commercial_summary':
    case 'sell_today':
    case 'today_priorities': {
      const map = {
        top_client: 'top_clients',
        top_product: 'top_products',
        commercial_summary: 'summary',
        sell_today: 'sell_today',
        today_priorities: 'today_actions',
        follow_up: 'receivables',
      };
      const type = map[intent];
      if (type) {
        const answer = buildCommercialPilotageAnswer(type, dataMap);
        if (answer?.situation) return answer;
      }
      break;
    }

    case 'follow_up': {
      const answer = buildCommercialPilotageAnswer('receivables', dataMap);
      if (answer?.situation) return answer;
      break;
    }

    case 'resultat':
    case 'profitability':
      return buildInvestorPilotageAnswer('profitability', dataMap) || {
        title: 'Résultat',
        situation: `Marge réelle ${fmtCurrency(margin)}.`,
        cause: `CA consolidé ${fmtCurrency(ca)}.`,
        action: margin < 0 ? 'Revoir prix et charges variables.' : 'Consolider les produits rentables.',
        sources: ['consolidateFinance', 'summarizeSalesMargins'],
        confidence: 93,
      };

    case 'progress_status':
    case 'month_goal':
    case 'annual_goal':
      return buildInvestorPilotageAnswer('growth_objectives', dataMap) || {
        title: 'Objectifs',
        situation: monthPct != null
          ? `Objectif mensuel atteint à ${monthPct} % (${fmtCurrency(monthRealized)} / ${fmtCurrency(monthTarget)}).`
          : `CA période ${fmtCurrency(ca)}.`,
        cause: monthPct != null && monthPct < 80 ? 'Rythme commercial en retard sur l\'objectif.' : 'Suivi objectifs ERP.',
        action: monthPct != null && monthPct < 80 ? 'Accélérez ventes et livraisons cette semaine.' : 'Maintenez le rythme actuel.',
        sources: ['buildObjectifsCroissanceData'],
        confidence: 90,
      };

    case 'farm_status':
    case 'investor_summary':
    case 'growth':
      return buildInvestorPilotageAnswer(
        intent === 'growth' ? 'growth_objectives' : (intent === 'investor_summary' ? 'investor_room' : 'farm_status'),
        dataMap,
      );

    default:
      return null;
  }

  return null;
}

/** Familles couvertes par le lecteur agricole. */
export const AGRICULTURAL_CONTEXT_FAMILIES = Object.freeze([
  UNIVERSAL_INTENT_FAMILIES.SALUTATION,
  UNIVERSAL_INTENT_FAMILIES.ELEVAGE,
  UNIVERSAL_INTENT_FAMILIES.CULTURES,
  UNIVERSAL_INTENT_FAMILIES.STOCK,
  UNIVERSAL_INTENT_FAMILIES.COMMERCIAL,
  UNIVERSAL_INTENT_FAMILIES.FINANCE,
  UNIVERSAL_INTENT_FAMILIES.OBJECTIFS,
  UNIVERSAL_INTENT_FAMILIES.DECISION,
  UNIVERSAL_INTENT_FAMILIES.INVESTISSEUR,
]);

export default buildAgriculturalAnswer;
