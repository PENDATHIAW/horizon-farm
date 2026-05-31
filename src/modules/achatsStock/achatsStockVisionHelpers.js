import { runErpHealthEngine } from '../../services/erpHealthEngine.js';
import { fmtCurrency } from '../../utils/format.js';

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

export function buildAchatsStockCoherenceRows(stocks = [], transactions = [], suppliers = []) {
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
        title: `${name} — dette`,
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

  return rows.sort((a, b) => (b.value || 0) - (a.value || 0));
}

export function aggregateSupplierDebts(suppliers = []) {
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
