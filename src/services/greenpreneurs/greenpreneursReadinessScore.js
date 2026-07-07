import { DERFJ_GREENPRENEURS_PROFILE, GREENPRENEURS_STATUS_THRESHOLDS } from '../../config/derfjGreenpreneurs.config.js';
import { computeCircularEconomyMetrics } from './circularEconomyMetrics.js';
import { computeManureFertilizerEconomy } from '../../utils/manureFertilizerEconomy.js';
import { toNumber } from '../../utils/format.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const clamp = (v, max) => Math.max(0, Math.min(max, Math.round(v)));
const norm = (v = '') => String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const CIRCULAR_EVENTS = [
  'effluent_produit', 'effluent_stocke', 'effluent_utilise_culture', 'effluent_vendu_orgaloop',
  'compost_produit', 'parcelle_fertilisee', 'engrais_chimique_evite',
  'fumier_collecte', 'entree_fumier',
];

function docMatches(doc = {}, patterns = []) {
  const text = norm(`${doc.title || ''} ${doc.nom || ''} ${doc.document_category || ''} ${doc.type || ''} ${doc.libelle || ''}`);
  return patterns.some((p) => text.includes(norm(p)));
}

function calculateEnvironmentalScore(dataMap, circular) {
  let score = 0;
  const signals = [];

  const events = arr(dataMap.business_events);
  const circularEvents = events.filter((e) => CIRCULAR_EVENTS.includes(norm(e.event_type)));
  if (circularEvents.length > 0) {
    score += Math.min(8, circularEvents.length * 2);
    signals.push('flux circulaires enregistrés');
  }

  if (circular.parcellesFertilisees > 0) {
    score += 6;
    signals.push('parcelles fertilisées');
  } else if (circular.hasRealData && circular.usedOnCulturesKg > 0) {
    score += 5;
    signals.push('effluents utilisés sur cultures');
  } else if (circular.orgaloop?.soldKg > 0) {
    score += 4;
    signals.push(`surplus vendu via ${circular.orgaloop.platformName || 'Orgaloop'}`);
  }

  const manure = computeManureFertilizerEconomy({
    stocks: dataMap.stocks,
    salesOrders: dataMap.sales_orders,
    cultures: dataMap.cultures,
    businessEvents: events,
    dataMap,
  });
  if (manure.producedSacs > 0 || circular.fientesPondeuses?.availableKg > 0) {
    score += 5;
    signals.push('fientes/fumiers suivis');
  }
  if (manure.economieFcfa > 0 || circular.engraisSavingsFcfa > 0) {
    score += Math.min(6, Math.round((circular.engraisSavingsFcfa || manure.economieFcfa) / 15000));
    signals.push('économies engrais estimées');
  }

  if (!circular.hasRealData && circular.sourceType === 'simulation') {
    score += 4;
    signals.push('hypothèse BP DER/FJ documentée');
  }

  return { value: clamp(score, 25), signals };
}

function calculateInnovationScore(dataMap) {
  let score = 0;
  const signals = [];

  const events = arr(dataMap.business_events);
  const docs = arr(dataMap.documents);
  const alerts = arr(dataMap.alertes_center);
  const smartEvents = arr(dataMap.smartfarm_events);
  const sensors = arr(dataMap.sensor_devices).length + arr(dataMap.camera_devices).length;

  if (events.length >= 5 || docs.length >= 3) {
    score += 6;
    signals.push('ERP actif');
  }
  if (alerts.length >= 1 || arr(dataMap.taches).length >= 3) {
    score += 5;
    signals.push('Centre décisionnel');
  }
  if (smartEvents.length > 0 || sensors > 0) {
    score += 7;
    signals.push('Smart Farm');
  }
  const criticalAlerts = alerts.filter((a) => norm(a.severity || a.priorite).includes('crit'));
  if (alerts.length > 0 && criticalAlerts.length <= 2) {
    score += 4;
    signals.push('alertes ciblées');
  }
  const financeurDocs = docs.filter((d) => docMatches(d, ['financeur', 'dossier', 'rapport', 'export', 'der', 'greenpreneurs']));
  if (financeurDocs.length > 0) {
    score += 3;
    signals.push('rapports financeur');
  }

  return { value: clamp(score, 25), signals };
}

function calculateViabilityScore(dataMap) {
  let score = 0;
  const signals = [];
  const sales = arr(dataMap.sales_orders);
  const payments = arr(dataMap.payments);
  const stocks = arr(dataMap.stocks);
  const finances = arr(dataMap.finances);
  const clients = arr(dataMap.clients);

  if (sales.length > 0) { score += 6; signals.push('ventes suivies'); }
  if (payments.length > 0) { score += 6; signals.push('paiements suivis'); }
  if (stocks.length > 0) { score += 5; signals.push('stock suivi'); }
  if (finances.length > 0) { score += 4; signals.push('charges suivies'); }

  const receivable = sales.reduce((s, r) => s + toNumber(r.montant_total ?? r.total), 0)
    - payments.reduce((s, r) => s + toNumber(r.montant_paye ?? r.montant), 0);
  if (clients.length > 0) { score += 2; signals.push('créances suivies'); }
  if (receivable >= 0 && payments.length > 0) score += 2;

  const bpFunding = arr(dataMap.bp_funding_sources);
  const hasPersonal = bpFunding.some((r) => norm(r.type || r.source).includes('apport'))
    || DERFJ_GREENPRENEURS_PROFILE.personalContribution > 0;
  if (hasPersonal) { score += 2; signals.push('apport personnel identifié'); }

  return { value: clamp(score, 25), signals };
}

