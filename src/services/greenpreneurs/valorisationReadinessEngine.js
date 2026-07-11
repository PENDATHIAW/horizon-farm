import {
  CIRCULAR_SIMULATION_MONTHLY_KG,
  DERFJ_GREENPRENEURS_PROFILE,
  VALORISATION_READINESS_THRESHOLDS,
} from '../../config/derfjGreenpreneurs.config.js';
import { toNumber } from '../../utils/format.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const norm = (v = '') => String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const clamp = (v) => Math.max(0, Math.min(100, Math.round(v)));

const CLOSED_BOVIN = ['vendu', 'abattu', 'sorti', 'cloture', 'clôture'];

function isBovin(row = {}) {
  const text = norm(`${row.espece || ''} ${row.type || ''} ${row.race || ''} ${row.categorie || ''}`);
  return text.includes('bovin') || text.includes('boeuf') || text.includes('vache');
}

function isClosedBovin(row = {}) {
  const status = norm(row.status || row.statut);
  return CLOSED_BOVIN.some((w) => status.includes(w));
}

function parseDate(row = {}) {
  const raw = row.date_sortie || row.exit_date || row.updated_at || row.created_at || row.date_entree;
  const d = raw ? new Date(raw) : null;
  return d && !Number.isNaN(d.getTime()) ? d : null;
}

function monthsAgo(n) {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d;
}

function resolveValorisationStatus(score) {
  if (score >= VALORISATION_READINESS_THRESHOLDS.pilote_possible + 1) {
    return { status: 'lancement_recommande', label: 'Lancement recommandé' };
  }
  if (score >= VALORISATION_READINESS_THRESHOLDS.a_preparer + 1) {
    return { status: 'pilote_possible', label: 'Pilote possible' };
  }
  if (score >= VALORISATION_READINESS_THRESHOLDS.non_pret + 1) {
    return { status: 'a_preparer', label: 'À préparer' };
  }
  return { status: 'non_pret', label: 'Non prêt' };
}

function scoreBovinFlow(animaux = []) {
  const bovins = arr(animaux).filter(isBovin);
  const closed = bovins.filter(isClosedBovin);
  const since3m = closed.filter((a) => {
    const d = parseDate(a);
    return d && d >= monthsAgo(3);
  });
  const monthlyAvg = since3m.length / 3;
  const target = DERFJ_GREENPRENEURS_PROFILE.targetProduction.bovinsPerMonth;

  let score = 0;
  const blockers = [];
  const opportunities = [];

  if (since3m.length >= 3) score += 25;
  else if (since3m.length >= 1) score += 12;
  else blockers.push('Flux bovin insuffisant sur 3 mois');

  if (monthlyAvg >= target * 0.8) {
    score += 15;
    opportunities.push(`Rotation ~${monthlyAvg.toFixed(1)} bovins/mois`);
  } else if (monthlyAvg > 0) {
    score += 8;
    blockers.push(`Rotation mensuelle faible (${monthlyAvg.toFixed(1)} vs cible ${target})`);
  }

  return { score, blockers, opportunities, closedCount: since3m.length, monthlyAvg };
}

function scoreCoproductAvailability(events, stocks, animaux, type = 'suif') {
  const eventTypes = type === 'suif' ? ['suif_collecte', 'coproduit_bovin_collecte'] : ['os_collectes', 'coproduit_bovin_collecte'];
  const stockPatterns = type === 'suif' ? ['suif', 'coproduit'] : ['os'];
  const eventQty = arr(events)
    .filter((e) => eventTypes.includes(norm(e.event_type)))
    .reduce((s, e) => s + toNumber(e.quantity), 0);
  const stockQty = arr(stocks)
    .filter((r) => stockPatterns.some((p) => norm(`${r.categorie || ''} ${r.produit || ''}`).includes(p)))
    .reduce((s, r) => s + toNumber(r.quantite ?? r.quantity), 0);

  const closedBovins = arr(animaux).filter(isBovin).filter(isClosedBovin).length;
  const estimated = closedBovins * (type === 'suif'
    ? CIRCULAR_SIMULATION_MONTHLY_KG.suif_par_bovin
    : CIRCULAR_SIMULATION_MONTHLY_KG.os_par_bovin);

  const available = eventQty + stockQty || estimated;
  let score = 0;
  const blockers = [];
  if (available >= 30) score += 20;
  else if (available >= 10) score += 10;
  else blockers.push(`${type === 'suif' ? 'Suif' : 'Os'} collectés insuffisants`);

  return { score, available, blockers, hasReal: eventQty + stockQty > 0 };
}

