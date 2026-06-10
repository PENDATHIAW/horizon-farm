const n = (v) => Number(v || 0);
const lower = (v) => String(v || '').toLowerCase();
const arr = (v) => (Array.isArray(v) ? v : []);

const isFeedStock = (row = {}) =>
  /aliment|feed|provende|son|mais|maïs|foin|fourrage/.test(
    lower(`${row.produit || row.name || row.nom || ''} ${row.categorie || row.category || ''}`),
  );

const daysAgo = (d) => {
  const t = new Date(d).getTime();
  return Math.max(0, Math.ceil((Date.now() - t) / 86400000));
};

/** Suggestion ration simple — basée sur effectif et type lot. */
export function suggestRationForTarget(target = {}, type = 'lot') {
  const effectif = type === 'lot'
    ? n(target.current_count ?? target.effectif_actuel ?? target.initial_count)
    : 1;
  const label = lower(`${target.type || ''} ${target.name || ''} ${target.espece || ''}`);
  let kgPerDay = 0.12;
  let product = 'Aliment';

  if (label.includes('chair')) {
    kgPerDay = 0.09;
    product = 'Aliment chair';
  } else if (label.includes('pondeuse') || label.includes('ponte')) {
    kgPerDay = 0.11;
    product = 'Aliment pondeuse';
  } else if (label.includes('bovin')) {
    kgPerDay = 8;
    product = 'Aliment bovin';
  }

  const qty = Math.max(1, Math.round(effectif * kgPerDay * 7));
  return {
    product,
    quantity7d: qty,
    quantityDaily: Math.round(effectif * kgPerDay),
    message: `Suggestion : ${qty} kg sur 7 j (${product}, ~${Math.round(effectif * kgPerDay)} kg/j pour ${effectif} tête(s)).`,
  };
}

/** Rupture stock aliment estimée sous 7 jours. */
export function buildFeedStockRuptureAlerts({ stocks = [], feedLogs = [] } = {}) {
  const feedStocks = arr(stocks).filter(isFeedStock);
  const alerts = [];

  feedStocks.forEach((row) => {
    const qty = n(row.quantite ?? row.quantity ?? row.stock);
    const product = row.produit || row.name || row.nom || row.id;
    const productKey = lower(product);

    const recent = arr(feedLogs)
      .filter((log) => lower(`${log.produit || ''} ${log.lot_nom || ''}`).includes(productKey.slice(0, 8)) || productKey.includes(lower(log.produit || '').slice(0, 8)))
      .slice(-14);
    const dailyUse = recent.length
      ? recent.reduce((s, l) => s + n(l.quantite ?? l.quantity), 0) / Math.max(1, recent.length)
      : 0;

    if (qty <= 0) {
      alerts.push({ severity: 'danger', title: `Rupture : ${product}`, message: 'Stock aliment à zéro — réapprovisionnement urgent (Achats & Stock).' });
      return;
    }
    if (dailyUse > 0 && qty / dailyUse <= 7) {
      alerts.push({
        severity: 'warning',
        title: `Rupture sous 7 j : ${product}`,
        message: `Stock ${qty} u. · usage ~${dailyUse.toFixed(1)}/jour — commander avant ${Math.ceil(qty / dailyUse)} j.`,
      });
    }
  });

  return alerts;
}
