/**
 * Flags de modules par ferme.
 *
 * AGRI FEEDS, Smart Farm, Financements et l'Assistant sont activables ferme
 * par ferme. Module désactivé = aucune entrée de navigation, aucune route
 * (redirection vers l'Accueil), aucun composant construit, aucun chargement
 * de données pour ses tables.
 *
 * La source de vérité est farms.settings.modules (jsonb). Un instantané est
 * gardé en localStorage pour que le chargement des données (AppContext),
 * qui démarre avant la sélection de la ferme, respecte déjà les flags.
 */

export const FLAGGED_MODULES = Object.freeze({
  agri_feeds: { actifParDefaut: false },
  smartfarm: { actifParDefaut: false },
  financements: { actifParDefaut: true },
  assistant_erp: { actifParDefaut: true },
});

/** Tables préchargées appartenant à un module sous flag. */
export const FLAGGED_DATA_KEYS = Object.freeze({
  smartfarm: ['sensor_devices', 'smartfarm_events'],
  financements: [
    'funding_opportunities', 'funding_contacts', 'funding_applications',
    'funding_document_library', 'funding_agreements', 'funding_expense_allocations',
    'funding_reports', 'funding_project_journal', 'funder_accounts', 'funder_access_logs',
  ],
  agri_feeds: [],
  assistant_erp: [],
});

export const RETIRED_DATA_KEYS = Object.freeze(['camera_devices']);

const STORAGE_KEY = 'horizon:modules-actifs';

export function readPersistedModuleFlags() {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function persistModuleFlags(flags = {}) {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(flags));
  } catch {
    // stockage indisponible : les valeurs par défaut s'appliquent
  }
}

/**
 * Calcule les flags effectifs pour une ferme.
 * Priorité : réglage explicite de la ferme, puis instantané local, puis défaut.
 */
export function resolveModuleFlags(farm = null, persisted = readPersistedModuleFlags()) {
  const reglages = farm?.settings?.modules || null;
  const flags = {};
  for (const [id, { actifParDefaut }] of Object.entries(FLAGGED_MODULES)) {
    if (reglages && typeof reglages[id] === 'boolean') flags[id] = reglages[id];
    else if (typeof persisted?.[id] === 'boolean' && !reglages) flags[id] = persisted[id];
    else flags[id] = actifParDefaut;
  }
  return flags;
}

export function isModuleEnabled(moduleId, flags = {}) {
  if (!(moduleId in FLAGGED_MODULES)) return true;
  return flags[moduleId] === true;
}

/** Une table de données est chargeable si son module propriétaire est actif. */
export function isDataKeyEnabled(dataKey, flags = {}) {
  if (RETIRED_DATA_KEYS.includes(dataKey)) return false;
  for (const [moduleId, keys] of Object.entries(FLAGGED_DATA_KEYS)) {
    if (keys.includes(dataKey)) return isModuleEnabled(moduleId, flags);
  }
  return true;
}

/** Entry points restreints aux modules actifs : flag désactivé = import jamais résolu. */
export function enabledModuleEntryPoints(entryPoints = {}, flags = {}) {
  return Object.fromEntries(
    Object.entries(entryPoints).filter(([id]) => isModuleEnabled(id, flags)),
  );
}