function scoreTreasury(payments, finances) {
  const inflow = arr(payments).reduce((s, r) => s + toNumber(r.montant_paye ?? r.montant), 0);
  const outflow = arr(finances)
    .filter((r) => norm(r.type || r.sens).includes('depense') || toNumber(r.montant) < 0)
    .reduce((s, r) => s + Math.abs(toNumber(r.montant ?? r.amount)), 0);
  const net = inflow - outflow;
  let score = 0;
  const blockers = [];
  if (net > 0 && inflow > 0) score += 20;
  else if (inflow > 0) score += 10;
  else blockers.push('Trésorerie phase 1 non stabilisée');
  return { score, net, blockers };
}

function scoreOperationalStability(dataMap) {
  const alerts = arr(dataMap.alertes_center);
  const critical = alerts.filter((a) => norm(a.severity || a.priorite).includes('crit'));
  const smartCritical = arr(dataMap.smartfarm_events).filter((e) => norm(e.severity).includes('crit'));
  let score = 15;
  const blockers = [];
  if (critical.length > 3) { score -= 8; blockers.push('Alertes critiques élevées'); }
  if (smartCritical.length > 2) { score -= 5; blockers.push('Signaux Smart Farm critiques'); }
  const feedStocks = arr(dataMap.stocks).filter((s) => norm(`${s.categorie || ''} ${s.produit || ''}`).includes('aliment'));
  if (feedStocks.length === 0) { score -= 3; blockers.push('Stocks aliments à suivre'); }
  return { score: Math.max(0, score), blockers };
}

function scoreCompliance(documents, taches, phase = 'cosmetique') {
  const patterns = phase === 'cosmetique'
    ? ['cosmetique', 'cosmétique', 'laboratoire', 'formulation', 'norme']
    : ['alimentaire', 'haccp', 'traçabilite', 'traçabilité', 'agrément'];
  const docs = arr(documents).filter((d) => patterns.some((p) => norm(`${d.title || ''} ${d.document_category || ''}`).includes(p)));
  const tasks = arr(taches).filter((t) => patterns.some((p) => norm(`${t.titre || ''} ${t.title || ''}`).includes(p)));
  let score = 0;
  const blockers = [];
  if (docs.length >= 2) score += 15;
  else if (docs.length >= 1) score += 8;
  else blockers.push(`Documents conformité ${phase} manquants`);
  if (tasks.length > 0) score += 5;
  return { score, blockers };
}

function scoreMarketDemand(opportunities, phase = 'tallow') {
  const patterns = phase === 'tallow'
    ? ['tallow', 'suif', 'cosmetique', 'cosmétique', 'beurre']
    : ['bovinia', 'os', 'collagene', 'collagène', 'nutrition', 'bien-etre', 'bien-être'];
  const matches = arr(opportunities).filter((o) => {
    const text = norm(`${o.title || ''} ${o.nom || ''} ${o.notes || ''} ${o.activity || ''} ${o.type || ''}`);
    const isFuture = norm(o.phase || o.statut_activite).includes('phase_future')
      || norm(o.activity_type).includes('valorisation');
    return patterns.some((p) => text.includes(p)) || isFuture;
  });
  let score = 0;
  const opportunitiesOut = [];
  const blockers = [];
  if (matches.length >= 2) { score += 15; opportunitiesOut.push('Demande marché identifiée'); }
  else if (matches.length >= 1) score += 8;
  else blockers.push('Aucune opportunité commerciale phase future');
  return { score, blockers, opportunities: opportunitiesOut };
}

function scoreTransformationCapacity(investissements, stocks, phase = 'tallow') {
  const patterns = phase === 'tallow'
    ? ['emballage', 'packaging', 'laboratoire', 'transformation', 'local']
    : ['deshydrat', 'déshydrat', 'sechoir', 'séchoir', 'transformation', 'packaging'];
  const inv = arr(investissements).filter((i) => patterns.some((p) => norm(`${i.designation || ''} ${i.categorie || ''}`).includes(p)));
  const stk = arr(stocks).filter((s) => norm(`${s.categorie || ''}`).includes('transformation'));
  let score = 0;
  const blockers = [];
  if (inv.length >= 1 || stk.length >= 1) score += 10;
  else blockers.push('Capacité de transformation à chiffrer');
  return { score, blockers };
}

function buildPhaseResult({
  score,
  blockers,
  opportunities,
  nextActions,
  bestMoment,
  readyItems = [],
}) {
  const { status, label } = resolveValorisationStatus(score);
  return {
    score: clamp(score),
    status,
    statusLabel: label,
    bestMoment,
    blockers: [...new Set(blockers)].slice(0, 6),
    opportunities: [...new Set(opportunities)].slice(0, 5),
    nextActions: [...new Set(nextActions)].slice(0, 6),
    readyItems,
  };
}

