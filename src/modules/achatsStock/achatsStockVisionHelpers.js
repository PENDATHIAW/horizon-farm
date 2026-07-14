import { runErpHealthEngine } from '../../services/erpHealthEngine.js';
import { fmtCurrency } from '../../utils/format.js';
import { buildProductionCoherenceAlerts } from '../../utils/productionStockCatalog.js';
import { aggregateSupplierDebtsForScope } from '../../utils/supplierDebtByFarm.js';
import { buildExpirySnapshot } from '../../utils/stockExpiry.js';

const arr = (v) => (Array.isArray(v) ? v : []);
const n = (v = 0) => Number(v || 0);
const low = (v) => String(v || '').toLowerCase();
const qty = (r = {}) => n(r.quantite ?? r.quantity ?? r.stock);
const threshold = (r = {}) => n(r.seuil ?? r.threshold ?? r.stock_min ?? r.minimum_stock);
const amount = (r = {}) => n(r.montant ?? r.amount ?? r.total ?? r.montant_total);
const label = (r = {}) => r.produit || r.name || r.nom || r.libelle || r.title || 'Produit';
const supplierDebt = (r = {}) => n(r.dettes ?? r.dette ?? r.solde ?? r.balance ?? r.reste_a_payer);
const isPurchaseTx = (r = {}) => /achat|stock|fournisseur|approvisionnement|reception|réception/.test(low(`${r.type || ''} ${r.categorie || ''} ${r.category || ''} ${r.libelle || ''} ${r.title || ''} ${r.module_lie || ''} ${r.source_module || ''}`));

export function buildAchatsStockHealthSnapshot({ stocks = [], suppliers = [], transactions = [], feedLogs = [] }) {
  const data = { stock: stocks, stocks, fournisseurs: suppliers, finances: transactions, transactions, alimentation_logs: feedLogs };
  const health = runErpHealthEngine(data);
  return {
    score: health.score,
    findings: health.findings.filter((f) => f.module === 'achats_stock'),
    predictions: health.predictions.filter((p) => p.module === 'achats_stock'),
    risks: health.risks.filter((r) => r.domain === 'stock' || r.domain === 'fournisseur' || r.module === 'achats_stock'),
  };
}

export function buildAchatsStockCoherenceRows(stocks = [], transactions = [], suppliers = [], lots = [], animaux = [], cultures = []) {
  const rows = [];
  const purchases = arr(transactions).filter(isPurchaseTx);

  purchases.forEach((trx) => {
    const linked = stocks.some((s) => String(s.last_purchase_id || s.source_id) === String(trx.id)) || trx.stock_impact === true;
    if (!linked && amount(trx) > 0) {
      rows.push({
        id: `purchase-${trx.id}`,
        trxId: trx.id,
        type: 'achat_stock',
        title: `Achat sans entrée stock : ${trx.libelle || trx.id}`,
        detail: fmtCurrency(amount(trx)),
        finding: {
          id: `coh-purchase-no-stock-${trx.id}`,
          module: 'achats_stock',
          severity: 'moyenne',
          auto_action: 'create_alert',
          title: `Achat sans impact stock : ${trx.libelle || trx.id}`,
          description: 'Aucun mouvement stock lié',
          recommended_action: 'Enregistrer entrée stock',
          confidence_score: 0.9,
        },
      });
    }
  });

  stocks.forEach((row) => {
    const th = threshold(row);
    const q = qty(row);
    if (th > 0 && q <= th) {
      rows.push({
        id: `low-${row.id || label(row)}`,
        stockId: row.id,
        type: 'seuil',
        title: `${label(row)} sous seuil`,
        detail: `${q} / seuil ${th}`,
        finding: {
          id: `stock-low-${row.id}`,
          module: 'achats_stock',
          severity: q <= 0 ? 'haute' : 'moyenne',
          auto_action: 'create_task',
          title: `Stock faible : ${label(row)}`,
          description: `${q} disponible · seuil ${th}`,
          recommended_action: 'Réapprovisionner ou créer une alerte stock',
          confidence_score: 0.88,
        },
      });
    }
  });

  suppliers.forEach((sup) => {
    const debt = supplierDebt(sup);
    if (debt > 0) {
      const name = sup.nom || sup.name || sup.raison_sociale || sup.id || 'Fournisseur';
      rows.push({
        id: `debt-${sup.id || name}`,
        supplierId: sup.id,
        type: 'dette',
        title: `${name} - dette`,
        detail: fmtCurrency(debt),
        value: debt,
        finding: {
          id: `sup-debt-${sup.id || name}`,
          module: 'achats_stock',
          severity: debt > 500000 ? 'haute' : 'moyenne',
          auto_action: 'create_task',
          title: `Dette fournisseur : ${name}`,
          description: `Solde ${debt} FCFA`,
          recommended_action: 'Planifier paiement ou négocier échéance',
          confidence_score: 0.87,
        },
      });
    }
  });

  buildProductionCoherenceAlerts({ stocks, lots, animaux, cultures }).forEach((alert) => {
    rows.push({
      id: alert.id,
      type: 'production_stock',
      title: alert.title,
      detail: alert.detail,
      finding: {
        id: alert.id,
        module: alert.module || 'achats_stock',
        severity: alert.severity === 'red' ? 'haute' : 'moyenne',
        auto_action: 'create_alert',
        title: alert.title,
        description: alert.detail,
        recommended_action: alert.module === 'cultures' ? 'Ouvrir Cultures' : 'Ouvrir Élevage',
        confidence_score: alert.severity === 'red' ? 0.9 : 0.82,
      },
    });
  });

  return rows.sort((a, b) => (b.value || 0) - (a.value || 0));
}

