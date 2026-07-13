/**
 * Registre du contrat des 20 secondes (chantier 5).
 *
 * Chaque saisie rapide déclare son contrat : cinq champs requis au maximum, le
 * reste replié sous « Détails », les préremplissages, les filtres de contexte,
 * la clé d'idempotence (issue_key : rejeu = un seul effet, en ligne comme hors
 * ligne) et le gabarit de confirmation à effets. Le libellé du bouton suit la
 * règle verbe + objet. Ce registre est la source unique : l'Accueil, les
 * modules et les tests le consomment.
 */

/** Préremplissages standards disponibles sur toute saisie. */
export const PREREMPLISSAGES_STANDARD = Object.freeze([
  'date_du_jour',
  'utilisateur_connecte',
  'unites_de_la_ferme',
]);

const form = (def) => ({
  quotidien: false,
  champsRequis: [],
  champsReplies: [],
  preremplissages: [],
  filtresContexte: [],
  ...def,
});

/** Les 7 saisies quotidiennes, boutons d'action rapide sur l'Accueil. */
export const SAISIES_QUOTIDIENNES = [
  form({
    id: 'distribution',
    libelleBouton: "Distribuer l'aliment",
    module: 'elevage',
    onglet: 'Alimentation',
    quotidien: true,
    champsRequis: ['produit_aliment', 'quantite', 'lot'],
    champsReplies: ['duree_jours', 'responsable', 'notes'],
    preremplissages: [...PREREMPLISSAGES_STANDARD, 'lot_unique_auto', 'dernier_fournisseur', 'dernier_prix'],
    filtresContexte: ['categorie_aliment', 'produit_en_stock', 'lot_actif'],
    cleIdempotence: { domaine: 'alimentation', module: 'elevage' },
    confirmation: { effetStock: 'sortie de stock', effetCout: 'coût du lot' },
  }),
  form({
    id: 'ponte',
    libelleBouton: 'Enregistrer la ponte',
    module: 'elevage',
    onglet: 'Pondeuses',
    quotidien: true,
    champsRequis: ['lot', 'oeufs_produits'],
    champsReplies: ['oeufs_casses', 'responsable', 'notes'],
    preremplissages: [...PREREMPLISSAGES_STANDARD, 'lot_unique_auto'],
    filtresContexte: ['lot_pondeuse_actif'],
    cleIdempotence: { domaine: 'ponte', module: 'elevage' },
    confirmation: { effetStock: 'tablettes vendables', effetCout: 'production du jour' },
  }),
  form({
    id: 'mortalite',
    libelleBouton: 'Déclarer une mortalité',
    module: 'elevage',
    onglet: 'Lots & bandes',
    quotidien: true,
    champsRequis: ['lot', 'nombre'],
    champsReplies: ['cause', 'responsable', 'notes'],
    preremplissages: [...PREREMPLISSAGES_STANDARD, 'lot_unique_auto'],
    filtresContexte: ['lot_actif'],
    cleIdempotence: { domaine: 'mortalite', module: 'elevage' },
    confirmation: { effetStock: 'effectif du lot', effetCout: 'perte estimée' },
  }),
  form({
    id: 'pesee',
    libelleBouton: 'Enregistrer une pesée',
    module: 'elevage',
    onglet: 'Embouche bovine',
    quotidien: true,
    champsRequis: ['animal', 'poids'],
    champsReplies: ['responsable', 'notes'],
    preremplissages: [...PREREMPLISSAGES_STANDARD, 'animal_unique_auto'],
    filtresContexte: ['animal_actif'],
    cleIdempotence: { domaine: 'pesee', module: 'elevage' },
    confirmation: { effetStock: 'courbe de poids', effetCout: 'gain moyen' },
  }),
  form({
    id: 'irrigation',
    libelleBouton: "Noter l'irrigation",
    module: 'cultures',
    onglet: 'Irrigation',
    quotidien: true,
    champsRequis: ['parcelle', 'volume'],
    champsReplies: ['source_eau', 'responsable', 'notes'],
    preremplissages: [...PREREMPLISSAGES_STANDARD, 'parcelle_unique_auto'],
    filtresContexte: ['parcelle_active'],
    cleIdempotence: { domaine: 'irrigation', module: 'cultures' },
    confirmation: { effetStock: 'consommation d\'eau', effetCout: 'coût par parcelle' },
  }),
  form({
    id: 'recolte',
    libelleBouton: 'Enregistrer la récolte',
    module: 'cultures',
    onglet: 'Récoltes',
    quotidien: true,
    champsRequis: ['parcelle', 'quantite', 'qualite'],
    champsReplies: ['responsable', 'notes'],
    preremplissages: [...PREREMPLISSAGES_STANDARD, 'parcelle_unique_auto'],
    filtresContexte: ['parcelle_active', 'qualite_fermee'],
    cleIdempotence: { domaine: 'recolte', module: 'cultures' },
    confirmation: { effetStock: 'entrée de stock', effetCout: 'coût au kg' },
  }),
  form({
    id: 'vente',
    libelleBouton: 'Enregistrer une vente',
    module: 'commercial',
    onglet: 'Ventes',
    quotidien: true,
    champsRequis: ['client', 'source_produit', 'quantite', 'prix'],
    champsReplies: ['paiement', 'livraison', 'notes'],
    preremplissages: [...PREREMPLISSAGES_STANDARD, 'dernier_client', 'dernier_prix'],
    filtresContexte: ['source_disponible', 'client_actif'],
    cleIdempotence: { domaine: 'vente', module: 'commercial' },
    confirmation: { effetStock: 'sortie ou réservation', effetCout: 'chiffre d\'affaires' },
  }),
];

