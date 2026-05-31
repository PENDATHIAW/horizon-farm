/**
 * Carte officielle des sources de vérité ERP — évite les doublons entre modules.
 * Utilisée par l'audit cohérence, Hey Horizon et l'Annexe.
 */

export const DATA_SOURCES_OF_TRUTH = {
  vente: { table: 'sales_orders', module: 'commercial', label: 'Commandes / ventes' },
  paiement: { table: 'payments', module: 'finance_pilotage', label: 'Encaissements clients' },
  mouvement_financier: { table: 'finances', module: 'finance_pilotage', label: 'Transactions trésorerie' },
  stock_physique: { table: 'stock', module: 'achats_stock', label: 'Quantités en stock' },
  production_oeufs: { table: 'production_oeufs_logs', module: 'elevage', label: 'Comptages ponte' },
  lot_avicole: { table: 'avicole', module: 'elevage', label: 'Bandes / lots avicoles' },
  animal: { table: 'animaux', module: 'elevage', label: 'Fiches animaux' },
  sante: { table: 'sante', module: 'elevage', label: 'Interventions santé' },
  alimentation: { table: 'alimentation_logs', module: 'elevage', label: 'Distribution aliment' },
  document_fichier: { table: 'documents', module: 'documents_rapports', label: 'Pièces jointes' },
  facture: { table: 'invoices', module: 'commercial', label: 'Factures émises' },
  livraison: { table: 'deliveries', module: 'commercial', label: 'Livraisons' },
  tache: { table: 'taches', module: 'activite_suivi', label: 'Tâches terrain' },
  alerte: { table: 'alertes_center', module: 'activite_suivi', label: 'Alertes ouvertes' },
  evenement: { table: 'business_events', module: 'activite_suivi', label: 'Traçabilité métier' },
  client: { table: 'clients', module: 'commercial', label: 'Référentiel clients' },
  fournisseur: { table: 'fournisseurs', module: 'achats_stock', label: 'Référentiel fournisseurs' },
  recommandation_ia: { table: 'ai_recommendations', module: 'assistant_erp', label: 'Suggestions Hey Horizon' },
};

/** Règles anti-double-comptage (CA, encaissement, stock). */
export const ANTI_DUPLICATION_RULES = [
  { domain: 'CA', source: 'sales_orders', neverSumWith: ['payments', 'finances'], note: 'Le chiffre d\'affaires = ventes, pas encaissements.' },
  { domain: 'Encaissement', source: 'payments', linkTo: 'sales_orders', note: 'Un paiement doit pointer vers une vente.' },
  { domain: 'Stock sortie vente', source: 'sales_orders', neverDuplicate: 'stock_movement_manual', note: 'Vente validée = sortie commerciale unique.' },
  { domain: 'Stock aliment', source: 'alimentation_logs', linkTo: 'stock', note: 'Distribution aliment = sortie stock liée.' },
  { domain: 'Ponte', source: 'production_oeufs_logs', neverSumWith: ['avicole.estimated_eggs'], note: 'Logs ponte = source officielle production.' },
  { domain: 'Document preuve', source: 'documents', linkTo: ['finances', 'sales_orders', 'sante'], note: 'Pièce attachée, pas doublon facture.' },
];

export function sourceForDomain(domain = '') {
  return DATA_SOURCES_OF_TRUTH[domain] || null;
}

export default DATA_SOURCES_OF_TRUTH;
