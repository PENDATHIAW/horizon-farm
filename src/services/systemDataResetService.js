import { supabase } from '../lib/supabase';

export const ERP_RESET_TABLES = [
  { key: 'animaux', label: 'Animaux' },
  { key: 'avicole', label: 'Lots avicoles' },
  { key: 'sante', label: 'Santé & vaccins' },
  { key: 'veterinaires', label: 'Vétérinaires' },
  { key: 'finances', label: 'Finances' },
  { key: 'investissements', label: 'Investissements' },
  { key: 'stock', label: 'Stock' },
  { key: 'clients', label: 'Clients' },
  { key: 'fournisseurs', label: 'Fournisseurs' },
  { key: 'tracabilite', label: 'Traçabilité' },
  { key: 'cultures', label: 'Cultures' },
  { key: 'documents', label: 'Documents' },
  { key: 'taches', label: 'Tâches' },
  { key: 'rapports', label: 'Rapports' },
  { key: 'equipements', label: 'Équipements' },
  { key: 'alimentation_logs', label: 'Logs alimentation' },
  { key: 'production_oeufs_logs', label: 'Logs œufs' },
  { key: 'business_events', label: 'Événements métier' },
  { key: 'alertes_center', label: 'Alertes' },
  { key: 'sales_orders', label: 'Commandes' },
  { key: 'sales_order_items', label: 'Lignes commandes' },
  { key: 'deliveries', label: 'Livraisons' },
  { key: 'invoices', label: 'Factures' },
  { key: 'payments', label: 'Paiements' },
  { key: 'sales_opportunities', label: 'Opportunités' },
  { key: 'audit_logs', label: 'Audit logs' },
];

export const PROTECTED_RESET_TABLES = [
  'profiles',
  'companies',
  'business_plans',
  'bp_investment_lines',
  'bp_recurring_costs',
  'bp_revenue_projections',
  'bp_funding_sources',
  'bp_links',
  'bp_risks',
];

export async function clearTableContent(tableKey) {
  if (!tableKey || PROTECTED_RESET_TABLES.includes(tableKey)) {
    throw new Error('Table protégée ou invalide');
  }
  const { error } = await supabase.from(tableKey).delete().neq('id', '__never__');
  if (error) throw error;
  return { tableKey, cleared: true };
}

export async function clearManyTables(tableKeys = [], { onProgress } = {}) {
  const results = [];
  for (const tableKey of tableKeys) {
    try {
      const result = await clearTableContent(tableKey);
      results.push(result);
      onProgress?.(result);
    } catch (error) {
      results.push({ tableKey, cleared: false, error: error.message });
      onProgress?.({ tableKey, cleared: false, error: error.message });
    }
  }
  return results;
}

export function clearLocalTombstones() {
  if (typeof window === 'undefined') return;
  Object.keys(window.localStorage)
    .filter((key) => key.startsWith('horizon_farm_deleted_ids:'))
    .forEach((key) => window.localStorage.removeItem(key));
}

export function clearLocalErpCache() {
  if (typeof window === 'undefined') return;
  Object.keys(window.localStorage)
    .filter((key) => key.startsWith('horizon_farm_') || key.startsWith('horizon-farm'))
    .forEach((key) => {
      if (!['horizon-farm-remember'].includes(key)) window.localStorage.removeItem(key);
    });
}
