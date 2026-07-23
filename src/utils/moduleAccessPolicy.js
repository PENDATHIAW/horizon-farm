import { normalizeErpRole } from '../config/erpRoles.js';

/**
 * Politique d'accès aux modules (feuille de route HF-P0-004).
 *
 * Règles de sécurité, indépendantes de l'UI et testables :
 *  1. L'autorisation dérive UNIQUEMENT du profil serveur (profiles.role), jamais
 *     des user_metadata (qu'un utilisateur peut forger).
 *  2. Un compte non « active » (pending, suspendu, invité…) n'accède qu'au strict
 *     minimum (accueil + assistant), aucune donnée métier.
 *  3. Quand la table profiles est imposée (déploiement production), elle fait
 *     foi : un profil de secours dérivé des métadonnées (source 'auth_fallback')
 *     ou un compte non actif ne donne accès qu'au minimum. En mode démo/preview
 *     (profiles non imposée), le profil dérivé reste toléré.
 */

export const MINIMAL_ACCESS_MODULES = Object.freeze(['dashboard', 'assistant_erp']);

const ACTIVE_STATUSES = new Set(['active', 'actif', 'enabled']);

export function isActiveProfile(profile) {
  const status = String(profile?.status || '').toLowerCase();
  // Absence de statut = considéré non actif (fail-closed) sauf si explicitement actif.
  return ACTIVE_STATUSES.has(status);
}

/**
 * Liste des modules autorisés pour un profil.
 * @param {object} profile               profil serveur (role, status, source)
 * @param {object} rolePermissions       table rôle -> modules (ou ['*'])
 * @param {object} opts
 * @param {boolean} opts.profilesRequired la table profiles est imposée (production) :
 *        active alors l'application stricte (secours et comptes non actifs = minimal).
 */
export function resolveAllowedModules(profile, rolePermissions = {}, { profilesRequired = false } = {}) {
  if (!profile) return [...MINIMAL_ACCESS_MODULES];
  const role = normalizeErpRole(profile.role, 'visiteur');
  const source = String(profile.source || '');

  if (profilesRequired) {
    // La table profiles fait foi : pas d'accès métier via un profil de secours,
    // ni pour un compte non actif (pending, suspendu…).
    if (source === 'auth_fallback') return [...MINIMAL_ACCESS_MODULES];
    if (!isActiveProfile(profile)) return [...MINIMAL_ACCESS_MODULES];
  }

  return rolePermissions[role] || rolePermissions.visiteur || [...MINIMAL_ACCESS_MODULES];
}
