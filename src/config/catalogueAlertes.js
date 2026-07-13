/**
 * Catalogue central unique des 15 alertes.
 *
 * Toute alerte émise dans l'application référence un code de ce catalogue.
 * Les seuils sont des paramètres de la ferme (Gestion du système ›
 * Paramètres) ; le catalogue est administré dans Gestion du système ›
 * Catalogues et consommé partout. Une action corrective est une tâche
 * portant un alert_id, jamais une entité à part.
 */
export const CATALOGUE_ALERTES = Object.freeze([
  { code: 'stock_sous_seuil', libelle: 'Stock sous seuil', gravite: 'warning', detecteur: 'achats_stock', condition: 'quantité disponible sous le seuil du produit' },
  { code: 'stock_negatif_tente', libelle: 'Tentative de stock négatif', gravite: 'critique', detecteur: 'achats_stock', condition: 'sortie refusée car quantité insuffisante' },
  { code: 'lot_expire', libelle: 'Lot expiré', gravite: 'warning', detecteur: 'achats_stock', condition: 'date de péremption du lot dépassée' },
  { code: 'mortalite_anormale', libelle: 'Mortalité anormale', gravite: 'critique', detecteur: 'elevage', condition: 'mortalité au-dessus du seuil de la ferme' },
  { code: 'ponte_en_baisse', libelle: 'Ponte en baisse', gravite: 'warning', detecteur: 'elevage', condition: 'taux de ponte sous la tendance attendue' },
  { code: 'aliment_hors_courbe', libelle: 'Aliment hors courbe', gravite: 'warning', detecteur: 'elevage', condition: 'consommation hors de la courbe de référence' },
  { code: 'vaccination_en_retard', libelle: 'Vaccination en retard', gravite: 'critique', detecteur: 'elevage', condition: 'échéance de vaccination dépassée' },
  { code: 'creance_echue', libelle: 'Créance échue', gravite: 'warning', detecteur: 'commercial', condition: 'paiement client en retard sur l\'échéance' },
  { code: 'facture_livraison_manquante', libelle: 'Facture de livraison manquante', gravite: 'warning', detecteur: 'commercial', condition: 'livraison sans facture générée' },
  { code: 'depense_sans_justificatif', libelle: 'Dépense sans justificatif', gravite: 'warning', detecteur: 'finance_pilotage', condition: 'dépense au-dessus du seuil sans pièce jointe' },
  { code: 'budget_depasse', libelle: 'Budget dépassé', gravite: 'critique', detecteur: 'finance_pilotage', condition: 'dépenses au-delà du budget de la ligne' },
  { code: 'tresorerie_faible', libelle: 'Trésorerie faible', gravite: 'critique', detecteur: 'finance_pilotage', condition: 'jours de trésorerie sous le seuil de la ferme' },
  { code: 'tache_critique_en_retard', libelle: 'Tâche critique en retard', gravite: 'critique', detecteur: 'activite_suivi', condition: 'tâche critique dont l\'échéance est dépassée' },
  { code: 'panne_equipement_critique', libelle: 'Panne d\'équipement critique', gravite: 'critique', detecteur: 'equipements', condition: 'équipement critique déclaré en panne' },
  { code: 'non_synchronise_24h', libelle: 'Non synchronisé depuis 24 h', gravite: 'warning', detecteur: 'gestion_systeme', condition: 'aucun envoi réussi depuis 24 heures' },
]);

export const ALERTES_PAR_CODE = Object.freeze(
  Object.fromEntries(CATALOGUE_ALERTES.map((alerte) => [alerte.code, alerte])),
);

export function libelleAlerte(code = '') {
  return ALERTES_PAR_CODE[code]?.libelle || code;
}

export function graviteAlerte(code = '', graviteBrute = '') {
  return ALERTES_PAR_CODE[code]?.gravite || String(graviteBrute || 'info');
}
