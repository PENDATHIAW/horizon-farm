/**
 * Application ERP-wide de la matrice RACI - mode ADDITIF.
 *
 * Enrichit n'importe quel enregistrement (tâche, alerte, événement, relance) avec
 * sa gouvernance : rôle responsable (à qui la tâche revient), rôles à notifier
 * (informés + approbateur), rôle approbateur. Additif : on ajoute des champs
 * `raci_*`, on ne change AUCUN comportement ni permission. L'enforcement des
 * permissions viendra dans un second temps, une fois validé.
 */

import {
  accountableRole,
  responsibleRoles,
  rolesToNotify,
  RACI_MATRIX,
} from './raci.config.js';

const lower = (v) => String(v || '').toLowerCase();

/** Motifs (mot-clé → processus RACI), du plus spécifique au plus général. */
const PROCESS_PATTERNS = [
  [/relance|impay|creance|créance|recouvre/, 'relance_creance'],
  [/encaiss|paiement|paye|règlement|reglement/, 'encaissement'],
  [/abattage|transformation|découpe|decoupe/, 'abattage_transformation'],
  [/réforme|reforme/, 'reforme'],
  [/mortalit|mort |perte|deces|décès/, 'mortalite'],
  [/vaccin/, 'vaccination'],
  [/biosecurit|biosécurit|désinfect|desinfect/, 'biosecurite'],
  [/soin|sante|santé|traitement|vétérinaire|veterinaire|curatif|preventif|déparasit|deparasit/, 'soin_sante'],
  [/pesée|pesee|poids/, 'pesee'],
  [/aliment|feeding|distribution|ration|provende/, 'distribution_aliment'],
  [/récolte|recolte|harvest/, 'cloture_cycle'],
  [/cloture|clôture/, 'cloture_cycle'],
  [/reception|réception|achat|fournisseur|approvision/, 'achat_reception'],
  [/investiss/, 'investissement'],
  [/dépense|depense|charge|facture/, 'depense_charge'],
  [/vente|commande|vendre|sale/, 'vente'],
];

/**
 * Déduit le processus RACI d'un enregistrement à partir de ses champs
 * (module, clé de décision, type, libellé…). Renvoie null si indéterminé.
 */
export function inferRaciProcess(record = {}) {
  const text = lower([
    record.raci_process,
    record.decision_key,
    record.module_lie,
    record.module_source,
    record.type,
    record.event_type,
    record.type_intervention,
    record.title,
    record.titre,
    record.libelle,
  ].filter(Boolean).join(' '));

  if (record.raci_process && RACI_MATRIX[record.raci_process]) return record.raci_process;
  for (const [pattern, process] of PROCESS_PATTERNS) {
    if (pattern.test(text)) return process;
  }
  return null;
}

/**
 * Enrichit un enregistrement avec sa gouvernance RACI (champs `raci_*`).
 * Additif et non destructif : renvoie une copie, sans toucher au reste.
 */
export function enrichWithRaci(record = {}, explicitProcess = '') {
  const process = explicitProcess && RACI_MATRIX[explicitProcess] ? explicitProcess : inferRaciProcess(record);
  if (!process) return record;
  return {
    ...record,
    raci_process: process,
    raci_owner_role: responsibleRoles(process)[0] || null,
    raci_owner_roles: responsibleRoles(process),
    raci_accountable_role: accountableRole(process),
    raci_notify_roles: rolesToNotify(process),
  };
}

/** Rôle à qui assigner la tâche d'un processus (le premier Responsable). */
export function taskOwnerForProcess(process) {
  return responsibleRoles(process)[0] || null;
}
