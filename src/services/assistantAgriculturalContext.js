/**
 * Réponses agricoles — lecture seule via moteurs de calcul uniquement.
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
import { buildInvestorPilotageAnswer } from './assistantInvestorAnswers.js';
import { buildAnnualOutlookAnswer } from './assistantFarmOverview.js';
import {
  buildCommentVaLaFermeAnswer,
  buildPrioritesDuJourAnswer,
  buildObjectifStatusAnswer,
  buildReceivableFollowUpAnswer,
} from './assistantDirectorEngines.js';
import {
  buildTendancesAnswer,
  buildComparaisonsAnswer,
  buildRisquesAnswer,
  buildOpportunitesAnswer,
  buildMoneyLeaksAnswer,
} from './assistantFarmAdvisor.js';
import { resolveCanonicalGoalProgress } from './assistantGoalProgress.js';
import { hasExploitableFarmData } from './assistantDirectorSnapshot.js';
import { UNIVERSAL_INTENT_FAMILIES } from './assistantUniversalIntents.js';
import { buildWeatherAnswer } from './assistantWeatherAnswer.js';

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

import { enrichTerrainAnswer } from './assistantTerrainAnswers.js';
import { buildCentreDecisionAnswer } from './assistantCentreDecisionAnswers.js';

const CENTRE_LINKED_INTENTS = new Set([
  'today_priorities', 'priorites_du_jour', 'main_risk', 'farm_risks',
  'farm_opportunities', 'centre_recommendations', 'centre_cycles',
  'centre_opportunities', 'activity_journal', 'farm_overview',
  'comment_va_la_ferme', 'farm_status',
]);

/**
 * Construit une réponse SCA compacte pour une intention universelle.
 * @returns {{ situation: string, cause: string, action: string, sources: string[], title: string, confidence: number } | null}
 */
