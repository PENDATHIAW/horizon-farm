/**
 * Modèle assistant création ferme — Phase 4 Multi-Fermes.
 */

import { FARM_ACTIVITY_KEYS } from './farmActivities.js';
import { buildFarmCreationSummary } from './farmAdaptation.js';

export const FARM_CREATION_STEPS = Object.freeze([
  { id: 'general', title: 'Informations générales' },
  { id: 'location', title: 'Localisation' },
  { id: 'activities', title: 'Activités' },
  { id: 'capacities', title: 'Capacités' },
  { id: 'finance', title: 'Paramètres financiers' },
  { id: 'commercial', title: 'Paramètres commerciaux' },
  { id: 'users', title: 'Utilisateurs' },
  { id: 'validation', title: 'Validation finale' },
]);

export const FARM_ACCESS_ROLE_LABELS = Object.freeze({
  direction: 'Direction',
  farm_manager: 'Responsable ferme',
  farm_accountant: 'Comptable',
  farm_agent: 'Agent terrain',
  farm_commercial: 'Commercial',
  farm_stock_manager: 'Responsable stock',
  farm_veterinary: 'Vétérinaire',
  farm_readonly: 'Lecture seule',
  super_admin: 'Super admin',
});

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
    buildings_count: null,
    target_lay_rate: null,
    mortality_alert_threshold: null,
    main_feed_type: '',
    egg_sale_unit: '',
    capacity_broilers: null,
    broiler_cycle_days: null,
    target_broiler_weight: null,
    broiler_mortality_threshold: null,
    broiler_sale_unit: '',
    capacity_cattle: null,
    cattle_cycle_days: null,
    avg_entry_weight: null,
    target_exit_weight: null,
    avg_purchase_price: null,
    target_sale_price: null,
    cultivable_surface: null,
    parcel_count: null,
    irrigation_type: '',
    planned_crops: [],
    target_yield: null,
    harvest_frequency: '',
    storage_capacity: null,
    storage_type: '',
    cold_storage: false,
    sensors_temperature: false,
    cameras: false,
    weather_station: false,
    water_monitoring: false,
    energy_monitoring: false,
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
    risk_tolerance: '',
  },
  commercial: {
    target_markets: [],
    delivery_zones: [],
    sales_channels: [],
    client_types: [],
    payment_terms: '',
    delivery_policy: '',
    default_price: null,
  },
  users: {
    assignments: [],
  },
});

const arr = (value) => (Array.isArray(value) ? value : []);

export function cloneFarmCreationDraft(draft = {}) {
  return JSON.parse(JSON.stringify({ ...EMPTY_FARM_CREATION_DRAFT, ...draft }));
}

export function validateFarmCreationStep(stepId = '', draft = {}) {
  if (stepId === 'general') {
    if (!String(draft.general?.name || '').trim()) return 'Le nom de la ferme est obligatoire.';
    return null;
  }
  if (stepId === 'activities') {
    if (!arr(draft.activities?.activity_type).length) return 'Sélectionnez au moins une activité.';
    return null;
  }
  return null;
}

export function getCapacityFieldsForActivities(activityTypes = []) {
  const activities = arr(activityTypes);
  const fields = [];
  const push = (key, label, type = 'number') => fields.push({ key, label, type });

  if (activities.includes('aviculture_pondeuses')) {
    push('capacity_layers', 'Capacité pondeuses');
    push('buildings_count', 'Nombre de bâtiments', 'number');
    push('target_lay_rate', 'Objectif taux ponte (%)');
    push('mortality_alert_threshold', 'Seuil mortalité alerte (%)');
    push('main_feed_type', 'Type aliment principal', 'text');
    push('egg_sale_unit', 'Unité de vente œufs', 'text');
  }
  if (activities.includes('poulets_chair')) {
    push('capacity_broilers', 'Capacité par bande');
    push('broiler_cycle_days', 'Durée cycle (jours)');
    push('target_broiler_weight', 'Poids cible (kg)');
    push('broiler_mortality_threshold', 'Seuil mortalité (%)');
    push('broiler_sale_unit', 'Unité de vente', 'text');
  }
  if (activities.includes('embouche_bovine')) {
    push('capacity_cattle', 'Capacité bovins');
    push('cattle_cycle_days', 'Durée cycle (jours)');
    push('avg_entry_weight', 'Poids entrée moyen (kg)');
    push('target_exit_weight', 'Poids sortie cible (kg)');
    push('avg_purchase_price', 'Prix achat moyen');
    push('target_sale_price', 'Prix vente cible');
  }
  if (activities.includes('cultures') || activities.includes('maraichage')) {
    push('cultivable_surface', 'Surface cultivable (ha)');
    push('parcel_count', 'Nombre de parcelles');
    push('irrigation_type', 'Type irrigation', 'text');
    push('target_yield', 'Rendement cible');
    push('harvest_frequency', 'Fréquence récolte', 'text');
  }
  if (activities.includes('stockage')) {
    push('storage_capacity', 'Capacité stockage');
    push('storage_type', 'Type stockage', 'text');
    fields.push({ key: 'cold_storage', label: 'Stockage froid', type: 'checkbox' });
  }
  if (activities.includes('smart_farm')) {
    fields.push({ key: 'sensors_temperature', label: 'Capteurs température', type: 'checkbox' });
    fields.push({ key: 'cameras', label: 'Caméras', type: 'checkbox' });
    fields.push({ key: 'weather_station', label: 'Station météo', type: 'checkbox' });
    fields.push({ key: 'water_monitoring', label: 'Suivi eau', type: 'checkbox' });
    fields.push({ key: 'energy_monitoring', label: 'Suivi énergie', type: 'checkbox' });
  }
  return fields;
}

/** Projection draft → payload table farms. */
export function buildFarmRecordFromCreationDraft(draft = {}, companyId, ownerUserId) {
  const general = draft.general || {};
  const location = draft.location || {};
  const activities = draft.activities || {};
  const capacities = draft.capacities || {};
  const finance = draft.finance || {};
  const commercial = draft.commercial || {};
  const users = draft.users || {};

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
      manager_name: general.manager_name,
      phone: general.phone,
      email: general.email,
      start_date: general.start_date,
      location_details: location,
      capacities,
      finance_settings: finance,
      commercial_settings: commercial,
      users,
      onboarding_progress: { step: 'completed', completed_at: new Date().toISOString() },
      preferred_units: {
        egg_sale_unit: capacities.egg_sale_unit,
        broiler_sale_unit: capacities.broiler_sale_unit,
      },
      risk_thresholds: {
        mortality_alert_threshold: capacities.mortality_alert_threshold,
        broiler_mortality_threshold: capacities.broiler_mortality_threshold,
        risk_tolerance: finance.risk_tolerance,
      },
    },
  };
}

export function buildFarmUpdateFromDraft(draft = {}) {
  const record = { ...buildFarmRecordFromCreationDraft(draft, null, null) };
  delete record.company_id;
  delete record.owner_user_id;
  delete record.is_default;
  return record;
}

export { buildFarmCreationSummary, FARM_ACTIVITY_KEYS };
