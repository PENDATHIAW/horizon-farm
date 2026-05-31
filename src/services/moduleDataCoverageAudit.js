/**
 * Vérifie que les modules sources alimentent bien Centre / Objectifs / Accueil.
 * Signale les trous de données sans dupliquer les règles métier existantes.
 */
import { DATA_SOURCES_OF_TRUTH } from './dataSourcesOfTruth.js';

const arr = (v) => (Array.isArray(v) ? v : []);
const n = (v) => Number(v || 0);

const ENRICHED_ENGINES = ['centre_ia', 'objectifs_croissance', 'dashboard'];

const COVERAGE_CHECKS = [
  {
    id: 'sales_for_decisions',
    keys: ['sales_orders', 'salesOrders'],
    relatedKeys: ['clients'],
    module: 'commercial',
    severity: 'moyenne',
    title: 'Ventes absentes pour le pilotage',
    description: 'Centre / Objectifs / Accueil ont besoin des commandes clients.',
    action: 'Enregistrer des ventes dans Commercial',
  },
  {
    id: 'payments_for_bfr',
    keys: ['payments'],
    relatedKeys: ['sales_orders', 'salesOrders'],
    module: 'finance_pilotage',
    severity: 'moyenne',
    title: 'Encaissements absents',
    description: 'BFR et trésorerie ne peuvent pas être calculés sans paiements.',
    action: 'Relier ventes et encaissements dans Finance',
  },
  {
    id: 'production_for_ponte',
    keys: ['production_oeufs_logs', 'productionLogs'],
    relatedKeys: ['avicole', 'lots'],
    module: 'elevage',
    severity: 'moyenne',
    title: 'Logs ponte absents',
    description: 'La production œufs officielle vient de production_oeufs_logs.',
    action: 'Saisir la ponte dans Élevage → Production',
  },
  {
    id: 'feed_for_costs',
    keys: ['alimentation_logs', 'alimentationLogs'],
    relatedKeys: ['avicole', 'lots', 'animaux'],
    module: 'elevage',
    severity: 'basse',
    title: 'Distribution aliment non tracée',
    description: 'Coût aliment par lot et audit coulage nécessitent alimentation_logs.',
    action: 'Enregistrer les distributions dans Élevage → Alimentation',
  },
  {
    id: 'stock_for_coverage',
    keys: ['stock', 'stocks'],
    module: 'achats_stock',
    severity: 'moyenne',
    title: 'Stock vide',
    description: 'Couverture demande et alertes rupture nécessitent le référentiel stock.',
    action: 'Créer les produits dans Achats & Stock',
  },
];

function pickRows(data, keys = []) {
  for (const key of keys) {
    const value = data[key];
    if (Array.isArray(value) && value.length) return value;
  }
  return [];
}

function hasRelatedActivity(data, keys = []) {
  return keys.some((key) => arr(data[key]).length > 0);
}

export function evaluateModuleDataCoverage(data = {}) {
  const findings = [];

  COVERAGE_CHECKS.forEach((check) => {
    const rows = pickRows(data, check.keys);
    if (rows.length) return;
    if (check.relatedKeys && !hasRelatedActivity(data, check.relatedKeys)) return;

    const source = DATA_SOURCES_OF_TRUTH[check.keys[0]?.replace(/Logs$/, '').replace(/s$/, '')] || {};
    findings.push({
      id: `data-coverage-${check.id}`,
      module: check.module,
      severity: check.severity,
      category: 'data_coverage',
      title: check.title,
      description: check.description,
      recommended_action: check.action,
      confidence_score: 0.82,
      engines: ENRICHED_ENGINES,
      source_table: source.table || check.keys[0],
    });
  });

  const lots = arr(data.avicole || data.lots);
  const sales = arr(data.sales_orders || data.salesOrders);
  const lotSales = sales.filter((row) => row.lot_id || row.source_type === 'lot_avicole');
  if (lots.length && sales.length && !lotSales.length) {
    findings.push({
      id: 'data-coverage-lot-sales-link',
      module: 'commercial',
      severity: 'basse',
      category: 'data_coverage',
      title: 'Ventes non reliées aux lots avicoles',
      description: 'La rentabilité par bande nécessite lot_id sur les ventes chair/œufs.',
      recommended_action: 'Lier les ventes aux lots dans Commercial ou Avicole',
      confidence_score: 0.78,
    });
  }

  const finances = arr(data.finances || data.transactions);
  const docs = arr(data.documents);
  const expensesWithoutProof = finances.filter((trx) => {
    const type = String(trx.type || '').toLowerCase();
    if (!type.includes('sortie') && !type.includes('depense') && !type.includes('dépense')) return false;
    return n(trx.montant ?? trx.amount) > 0 && !trx.document_id && !trx.proof_url && !trx.justificatif_id;
  });
  if (expensesWithoutProof.length >= 3 && docs.length === 0) {
    findings.push({
      id: 'data-coverage-documents-empty',
      module: 'documents_rapports',
      severity: 'moyenne',
      category: 'data_coverage',
      title: 'Dépenses sans module Documents',
      description: `${expensesWithoutProof.length} dépense(s) sans preuve et bibliothèque documents vide.`,
      recommended_action: 'Créer Documents & Rapports et lier les justificatifs',
      confidence_score: 0.84,
    });
  }

  return findings;
}

export default evaluateModuleDataCoverage;