function buildAgriculturalAnswerCore(intent = '', dataMap = {}, options = {}) {
  const conversationContext = options.conversationContext || null;
  const query = options.query || '';
  if (!intent) return null;

  const snap = loadCanonicalSnapshot(dataMap);
  const { finance, commercialKpis, growth, headcount, cultureSummary, stockSummary, carnetCards, props } = snap;

  const fmt = (v) => Number(v || 0).toLocaleString('fr-FR');
  const treasury = n(finance.cashNet);
  const receivables = n(finance.creancesReelles);
  const payables = n(finance.payablesTotal ?? finance.dettesFournisseurs);
  const margin = n(finance.margeReelle);
  const ca = n(commercialKpis.ca ?? finance.caConsolide);
  const goalProgress = resolveCanonicalGoalProgress(dataMap);
  const monthTarget = goalProgress.monthTarget;
  const monthRealized = goalProgress.monthRealized;
  const monthPct = goalProgress.monthPct;

  const elevageAlerts = arr(carnetCards).find((c) => /elevage|élevage/i.test(c.domain || c.title || ''));
  const cultureAlerts = arr(carnetCards).find((c) => /culture/i.test(c.domain || c.title || ''));

  if (CENTRE_LINKED_INTENTS.has(intent)) {
    const centreAnswer = buildCentreDecisionAnswer(intent, dataMap, options);
    if (centreAnswer) return centreAnswer;
  }

  switch (intent) {
    case 'greeting':
      if (hasExploitableFarmData(dataMap)) {
        return buildCommentVaLaFermeAnswer(dataMap);
      }
      return {
        title: 'Bonjour',
        situation: 'Bonjour — content de vous retrouver.',
        cause: '',
        action: 'De quoi voulez-vous qu\'on parle ?',
        sources: [],
        confidence: 99,
      };

    case 'receivable_follow_up':
      return buildReceivableFollowUpAnswer(dataMap, conversationContext);

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
      const treated = countUnderTreatment(props.animaux, props.sante, 'bovin');
      return {
        title: 'Bovins',
        situation: bovins > 0
          ? `Vous avez ${fmt(bovins)} bovins sur l'exploitation.`
          : 'Je ne vois aucun bovin actif enregistré pour le moment.',
        cause: treated.length
          ? `${fmt(treated.length)} d'entre eux suivent encore un traitement.`
          : (bovins > 0 ? 'Le cheptel bovin est suivi dans vos fiches animaux.' : 'Les fiches animaux ne remontent pas encore de bovins actifs.'),
        action: treated.length
          ? 'Gardez un œil sur les animaux sous traitement cette semaine.'
          : (bovins > 0 ? 'Si un mouvement vient d\'avoir lieu, pensez à mettre à jour les fiches.' : 'Commencez par enregistrer vos bovins dans Élevage.'),
        sources: ['computeFarmHeadcount', 'animaux', 'sante'],
        confidence: 92,
      };
    }

    case 'my_animals':
      return {
        title: 'Cheptel',
        situation: `${fmt(headcount.total)} animaux · ${fmt(headcount.activeLots)} lots actifs.`,
        cause: `${fmt(headcount.activeAnimals)} fiches animaux · ${fmt(headcount.activeAvicole)} avicoles.`,
        action: elevageAlerts?.action || 'Posez une question sur une espèce : bovins, ovins, poulets…',
        sources: ['computeFarmHeadcount', 'buildCarnetDomainCards'],
        confidence: 94,
      };

    case 'lots_overview': {
      const activeLots = arr(props.lots).filter((lot) => !['termine', 'terminé', 'clos', 'clôturé', 'archive'].includes(lower(lot.statut || lot.status)));
      const names = activeLots.slice(0, 5).map((l) => l.name || l.nom || l.id).join(', ');
      return {
        title: 'Lots',
        situation: `${fmt(activeLots.length)} lot(s) actif(s)${names ? ` : ${names}` : ''}.`,
        cause: `${fmt(headcount.effectifChair)} chair · ${fmt(headcount.effectifPondeuses)} pondeuses en cours.`,
        action: elevageAlerts?.headline || 'Demandez « quel lot surveiller » pour les alertes.',
        sources: ['computeFarmHeadcount', 'avicole'],
        confidence: 91,
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

    case 'headcount_pondeuses':
      return {
        title: 'Pondeuses',
        situation: `${fmt(headcount.effectifPondeuses)} pondeuses actives.`,
        cause: `${fmt(headcount.activeLotsPondeuses)} lot(s) pondeuses en cours.`,
        action: 'Suivez ponte et alimentation dans Élevage.',
        sources: ['computeFarmHeadcount'],
        confidence: 94,
      };

    case 'lots_sick': {
      const sickLots = arr(props.lots).filter((lot) => /alerte|malad|sante|santé|critique|surveill/i.test(lower(lot.status || lot.statut || lot.health_status || lot.alert_level || '')));
      const names = sickLots.slice(0, 4).map((l) => l.name || l.nom || l.id).join(', ');
      return {
        title: 'Lots malades',
        situation: sickLots.length
          ? `${sickLots.length} lot(s) en alerte${names ? ` : ${names}` : ''}.`
          : 'Aucun lot en alerte sanitaire signalé.',
        cause: elevageAlerts?.headline || 'Statuts lots et carnet élevage.',
        action: sickLots.length ? 'Contrôlez santé et biosecurité sur ces lots.' : 'Poursuivez le protocole sanitaire habituel.',
        sources: ['buildCarnetDomainCards', 'avicole'],
        confidence: 86,
      };
    }

    case 'lot_mortality': {
      const ranked = arr(props.lots)
        .map((lot) => ({
          name: lot.name || lot.nom || lot.id,
          mortality: n(lot.mortalite ?? lot.mortalité ?? lot.morts ?? lot.deaths ?? lot.pertes),
        }))
        .filter((row) => row.mortality > 0)
        .sort((a, b) => b.mortality - a.mortality);
      const top = ranked[0];
      return {
        title: 'Mortalité',
        situation: top
          ? `Lot le plus touché : ${top.name} (${fmt(top.mortality)} pertes signalées).`
          : 'Aucune mortalité significative enregistrée sur les lots actifs.',
        cause: 'Mouvements mortalité ERP / fiches lots.',
        action: top ? `Analyser causes sur ${top.name} et ajuster conduite.` : 'Maintenir la surveillance zootechnique.',
        sources: ['avicole', 'buildCarnetDomainCards'],
        confidence: 84,
      };
    }

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

    case 'parcel_best':
      return {
        title: 'Parcelles',
        situation: cultureAlerts?.headline || `${fmt(cultureSummary.parcelCount)} parcelles · ${fmt(cultureSummary.activeCultures)} cultures actives.`,
        cause: 'Comparaison issue du carnet cultures et fiches parcelles.',
        action: 'Ouvrez Cultures pour le détail par parcelle.',
        sources: ['computeCultureSummary', 'buildCarnetDomainCards'],
        confidence: 82,
      };

    case 'culture_profit': {
      const top = arr(snap.margins?.products || snap.margins?.rows)[0];
      return {
        title: 'Culture rentable',
        situation: top?.name
          ? `Meilleure contribution ventes : ${top.name}${top.margin != null ? ` (marge ${fmtCurrency(top.margin)})` : ''}.`
          : `${fmt(cultureSummary.activeCultures)} cultures actives — détail marge dans Cultures.`,
        cause: 'Marges consolidées depuis les ventes ERP.',
        action: 'Renforcez les cultures les plus rentables cette saison.',
        sources: ['summarizeSalesMargins', 'computeCultureSummary'],
        confidence: 83,
      };
    }

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

    case 'stock_sellable': {
      const sellable = arr(props.stocks).filter((row) => stockQty(row) > 0).slice(0, 6);
      const labels = sellable.map((row) => row.nom || row.name || row.produit).join(', ');
      return {
        title: 'À vendre',
        situation: sellable.length
          ? `${fmt(sellable.length)} produit(s) vendables en stock${labels ? ` : ${labels}` : ''}.`
          : 'Peu de produits disponibles à la vente immédiate.',
        cause: 'Quantités stock ERP > 0.',
        action: 'Priorisez les produits périssables ou à forte marge.',
        sources: ['computeStockSummary', 'stocks'],
        confidence: 88,
      };
    }

    case 'ventes': {
      const unpaid = n(commercialKpis.unpaidOrders || commercialKpis.openOrders || 0);
      const receivable = n(commercialKpis.receivable);
      return {
        title: 'Ventes',
        situation: `Vous avez réalisé ${fmtCurrency(ca)} de chiffre d'affaires.\n\nSur ce montant, ${fmtCurrency(commercialKpis.collected)} ont déjà été encaissés.`,
        cause: unpaid > 0
          ? 'Il reste plusieurs factures ouvertes qui mériteraient une relance.'
          : 'Les encaissements suivent bien le rythme des ventes.',
        action: receivable > 0 ? 'Je peux détailler les clients à relancer si vous voulez.' : '',
        sources: [],
        confidence: 92,
      };
    }

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
    case 'relances':
    case 'receivable_detail': {
      const commercialType = intent === 'relances' ? 'receivables' : (detectCommercialPilotageQuery(intent === 'receivables' ? 'clients à relancer' : 'créances') || 'receivables');
      const commercial = buildCommercialPilotageAnswer(commercialType, dataMap);
      if (commercial?.situation) {
        const top = commercial.meta?.topReceivable || null;
        return {
          ...commercial,
          sources: [],
          meta: top ? { topReceivable: top } : commercial.meta,
        };
      }
      return {
        title: 'Créances',
        situation: receivables > 0
          ? `Vous avez encore ${fmtCurrency(receivables)} à récupérer auprès de vos clients.`
          : 'Aucun client ne vous doit d\'argent pour le moment.',
        cause: n(commercialKpis.unpaidOrders || 0) > 0
          ? `${commercialKpis.unpaidOrders} commande${commercialKpis.unpaidOrders > 1 ? 's' : ''} restent partiellement impayées.`
          : '',
        action: receivables > 0 ? 'Je peux détailler le client le plus urgent si vous voulez.' : '',
        sources: [],
        confidence: 91,
      };
    }

    case 'today_priorities':
    case 'priorites_du_jour':
      return buildPrioritesDuJourAnswer(dataMap);

    case 'sell_today':
    case 'farm_opportunities':
      return buildOpportunitesAnswer(dataMap);

    case 'farm_trends':
      return buildTendancesAnswer(dataMap);

    case 'farm_comparisons':
      return buildComparaisonsAnswer(dataMap);

    case 'farm_risks':
    case 'main_risk':
      return buildRisquesAnswer(dataMap);

    case 'money_leaks':
      return buildMoneyLeaksAnswer(dataMap);

    case 'top_client':
    case 'top_product':
    case 'quotes_pending':
    case 'deliveries_today':
    case 'commercial_summary': {
      const map = {
        top_client: 'top_clients',
        top_product: 'top_products',
        commercial_summary: 'summary',
        quotes_pending: 'quotes_pending',
        deliveries_today: 'deliveries_today',
      };
      const type = map[intent];
      if (type) {
        const answer = buildCommercialPilotageAnswer(type, dataMap);
        if (answer?.situation) {
          return { ...answer, sources: [], meta: answer.meta };
        }
      }
      break;
    }

    case 'follow_up': {
      const answer = buildCommercialPilotageAnswer('receivables', dataMap);
      if (answer?.situation) return answer;
      break;
    }

    case 'orders_overview': {
      const open = arr(props.salesOrdersAll).filter((row) => !['livree', 'livrée', 'payee', 'payée', 'annulee', 'annulée'].includes(lower(row.statut || row.status)));
      const total = open.reduce((sum, row) => sum + n(row.total ?? row.montant_total ?? row.total_amount), 0);
      return {
        title: 'Commandes',
        situation: `${fmt(open.length)} commande(s) en cours · ${fmtCurrency(total)}.`,
        cause: `${fmt(commercialKpis.unpaidOrders || 0)} commande(s) avec solde client.`,
        action: open.length ? 'Priorisez livraisons et encaissements sur les commandes ouvertes.' : 'Aucune commande ouverte — prospectez vos clients réguliers.',
        sources: ['buildConsolidatedCommercialKpis'],
        confidence: 89,
      };
    }

    case 'deliveries_overview': {
      const pending = arr(props.deliveries).filter((row) => !['livree', 'livrée', 'termine', 'terminé'].includes(lower(row.statut || row.status)));
      return {
        title: 'Livraisons',
        situation: `${fmt(pending.length)} livraison(s) en attente.`,
        cause: `${fmt(arr(props.deliveries).length)} livraison(s) enregistrée(s) sur la période.`,
        action: pending.length ? 'Planifiez les tournées sur les livraisons en retard.' : 'Aucune livraison en attente.',
        sources: ['deliveries', 'buildConsolidatedCommercialKpis'],
        confidence: 86,
      };
    }

    case 'purchases_overview': {
      const purchases = arr(props.businessEvents).filter((row) => /achat|reception|réception|stock/i.test(String(row.event_type || row.title || '')));
      return {
        title: 'Achats',
        situation: `${fmt(purchases.length)} mouvement(s) achat/réception récent(s).`,
        cause: `${fmt(stockSummary.availableProducts)} produits en stock · valeur ${fmtCurrency(stockSummary.stockValue)}.`,
        action: stockSummary.lowStockCount > 0 ? 'Complétez les achats sur les références sous seuil.' : 'Achats sous contrôle.',
        sources: ['computeStockSummary', 'business_events'],
        confidence: 84,
      };
    }

    case 'suppliers_overview': {
      const suppliers = arr(dataMap.fournisseurs || dataMap.suppliers);
      return {
        title: 'Fournisseurs',
        situation: `${fmt(suppliers.length)} fournisseur(s) référencé(s).`,
        cause: payables > 0 ? `Dettes fournisseurs ${fmtCurrency(payables)}.` : 'Pas de dette fournisseur ouverte signalée.',
        action: payables > treasury ? 'Arbitrez les paiements fournisseurs cette semaine.' : 'Relations fournisseurs stables.',
        sources: ['fournisseurs', 'consolidateFinance'],
        confidence: 85,
      };
    }

    case 'charges_overview':
      return {
        title: 'Charges',
        situation: `Charges et sorties : dettes ${fmtCurrency(payables)} · marge ${fmtCurrency(margin)}.`,
        cause: `CA ${fmtCurrency(ca)} sur la période.`,
        action: margin < 0 ? 'Identifiez les postes de charges les plus lourds dans Finance.' : 'Charges maîtrisées par rapport au CA.',
        sources: ['consolidateFinance'],
        confidence: 88,
      };

    case 'documents_summary': {
      const docs = arr(dataMap.documents);
      const reports = arr(dataMap.rapports || dataMap.reports);
      const total = docs.length + reports.length;
      const recent = docs.slice(0, 3).map((d) => d.nom || d.title || d.type).filter(Boolean);
      return {
        title: 'Documents',
        situation: total
          ? `${fmt(total)} document(s) et rapport(s)${recent.length ? ` — derniers : ${recent.join(', ')}` : ''}.`
          : 'Aucun document exporté récemment.',
        cause: 'Archives Documents & Rapports + exports Centre décisionnel.',
        action: total
          ? 'Centre décisionnel → exports ou Documents & Rapports pour télécharger.'
          : 'Générez un rapport depuis Commercial, Finance ou le Centre décisionnel.',
        sources: ['documents'],
        confidence: 84,
      };
    }

    case 'activity_journal': {
      const events = arr(props.businessEvents).slice(0, 5);
      const preview = events.map((e) => e.title || e.event_type).filter(Boolean).slice(0, 3).join(', ');
      return {
        title: 'Journal',
        situation: `${fmt(arr(props.businessEvents).length)} événement(s) récent(s)${preview ? ` : ${preview}` : ''}.`,
        cause: 'Historique Activité & Suivi ERP.',
        action: 'Consultez Activité & Suivi pour le journal complet.',
        sources: ['business_events', 'buildCarnetDomainCards'],
        confidence: 87,
      };
    }

    case 'rh_personnel': {
      const team = arr(props.rh || props.equipe || dataMap.rh || dataMap.equipe);
      const active = team.filter((p) => ['actif', 'active'].includes(String(p.statut || p.status || '').toLowerCase()));
      const query = lower(options.query || '');
      const wantsMaintenance = /maintenance|tracteur|equipement|équipement|panne|materiel|matériel|disponible/.test(query);
      const maintenanceStaff = active.filter((p) => {
        const mods = arr(p.modules);
        const role = lower(p.role || p.fonction || '');
        return mods.includes('equipements') || mods.includes('smartfarm') || /maintenance|technique|ouvrier/.test(role);
      });
      const preview = active.slice(0, 4).map((p) => p.nom || p.name).filter(Boolean);
      if (wantsMaintenance && maintenanceStaff.length) {
        const names = maintenanceStaff.map((p) => `${p.nom || p.name} (${p.role || p.fonction || 'équipe'})`).slice(0, 5);
        return {
          title: 'Personnel maintenance',
          situation: `${fmt(maintenanceStaff.length)} personne(s) avec accès équipements / Smart Farm : ${names.join(', ')}.`,
          cause: 'Annuaire RH — modules equipements, smartfarm ou rôles terrain technique.',
          action: 'Assignez la tâche maintenance depuis Personnel & Paie ou créez une tâche sur le parc matériel.',
          sources: ['rh', 'equipements'],
          confidence: 88,
        };
      }
      const tasks = arr(props.taches).filter((t) => /rh|personnel|equipe|équipe/i.test(String(t.module || t.categorie || t.title || '')));
      const open = arr(props.taches).filter((t) => !['termine', 'terminé', 'clos', 'done'].includes(lower(t.statut || t.status)));
      const taskPreview = tasks.slice(0, 2).map((t) => t.title || t.nom).filter(Boolean);
      return {
        title: 'Personnel',
        situation: active.length
          ? `${fmt(active.length)} personne(s) active(s)${preview.length ? ` : ${preview.join(', ')}` : ''}.`
          : `${fmt(open.length)} tâche(s) ouverte(s) sur l'exploitation${taskPreview.length ? ` — ${taskPreview.join(', ')}` : ''}.`,
        cause: team.length
          ? 'Annuaire RH synchronisé (cloud ou cache de secours).'
          : tasks.length ? `${fmt(tasks.length)} tâche(s) liée(s) au personnel terrain.` : 'Peu de données RH — complétez l’annuaire dans Personnel & Paie.',
        action: wantsMaintenance
          ? 'Vérifiez les modules assignés (equipements, smartfarm) pour chaque membre.'
          : open.length ? 'Priorisez les tâches équipe avant les sorties terrain.' : 'Planifiez les équipes dans Personnel & Paie.',
        sources: ['rh', 'taches'],
        confidence: team.length ? 88 : 82,
      };
    }

    case 'equipment_overview': {
      const equipment = arr(dataMap.equipements || dataMap.equipment);
      const maint = equipment.filter((row) => /maintenance|panne|alerte/i.test(lower(row.statut || row.status || row.etat)));
      return {
        title: 'Équipements',
        situation: `${fmt(equipment.length)} équipement(s)${maint.length ? ` · ${maint.length} en maintenance/alerte` : ''}.`,
        cause: 'Parc matériel ERP.',
        action: maint.length ? 'Traitez les maintenances en retard.' : 'Parc équipements stable.',
        sources: ['equipements'],
        confidence: 81,
      };
    }

    case 'weather_now':
    case 'weather_risk':
    case 'weather_forecast':
      return buildWeatherAnswer(intent, dataMap);

    case 'sync_status':
      return {
        title: 'Synchronisation',
        situation: 'État de synchronisation consultable dans Activité & Sync ERP.',
        cause: 'Intégrité des flux terrain → ERP.',
        action: 'Ouvrez Activité & Sync pour l\'historique des synchronisations.',
        sources: ['sync_activity'],
        confidence: 78,
      };

    case 'system_overview':
      return {
        title: 'Administration',
        situation: 'Paramètres, utilisateurs et rôles dans Gestion du système.',
        cause: 'Configuration ERP.',
        action: 'Ouvrez Gestion du système pour les permissions.',
        sources: ['gestion_systeme'],
        confidence: 78,
      };

    case 'ca_progress':
      return buildTendancesAnswer(dataMap);

    case 'investment_capacity':
      return buildInvestorPilotageAnswer('investment_capacity', dataMap);

    case 'ventes_today': {
      const todayKey = new Date().toISOString().slice(0, 10);
      const todayOrders = arr(props.salesOrdersAll).filter((row) => String(row.date || row.date_commande || row.created_at).slice(0, 10) === todayKey);
      const total = todayOrders.reduce((sum, row) => sum + n(row.total ?? row.montant_total ?? row.total_amount), 0);
      return {
        title: 'Ventes du jour',
        situation: `${fmt(todayOrders.length)} vente(s) aujourd'hui · ${fmtCurrency(total)}.`,
        cause: 'Commandes datées du jour dans le commercial ERP.',
        action: todayOrders.length ? 'Reliez livraisons et encaissements sur ces ventes.' : 'Aucune vente enregistrée — pensez aux clients du jour.',
        sources: ['buildConsolidatedCommercialKpis'],
        confidence: 90,
      };
    }

    case 'farm_overview':
    case 'comment_va_la_ferme':
      return buildCommentVaLaFermeAnswer(dataMap);

    case 'annual_outlook':
      return buildAnnualOutlookAnswer(dataMap);

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
    case 'objectif_status':
      return buildObjectifStatusAnswer(dataMap, query);

    case 'farm_status':
      return hasExploitableFarmData(dataMap)
        ? buildCommentVaLaFermeAnswer(dataMap)
        : buildInvestorPilotageAnswer('farm_status', dataMap);

    case 'investor_summary':
    case 'growth':
      return buildInvestorPilotageAnswer(
        intent === 'growth' ? 'growth_objectives' : 'investor_room',
        dataMap,
      );

    default:
      return null;
  }

  return null;
}

export function buildAgriculturalAnswer(intent = '', dataMap = {}, options = {}) {
  const raw = buildAgriculturalAnswerCore(intent, dataMap, options);
  return enrichTerrainAnswer(raw, intent, dataMap, options);
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
