/**
 * Affinage des réponses Hey Horizon - ton terrain, offres de suite, modules ERP.
 */

import { inferOfferFromAnswer } from './assistantConversationOffers.js';

const n = (v) => Number(v || 0);

function clean(value = '') {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function hasOfferCue(text = '') {
  return /si vous voulez|vas-y|détail|detail|je peux detail|relancer si/i.test(text);
}

/** Offres de suite par intent (réponses, pas seulement routage). */
const FOLLOW_UP_OFFERS = Object.freeze({
  ventes: 'Je peux détailler les clients à relancer si vous voulez.',
  receivables: 'Je peux lister les clients prioritaires à relancer aujourd\'hui.',
  creances: 'Je peux lister les clients prioritaires à relancer aujourd\'hui.',
  relances: 'Dites « vas-y » pour le client le plus urgent.',
  treasury: 'Je peux comparer trésorerie et dettes si vous voulez.',
  dettes: 'Je peux résumer ce qui est payable cette semaine.',
  stock_ruptures: 'Je peux préciser les produits critiques à réapprovisionner.',
  stock_aliment: 'Je peux vérifier si c\'est suffisant pour vos lots actifs.',
  lot_mortality: 'Dites « vas-y » pour le lot à surveiller en priorité.',
  lots_sick: 'Je peux indiquer quelle bande surveiller en premier.',
  lots_surveillance: 'Dites « vas-y » pour le détail du lot le plus fragile.',
  headcount_poulets: 'Demandez « mortalité » ou « lots malades » pour la suite.',
  elevage_status: 'Posez « quels lots surveiller » pour aller plus loin.',
  ventes_today: 'Je peux relier ces ventes aux encaissements du jour.',
  farm_overview: 'Je peux détailler les priorités du jour si vous voulez.',
  comment_va_la_ferme: 'Je peux détailler les priorités du jour si vous voulez.',
  today_priorities: 'Dites « vas-y » pour la première action concrète.',
  centre_recommendations: 'Ouvrez Centre décisionnel → Recommandations pour valider.',
  centre_cycles: 'Dites « vas-y » pour le timing de lancement complet.',
  main_risk: 'Je peux détailler les risques dans Centre décisionnel → Risques.',
  farm_risks: 'Dites « vas-y » pour le plan de mitigation prioritaire.',
  progress_status: 'Je peux projeter l\'objectif annuel si vous voulez.',
  weather_risk: 'Je peux croiser météo et priorités élevage si vous voulez.',
  sell_today: 'Je peux croiser stock vendable et créances clients.',
});

/** Accroches situation selon module (si la réponse est encore générique). */
const SITUATION_HOOKS = Object.freeze({
  ELEVAGE: 'Sur le terrain élevage, ',
  COMMERCIAL: 'Côté commercial, ',
  STOCK: 'Au magasin, ',
  FINANCE: 'Pour la trésorerie, ',
  CULTURES: 'Sur vos cultures, ',
  METEO: 'Météo terrain : ',
  OBJECTIFS: 'Sur vos objectifs, ',
  DECISION: 'Pour la journée, ',
});

const INTENT_MODULE_FAMILY = Object.freeze({
  my_animals: 'ELEVAGE',
  lots_overview: 'ELEVAGE',
  lots_sick: 'ELEVAGE',
  lot_mortality: 'ELEVAGE',
  animals_under_treatment: 'ELEVAGE',
  lots_surveillance: 'ELEVAGE',
  elevage_status: 'ELEVAGE',
  headcount_total: 'ELEVAGE',
  headcount_bovins: 'ELEVAGE',
  headcount_poulets: 'ELEVAGE',
  headcount_pondeuses: 'ELEVAGE',
  headcount_ovins: 'ELEVAGE',
  headcount_caprins: 'ELEVAGE',
  stock_aliment: 'STOCK',
  stock_overview: 'STOCK',
  stock_remain: 'STOCK',
  stock_ruptures: 'STOCK',
  stock_sellable: 'STOCK',
  stock_dlc: 'STOCK',
  purchases_overview: 'STOCK',
  suppliers_overview: 'STOCK',
  ventes: 'COMMERCIAL',
  ventes_today: 'COMMERCIAL',
  top_client: 'COMMERCIAL',
  top_product: 'COMMERCIAL',
  receivables: 'COMMERCIAL',
  relances: 'COMMERCIAL',
  commercial_summary: 'COMMERCIAL',
  orders_overview: 'COMMERCIAL',
  deliveries_overview: 'COMMERCIAL',
  sell_today: 'COMMERCIAL',
  treasury: 'FINANCE',
  dettes: 'FINANCE',
  creances: 'FINANCE',
  resultat: 'FINANCE',
  charges_overview: 'FINANCE',
  parcelles_status: 'CULTURES',
  recoltes: 'CULTURES',
  rendement: 'CULTURES',
  culture_profit: 'CULTURES',
  weather_now: 'METEO',
  weather_risk: 'METEO',
  weather_forecast: 'METEO',
  progress_status: 'OBJECTIFS',
  centre_recommendations: 'DECISION',
  centre_cycles: 'DECISION',
  main_risk: 'DECISION',
  farm_risks: 'DECISION',
  annual_outlook: 'OBJECTIFS',
  today_priorities: 'DECISION',
  farm_overview: 'DECISION',
});

function appendAction(action = '', offer = '') {
  const base = clean(action);
  const extra = clean(offer);
  if (!extra) return base;
  if (!base) return extra;
  if (hasOfferCue(base)) return base;
  return `${base} ${extra}`;
}

function maybeHookSituation(situation = '', family = '') {
  const sit = clean(situation);
  if (!sit || sit.length > 180) return sit;
  const hook = SITUATION_HOOKS[family];
  if (!hook) return sit;
  const hookNorm = hook.toLowerCase().trim();
  if (sit.toLowerCase().startsWith(hookNorm.slice(0, 12))) return sit;
  if (/^vous avez|^il reste|^on a |^c est |^la ferme/i.test(sit)) {
    return `${hook}${sit.charAt(0).toLowerCase()}${sit.slice(1)}`;
  }
  return sit;
}

function enrichElevage(answer = {}, dataMap = {}) {
  const lots = Array.isArray(dataMap.lots) ? dataMap.lots : dataMap.avicole || [];
  const activeLots = lots.filter((lot) => !['termine', 'terminé', 'clos', 'archive'].includes(String(lot.statut || lot.status || '').toLowerCase()));
  if (answer.intent === 'lot_mortality' && activeLots.length && !/lot|bande/i.test(answer.situation || '')) {
    const label = activeLots[0]?.nom || activeLots[0]?.name;
    if (label) {
      return {
        ...answer,
        situation: `${answer.situation} Lot le plus suivi : ${label}.`,
      };
    }
  }
  return answer;
}

function enrichCommercial(answer = {}, dataMap = {}) {
  const orders = Array.isArray(dataMap.sales_orders) ? dataMap.sales_orders : dataMap.salesOrders || [];
  const unpaid = orders.filter((row) => n(row.reste_a_payer ?? row.balance_due) > 0).length;
  if ((answer.intent === 'receivables' || answer.intent === 'relances') && unpaid > 0) {
    const sit = answer.situation || '';
    if (!/client/i.test(sit)) {
      return {
        ...answer,
        situation: `${sit} ${unpaid} client(s) avec solde ouvert.`,
      };
    }
  }
  return answer;
}

/**
 * Enrichit une réponse métier avec ton terrain et offres conversationnelles.
 */
export function enrichTerrainAnswer(answer = null, intent = '', dataMap = {}, options = {}) {
  if (!answer) return null;

  let enriched = {
    ...answer,
    intent: intent || answer.intent,
  };

  const family = INTENT_MODULE_FAMILY[enriched.intent];
  if (family && enriched.situation) {
    enriched.situation = maybeHookSituation(enriched.situation, family);
  }

  if (enriched.intent?.startsWith('headcount_') || enriched.intent?.includes('lot')) {
    enriched = enrichElevage(enriched, dataMap);
  }
  if (/ventes|receivable|relance|commercial/i.test(enriched.intent || '')) {
    enriched = enrichCommercial(enriched, dataMap);
  }

  const inferred = inferOfferFromAnswer(enriched);
  const staticOffer = FOLLOW_UP_OFFERS[enriched.intent];
  const offerText = inferred?.label && inferred.intent
    ? (FOLLOW_UP_OFFERS[inferred.intent] || `Je peux approfondir : ${inferred.label}.`)
  : staticOffer;

  if (offerText) {
    enriched.action = appendAction(enriched.action, offerText);
  }

  enriched.terrainEnriched = true;
  enriched.moduleFamily = family || null;

  if (options.query && /whatsapp|terrain|ce matin|orange money/i.test(options.query)) {
    enriched.sourceChannel = 'terrain';
  }

  return enriched;
}

export default enrichTerrainAnswer;
