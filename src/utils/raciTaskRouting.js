/**
 * RACI vivant - routage des tâches et notifications (mode ADDITIF).
 *
 * À partir de la gouvernance RACI d'un enregistrement (voir raciAssignment.js), on
 * propose concrètement :
 *  - à qui assigner la tâche : le premier membre actif dont le rôle correspond au
 *    Responsable du processus (suggestion, sans jamais écraser un assigned_to déjà
 *    posé) ;
 *  - qui prévenir : les membres dont le rôle correspond aux rôles à notifier
 *    (Informés + Approbateur).
 *
 * Rien n'est imposé ni verrouillé : ce sont des champs `raci_*` en plus. L'annuaire
 * (people) reste optionnel ; sans lui, seuls les rôles sont exposés.
 */

import { enrichWithRaci } from '../config/raciAssignment.js';

const arr = (v) => (Array.isArray(v) ? v : []);
const DIACRITICS = new RegExp('[' + String.fromCharCode(0x300) + '-' + String.fromCharCode(0x36f) + ']', 'g');
const norm = (v) => String(v || '')
  .toLowerCase()
  .normalize('NFD')
  .replace(DIACRITICS, '')
  .replace(/[^a-z0-9]+/g, '_')
  .replace(/^_|_$/g, '');

/** Synonymes courants d'annuaire → rôle RACI canonique. */
const ROLE_SYNONYMS = {
  promotrice_direction: ['promotrice_direction', 'promotrice', 'direction', 'directrice', 'gerante', 'gerant', 'patronne'],
  responsable_filiere: ['responsable_filiere', 'filiere', 'responsable', 'chef_filiere', 'manager', 'chef'],
  terrain: ['terrain', 'ouvrier', 'agent_terrain', 'berger', 'soigneur', 'equipe_terrain', 'aviculteur', 'bouvier'],
  veterinaire: ['veterinaire', 'veto', 'sante', 'infirmier'],
  finance: ['finance', 'comptable', 'tresorerie', 'caissier', 'caisse', 'comptabilite'],
  admin_support: ['admin_support', 'admin', 'support', 'secretaire', 'administratif', 'assistant'],
};

const INACTIVE = new Set(['inactif', 'parti', 'sorti', 'suspendu', 'archive', 'absent']);
const isActive = (member = {}) => !INACTIVE.has(norm(member.statut || member.status));

/** Un membre correspond-il au rôle RACI demandé ? (rôle déclaré, exact ou synonyme). */
export function memberMatchesRole(member = {}, raciRole = '') {
  if (!raciRole) return false;
  const declared = norm(member.raci_role);
  if (declared && declared === raciRole) return true;
  const role = norm(member.role || member.fonction);
  if (!role) return false;
  const synonyms = ROLE_SYNONYMS[raciRole] || [raciRole];
  return synonyms.some((syn) => role === syn || role.includes(syn) || syn.includes(role));
}

const toTarget = (member, role) => ({
  role,
  member_id: member.id || null,
  member_nom: member.nom || member.name || '',
  phone: member.phone || member.telephone || '',
  user_id: member.user_id || '',
});

/**
 * Suggestion d'assignation : premier membre actif correspondant au Responsable.
 * @returns { role, member_id, member_nom, phone, user_id } ou null si aucun rôle.
 */
export function raciAssigneeSuggestion(record = {}, people = []) {
  const enriched = record.raci_owner_role ? record : enrichWithRaci(record);
  const role = enriched.raci_owner_role;
  if (!role) return null;
  const member = arr(people).filter(isActive).find((m) => memberMatchesRole(m, role));
  return member ? toTarget(member, role) : { role, member_id: null, member_nom: '', phone: '', user_id: '' };
}

/**
 * Cibles de notification : membres actifs correspondant aux rôles à notifier
 * (Informés + Approbateur). Retourne [] si rien à notifier.
 */
export function raciNotifyTargets(record = {}, people = []) {
  const enriched = record.raci_notify_roles ? record : enrichWithRaci(record);
  const roles = arr(enriched.raci_notify_roles);
  if (!roles.length) return [];
  const seen = new Set();
  const targets = [];
  roles.forEach((role) => {
    arr(people).filter(isActive).filter((m) => memberMatchesRole(m, role)).forEach((m) => {
      const key = `${role}:${m.id || m.nom}`;
      if (seen.has(key)) return;
      seen.add(key);
      targets.push(toTarget(m, role));
    });
  });
  return targets;
}

/**
 * Enrichit une tâche avec sa gouvernance RACI ET, si l'annuaire est fourni, une
 * suggestion d'assignation + les cibles de notification. Additif : ne touche jamais
 * à `assigned_to`. Sans processus déductible, renvoie la tâche inchangée.
 */
export function routeTaskWithRaci(task = {}, people = [], explicitProcess = '') {
  const enriched = enrichWithRaci(task, explicitProcess);
  if (!enriched.raci_process) return task;
  const suggestion = raciAssigneeSuggestion(enriched, people);
  return {
    ...enriched,
    raci_suggested_assignee_role: enriched.raci_owner_role || null,
    raci_suggested_assignee_id: suggestion?.member_id || null,
    raci_suggested_assignee_nom: suggestion?.member_nom || '',
    raci_notify_targets: raciNotifyTargets(enriched, people),
  };
}
