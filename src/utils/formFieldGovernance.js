import { CIRCULAR_STOCK_CATEGORIES } from '../config/derfjGreenpreneurs.config.js';

const PAYMENT_OPTIONS = ['Cash', 'Banque', 'Wave', 'Orange Money', 'Free Money', 'Carte bancaire'];
const MODULE_OPTIONS = ['animaux', 'avicole', 'cultures', 'stock', 'finances', 'ventes', 'clients', 'fournisseurs', 'sante', 'documents', 'taches', 'equipements', 'smartfarm', 'rh', 'autre'];
const UNIT_OPTIONS = ['kg', 'sac', 'carton', 'plateau', 'tete', 'unite', 'litre', 'botte', 'caisse', 'm2', 'hectare'];
const STOCK_CATEGORY_OPTIONS = ['aliment_betail', 'aliment_volaille', 'semence', 'engrais', 'traitement', 'pharmacie', 'emballage', 'materiel', 'produit_fini', 'carburant', 'autre', ...CIRCULAR_STOCK_CATEGORIES];
const CLIENT_TYPE_OPTIONS = ['particulier', 'restaurant', 'boutique', 'grossiste', 'revendeur', 'institution', 'partenaire', 'autre'];
const SUPPLIER_CATEGORY_OPTIONS = ['aliments', 'poussins', 'animaux', 'intrants_cultures', 'veterinaire', 'transport', 'equipements', 'energie', 'services', 'autre'];
const ENTITY_TYPE_OPTIONS = ['animal', 'lot_avicole', 'culture', 'stock', 'transaction', 'vente', 'client', 'fournisseur', 'document', 'equipement', 'tache', 'alerte', 'autre'];
const EVENT_TYPE_OPTIONS = ['achat', 'vente', 'paiement', 'depense', 'alimentation', 'soin', 'vaccination', 'production_oeufs', 'recolte', 'perte', 'maintenance', 'document_ajoute', 'alerte', 'audit_interconnexion_repare', 'autre'];
const ZONE_OPTIONS = ['poulailler', 'parc_bovins', 'magasin_stock', 'parcelle_cultures', 'salle_ponte', 'zone_quarantaine', 'entree_principale', 'autre'];

const OVERRIDES = {
  stock: {
    produit: { required: true },
    categorie: { type: 'select', options: STOCK_CATEGORY_OPTIONS, required: true },
    unite: { type: 'select', options: UNIT_OPTIONS, required: true },
    quantite: { required: true },
    seuil: { required: true },
  },
  clients: {
    tel: { required: true },
    type: { type: 'select', options: CLIENT_TYPE_OPTIONS, required: true },
    statut: { required: true },
  },
  fournisseurs: {
    tel: { required: true },
    categorie: { type: 'select', options: SUPPLIER_CATEGORY_OPTIONS, required: true },
    statut: { required: true },
  },
  finances: {
    type: { required: true },
    date: { required: true },
    categorie: { required: true },
    module_lie: { type: 'select', options: MODULE_OPTIONS, required: true },
    paiement: { type: 'select', options: PAYMENT_OPTIONS, required: true },
  },
  ventes: {
    client_id: { required: true },
    produit: { required: true },
    paiement: { type: 'select', options: PAYMENT_OPTIONS },
  },
  sales_orders: {
    client_id: { required: true },
    type_document: { required: true },
    moyen_paiement: { type: 'select', options: PAYMENT_OPTIONS },
    statut_commande: { required: true },
    statut_paiement: { required: true },
    statut_livraison: { required: true },
  },
  sales_order_items: {
    source_type: { required: true },
    product_name: { required: true },
    unit: { type: 'select', options: UNIT_OPTIONS, required: true },
  },
  documents: {
    document_category: { required: true },
    file_type: { required: true },
    module_source: { type: 'select', options: MODULE_OPTIONS, required: true },
    entity_type: { type: 'select', options: ENTITY_TYPE_OPTIONS, required: true },
    entity_id: { required: true },
  },
  erp_documents: {
    document_type: { required: true },
    module_lie: { type: 'select', options: MODULE_OPTIONS, required: true },
    related_id: { required: true },
  },
  taches: {
    module_lie: { type: 'select', options: MODULE_OPTIONS, required: true },
    assigned_to: { required: true },
    due_date: { required: true },
    priority: { required: true },
    status: { required: true },
  },
  alertes_center: {
    module_source: { type: 'select', options: MODULE_OPTIONS, required: true },
    entity_type: { type: 'select', options: ENTITY_TYPE_OPTIONS, required: true },
    severity: { required: true },
    status: { required: true },
    action_recommandee: { required: true },
  },
  business_events: {
    event_type: { type: 'select', options: EVENT_TYPE_OPTIONS, required: true },
    module_source: { type: 'select', options: MODULE_OPTIONS, required: true },
    entity_type: { type: 'select', options: ENTITY_TYPE_OPTIONS, required: true },
    event_date: { required: true },
    severity: { required: true },
  },
  alimentation_logs: {
    date: { required: true },
    produit: { required: true },
    categorie: { required: true },
    type_cible: { required: true },
    quantite: { required: true },
    unite: { type: 'select', options: UNIT_OPTIONS, required: true },
    fournisseur_id: { required: true },
  },
  production_oeufs_logs: {
    lot_id: { required: true },
    oeufs_produits: { required: true },
  },
  sensor_devices: {
    type: { required: true },
    zone: { type: 'select', options: ZONE_OPTIONS, required: true },
    status: { required: true },
  },
  camera_devices: {
    zone: { type: 'select', options: ZONE_OPTIONS, required: true },
    type: { required: true },
    status: { required: true },
  },
  equipements: {
    type: { required: true },
    status: { required: true },
    maintenance_due: { required: true },
  },
  audit_logs: {
    action: { type: 'select', options: ['create', 'update', 'delete', 'login', 'export', 'sync', 'repair', 'autre'] },
    module: { type: 'select', options: MODULE_OPTIONS },
  },
};

export function governFormFields(moduleKey, fields = []) {
  const overrides = OVERRIDES[moduleKey] || {};
  return fields.map((field) => ({ ...field, ...(overrides[field.key] || {}) }));
}

export function applyGovernedDefaults(moduleKey, values = {}) {
  const defaults = {
    stock: { categorie: 'aliment_volaille', unite: 'kg', seuil: 0 },
    clients: { type: 'particulier', statut: 'actif' },
    fournisseurs: { categorie: 'aliments', statut: 'actif' },
    taches: { priority: 'normale', status: 'a_faire' },
    alertes_center: { severity: 'warning', status: 'nouvelle' },
    business_events: { severity: 'info', event_type: 'autre', module_source: 'autre', entity_type: 'autre' },
    documents: { document_category: 'facture', file_type: 'pdf', module_source: 'autre', entity_type: 'autre' },
    sensor_devices: { zone: 'poulailler', status: 'simulation' },
    camera_devices: { zone: 'entree_principale', status: 'simulation' },
  };
  return { ...(defaults[moduleKey] || {}), ...values };
}
