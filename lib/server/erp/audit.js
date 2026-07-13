const arr = (v) => (Array.isArray(v) ? v : []);
const n = (v = 0) => Number(v || 0);
function evaluateAudit(data = {}) {
  const findings = [];
  arr(data.stock || data.stocks).forEach((row) => {
    const q = n(row.quantite ?? row.quantity ?? row.stock);
    const t = n(row.seuil ?? row.threshold);
    if (t > 0 && q <= t) findings.push({ id: `stock-${row.id}`, module: 'achats_stock', severity: q <= 0 ? 'critique' : 'haute', title: `Stock faible : ${row.produit || row.nom}`, recommended_action: 'Réapprovisionner', confidence_score: 95 });
  });
  arr(data.sales_orders || data.salesOrders).forEach((order) => {
    const total = n(order.montant_total ?? order.total);
    const paid = n(order.montant_paye);
    if (total > paid) findings.push({ id: `sale-${order.id}`, module: 'commercial', severity: 'haute', title: `Vente non soldée : ${order.id}`, recommended_action: 'Encaisser', confidence_score: 90 });
  });
  arr(data.finances || data.transactions).forEach((trx) => {
    const amt = n(trx.montant ?? trx.amount);
    if (amt > 0 && !trx.document_id && !trx.proof_url) findings.push({ id: `proof-${trx.id}`, module: 'finance_pilotage', severity: 'moyenne', title: `Preuve manquante : ${trx.libelle || trx.id}`, recommended_action: 'Joindre justificatif', confidence_score: 92 });
  });
  arr(data.taches || data.tasks).filter((t) => t.priority === 'critique').forEach((t) => {
    findings.push({ id: `task-${t.id}`, module: 'activite_suivi', severity: 'haute', title: `Tâche critique : ${t.title}`, recommended_action: 'Traiter', confidence_score: 87 });
  });
  return findings;
}

const send = (res, status, payload) => res.status(status).json(payload);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return send(res, 405, { error: 'Method not allowed' });
  }
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const { module, data = {}, trigger = 'manual', question = '' } = body;
    const findings = evaluateAudit(data);
    const scoped = module ? findings.filter((f) => f.module === module) : findings;
    const recommendations = scoped.map((f) => ({
      id: f.id,
      title: f.title,
      recommendation_type: f.module,
      module_target: f.module,
      priority: f.severity,
      status: 'nouvelle',
      reasoning: question || 'Anomalie détectée par règles métier Horizon Farm',
      action_recommandee: f.recommended_action,
      confidence_score: f.confidence_score,
      created_by_ai: true,
      requires_validation: true,
    }));
    return send(res, 200, { trigger, module: module || 'global', count: recommendations.length, findings: scoped, recommendations, requires_validation: true });
  } catch (error) {
    return send(res, 500, { error: error?.message || 'ERP audit failed.' });
  }
}
