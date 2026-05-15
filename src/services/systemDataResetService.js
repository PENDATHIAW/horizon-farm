import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';

export const ERP_RESET_TABLES = [
  { key: 'payments', label: 'Paiements' },
  { key: 'invoices', label: 'Factures' },
  { key: 'deliveries', label: 'Livraisons' },
  { key: 'sales_order_items', label: 'Lignes commandes' },
  { key: 'sales_orders', label: 'Commandes' },
  { key: 'sales_opportunities', label: 'Opportunités' },
  { key: 'documents', label: 'Documents' },
  { key: 'taches', label: 'Tâches' },
  { key: 'alertes_center', label: 'Alertes' },
  { key: 'business_events', label: 'Actions importantes' },
  { key: 'audit_logs', label: 'Activité' },
  { key: 'production_oeufs_logs', label: 'Production œufs' },
  { key: 'alimentation_logs', label: 'Alimentation' },
  { key: 'sante', label: 'Santé & vaccins' },
  { key: 'veterinaires', label: 'Vétérinaires' },
  { key: 'finances', label: 'Finances' },
  { key: 'stock', label: 'Stock' },
  { key: 'fournisseurs', label: 'Fournisseurs' },
  { key: 'clients', label: 'Clients' },
  { key: 'tracabilite', label: 'Traçabilité' },
  { key: 'cultures', label: 'Cultures' },
  { key: 'equipements', label: 'Équipements' },
  { key: 'sensor_devices', label: 'Capteurs' },
  { key: 'camera_devices', label: 'Caméras' },
  { key: 'whatsapp_logs', label: 'Messages WhatsApp' },
  { key: 'whatsapp_templates', label: 'Modèles WhatsApp' },
  { key: 'bp_risks', label: 'Risques business plan' },
  { key: 'bp_links', label: 'Liens business plan' },
  { key: 'bp_funding_sources', label: 'Financements business plan' },
  { key: 'bp_revenue_projections', label: 'Revenus business plan' },
  { key: 'bp_recurring_costs', label: 'Charges business plan' },
  { key: 'bp_investment_lines', label: 'Lignes investissement BP' },
  { key: 'business_plans', label: 'Business plans' },
  { key: 'investissements', label: 'Investissements' },
  { key: 'rapports', label: 'Rapports' },
  { key: 'avicole', label: 'Lots avicoles' },
  { key: 'animaux', label: 'Animaux' },
];

export const PROTECTED_RESET_TABLES = ['profiles', 'companies'];

const safeSheetName = (name = 'Feuille') => String(name).replace(/[\\/?*\[\]:]/g, ' ').slice(0, 31) || 'Feuille';
const normalizeRows = (rows = []) => rows.map((row) => Object.fromEntries(Object.entries(row || {}).map(([key, value]) => [key, typeof value === 'object' && value !== null ? JSON.stringify(value) : value])));

export async function fetchTableContent(tableKey) {
  const { data, error } = await supabase.from(tableKey).select('*');
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function exportErpDataToExcel({ fileName } = {}) {
  const workbook = XLSX.utils.book_new();
  const summary = [];
  const exportedAt = new Date().toISOString();

  for (const table of ERP_RESET_TABLES) {
    try {
      const rows = await fetchTableContent(table.key);
      summary.push({ espace: table.label, table: table.key, lignes: rows.length, statut: 'exporté' });
      const sheetRows = rows.length ? normalizeRows(rows) : [{ info: 'Aucune donnée', exported_at: exportedAt }];
      const worksheet = XLSX.utils.json_to_sheet(sheetRows);
      XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName(table.label));
    } catch (error) {
      summary.push({ espace: table.label, table: table.key, lignes: 0, statut: 'non exporté', erreur: error.message || String(error) });
      const worksheet = XLSX.utils.json_to_sheet([{ erreur: error.message || String(error), exported_at: exportedAt }]);
      XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName(`${table.label} erreur`));
    }
  }

  const summarySheet = XLSX.utils.json_to_sheet([{ export_realise_le: exportedAt }, ...summary]);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Résumé');
  const safeName = fileName || `horizon-farm-export-${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(workbook, safeName);
  return summary;
}

export async function clearTableContent(tableKey) {
  if (!tableKey || PROTECTED_RESET_TABLES.includes(tableKey)) throw new Error('Espace protégé ou invalide');
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

export async function clearAllErpData({ onProgress } = {}) {
  return clearManyTables(ERP_RESET_TABLES.map((table) => table.key), { onProgress });
}

export function clearLocalTombstones() {
  if (typeof window === 'undefined') return;
  Object.keys(window.localStorage).filter((key) => key.startsWith('horizon_farm_deleted_ids:')).forEach((key) => window.localStorage.removeItem(key));
}

export function clearLocalErpCache() {
  if (typeof window === 'undefined') return;
  Object.keys(window.localStorage).filter((key) => key.startsWith('horizon_farm_') || key.startsWith('horizon-farm')).forEach((key) => {
    if (!['horizon-farm-remember'].includes(key)) window.localStorage.removeItem(key);
  });
}
