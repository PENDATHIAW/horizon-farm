export const FORM_SCHEMA_REGISTRY = {
  ventes: {
    label: 'Ventes',
    intents: ['créer vente', 'enregistrer paiement', 'vendre animal', 'vendre poulets', 'vendre récolte'],
    required: ['client_id', 'source_module', 'source_id', 'quantity', 'prix_unitaire'],
    recommended: ['moyen_paiement', 'date', 'statut_paiement'],
    auto: ['montant_total', 'reste_a_payer', 'statut_commande', 'statut_facture', 'transaction_finance', 'document', 'business_event'],
    effects: ['clients', 'payments', 'finances', 'documents', 'business_events', 'alertes_center', 'stock/animaux/avicole/cultures'],
  },
  paiements: {
    label: 'Paiements',
    intents: ['encaisser', 'ajouter paiement', 'solder commande'],
    required: ['order_id', 'client_id', 'montant', 'moyen_paiement'],
    recommended: ['date_paiement', 'invoice_id'],
    auto: ['reste_a_payer', 'statut_paiement', 'statut_client', 'transaction_finance'],
    effects: ['sales_orders', 'clients', 'finances', 'alertes_center'],
  },
  stock: {
    label: 'Stock',
    intents: ['ajouter stock', 'sortir stock', 'déclarer perte', 'réceptionner stock'],
    required: ['produit', 'categorie', 'quantite', 'unite'],
    recommended: ['prixUnit', 'fournisseur_id', 'seuil', 'activite_liee'],
    auto: ['valeur_stock', 'statut', 'alerte_stock', 'finance_si_achat_ou_perte'],
    effects: ['finances', 'fournisseurs', 'documents', 'business_events', 'alertes_center', 'taches'],
  },
  animaux: {
    label: 'Animaux',
    intents: ['ajouter animal', 'modifier animal', 'vendre animal', 'signaler santé animal'],
    required: ['tag', 'type', 'sexe'],
    recommended: ['poids', 'purchase_cost', 'date_achat', 'health_status'],
    auto: ['cout_total', 'marge', 'prix_recommande', 'traçabilité'],
    effects: ['sante', 'ventes', 'finances', 'business_events'],
  },
  avicole: {
    label: 'Avicole',
    intents: ['créer lot', 'sortie lot', 'vente poulets', 'mortalité lot', 'production oeufs'],
    required: ['name', 'type', 'initial_count', 'date_debut'],
    recommended: ['prix_vente_prevu', 'cout_poussins', 'phase'],
    auto: ['current_count', 'cout_par_tete', 'marge_lot', 'readiness_vente'],
    effects: ['ventes', 'stock', 'sante', 'finances', 'business_events'],
  },
  cultures: {
    label: 'Cultures',
    intents: ['créer culture', 'récolter', 'vendre récolte', 'traitement culture'],
    required: ['nom', 'type', 'parcelle', 'surface'],
    recommended: ['quantite_prevue', 'cout_semences', 'cout_engrais', 'statut'],
    auto: ['cout_total', 'cout_unitaire', 'stock_recolte', 'marge_culture'],
    effects: ['stock', 'ventes', 'finances', 'business_events'],
  },
  sante: {
    label: 'Santé & Biosécurité',
    intents: ['ajouter soin', 'vacciner', 'traiter maladie', 'désinfecter', 'urgence sanitaire'],
    required: ['nom', 'type_intervention', 'target_mode', 'date'],
    recommended: ['cout', 'vet', 'product_source', 'prochaine_action'],
    auto: ['sortie_stock_sante', 'finance', 'tache_suivi', 'alerte_si_urgence', 'document_preuve'],
    effects: ['stock', 'finances', 'taches', 'alertes_center', 'documents', 'business_events'],
  },
  fournisseurs: {
    label: 'Fournisseurs',
    intents: ['ajouter fournisseur', 'payer fournisseur', 'commander fournisseur'],
    required: ['nom', 'categorie'],
    recommended: ['tel', 'whatsapp', 'contact', 'note'],
    auto: ['dette_reelle', 'tache_paiement', 'document', 'transaction_finance'],
    effects: ['stock', 'finances', 'documents', 'taches', 'alertes_center'],
  },
  rh: {
    label: 'RH & Équipe',
    intents: ['ajouter employé', 'payer salaire', 'noter avance', 'affecter équipe'],
    required: ['nom', 'role', 'fonction'],
    recommended: ['salaire_mensuel', 'prime_mensuelle', 'avance_mois', 'modules'],
    auto: ['net_a_payer', 'masse_salariale', 'charge_finance_si_payé'],
    effects: ['finances', 'comptabilite', 'taches', 'impact_business'],
  },
};

export function getFormSchema(moduleKey) {
  return FORM_SCHEMA_REGISTRY[moduleKey] || null;
}

export function listAssistantModules() {
  return Object.entries(FORM_SCHEMA_REGISTRY).map(([key, schema]) => ({ key, label: schema.label, intents: schema.intents, required: schema.required }));
}

export function missingRequiredFields(moduleKey, payload = {}) {
  const schema = getFormSchema(moduleKey);
  if (!schema) return [];
  return schema.required.filter((key) => payload[key] === undefined || payload[key] === null || payload[key] === '');
}

export function buildAssistantDraft(moduleKey, payload = {}) {
  const schema = getFormSchema(moduleKey);
  if (!schema) return { ok: false, error: 'Module inconnu', moduleKey, payload };
  const missing = missingRequiredFields(moduleKey, payload);
  return {
    ok: missing.length === 0,
    moduleKey,
    label: schema.label,
    payload,
    missing,
    required: schema.required,
    recommended: schema.recommended,
    auto: schema.auto,
    effects: schema.effects,
  };
}