export function aggregateSupplierDebts(suppliers = [], transactions = [], farmScope = {}, accessibleFarms = []) {
  if (transactions.length || farmScope?.mode) {
    return aggregateSupplierDebtsForScope(suppliers, transactions, farmScope, accessibleFarms);
  }
  return arr(suppliers)
    .map((sup) => {
      const debt = supplierDebt(sup);
      if (debt <= 0) return null;
      const name = sup.nom || sup.name || sup.raison_sociale || String(sup.id || 'Fournisseur');
      return { id: sup.id, name, total: debt };
    })
    .filter(Boolean)
    .sort((a, b) => b.total - a.total);
}

export function isAchatsStockStartupMode({ stocks = [], suppliers = [], purchases = [] } = {}) {
  return !arr(stocks).length && !arr(suppliers).length && !arr(purchases).length;
}

const hasProof = (trx = {}, documents = []) => {
  if (trx.document_id || trx.proof_id) return true;
  return arr(documents).some((doc) => String(doc.finance_id || doc.transaction_id) === String(trx.id));
};

export function buildAchatsStockOperationalData({
  documents = [],
  stockMovements = [],
  purchases = [],
  purchasesWithoutStock = [],
  supplierDebts = [],
  lowStock = [],
} = {}) {
  const recentReceptions = arr(stockMovements)
    .filter((row) => row.movement_type === 'entree')
    .sort((a, b) => String(b.movement_date || b.created_at).localeCompare(String(a.movement_date || a.created_at)))
    .slice(0, 8);

  const unpaidPurchases = arr(purchases).filter((trx) => {
    const status = low(`${trx.statut || trx.status || trx.statut_paiement}`);
    return ['impaye', 'impayé', 'a_payer', 'credit', 'non_paye', 'partiel'].some((s) => status.includes(s));
  });

  const purchasesWithoutProof = arr(purchases).filter((trx) => !hasProof(trx, documents) && amount(trx) > 0);

  const suppliersToContact = arr(supplierDebts)
    .filter((row) => n(row.total) > 0)
    .slice(0, 6);

  return {
    recentReceptions,
    unpaidPurchases,
    purchasesWithoutProof,
    suppliersToContact,
    restockNeeds: arr(lowStock).slice(0, 8),
    purchasesWithoutStock: arr(purchasesWithoutStock),
  };
}

export function buildStartupProgress({
  stocks = [],
  suppliers = [],
  purchases = [],
  documents = [],
  stockMovements = [],
} = {}) {
  const hasSupplier = arr(suppliers).length > 0;
  const hasArticle = arr(stocks).length > 0;
  const hasUnit = arr(stocks).some((row) => row.unite || row.unit);
  const hasThreshold = arr(stocks).some((row) => threshold(row) > 0);
  const hasReception = arr(stockMovements).some((row) => row.movement_type === 'entree') || arr(purchases).length > 0;
  const hasProof = arr(documents).some((doc) => /stock|achat|fournisseur|facture/.test(low(`${doc.module_source} ${doc.document_category} ${doc.title}`)));
  const hasSellable = arr(stocks).some((row) => row.vendable === true || row.is_sellable === true);
  const hasCommercialLink = arr(stocks).some((row) => row.commercial_ready || row.published_commercial);
  const hasCriticalWatch = arr(stocks).some((row) => threshold(row) > 0);

  const steps = [
    { id: 'supplier', label: 'Créer fournisseur', done: hasSupplier, tab: 'Fournisseurs' },
    { id: 'article', label: 'Créer article', done: hasArticle, tab: 'Stock' },
    { id: 'unit', label: 'Définir unité', done: hasUnit, tab: 'Stock' },
    { id: 'threshold', label: 'Définir seuil minimum', done: hasThreshold, tab: 'Stock' },
    { id: 'reception', label: 'Enregistrer réception', done: hasReception, tab: 'Stock' },
    { id: 'proof', label: 'Ajouter preuve', done: hasProof, tab: 'Annexe' },
    { id: 'sellable', label: 'Vérifier stock vendable', done: hasSellable, tab: 'Stock' },
    { id: 'commercial', label: 'Connecter Commercial', done: hasCommercialLink, tab: 'Stock', navigate: 'commercial' },
    { id: 'watch', label: 'Surveiller stock critique', done: hasCriticalWatch, tab: 'Stock' },
  ];

  const completed = steps.filter((step) => step.done).length;
  const nextStep = steps.find((step) => !step.done) || null;

  return { steps, completed, total: steps.length, nextStep, percent: Math.round((completed / steps.length) * 100) };
}

