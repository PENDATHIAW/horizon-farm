/**
 * Commercial V3 — parcours prospects (metadata client légère).
 */

import { readClientCommercialTerms } from './commercialPricing.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const clean = (value) => String(value || '').trim();
const lower = (value) => clean(value).toLowerCase();
const num = (value) => Number(value || 0);

export const PROSPECT_STATUSES = {
  HOT: 'chaud',
  WARM: 'tiède',
  COLD: 'froid',
  CONVERTED: 'converti',
  LOST: 'perdu',
};

export function isProspectClient(client = {}) {
  const statut = lower(client.statut || client.status || client.type_client || '');
  const terms = readClientCommercialTerms(client);
  return statut.includes('prospect') || terms.isProspect === true || client.is_prospect === true;
}

export function readProspectProfile(client = {}) {
  const meta = client.prospect_profile || client.commercial_terms?.prospect || {};
  return {
    source: meta.source || client.source_prospect || client.source || '',
    interest: meta.interest || client.interet || client.prefs || '',
    estimatedNeed: num(meta.estimated_need ?? meta.besoin_estime ?? client.besoin_estime),
    probability: num(meta.probability ?? meta.probabilite ?? client.probabilite),
    nextAction: meta.next_action || client.prochaine_action || '',
    nextActionDate: meta.next_action_date || client.date_prochaine_action || '',
    status: lower(meta.status || meta.statut_prospect || PROSPECT_STATUSES.WARM),
    convertedAt: meta.converted_at || client.converted_at || '',
    lostReason: meta.lost_reason || client.motif_perdu || '',
  };
}

export function buildProspectRow(client = {}) {
  const profile = readProspectProfile(client);
  const status = profile.status || PROSPECT_STATUSES.WARM;
  return {
    id: client.id,
    name: client.nom || client.name || client.id,
    phone: client.tel || client.whatsapp || '',
    source: profile.source,
    interest: profile.interest,
    estimatedNeed: profile.estimatedNeed,
    probability: profile.probability,
    nextAction: profile.nextAction,
    nextActionDate: profile.nextActionDate,
    status,
    statusLabel: status === PROSPECT_STATUSES.HOT ? 'Chaud' : status === PROSPECT_STATUSES.COLD ? 'Froid' : status === PROSPECT_STATUSES.CONVERTED ? 'Converti' : status === PROSPECT_STATUSES.LOST ? 'Perdu' : 'Tiède',
    client,
    profile,
  };
}

export function buildProspectPipeline(clients = []) {
  const prospects = arr(clients).filter(isProspectClient).map(buildProspectRow);
  return {
    all: prospects,
    hot: prospects.filter((p) => p.status === PROSPECT_STATUSES.HOT),
    toFollowUp: prospects.filter((p) => [PROSPECT_STATUSES.HOT, PROSPECT_STATUSES.WARM].includes(p.status)),
    converted: prospects.filter((p) => p.status === PROSPECT_STATUSES.CONVERTED),
    lost: prospects.filter((p) => p.status === PROSPECT_STATUSES.LOST),
  };
}

export function buildProspectConversionPatch({ toClient = true, toQuote = false } = {}) {
  if (toQuote) {
    return {
      statut: 'prospect',
      status: 'prospect',
      prochaine_action: 'Convertir en devis',
      prospect_profile: { status: PROSPECT_STATUSES.HOT, next_action: 'Créer devis' },
    };
  }
  if (toClient) {
    return {
      statut: 'actif',
      status: 'actif',
      is_prospect: false,
      converted_at: new Date().toISOString(),
      prospect_profile: { status: PROSPECT_STATUSES.CONVERTED, converted_at: new Date().toISOString() },
      commercial_terms: { isProspect: false },
    };
  }
  return {};
}

export function buildProspectCreatePayload(form = {}) {
  return {
    nom: form.name,
    tel: form.phone,
    whatsapp: form.whatsapp || form.phone,
    statut: 'prospect',
    status: 'prospect',
    is_prospect: true,
    type_client: form.segment || 'prospect',
    source_prospect: form.source,
    interet: form.interest,
    besoin_estime: num(form.estimatedNeed),
    probabilite: num(form.probability),
    prochaine_action: form.nextAction,
    date_prochaine_action: form.nextActionDate,
    prospect_profile: {
      source: form.source,
      interest: form.interest,
      estimated_need: num(form.estimatedNeed),
      probability: num(form.probability),
      next_action: form.nextAction,
      next_action_date: form.nextActionDate,
      status: form.status || PROSPECT_STATUSES.WARM,
    },
    commercial_terms: { isProspect: true, price_tier: form.segment || 'detail' },
  };
}