/** Saisies périodiques soumises au même contrat. */
export const SAISIES_PERIODIQUES = [
  form({ id: 'reception', libelleBouton: 'Enregistrer une réception', module: 'achats_stock', onglet: 'Réceptions & achats', champsRequis: ['fournisseur', 'produit', 'quantite', 'prix'], champsReplies: ['document', 'notes'], preremplissages: [...PREREMPLISSAGES_STANDARD, 'dernier_fournisseur', 'dernier_prix'], filtresContexte: ['fournisseur_actif', 'produit_catalogue'], cleIdempotence: { domaine: 'reception', module: 'achats_stock' }, confirmation: { effetStock: 'entrée de stock', effetCout: 'coût moyen' } }),
  form({ id: 'depense', libelleBouton: 'Enregistrer une dépense', module: 'finance_pilotage', onglet: 'Résumé', champsRequis: ['objet_cout', 'montant', 'categorie'], champsReplies: ['justificatif', 'notes'], preremplissages: [...PREREMPLISSAGES_STANDARD], filtresContexte: ['categorie_active'], cleIdempotence: { domaine: 'depense', module: 'finance_pilotage' }, confirmation: { effetStock: 'trésorerie', effetCout: 'coût rattaché' } }),
  form({ id: 'encaissement_client', libelleBouton: 'Enregistrer un encaissement', module: 'commercial', onglet: 'Clients & créances', champsRequis: ['client', 'montant'], champsReplies: ['moyen_paiement', 'notes'], preremplissages: [...PREREMPLISSAGES_STANDARD, 'dernier_client'], filtresContexte: ['client_avec_creance'], cleIdempotence: { domaine: 'encaissement_client', module: 'commercial' }, confirmation: { effetStock: 'trésorerie', effetCout: 'créance restante' } }),
  form({ id: 'paiement_fournisseur', libelleBouton: 'Enregistrer un paiement fournisseur', module: 'finance_pilotage', onglet: 'Créances & dettes', champsRequis: ['fournisseur', 'montant'], champsReplies: ['moyen_paiement', 'notes'], preremplissages: [...PREREMPLISSAGES_STANDARD, 'dernier_fournisseur'], filtresContexte: ['fournisseur_avec_dette'], cleIdempotence: { domaine: 'paiement_fournisseur', module: 'finance_pilotage' }, confirmation: { effetStock: 'trésorerie', effetCout: 'dette restante' } }),
  form({ id: 'vaccination', libelleBouton: 'Enregistrer une vaccination', module: 'elevage', onglet: 'Santé', champsRequis: ['lot', 'produit', 'date_reelle'], champsReplies: ['responsable', 'notes'], preremplissages: [...PREREMPLISSAGES_STANDARD, 'lot_unique_auto'], filtresContexte: ['lot_actif'], cleIdempotence: { domaine: 'vaccination', module: 'elevage' }, confirmation: { effetStock: 'stock vétérinaire', effetCout: 'coût sanitaire' } }),
  form({ id: 'nettoyage', libelleBouton: 'Enregistrer un nettoyage', module: 'elevage', onglet: 'Santé', champsRequis: ['zone', 'sacs', 'poids', 'destination'], champsReplies: ['statut_sanitaire', 'notes'], preremplissages: [...PREREMPLISSAGES_STANDARD], filtresContexte: ['zone_active'], cleIdempotence: { domaine: 'nettoyage', module: 'elevage' }, confirmation: { effetStock: 'stock organique', effetCout: 'biosécurité' } }),
  form({ id: 'transfert_organique', libelleBouton: 'Enregistrer un transfert', module: 'achats_stock', onglet: 'Matières organiques', champsRequis: ['matiere', 'quantite', 'destination'], champsReplies: ['notes'], preremplissages: [...PREREMPLISSAGES_STANDARD], filtresContexte: ['matiere_conforme'], cleIdempotence: { domaine: 'transfert_organique', module: 'achats_stock' }, confirmation: { effetStock: 'mouvement de stock', effetCout: 'valorisation' } }),
  form({ id: 'semis', libelleBouton: 'Enregistrer un semis', module: 'cultures', onglet: 'Parcelles & campagnes', champsRequis: ['parcelle', 'culture', 'date_reelle'], champsReplies: ['densite', 'notes'], preremplissages: [...PREREMPLISSAGES_STANDARD, 'parcelle_unique_auto'], filtresContexte: ['parcelle_active'], cleIdempotence: { domaine: 'semis', module: 'cultures' }, confirmation: { effetStock: 'campagne créée', effetCout: 'budget de campagne' } }),
  form({ id: 'panne', libelleBouton: 'Déclarer une panne', module: 'equipements', onglet: 'Pannes', champsRequis: ['equipement', 'gravite'], champsReplies: ['description', 'notes'], preremplissages: [...PREREMPLISSAGES_STANDARD], filtresContexte: ['equipement_actif'], cleIdempotence: { domaine: 'panne', module: 'equipements' }, confirmation: { effetStock: 'disponibilité', effetCout: 'alerte et tâche' } }),
  form({ id: 'absence', libelleBouton: 'Déclarer une absence', module: 'equipe', onglet: 'Personnel & Paie', champsRequis: ['membre', 'date_debut', 'date_fin'], champsReplies: ['motif', 'notes'], preremplissages: [...PREREMPLISSAGES_STANDARD], filtresContexte: ['membre_actif'], cleIdempotence: { domaine: 'absence', module: 'equipe' }, confirmation: { effetStock: 'tâches concernées', effetCout: 'signalement' } }),
];

export const REGISTRE_FORMULAIRES = [...SAISIES_QUOTIDIENNES, ...SAISIES_PERIODIQUES];

export const REGISTRE_PAR_ID = Object.freeze(
  Object.fromEntries(REGISTRE_FORMULAIRES.map((f) => [f.id, f])),
);

/** Contrat vérifiable : cinq champs requis maximum, cinq interactions maximum. */
export const CONTRAT_20S = Object.freeze({
  champsRequisMax: 5,
  interactionsMax: 5,
  dureeMaxSecondes: 20,
});

export function respecteContrat(formulaire) {
  if (!formulaire) return false;
  return formulaire.champsRequis.length <= CONTRAT_20S.champsRequisMax
    && formulaire.preremplissages.length > 0
    && Boolean(formulaire.cleIdempotence?.domaine)
    && Boolean(formulaire.confirmation?.effetStock);
}