/** Recommandations stock utiles (sans LLM). */
export function buildStockIaRecommendations({
  stocks = [],
  stockMovements = [],
  purchases = [],
  documents = [],
  lowStock = [],
  supplierDebts = [],
} = {}) {
  const recs = [];

  arr(lowStock).slice(0, 3).forEach((row) => {
    recs.push({
      id: `ia-low-${row.id}`,
      title: `Rupture imminente : ${label(row)}`,
      description: `${qty(row)} restant · seuil ${threshold(row)}`,
      recommended_action: 'Réapprovisionner',
      severity: qty(row) <= 0 ? 'haute' : 'moyenne',
      auto_action: 'create_task',
      module: 'achats_stock',
    });
  });

  const expiry = buildExpirySnapshot(stocks);
  expiry.soon.slice(0, 2).forEach((row) => {
    recs.push({
      id: `ia-expiry-${row.id}`,
      title: `Péremption proche : ${row.label}`,
      description: `${row.daysLeft} jour(s) restant(s)`,
      recommended_action: row.recommended.label,
      severity: 'moyenne',
      auto_action: row.recommended.action === 'create_alert' ? 'create_alert' : null,
      module: 'achats_stock',
    });
  });

  arr(purchases).filter((trx) => !hasProof(trx, documents) && amount(trx) > 0).slice(0, 2).forEach((trx) => {
    recs.push({
      id: `ia-proof-${trx.id}`,
      title: 'Achat sans preuve',
      description: trx.libelle || trx.id,
      recommended_action: 'Ajouter preuve document',
      severity: 'moyenne',
      module: 'achats_stock',
    });
  });

  arr(stocks).forEach((row) => {
    const q = qty(row);
    const th = threshold(row);
    if (th > 0 && q > th * 4) {
      recs.push({
        id: `ia-over-${row.id}`,
        title: `Surstock : ${label(row)}`,
        description: `${q} u. · seuil ${th}`,
        recommended_action: 'Réduire les commandes ou promouvoir la vente',
        severity: 'moyenne',
        module: 'achats_stock',
      });
    }
    const lastMove = arr(stockMovements).filter((m) => String(m.stock_id) === String(row.id)).sort((a, b) => String(b.movement_date).localeCompare(String(a.movement_date)))[0];
    if (q > 0 && (!lastMove || String(lastMove.movement_date).localeCompare(new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10)) < 0)) {
      recs.push({
        id: `ia-dormant-${row.id}`,
        title: `Stock dormant : ${label(row)}`,
        description: 'Aucun mouvement récent (90 j)',
        recommended_action: 'Vérifier utilité ou vendre',
        severity: 'moyenne',
        module: 'achats_stock',
      });
    }
  });

  arr(supplierDebts).slice(0, 1).forEach((sup) => {
    const sameSupplierPurchases = arr(purchases).filter((trx) => low(trx.libelle || '').includes(low(sup.name)));
    if (sameSupplierPurchases.length >= 2) {
      const amounts = sameSupplierPurchases.map((trx) => amount(trx)).filter((v) => v > 0);
      if (amounts.length >= 2 && amounts[0] > amounts[1] * 1.15) {
        recs.push({
          id: `ia-price-${sup.id}`,
          title: `Hausse prix fournisseur : ${sup.name}`,
          description: 'Dernier achat supérieur de >15 % au précédent',
          recommended_action: 'Comparer offres ou négocier',
          severity: 'moyenne',
          module: 'achats_stock',
        });
      }
    }
  });

  return recs.slice(0, 8);
}
