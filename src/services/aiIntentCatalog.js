export const HORIZON_INTENT_CATALOG = {
  purchase_stock: {
    label: 'Achat stock / intrants',
    primary_module: 'stock',
    form_type: 'stock_purchase',
    impacted_modules: ['stock', 'finances', 'fournisseurs', 'tracabilite', 'centre_ia'],
    examples: [
      'Enregistre un achat de 20 sacs d aliment de 50 kg chez NMA Sanders',
      'J ai achete 10 sacs de mais a credit',
    ],
    required_fields: ['product_name', 'quantity', 'unit', 'supplier_name', 'date', 'payment_status'],
    related_forms: ['supplier_creation', 'stock_product_creation'],
    validation_required: true,
  },

  sale_record: {
    label: 'Vente / commande client',
    primary_module: 'commercial',
    form_type: 'sale_record',
    impacted_modules: ['commercial', 'stock', 'clients', 'finances', 'tracabilite', 'centre_ia'],
    examples: [
      'Enregistre une vente de 15 tablettes d oeufs au client Mariama',
      'J ai vendu 3 moutons payes cash',
    ],
    required_fields: ['product_name', 'quantity', 'client_name', 'date', 'payment_status'],
    related_forms: ['client_creation', 'payment_entry'],
    validation_required: true,
  },

  egg_production: {
    label: 'Production oeufs',
    primary_module: 'avicole',
    form_type: 'egg_production_log',
    impacted_modules: ['avicole', 'stock', 'ventes', 'tracabilite', 'centre_ia'],
    examples: [
      'Ponte P1 aujourd hui 980 oeufs 12 casses',
      'Enregistre 1200 oeufs produits pour le lot pondeuses A',
    ],
    required_fields: ['lot_name', 'produced_eggs', 'date'],
    optional_fields: ['broken_eggs', 'observations'],
    related_forms: ['lot_selection'],
    validation_required: true,
  },

  animal_mortality: {
    label: 'Mortalite / perte animaux',
    primary_module: 'avicole',
    form_type: 'mortality_event',
    impacted_modules: ['avicole', 'animaux', 'sante', 'tracabilite', 'centre_ia', 'alertes'],
    examples: [
      'Il y a 2 morts dans le lot poulets de chair B',
      'Enregistre 1 chevre morte aujourd hui',
    ],
    required_fields: ['entity_name', 'quantity', 'date'],
    optional_fields: ['cause', 'observations'],
    related_forms: ['health_event'],
    validation_required: true,
  },

  health_treatment: {
    label: 'Soin / vaccin / traitement',
    primary_module: 'sante',
    form_type: 'health_treatment',
    impacted_modules: ['sante', 'avicole', 'animaux', 'stock', 'finances', 'tracabilite', 'centre_ia'],
    examples: [
      'Enregistre un vaccin Newcastle pour le lot P1',
      'Le veterinaire a traite la vache Awa aujourd hui',
    ],
    required_fields: ['target_name', 'treatment_name', 'date'],
    optional_fields: ['vet_name', 'cost', 'next_due_date'],
    related_forms: ['vet_creation', 'medicine_stock_update'],
    validation_required: true,
  },

  feed_distribution: {
    label: 'Distribution alimentation',
    primary_module: 'stock',
    form_type: 'feed_distribution',
    impacted_modules: ['stock', 'avicole', 'animaux', 'tracabilite', 'centre_ia'],
    examples: [
      'Distribue 3 sacs d aliment au lot pondeuses A',
      'Aujourd hui les moutons ont consomme 50 kg d aliment',
    ],
    required_fields: ['target_name', 'product_name', 'quantity', 'unit', 'date'],
    related_forms: ['stock_product_selection', 'lot_or_animal_selection'],
    validation_required: true,
  },

  culture_activity: {
    label: 'Activite culture / maraichage',
    primary_module: 'cultures',
    form_type: 'culture_activity',
    impacted_modules: ['cultures', 'stock', 'finances', 'tracabilite', 'centre_ia'],
    examples: [
      'Enregistre semis tomate sur parcelle 1',
      'J ai recolte 40 kg de piment aujourd hui',
    ],
    required_fields: ['activity_type', 'culture_name', 'date'],
    optional_fields: ['quantity', 'unit', 'cost'],
    related_forms: ['culture_creation', 'stock_update'],
    validation_required: true,
  },

  equipment_maintenance: {
    label: 'Maintenance equipement',
    primary_module: 'equipements',
    form_type: 'equipment_maintenance',
    impacted_modules: ['equipements', 'finances', 'taches', 'tracabilite', 'centre_ia'],
    examples: [
      'Le groupe electrogene est en panne',
      'Programme maintenance pompe demain',
    ],
    required_fields: ['equipment_name', 'event_type', 'date'],
    optional_fields: ['cost', 'technician', 'priority'],
    related_forms: ['task_creation', 'finance_expense'],
    validation_required: true,
  },

  smartfarm_event: {
    label: 'Evenement Smart Farm',
    primary_module: 'smartfarm',
    form_type: 'smartfarm_event',
    impacted_modules: ['smartfarm', 'alertes', 'taches', 'tracabilite', 'centre_ia'],
    examples: [
      'Camera stock hors ligne',
      'Temperature poulailler 37 degres',
      'Presence humaine detectee au stock',
    ],
    required_fields: ['event_type', 'zone', 'date'],
    optional_fields: ['event_value', 'severity'],
    related_forms: ['alert_creation', 'task_creation'],
    validation_required: true,
  },

  task_creation: {
    label: 'Creation tache',
    primary_module: 'taches',
    form_type: 'task',
    impacted_modules: ['taches', 'tracabilite', 'centre_ia'],
    examples: [
      'Cree une tache pour verifier le stock demain',
      'Rappelle a Moussa de nettoyer le poulailler',
    ],
    required_fields: ['title', 'due_date'],
    optional_fields: ['assignee', 'priority', 'linked_module'],
    related_forms: ['employee_selection'],
    validation_required: true,
  },

  document_capture: {
    label: 'Document / justificatif',
    primary_module: 'documents',
    form_type: 'document',
    impacted_modules: ['documents', 'finances', 'fournisseurs', 'clients', 'tracabilite', 'centre_ia'],
    examples: [
      'Ajoute cette facture fournisseur',
      'Enregistre le recu de paiement client',
    ],
    required_fields: ['document_type', 'date'],
    optional_fields: ['linked_entity', 'amount', 'file'],
    related_forms: ['finance_link', 'supplier_or_client_link'],
    validation_required: true,
  },

  finance_entry: {
    label: 'Entree / sortie finance',
    primary_module: 'finances',
    form_type: 'finance_transaction',
    impacted_modules: ['finances', 'comptabilite', 'tracabilite', 'centre_ia'],
    examples: [
      'Enregistre une depense de 25000 FCFA pour transport',
      'J ai encaisse 50000 FCFA du client Fatou',
    ],
    required_fields: ['transaction_type', 'amount', 'date', 'category'],
    optional_fields: ['client_name', 'supplier_name', 'payment_method'],
    related_forms: ['client_creation', 'supplier_creation'],
    validation_required: true,
  },
};

export const getIntentConfig = (intent) => HORIZON_INTENT_CATALOG[intent] || null;

export const listHorizonIntents = () => Object.entries(HORIZON_INTENT_CATALOG).map(([key, value]) => ({
  key,
  ...value,
}));

export default HORIZON_INTENT_CATALOG;
