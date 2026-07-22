/**
 * Ciblage RACI du push : à qui envoyer une notification selon la gouvernance.
 *
 * À partir d'un enregistrement porteur de sa gouvernance RACI (raci_owner_role +
 * raci_notify_roles, sinon déduits), on sélectionne les abonnements push dont le
 * rôle correspond. Sans correspondance (ou sans rôle sur les appareils), on
 * retombe sur tous les abonnements : personne n'est privé d'une alerte à cause
 * d'une cartographie incomplète.
 */

import { enrichWithRaci } from '../../../src/config/raciAssignment.js';
import { memberMatchesRole } from '../../../src/utils/raciTaskRouting.js';

const arr = (v) => (Array.isArray(v) ? v : []);
const clean = (v) => String(v ?? '').trim();

/** Rôles RACI ciblés par un enregistrement (responsable + rôles à notifier). */
export function targetRolesForRecord(record = {}) {
  let rec = record;
  if (!rec.raci_owner_role && !arr(rec.raci_notify_roles).length) {
    rec = enrichWithRaci(record);
  }
  const roles = new Set();
  if (rec.raci_owner_role) roles.add(rec.raci_owner_role);
  arr(rec.raci_notify_roles).forEach((r) => roles.add(r));
  return [...roles].filter(Boolean);
}

const subscriptionRole = (sub = {}) => ({ role: sub.role || sub.fonction || '', raci_role: sub.raci_role || '' });

/**
 * Sélectionne les abonnements à notifier pour un enregistrement.
 * @returns { subscriptions, roles, matched, fallback }
 */
export function selectRaciAudience(record = {}, subscriptions = [], { fallbackToAll = true } = {}) {
  const roles = targetRolesForRecord(record);
  const subs = arr(subscriptions);

  if (!roles.length) {
    return { subscriptions: fallbackToAll ? subs : [], roles, matched: false, fallback: true };
  }

  const matched = subs.filter((sub) => {
    const m = subscriptionRole(sub);
    if (!clean(m.role) && !clean(m.raci_role)) return false;
    return roles.some((role) => memberMatchesRole(m, role));
  });

  if (matched.length) return { subscriptions: matched, roles, matched: true, fallback: false };
  return { subscriptions: fallbackToAll ? subs : [], roles, matched: false, fallback: true };
}

export default selectRaciAudience;
