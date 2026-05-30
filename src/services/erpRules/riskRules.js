const arr = (v) => (Array.isArray(v) ? v : []);
const n = (v = 0) => Number(v || 0);
const low = (v) => String(v || '').toLowerCase();
const amount = (r = {}) => n(r.montant ?? r.amount ?? r.total ?? r.montant_total);

function level(score) {
  if (score >= 75) return 'critique';
  if (score >= 50) return 'eleve';
  if (score >= 25) return 'moyen';
  return 'faible';
}

/** Risques financier, sanitaire, stock, fournisseur, client. */
export function evaluateRiskRules(data = {}) {
  const risks = [];
  const finances = arr(data.finances || data.transactions);
  const stocks = arr(data.stock || data.stocks);
  const clients = arr(data.clients);
  const suppliers = arr(data.fournisseurs);
  const sante = arr(data.sante);
  const lots = arr(data.avicole || data.lots);
  const orders = arr(data.sales_orders || data.salesOrders);
  const payments = arr(data.payments);

  const unpaidTotal = orders.reduce((sum, o) => {
    const total = amount(o);
    const paid = n(o.montant_paye) || payments.filter((p) => String(p.order_id) === String(o.id)).reduce((s, p) => s + amount(p), 0);
    return sum + Math.max(0, total - paid);
  }, 0);
  const expenses = finances.filter((t) => ['sortie', 'depense', 'dépense'].includes(low(t.type))).reduce((s, t) => s + amount(t), 0);
  const income = finances.filter((t) => ['entree', 'entrée', 'recette'].includes(low(t.type))).reduce((s, t) => s + amount(t), 0);
  const financialScore = Math.min(100, (unpaidTotal / Math.max(income, 1)) * 40 + (expenses > income ? 30 : 0));
  risks.push({ id: 'risk-financial', domain: 'financier', level: level(financialScore), score: Math.round(financialScore), title: 'Risque financier', detail: `${unpaidTotal.toLocaleString('fr-FR')} FCFA à encaisser · dépenses/recettes ${expenses > income ? 'déséquilibrées' : 'OK'}`, module: 'finance_pilotage' });

  const healthLate = sante.filter((r) => low(r.statut) === 'retard').length;
  const lotRisk = lots.filter((l) => n(l.mortality ?? l.mortalite) > n(l.initial_count) * 0.04).length;
  const sanitaryScore = Math.min(100, healthLate * 15 + lotRisk * 25);
  risks.push({ id: 'risk-sanitary', domain: 'sanitaire', level: level(sanitaryScore), score: Math.round(sanitaryScore), title: 'Risque sanitaire', detail: `${healthLate} soin(s) en retard · ${lotRisk} lot(s) à mortalité élevée`, module: 'elevage' });

  const stockCritical = stocks.filter((s) => n(s.quantite ?? s.quantity) <= n(s.seuil ?? s.threshold) && n(s.seuil ?? s.threshold) > 0).length;
  const stockScore = Math.min(100, stockCritical * 20);
  risks.push({ id: 'risk-stock', domain: 'stock', level: level(stockScore), score: Math.round(stockScore), title: 'Risque stock', detail: `${stockCritical} produit(s) sous seuil`, module: 'achats_stock' });

  const supplierDebt = suppliers.filter((f) => n(f.dettes) > 0 || low(f.statut) === 'a_risque').length;
  risks.push({ id: 'risk-supplier', domain: 'fournisseur', level: level(supplierDebt * 25), score: Math.min(100, supplierDebt * 25), title: 'Risque fournisseur', detail: `${supplierDebt} fournisseur(s) à surveiller`, module: 'achats_stock' });

  const clientDebt = clients.filter((c) => n(c.creance ?? c.dette ?? c.balance_due) > 0).length;
  risks.push({ id: 'risk-client', domain: 'client', level: level(clientDebt * 20 + (unpaidTotal > 0 ? 20 : 0)), score: Math.min(100, clientDebt * 20 + (unpaidTotal > 0 ? 20 : 0)), title: 'Risque client', detail: `${clientDebt} client(s) avec créance · ${unpaidTotal.toLocaleString('fr-FR')} FCFA impayés`, module: 'commercial' });

  return risks.sort((a, b) => b.score - a.score);
}