function calculateSocialScore(dataMap) {
  let score = 0;
  const signals = [];
  const fournisseurs = arr(dataMap.fournisseurs);
  const bpCosts = arr(dataMap.bp_recurring_costs);
  const cultures = arr(dataMap.cultures);

  const hasJobs = bpCosts.some((r) => norm(`${r.designation || ''} ${r.categorie || ''}`).includes('salaire'))
    || bpCosts.some((r) => norm(`${r.designation || ''}`).includes('emploi'));
  if (hasJobs || arr(dataMap.business_plans).length > 0) {
    score += 5;
    signals.push('emplois prévus');
  }

  const localSuppliers = fournisseurs.filter((f) => norm(f.local || f.ville || f.region).includes('thies')
    || norm(f.nom || '').length > 2);
  if (localSuppliers.length > 0 || fournisseurs.length >= 2) {
    score += 5;
    signals.push('fournisseurs locaux');
  }

  if (cultures.length > 0 || arr(dataMap.sales_orders).length > 0) {
    score += 5;
    signals.push('production alimentaire locale');
  }

  return { value: clamp(score, 15), signals };
}

function calculateDossierScore(dataMap) {
  const docs = arr(dataMap.documents);
  const checks = [
    { id: 'note', label: 'note descriptive', patterns: ['note', 'descriptif', 'memoire', 'mémoire', 'projet'] },
    { id: 'cni', label: 'CNI', patterns: ['cni', 'identite', 'identité', 'carte nationale'] },
    { id: 'residence', label: 'certificat résidence', patterns: ['residence', 'résidence', 'domicile', 'certificat'] },
    { id: 'captures', label: 'captures ERP', patterns: ['capture', 'erp', 'ecran', 'écran', 'screenshot'] },
    { id: 'budget', label: 'budget indicatif', patterns: ['budget', 'previsionnel', 'prévisionnel', 'devis', 'business plan', 'bp'] },
  ];

  const signals = [];
  let score = 0;
  checks.forEach((check) => {
    const ok = docs.some((d) => docMatches(d, check.patterns));
    if (ok) {
      score += 2;
      signals.push(check.label);
    }
  });

  return { value: clamp(score, 10), signals, missing: checks.filter((c) => !signals.includes(c.label)).map((c) => c.label) };
}

function resolveStatus(total, dossierValue) {
  if (total >= GREENPRENEURS_STATUS_THRESHOLDS.pret_dossier && dossierValue >= 6) {
    return { status: 'pret_dossier', label: 'Prêt dossier' };
  }
  if (total >= GREENPRENEURS_STATUS_THRESHOLDS.pret_renforcer) {
    return { status: 'pret_renforcer', label: 'Prêt à renforcer' };
  }
  return { status: 'dossier_incomplet', label: 'Dossier incomplet' };
}

function buildStrengths(score) {
  const strengths = [];
  if (score.innovation.value >= 15) strengths.push('ERP & Smart Farm');
  if (score.impact_environnemental.value >= 12) strengths.push('économie circulaire');
  if (score.viabilite.value >= 15) strengths.push('données de production');
  if (score.viabilite.signals.includes('apport personnel identifié')) strengths.push('apport personnel');
  if (score.innovation.value >= 10) strengths.push('pilotage par la donnée');
  return [...new Set(strengths)].slice(0, 5);
}

function buildGaps(dossier, score) {
  const gaps = [...(dossier.missing || [])];
  if (score.impact_environnemental.value < 12) gaps.push('flux fumier/fientes à tracer');
  if (score.dossier.value < 6) gaps.push('plan financier détaillé');
  return [...new Set(gaps)].slice(0, 6);
}

function buildActions(dossier, score, circular) {
  const actions = [];
  (dossier.missing || []).forEach((item) => {
    actions.push(`Ajouter document : ${item}`);
  });
  if (score.impact_environnemental.value < 15) {
    actions.push('Renseigner fientes/fumiers dans Élevage et Cultures');
  }
  if (!circular.hasRealData) {
    actions.push('Enregistrer les premiers flux circulaires (business_events)');
  }
  actions.push('Créer captures Smart Farm pour le dossier financeur');
  if (score.dossier.value < 8) actions.push('Compléter budget indicatif et devis');
  return [...new Set(actions)].slice(0, 6);
}

/**
 * Score DER/FJ Greenpreneurs sur 100.
 */
export function buildGreenpreneursReadinessScore(dataMap = {}, options = {}) {
  const circular = computeCircularEconomyMetrics(dataMap, options);

  const impact = calculateEnvironmentalScore(dataMap, circular);
  const innovation = calculateInnovationScore(dataMap);
  const viabilite = calculateViabilityScore(dataMap);
  const social = calculateSocialScore(dataMap);
  const dossier = calculateDossierScore(dataMap);

  const score = {
    impact_environnemental: { max: 25, ...impact },
    innovation: { max: 25, ...innovation },
    viabilite: { max: 25, ...viabilite },
    social: { max: 15, ...social },
    dossier: { max: 10, ...dossier },
  };

  const total = Object.values(score).reduce((s, c) => s + c.value, 0);
  const { status, label: statusLabel } = resolveStatus(total, dossier.value);

  return {
    score,
    total,
    maxTotal: 100,
    status,
    statusLabel,
    strengths: buildStrengths(score),
    gaps: buildGaps(dossier, score),
    recommendedActions: buildActions(dossier, score, circular),
    criteria: DERFJ_GREENPRENEURS_PROFILE.criteria,
    profile: {
      program: DERFJ_GREENPRENEURS_PROFILE.program,
      projectName: DERFJ_GREENPRENEURS_PROFILE.projectName,
      ownerName: DERFJ_GREENPRENEURS_PROFILE.ownerName,
      location: DERFJ_GREENPRENEURS_PROFILE.location,
    },
  };
}
