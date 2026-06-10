/**
 * Achats & Stock V3 — qualité des données stock (gaps explicites).
 */

import { buildExpirySnapshot } from './stockExpiry.js';

const arr = (v) => (Array.isArray(v) ? v : []);
const n = (v = 0) => Number(v || 0) || 0;
const clean = (v) => String(v || '').trim();
const threshold = (r = {}) => n(r.seuil ?? r.threshold ?? r.stock_min ?? r.minimum_stock);
const unitCost = (r = {}) => n(r.prix_unitaire ?? r.unit_price ?? r.price ?? r.cout_unitaire ?? r.cmup);
const label = (r = {}) => r.produit || r.name || r.nom || r.id || 'Article';

export function buildStockDataQualitySnapshot({
  stocks = [],
  stockMovements = [],
  santeRecords = [],
  productionLogs = [],
  suppliers = [],
  transactions = [],
} = {}) {
  const issues = [];

  arr(stocks).forEach((row) => {
    const id = clean(row.id);
    if (!id) return;
    const name = label(row);
    if (!row.unite && !row.unit) {
      issues.push({ id: `no-unit-${id}`, category: 'article', severity: 'moyenne', title: `${name} — sans unité`, detail: 'CMUP et conversions agricoles incomplets.' });
    }
    if (threshold(row) <= 0) {
      issues.push({ id: `no-threshold-${id}`, category: 'article', severity: 'faible', title: `${name} — sans seuil`, detail: 'Alertes rupture et réappro non fiables.' });
    }
    if (unitCost(row) <= 0) {
      issues.push({ id: `no-cost-${id}`, category: 'article', severity: 'moyenne', title: `${name} — sans coût`, detail: 'Valorisation stock et marges incomplètes.' });
    }
    if (!clean(row.farm_id)) {
      issues.push({ id: `no-farm-${id}`, category: 'article', severity: 'moyenne', title: `${name} — sans ferme`, detail: 'Scope multi-fermes et transferts limités.' });
    }
  });

  arr(stockMovements).forEach((row, idx) => {
    if (!clean(row.stock_id)) {
      issues.push({
        id: `mvt-no-stock-${row.id || idx}`,
        category: 'mouvement',
        severity: 'haute',
        title: 'Mouvement sans stock_id',
        detail: row.notes || row.movement_ref || row.id || 'Mouvement orphelin',
      });
    }
  });

  arr(santeRecords).forEach((row) => {
    const used = n(row.quantite_utilisee ?? row.quantite_stock);
    const fromStock = clean(row.product_source) === 'stock' || clean(row.stock_id);
    if (used > 0 && fromStock && !clean(row.stock_id)) {
      issues.push({
        id: `sante-no-stock-${row.id}`,
        category: 'consommation',
        severity: 'moyenne',
        title: `Santé sans stock_id : ${row.nom || row.id}`,
        detail: 'Consommation santé non rattachée au stock : stock_id absent.',
      });
    }
  });

  arr(productionLogs).forEach((row) => {
    const tablets = n(row.tablettes ?? row.tablettes_vendables);
    if (tablets > 0 && !clean(row.packaging_stock_id) && !row.packaging_gap_noted) {
      issues.push({
        id: `egg-pack-gap-${row.id}`,
        category: 'consommation',
        severity: 'faible',
        title: `Emballage œufs non tracé : ${row.lot_id || row.id}`,
        detail: 'Pour tracer les emballages, rattacher un article stock emballage à cette production.',
      });
    }
  });

  const expiry = buildExpirySnapshot(stocks);
  expiry.soon.slice(0, 5).forEach((row) => {
    issues.push({
      id: `expiry-${row.id}`,
      category: 'peremption',
      severity: row.daysLeft <= 3 ? 'haute' : 'moyenne',
      title: `Péremption proche : ${row.label}`,
      detail: `${row.daysLeft} jour(s) — action recommandée`,
    });
  });

  const hasFarmScope = arr(transactions).some((trx) => clean(trx.farm_id));
  arr(suppliers).forEach((sup) => {
    const debt = n(sup.dettes ?? sup.dette ?? sup.solde ?? sup.balance);
    if (debt > 0 && hasFarmScope && !arr(sup.farm_debts || sup.dettes_par_ferme).length) {
      const name = sup.nom || sup.name || sup.id || 'Fournisseur';
      issues.push({
        id: `debt-scope-${sup.id || name}`,
        category: 'fournisseur',
        severity: 'faible',
        title: `Dette non ventilée : ${name}`,
        detail: 'Historique sans ventilation par ferme — totaux multi-fermes approximatifs.',
      });
    }
  });

  const byCategory = issues.reduce((acc, issue) => {
    acc[issue.category] = (acc[issue.category] || 0) + 1;
    return acc;
  }, {});

  return {
    issues: issues.slice(0, 24),
    totalIssues: issues.length,
    byCategory,
    hasBlocking: issues.some((issue) => issue.severity === 'haute'),
  };
}
