/**
 * Modèle assistant création ferme — Phase 2 (conception uniquement).
 * Structure cible pour un futur wizard multi-étapes.
 */

export const FARM_CREATION_STEPS = Object.freeze([
  {
    id: 'general',
    title: 'Informations générales',
    fields: [
      'name',
      'legal_name',
      'legal_entity_type',
      'registration_number',
      'manager_name',
      'phone',
      'email',
      'description',
      'status',
      'start_date',
    ],
  },
  {
    id: 'location',
    title: 'Localisation',
    fields: [
      'country',
      'region',
      'department',
      'commune',
      'address',
      'latitude',
      'longitude',
      'surface_area',
      'water_access',
      'electricity_access',
      'road_access',
    ],
  },
  {
    id: 'activities',
    title: 'Activités',
    fields: ['activity_type'],
  },
  {
    id: 'capacities',
    title: 'Capacités',
    fields: [
      'capacity_layers',
      'capacity_broilers',
      'capacity_cattle',
      'parcel_count',
      'cultivable_surface',
      'storage_capacity',
      'buildings_available',
    ],
  },
  {
    id: 'finance',
    title: 'Paramètres financiers',
    fields: [
      'currency',
      'startup_budget',
      'available_capital',
      'funding_need',
      'annual_revenue_target',
      'margin_target',
      'primary_bank',
    ],
  },
  {
    id: 'commercial',
    title: 'Paramètres commerciaux',
    fields: [
      'target_markets',
      'delivery_zones',
      'sales_channels',
      'payment_terms',
      'client_types',
    ],
  },
  {
    id: 'users',
    title: 'Utilisateurs',
    fields: [
      'farm_manager_user_id',
      'field_agents',
      'accountant_user_id',
      'commercial_user_id',
      'veterinary_user_id',
      'stock_manager_user_id',
    ],
  },
  {
    id: 'documents',
    title: 'Documents',
    fields: [
      'ninea',
      'rccm',
      'lease_or_title',
      'authorizations',
      'quotes',
      'site_photos',
      'supplier_contracts',
      'client_contracts',
    ],
  },
]);

export const EMPTY_FARM_CREATION_DRAFT = Object.freeze({
  general: {
    name: '',
    legal_name: '',
    legal_entity_type: '',
    registration_number: '',
    manager_name: '',
    phone: '',
    email: '',
    description: '',
    status: 'active',
    start_date: '',
  },
  location: {
    country: 'SN',
    region: '',
    department: '',
    commune: '',
    address: '',
    latitude: null,
    longitude: null,
    surface_area: null,
    water_access: '',
    electricity_access: '',
    road_access: '',
  },
  activities: {
    activity_type: [],
  },
  capacities: {
    capacity_layers: null,
    capacity_broilers: null,
    capacity_cattle: null,
    parcel_count: null,
    cultivable_surface: null,
    storage_capacity: null,
    buildings_available: null,
  },
  finance: {
    currency: 'XOF',
    startup_budget: null,
    available_capital: null,
    funding_need: null,
    annual_revenue_target: null,
    margin_target: null,
    primary_bank: '',
  },
  commercial: {
    target_markets: [],
    delivery_zones: [],
    sales_channels: [],
    payment_terms: '',
    client_types: [],
  },
  users: {
    farm_manager_user_id: null,
    field_agents: [],
    accountant_user_id: null,
    commercial_user_id: null,
    veterinary_user_id: null,
    stock_manager_user_id: null,
  },
  documents: {
    ninea: null,
    rccm: null,
    lease_or_title: null,
    authorizations: [],
    quotes: [],
    site_photos: [],
    supplier_contracts: [],
    client_contracts: [],
  },
});

/** Projection draft → payload table farms (Phase future). */
export function buildFarmRecordFromCreationDraft(draft = {}, companyId, ownerUserId) {
  const general = draft.general || {};
  const location = draft.location || {};
  const activities = draft.activities || {};
  const capacities = draft.capacities || {};
  const finance = draft.finance || {};
  const commercial = draft.commercial || {};

  return {
    company_id: companyId,
    owner_user_id: ownerUserId,
    name: general.name,
    legal_name: general.legal_name || general.name,
    legal_entity_type: general.legal_entity_type,
    registration_number: general.registration_number,
    location: location.address || location.commune || '',
    region: location.region,
    country: location.country || 'SN',
    latitude: location.latitude,
    longitude: location.longitude,
    activity_type: activities.activity_type || [],
    status: general.status || 'active',
    is_default: false,
    settings: {
      description: general.description,
      start_date: general.start_date,
      location,
      capacities,
      finance,
      commercial,
      documents: draft.documents || {},
      users: draft.users || {},
    },
  };
}
