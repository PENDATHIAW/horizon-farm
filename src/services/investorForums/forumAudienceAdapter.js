/**
 * Adaptation du profil selon la cible (investisseur, banque, ONG, salon…).
 */

import { fmtCurrency } from '../../utils/format.js';
import { HORIZON_FARM_TAGLINE } from './investorProfileService.js';

const arr = (value) => (Array.isArray(value) ? value : []);

export const FORUM_AUDIENCES = {
  investisseur_prive: {
    id: 'investisseur_prive',
    label: 'Investisseur privé',
    angle: 'ROI, croissance, marge et maîtrise des risques',
    emphasis: ['keyFigures', 'risksMitigation', 'aiInnovation'],
    tone: 'opportunite',
  },
  banque: {
    id: 'banque',
    label: 'Banque',
    angle: 'Trésorerie, garanties, capacité de remboursement',
    emphasis: ['keyFigures', 'risksMitigation', 'needsSought'],
    tone: 'solidite',
  },
  ong_subvention: {
    id: 'ong_subvention',
    label: 'ONG / Subvention',
    angle: 'Impact social, femmes, jeunes, sécurité alimentaire',
    emphasis: ['socialImpact', 'founderProfile', 'projectSummary'],
    tone: 'impact',
  },
  salon_agricole: {
    id: 'salon_agricole',
    label: 'Salon agricole / forum',
    angle: 'Innovation, productivité, traçabilité',
    emphasis: ['aiInnovation', 'activities', 'projectSummary'],
    tone: 'innovation',
  },
  partenaire_technique: {
    id: 'partenaire_technique',
    label: 'Partenaire technique',
    angle: 'Équipements, formation, fournisseurs',
    emphasis: ['activities', 'needsSought', 'aiInnovation'],
    tone: 'partenariat',
  },
  incubateur: {
    id: 'incubateur',
    label: 'Incubateur',
    angle: 'Exécution, scalabilité et accompagnement',
    emphasis: ['founderProfile', 'aiInnovation', 'keyFigures'],
    tone: 'croissance',
  },
  femmes_entrepreneures: {
    id: 'femmes_entrepreneures',
    label: 'Programme femmes entrepreneures',
    angle: 'Leadership féminin, emploi local, résilience',
    emphasis: ['founderProfile', 'socialImpact', 'projectSummary'],
    tone: 'impact',
  },
};

const money = (value) => fmtCurrency(Number(value || 0));

function buildExecutiveSummary(profile, audience) {
  const k = profile.keyFigures || {};
  const founder = profile.founderProfile?.name || 'la fondatrice';

  switch (audience.id) {
    case 'investisseur_prive':
      return `${HORIZON_FARM_TAGLINE} CA ERP ${money(k.ca_erp)} · trésorerie ${money(k.resultat_tresorerie)} · CA BP annuel ${money(k.ca_bp_annuel)}. Opportunité avicole-bovine intégrée avec pilotage ERP.`;
    case 'banque':
      return `Dossier remboursement Horizon Farm — encaissements ${money(k.encaissements)}, créances ${money(k.creances)}, besoin structuré ${money(k.besoin_bp)}. ${audience.angle}.`;
    case 'ong_subvention':
      return `${founder} porte un projet de sécurité alimentaire locale : œufs, volaille, viande bovine. ${profile.socialImpact?.securite_alimentaire}. ${audience.angle}.`;
    case 'salon_agricole':
      return `${HORIZON_FARM_TAGLINE} Productivité avicole et bovine + traçabilité ERP + modules IA Horizon. ${audience.angle}.`;
    case 'partenaire_technique':
      return `Horizon Farm recherche équipements avicoles, aliments, formation et maintenance. Production : pondeuses, chair, embouche. ${audience.angle}.`;
    case 'incubateur':
      return `Projet incubable : ${founder}, ERP opérationnel, score santé ${k.health_score}/100. ${audience.angle}.`;
    case 'femmes_entrepreneures':
      return `${founder} — ferme intégrée pilotée par la donnée. ${profile.socialImpact?.femmes_jeunes}. ${audience.angle}.`;
    default:
      return profile.tagline;
  }
}

function buildHighlights(profile, audience) {
  const k = profile.keyFigures || {};
  const items = [];

  if (audience.emphasis.includes('keyFigures')) {
    items.push({ label: 'CA suivi ERP', value: money(k.ca_erp) });
    items.push({ label: 'Résultat trésorerie', value: money(k.resultat_tresorerie) });
    if (k.marge_brute != null) items.push({ label: 'Marge brute', value: money(k.marge_brute) });
    if (k.resultat_bp_an1) items.push({ label: 'Résultat BP An 1', value: money(k.resultat_bp_an1) });
  }
  if (audience.emphasis.includes('socialImpact')) {
    items.push({ label: 'Emplois prévus BP', value: String(profile.socialImpact?.emplois_prevus || 0) });
    items.push({ label: 'Sécurité alimentaire', value: profile.socialImpact?.securite_alimentaire || '—' });
  }
  if (audience.emphasis.includes('aiInnovation')) {
    items.push({ label: 'Score santé ERP', value: `${k.health_score || 0}/100` });
    items.push({ label: 'Innovation', value: profile.aiInnovation?.headline || 'Hey Horizon AI Core' });
  }
  if (audience.emphasis.includes('activities')) {
    arr(profile.activities).slice(0, 4).forEach((act) => {
      items.push({ label: act.label, value: act.detail });
    });
  }
  if (audience.emphasis.includes('needsSought')) {
    arr(profile.needsSought).slice(0, 3).forEach((need) => {
      items.push({ label: need.label, value: need.detail });
    });
  }
  if (audience.emphasis.includes('founderProfile')) {
    items.push({ label: 'Fondatrice', value: profile.founderProfile?.name || '—' });
    items.push({ label: 'Rôle', value: profile.founderProfile?.role || '—' });
  }
  if (audience.emphasis.includes('risksMitigation')) {
    arr(profile.risksMitigation).slice(0, 2).forEach((risk) => {
      items.push({ label: risk.label, value: risk.mitigation });
    });
  }
  if (audience.emphasis.includes('projectSummary')) {
    items.push({ label: 'Projet', value: profile.projectSummary?.title || 'Horizon Farm' });
    items.push({ label: 'Activités', value: arr(profile.projectSummary?.activities).join(' · ') });
  }

  return items.slice(0, 8);
}

/**
 * Adapte le profil pour une audience cible.
 * @param {object} profile — buildInvestorForumProfile()
 * @param {string} audienceKey — clé FORUM_AUDIENCES
 */
export function adaptProfileForAudience(profile = {}, audienceKey = 'investisseur_prive') {
  const audience = FORUM_AUDIENCES[audienceKey] || FORUM_AUDIENCES.investisseur_prive;
  return {
    audience,
    executiveSummary: buildExecutiveSummary(profile, audience),
    highlights: buildHighlights(profile, audience),
    recommendedSections: audience.emphasis,
    adaptedNeeds: arr(profile.needsSought).slice(0, 5),
    adaptedRisks: arr(profile.risksMitigation).slice(0, audience.id === 'banque' ? 6 : 4),
    callToAction: audience.id === 'partenaire_technique'
      ? 'Proposer un partenariat équipement, formation ou intrants.'
      : audience.id === 'ong_subvention'
        ? 'Demander un appui subventionné aligné impact social et femmes entrepreneures.'
        : audience.id === 'banque'
          ? 'Présenter garanties, flux et plan de remboursement.'
          : 'Planifier une présentation ou due diligence sur dossier ERP.',
  };
}

export default adaptProfileForAudience;
