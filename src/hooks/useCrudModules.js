import { useMemo } from 'react';
import useCrudModule from './useCrudModule';

export default function useCrudModules() {
  const animaux = useCrudModule('animaux');
  const avicole = useCrudModule('avicole');
  const sante = useCrudModule('sante');
  const veterinaires = useCrudModule('veterinaires');
  const finances = useCrudModule('finances');
  const investissements = useCrudModule('investissements');
  const business_plans = useCrudModule('business_plans');
  const bp_investment_lines = useCrudModule('bp_investment_lines');
  const bp_recurring_costs = useCrudModule('bp_recurring_costs');
  const bp_revenue_projections = useCrudModule('bp_revenue_projections');
  const bp_funding_sources = useCrudModule('bp_funding_sources');
  const bp_links = useCrudModule('bp_links');
  const bp_risks = useCrudModule('bp_risks');
  const stock = useCrudModule('stock');
  const clients = useCrudModule('clients');
  const fournisseurs = useCrudModule('fournisseurs');
  const tracabilite = useCrudModule('tracabilite');
  const cultures = useCrudModule('cultures');
  const documents = useCrudModule('documents');
  const taches = useCrudModule('taches');
  const rapports = useCrudModule('rapports');
  const equipements = useCrudModule('equipements');
  const audit_logs = useCrudModule('audit_logs');
  const alimentation_logs = useCrudModule('alimentation_logs');
  const production_oeufs_logs = useCrudModule('production_oeufs_logs');
  const sensor_devices = useCrudModule('sensor_devices');
  const camera_devices = useCrudModule('camera_devices');
  const smartfarm_events = useCrudModule('smartfarm_events');
  const business_events = useCrudModule('business_events');
  const alertes_center = useCrudModule('alertes_center');
  const whatsapp_templates = useCrudModule('whatsapp_templates');
  const whatsapp_logs = useCrudModule('whatsapp_logs');
  const sales_orders = useCrudModule('sales_orders');
  const sales_order_items = useCrudModule('sales_order_items');
  const deliveries = useCrudModule('deliveries');
  const invoices = useCrudModule('invoices');
  const payments = useCrudModule('payments');
  const sales_opportunities = useCrudModule('sales_opportunities');
  const stock_movements = useCrudModule('stock_movements');
  const feed_raw_materials = useCrudModule('feed_raw_materials');
  const feed_raw_batches = useCrudModule('feed_raw_batches');
  const feed_formulas = useCrudModule('feed_formulas');
  const feed_formula_versions = useCrudModule('feed_formula_versions');
  const feed_formula_ingredients = useCrudModule('feed_formula_ingredients');
  const feed_facility_zones = useCrudModule('feed_facility_zones');
  const feed_production_orders = useCrudModule('feed_production_orders');
  const feed_finished_batches = useCrudModule('feed_finished_batches');
  const feed_quality_checks = useCrudModule('feed_quality_checks');

  return useMemo(() => ({
    animaux,
    avicole,
    sante,
    veterinaires,
    finances,
    investissements,
    business_plans,
    bp_investment_lines,
    bp_recurring_costs,
    bp_revenue_projections,
    bp_funding_sources,
    bp_links,
    bp_risks,
    stock,
    clients,
    fournisseurs,
    tracabilite,
    cultures,
    documents,
    taches,
    rapports,
    equipements,
    audit_logs,
    alimentation_logs,
    production_oeufs_logs,
    sensor_devices,
    camera_devices,
    smartfarm_events,
    business_events,
    alertes_center,
    whatsapp_templates,
    whatsapp_logs,
    sales_orders,
    sales_order_items,
    deliveries,
    invoices,
    payments,
    sales_opportunities,
    stock_movements,
    feed_raw_materials,
    feed_raw_batches,
    feed_formulas,
    feed_formula_versions,
    feed_formula_ingredients,
    feed_facility_zones,
    feed_production_orders,
    feed_finished_batches,
    feed_quality_checks,
  }), [
    animaux,
    avicole,
    sante,
    veterinaires,
    finances,
    investissements,
    business_plans,
    bp_investment_lines,
    bp_recurring_costs,
    bp_revenue_projections,
    bp_funding_sources,
    bp_links,
    bp_risks,
    stock,
    clients,
    fournisseurs,
    tracabilite,
    cultures,
    documents,
    taches,
    rapports,
    equipements,
    audit_logs,
    alimentation_logs,
    production_oeufs_logs,
    sensor_devices,
    camera_devices,
    smartfarm_events,
    business_events,
    alertes_center,
    whatsapp_templates,
    whatsapp_logs,
    sales_orders,
    sales_order_items,
    deliveries,
    invoices,
    payments,
    sales_opportunities,
    stock_movements,
    feed_raw_materials,
    feed_raw_batches,
    feed_formulas,
    feed_formula_versions,
    feed_formula_ingredients,
    feed_facility_zones,
    feed_production_orders,
    feed_finished_batches,
    feed_quality_checks,
  ]);
}