function buildTallowGoReadiness(dataMap) {
  const bovin = scoreBovinFlow(dataMap.animaux);
  const suif = scoreCoproductAvailability(dataMap.business_events, dataMap.stocks, dataMap.animaux, 'suif');
  const treasury = scoreTreasury(dataMap.payments, dataMap.finances);
  const ops = scoreOperationalStability(dataMap);
  const compliance = scoreCompliance(dataMap.documents, dataMap.taches, 'cosmetique');
  const market = scoreMarketDemand(dataMap.sales_opportunities, 'tallow');
  const transform = scoreTransformationCapacity(dataMap.investissements, dataMap.stocks, 'tallow');

  const total = bovin.score + suif.score + treasury.score + ops.score + compliance.score + market.score + transform.score;
  const blockers = [...bovin.blockers, ...suif.blockers, ...treasury.blockers, ...ops.blockers, ...compliance.blockers, ...market.blockers, ...transform.blockers];
  const opportunities = [...bovin.opportunities, ...market.opportunities];
  const readyItems = [];
  if (bovin.closedCount >= 3) readyItems.push('Historique bovin sur 3 mois');
  if (suif.hasReal) readyItems.push('Suif collecté dans l\'ERP');
  if (treasury.net > 0) readyItems.push('Trésorerie positive');

  const nextActions = [];
  if (compliance.score < 10) nextActions.push('Critère futur : conformité cosmétique à cadrer');
  if (compliance.score < 15) nextActions.push('Critère futur : laboratoire cosmétique à identifier');
  nextActions.push('Critère futur : packaging à chiffrer');
  nextActions.push('Critère futur : demande marché à valider');
  nextActions.push('Critère futur : traçabilité suif à documenter');

  const bestMoment = total >= 75
    ? 'Conditions réunies — pilote Tallow & Go envisageable'
    : 'Tallow & Go pourra passer en pilote lorsque : rotation bovine stable ≥ 3 cycles, suif collecté régulièrement, trésorerie phase 1 positive, conformité cosmétique prête, alertes critiques maîtrisées, demande commerciale minimale identifiée.';

  return buildPhaseResult({ score: total, blockers, opportunities, nextActions, bestMoment, readyItems });
}

function buildBoviniaReadiness(dataMap) {
  const bovin = scoreBovinFlow(dataMap.animaux);
  const os = scoreCoproductAvailability(dataMap.business_events, dataMap.stocks, dataMap.animaux, 'os');
  const treasury = scoreTreasury(dataMap.payments, dataMap.finances);
  const ops = scoreOperationalStability(dataMap);
  const compliance = scoreCompliance(dataMap.documents, dataMap.taches, 'alimentaire');
  const market = scoreMarketDemand(dataMap.sales_opportunities, 'bovinia');
  const transform = scoreTransformationCapacity(dataMap.investissements, dataMap.stocks, 'bovinia');
  const traceability = arr(dataMap.documents).some((d) => norm(`${d.title || ''}`).includes('trac'))
    || arr(dataMap.business_events).some((e) => norm(e.event_type).includes('lot')) ? 10 : 0;

  const total = bovin.score + os.score + treasury.score + ops.score + compliance.score + market.score + transform.score + traceability;
  const blockers = [...bovin.blockers, ...os.blockers, ...treasury.blockers, ...ops.blockers, ...compliance.blockers, ...market.blockers, ...transform.blockers];
  if (!traceability) blockers.push('Traçabilité des lots non prête');

  const nextActions = [
    'Critère futur : conformité alimentaire à cadrer',
    'Critère futur : équipement déshydratation à évaluer',
    'Critère futur : traçabilité lots os à documenter',
    'Critère futur : demande nutrition / bien-être à valider',
  ];

  const bestMoment = total >= 75
    ? 'Conditions réunies — pilote BOVINIA envisageable'
    : 'BOVINIA pourra passer en pilote lorsque : flux d\'os bovins régulier, conformité alimentaire cadrée, équipement déshydratation disponible, traçabilité lots prête, phase 1 financièrement stable, demande marché identifiée.';

  return buildPhaseResult({
    score: total,
    blockers,
    opportunities: market.opportunities,
    nextActions,
    bestMoment,
    readyItems: bovin.closedCount >= 3 ? ['Flux bovin historique'] : [],
  });
}

/**
 * Diagnostic data-driven Tallow & Go (phase 2) et BOVINIA (phase 3).
 */
export function computeValorisationReadiness(dataMap = {}) {
  return {
    phase2_tallow_go: buildTallowGoReadiness(dataMap),
    phase3_bovinia: buildBoviniaReadiness(dataMap),
    roadmapNote: 'Les phases Tallow & Go et BOVINIA ne sont pas déclenchées à une date arbitraire. Elles seront activées selon des indicateurs suivis par l\'ERP : stabilité de la production bovine, disponibilité des coproduits, trésorerie, conformité, demande marché et niveau de risque.',
  };
}
