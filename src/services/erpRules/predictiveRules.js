const arr = (v) => (Array.isArray(v) ? v : []);
const n = (v = 0) => Number(v || 0);
const low = (v) => String(v || '').toLowerCase();

/** Prédictions : rupture stock, trésorerie, retards paiement. */
export function evaluatePredictiveRules(data = {}) {
  const predictions = [];
  const stocks = arr(data.stock || data.stocks);
  const feedLogs = arr(data.alimentation_logs || data.alimentationLogs);
  const finances = arr(data.finances || data.transactions);
  const orders = arr(data.sales_orders || data.salesOrders);
  const payments = arr(data.payments);

  stocks.forEach((row) => {
    const qty = n(row.quantite ?? row.quantity ?? row.stock);
    const name = row.produit || row.nom || row.name || 'Produit';
    const productKey = low(name);
    const relatedFeed = feedLogs.filter((log) => low(JSON.stringify(log)).includes(productKey.split(' ')[0] || '___'));
    const dailyUse = relatedFeed.length
      ? relatedFeed.slice(0, 14).reduce((s, l) => s + n(l.quantite ?? l.quantity ?? l.amount), 0) / Math.max(relatedFeed.slice(0, 14).length, 1)
      : 0;
    if (qty > 0 && dailyUse > 0) {
      const daysLeft = Math.floor(qty / dailyUse);
      if (daysLeft <= 14) {
        predictions.push({
          id: `pred-stock-${row.id || name}`,
          type: 'rupture_stock',
          module: 'achats_stock',
          severity: daysLeft <= 7 ? 'critique' : 'haute',
          title: `Rupture prévue : ${name}`,
          description: `Au rythme actuel, rupture dans ${daysLeft} jour(s)`,
          recommended_action: `Acheter ${name} dans ${Math.max(1, daysLeft - 3)} jours`,
          days_left: daysLeft,
          confidence_score: 0.82,
        });
      }
    } else if (qty <= n(row.seuil ?? row.threshold) && n(row.seuil ?? row.threshold) > 0) {
      predictions.push({
        id: `pred-stock-threshold-${row.id || name}`,
        type: 'rupture_stock',
        module: 'achats_stock',
        severity: qty <= 0 ? 'critique' : 'haute',
        title: `Stock bas : ${name}`,
        description: `${qty} restant · seuil ${n(row.seuil ?? row.threshold)}`,
        recommended_action: 'Réapprovisionner',
        days_left: qty <= 0 ? 0 : null,
        confidence_score: 0.95,
      });
    }
  });

  const income = finances.filter((t) => ['entree', 'entrée'].includes(low(t.type))).reduce((s, t) => s + n(t.montant ?? t.amount), 0);
  const expense = finances.filter((t) => ['sortie', 'depense', 'dépense'].includes(low(t.type))).reduce((s, t) => s + n(t.montant ?? t.amount), 0);
  const balance = income - expense;
  if (balance < 0 && expense > 0) {
    const burnPerDay = expense / 30;
    const daysLeft = burnPerDay > 0 ? Math.max(0, Math.floor(Math.abs(balance) / burnPerDay)) : 0;
    predictions.push({
      id: 'pred-cashflow',
      type: 'tresorerie',
      module: 'finance_pilotage',
      severity: daysLeft <= 14 ? 'critique' : 'haute',
      title: 'Baisse trésorerie prévue',
      description: `Solde négatif · tension estimée sous ${daysLeft || 30} jours au rythme actuel`,
      recommended_action: 'Accélérer encaissements et réduire dépenses non critiques',
      days_left: daysLeft,
      confidence_score: 0.78,
    });
  }

  const unpaidOrders = orders.filter((o) => {
    const total = n(o.montant_total ?? o.total);
    const paid = n(o.montant_paye) || payments.filter((p) => String(p.order_id) === String(o.id)).reduce((s, p) => s + n(p.montant ?? p.amount), 0);
    return total > paid;
  });
  if (unpaidOrders.length >= 3) {
    predictions.push({
      id: 'pred-payment-delay',
      type: 'retard_paiement',
      module: 'commercial',
      severity: 'haute',
      title: 'Retards paiement clients',
      description: `${unpaidOrders.length} vente(s) non soldées - risque de tension trésorerie`,
      recommended_action: 'Relancer les clients avec créances',
      confidence_score: 0.86,
    });
  }

  return predictions;
}
