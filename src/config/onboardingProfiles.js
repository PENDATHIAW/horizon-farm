/**
 * Onboarding par filière (feuille de route HF-P1-009).
 *
 * Réponse à « la richesse fonctionnelle décourage une petite ferme » : chaque
 * filière propose un profil qui (1) règle les modules sous flag adaptés à
 * l'activité et (2) liste des premiers gestes guidés. L'exploitant choisit sa
 * filière au lieu de découvrir seul les dizaines de modules.
 *
 * Config PURE (aucune dépendance React) : testable et réutilisable par l'UI.
 * Les flags portent sur les modules activables ferme par ferme
 * (cf. FLAGGED_MODULES : agri_feeds, smartfarm, financements, assistant_erp).
 */

import { FLAGGED_MODULES } from './moduleFlags.js';

/**
 * @typedef {{ id: string, label: string, description: string,
 *   flags: Record<string, boolean>, focusModules: string[],
 *   firstSteps: {label: string, module: string, tab?: string}[] }} OnboardingProfile
 */

/** @type {OnboardingProfile[]} */
export const ONBOARDING_PROFILES = Object.freeze([
  {
    id: 'aviculture_chair',
    label: 'Aviculture chair',
    description: 'Poulets de chair : bandes, aliment, poids, ventes.',
    flags: { agri_feeds: false, smartfarm: false, financements: false, assistant_erp: true },
    focusModules: ['elevage', 'achats_stock', 'commercial', 'finance_pilotage'],
    firstSteps: [
      { label: 'Créer une bande de chair', module: 'elevage', tab: 'Lots & bandes' },
      { label: 'Enregistrer une distribution d’aliment', module: 'activite_suivi', tab: 'À traiter maintenant' },
      { label: 'Peser la bande', module: 'elevage', tab: 'Lots & bandes' },
      { label: 'Enregistrer une vente', module: 'commercial', tab: 'Ventes & commandes' },
    ],
  },
  {
    id: 'aviculture_ponte',
    label: 'Aviculture pondeuses',
    description: 'Pondeuses : cheptel, ponte, aliment, ventes d’œufs.',
    flags: { agri_feeds: false, smartfarm: false, financements: false, assistant_erp: true },
    focusModules: ['elevage', 'achats_stock', 'commercial', 'finance_pilotage'],
    firstSteps: [
      { label: 'Créer un lot de pondeuses', module: 'elevage', tab: 'Lots & bandes' },
      { label: 'Saisir la ponte du jour', module: 'activite_suivi', tab: 'À traiter maintenant' },
      { label: 'Enregistrer une vente d’œufs', module: 'commercial', tab: 'Ventes & commandes' },
    ],
  },
  {
    id: 'elevage_bovin',
    label: 'Élevage bovin',
    description: 'Bovins : animaux, santé, pesée, reproduction, ventes.',
    flags: { agri_feeds: false, smartfarm: false, financements: false, assistant_erp: true },
    focusModules: ['elevage', 'achats_stock', 'commercial', 'finance_pilotage'],
    firstSteps: [
      { label: 'Enregistrer un animal', module: 'elevage', tab: 'Animaux' },
      { label: 'Noter un suivi santé', module: 'elevage', tab: 'Santé' },
      { label: 'Enregistrer une vente', module: 'commercial', tab: 'Ventes & commandes' },
    ],
  },
  {
    id: 'culture',
    label: 'Cultures / maraîchage',
    description: 'Parcelles, campagnes, intrants, récoltes et ventes.',
    flags: { agri_feeds: false, smartfarm: false, financements: false, assistant_erp: true },
    focusModules: ['cultures', 'achats_stock', 'commercial', 'finance_pilotage'],
    firstSteps: [
      { label: 'Créer une parcelle / campagne', module: 'cultures', tab: 'Parcelles' },
      { label: 'Enregistrer des intrants', module: 'cultures', tab: 'Intrants' },
      { label: 'Saisir une récolte', module: 'cultures', tab: 'Récoltes' },
      { label: 'Enregistrer une vente', module: 'commercial', tab: 'Ventes & commandes' },
    ],
  },
  {
    id: 'mixte',
    label: 'Exploitation mixte',
    description: 'Élevage + cultures + stocks consolidés (Ferme 360).',
    flags: { agri_feeds: false, smartfarm: false, financements: true, assistant_erp: true },
    focusModules: ['elevage', 'cultures', 'achats_stock', 'commercial', 'finance_pilotage'],
    firstSteps: [
      { label: 'Créer un lot ou un animal', module: 'elevage', tab: 'Lots & bandes' },
      { label: 'Créer une parcelle', module: 'cultures', tab: 'Parcelles' },
      { label: 'Vérifier les stocks', module: 'achats_stock', tab: 'Stocks & lots' },
    ],
  },
  {
    id: 'agro_industrie',
    label: 'Agro-industrie (aliments)',
    description: 'Fabrication d’aliments : matières, formules, production, qualité.',
    flags: { agri_feeds: true, smartfarm: false, financements: true, assistant_erp: true },
    focusModules: ['agri_feeds', 'achats_stock', 'commercial', 'finance_pilotage'],
    firstSteps: [
      { label: 'Saisir des matières premières', module: 'agri_feeds', tab: 'Matières & fournisseurs' },
      { label: 'Créer une formule', module: 'agri_feeds', tab: 'Formulations' },
      { label: 'Lancer une production', module: 'agri_feeds', tab: 'Production' },
    ],
  },
]);

const PROFILES_BY_ID = new Map(ONBOARDING_PROFILES.map((profile) => [profile.id, profile]));

export function listOnboardingProfiles() {
  return ONBOARDING_PROFILES;
}

export function getOnboardingProfile(profileId) {
  return PROFILES_BY_ID.get(String(profileId || '')) || null;
}

/**
 * Flags de modules effectifs pour un profil (complétés par les défauts pour
 * tout module sous flag non cité, afin de toujours renvoyer un jeu complet).
 */
export function resolveOnboardingFlags(profileId) {
  const profile = getOnboardingProfile(profileId);
  const flags = {};
  for (const [id, { actifParDefaut }] of Object.entries(FLAGGED_MODULES)) {
    flags[id] = profile && typeof profile.flags[id] === 'boolean' ? profile.flags[id] : actifParDefaut;
  }
  return flags;
}

/** La ferme a-t-elle déjà choisi une filière (onboarding fait) ? */
export function isFarmOnboarded(farm) {
  return Boolean(farm?.settings?.onboarding?.profile);
}

/**
 * Réglages à écrire sur la ferme pour appliquer un profil : flags de modules +
 * trace d'onboarding (profil choisi + date). Fusionne avec les settings existants.
 */
export function buildOnboardingSettings(farm, profileId, now = Date.now()) {
  const profile = getOnboardingProfile(profileId);
  if (!profile) return null;
  const previous = farm?.settings || {};
  return {
    ...previous,
    modules: { ...(previous.modules || {}), ...resolveOnboardingFlags(profileId) },
    onboarding: { profile: profile.id, completed_at: new Date(now).toISOString() },
  };
}
