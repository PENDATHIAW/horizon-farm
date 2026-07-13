const arr = (v) => (Array.isArray(v) ? v : []);
const n = (v = 0) => Number(v || 0);


const qty = (r = {}) => n(r.quantite ?? r.quantity ?? r.stock);
const threshold = (r = {}) => n(r.seuil ?? r.threshold ?? r.stock_min);

export function evaluateStockRules(stocks = []) {
  const findings = [];
  arr(stocks).forEach((row) => {
    const q = qty(row);
    const t = threshold(row);
    if (t > 0 && q <= t) {
      findings.push({
        id: `stock-low-${row.id}`,
        module: 'achats_stock',
        severity: q <= 0 ? 'critique' : 'haute',
        title: `Stock faible : ${row.produit || row.nom || row.name}`,
        description: `${q} disponible · seuil ${t}`,
        recommended_action: 'Réapprovisionner ou créer une alerte stock',
        confidence_score: 0.95,
        source_records: [{ type: 'stock', id: row.id }],
      });
    }
  });
  return findings;
}
