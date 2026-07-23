export const OPPORTUNITY_TYPE_OPTIONS = Object.freeze([
  ['subvention', 'Subvention'],
  ['pret', 'Prêt'],
  ['concours', 'Concours'],
  ['evenement', 'Rencontre ou événement'],
  ['investisseur_prive', 'Investisseur privé'],
  ['programme_accompagnement', 'Programme d’accompagnement'],
]);

export const OPPORTUNITY_STATUS_OPTIONS = Object.freeze([
  ['identifiee', 'Identifiée'],
  ['a_qualifier', 'À qualifier'],
  ['en_preparation', 'En préparation'],
  ['deposee', 'Déposée'],
  ['en_instruction', 'En instruction'],
  ['accordee', 'Accordée'],
  ['refusee', 'Refusée'],
  ['abandonnee', 'Abandonnée'],
]);

export const CONTACT_STATUS_OPTIONS = Object.freeze([
  ['prospect', 'À contacter'],
  ['contacte', 'Contacté'],
  ['en_echange', 'Échanges en cours'],
  ['dossier_envoye', 'Dossier envoyé'],
  ['relance_a_faire', 'Relance à faire'],
  ['partenaire', 'Partenaire'],
  ['inactif', 'Inactif'],
]);

export const APPLICATION_STATUS_OPTIONS = Object.freeze([
  ['draft', 'Brouillon'],
  ['in_progress', 'En préparation'],
  ['ready', 'Prête à déposer'],
  ['submitted', 'Déposée'],
  ['under_review', 'En instruction'],
  ['approved', 'Accordée'],
  ['rejected', 'Refusée'],
  ['withdrawn', 'Retirée'],
]);

export const AGREEMENT_STATUS_OPTIONS = Object.freeze([
  ['draft', 'Brouillon'],
  ['signed', 'Signée'],
  ['active', 'Active'],
  ['completed', 'Terminée'],
  ['suspended', 'Suspendue'],
  ['cancelled', 'Annulée'],
]);

export const DOCUMENT_STATUS_OPTIONS = Object.freeze([
  ['draft', 'Brouillon'],
  ['ready', 'Prête'],
  ['published', 'Publiée'],
  ['archived', 'Archivée'],
]);

export const REPORT_STATUS_OPTIONS = Object.freeze([
  ['draft', 'Brouillon'],
  ['ready', 'Prêt à publier'],
  ['published', 'Publié'],
  ['archived', 'Archivé'],
]);

export const VISIBILITY_OPTIONS = Object.freeze([
  ['internal', 'Interne'],
  ['restricted', 'Accès limité'],
  ['shared', 'Partagée avec les financeurs'],
  ['public', 'Publique'],
]);

export const ACCOUNT_STATUS_OPTIONS = Object.freeze([
  ['invited', 'Invitation en attente'],
  ['active', 'Actif'],
  ['suspended', 'Suspendu'],
  ['revoked', 'Révoqué'],
]);

export const JOURNAL_STATUS_OPTIONS = Object.freeze([
  ['draft', 'Brouillon'],
  ['published', 'Publié'],
  ['archived', 'Archivé'],
]);

const LABELS = new Map([
  ...OPPORTUNITY_TYPE_OPTIONS,
  ...OPPORTUNITY_STATUS_OPTIONS,
  ...CONTACT_STATUS_OPTIONS,
  ...APPLICATION_STATUS_OPTIONS,
  ...AGREEMENT_STATUS_OPTIONS,
  ...DOCUMENT_STATUS_OPTIONS,
  ...REPORT_STATUS_OPTIONS,
  ...VISIBILITY_OPTIONS,
  ...ACCOUNT_STATUS_OPTIONS,
  ...JOURNAL_STATUS_OPTIONS,
  ['allocated', 'Affectée'],
  ['read', 'Consultation'],
  ['download', 'Téléchargement'],
  ['non_precise', 'À confirmer'],
  ['consent', 'Accord confirmé'],
  ['refus', 'Contact refusé'],
]);

export function fundingValueLabel(value, fallback = 'À préciser') {
  const key = String(value || '').trim();
  return LABELS.get(key) || (key ? key.replaceAll('_', ' ') : fallback);
}

export function selectOptions(entries = []) {
  return entries.map(([value, label]) => ({ value, label }));
}
