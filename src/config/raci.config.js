/**
 * Matrice RACI Horizon Farm - qui fait quoi sur chaque processus clé.
 *
 * RACI : Responsable (réalise), Approbateur (rend des comptes, valide - UN seul
 * par processus), Consulté (avis avant), Informé (prévenu après). Cette matrice
 * n'est pas qu'un document : elle pilote concrètement l'ERP -
 *  - permissions : seul l'Approbateur (A) peut valider un processus sensible ;
 *  - assignation : la tâche part au(x) Responsable(s) (R) ;
 *  - notifications : les Informés (I) et l'Approbateur (A) sont prévenus.
 */

export const RACI_ROLES = [
  'promotrice_direction',
  'responsable_filiere',
  'terrain',
  'veterinaire',
  'finance',
  'admin_support',
];

export const RACI_LEGEND = {
  R: 'Responsable - réalise le geste',
  A: 'Approbateur - valide et rend des comptes (un seul)',
  C: 'Consulté - avis sollicité avant',
  I: 'Informé - prévenu une fois fait',
};

export const RACI_PROCESS_LABELS = {
  vente: 'Vente / commande',
  encaissement: 'Encaissement paiement',
  achat_reception: 'Achat / réception stock',
  distribution_aliment: 'Distribution aliment',
  soin_sante: 'Soin / intervention santé',
  vaccination: 'Vaccination',
  biosecurite: 'Biosécurité',
  pesee: 'Pesée',
  abattage_transformation: 'Abattage / transformation',
  reforme: 'Réforme',
  mortalite: 'Mortalité / perte',
  cloture_cycle: 'Clôture de cycle',
  depense_charge: 'Dépense / charge',
  investissement: 'Investissement',
  relance_creance: 'Relance créance',
};

/** process → { role: 'R'|'A'|'C'|'I' }. Un rôle absent n'a pas de part. */
export const RACI_MATRIX = {
  vente: { responsable_filiere: 'R', promotrice_direction: 'A', finance: 'I', terrain: 'I' },
  encaissement: { finance: 'R', promotrice_direction: 'A', responsable_filiere: 'I' },
  achat_reception: { responsable_filiere: 'R', promotrice_direction: 'A', finance: 'C', admin_support: 'I' },
  distribution_aliment: { terrain: 'R', responsable_filiere: 'A', finance: 'I' },
  soin_sante: { terrain: 'R', veterinaire: 'A', responsable_filiere: 'C', promotrice_direction: 'I' },
  vaccination: { terrain: 'R', veterinaire: 'A', responsable_filiere: 'I' },
  biosecurite: { terrain: 'R', veterinaire: 'A', responsable_filiere: 'C' },
  pesee: { terrain: 'R', responsable_filiere: 'A', promotrice_direction: 'I' },
  abattage_transformation: { terrain: 'R', responsable_filiere: 'A', veterinaire: 'C', finance: 'I', promotrice_direction: 'I' },
  reforme: { responsable_filiere: 'R', promotrice_direction: 'A', veterinaire: 'C', finance: 'I' },
  mortalite: { terrain: 'R', responsable_filiere: 'A', veterinaire: 'C', promotrice_direction: 'I' },
  cloture_cycle: { responsable_filiere: 'R', promotrice_direction: 'A', finance: 'C' },
  depense_charge: { finance: 'R', promotrice_direction: 'A', responsable_filiere: 'I' },
  investissement: { promotrice_direction: 'A', finance: 'R', responsable_filiere: 'C' },
  relance_creance: { finance: 'R', responsable_filiere: 'A', promotrice_direction: 'I' },
};

const rolesWith = (process, letter) => Object.entries(RACI_MATRIX[process] || {})
  .filter(([, l]) => l === letter)
  .map(([role]) => role);

/** Rôles Responsables (R) d'un processus - reçoivent la tâche. */
export function responsibleRoles(process) {
  return rolesWith(process, 'R');
}

/** L'unique Approbateur (A) d'un processus - seul à pouvoir valider. */
export function accountableRole(process) {
  return rolesWith(process, 'A')[0] || null;
}

/** Rôles Consultés (C). */
export function consultedRoles(process) {
  return rolesWith(process, 'C');
}

/** Rôles à notifier une fois le processus réalisé : Informés (I) + Approbateur. */
export function rolesToNotify(process) {
  const set = new Set([...rolesWith(process, 'I'), ...rolesWith(process, 'A')]);
  return [...set];
}

/** Un rôle peut-il valider (approuver) ce processus ? */
export function canApprove(role, process) {
  return accountableRole(process) === role;
}

/** Part RACI d'un rôle sur un processus (ou null). */
export function raciRoleFor(role, process) {
  return (RACI_MATRIX[process] || {})[role] || null;
}

/** Liste des processus connus. */
export function raciProcesses() {
  return Object.keys(RACI_MATRIX);
}

/** Validation d'intégrité : chaque processus a exactement un Approbateur. */
export function validateRaciMatrix(matrix = RACI_MATRIX) {
  const errors = [];
  Object.entries(matrix).forEach(([process, map]) => {
    const accountable = Object.values(map).filter((l) => l === 'A');
    if (accountable.length !== 1) errors.push(`${process} : ${accountable.length} approbateur(s) (attendu 1)`);
    const responsibles = Object.values(map).filter((l) => l === 'R');
    if (responsibles.length < 1) errors.push(`${process} : aucun responsable`);
    Object.entries(map).forEach(([role, letter]) => {
      if (!RACI_ROLES.includes(role)) errors.push(`${process} : rôle inconnu ${role}`);
      if (!'RACI'.includes(letter)) errors.push(`${process} : lettre invalide ${letter}`);
    });
  });
  return { ok: errors.length === 0, errors };
}

export default RACI_MATRIX;
