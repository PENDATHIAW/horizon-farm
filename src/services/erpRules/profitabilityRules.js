const arr = (v) => (Array.isArray(v) ? v : []);
const n = (v = 0) => Number(v || 0);

function marginFinding(id, module, title, missing, entityId) {
  return {
    id,
    module,
    severity: 'moyenne',
    category: 'rentabilite',
    title,
    description: `Données manquantes : ${missing.join(', ')} — marge non affichée volontairement`,
    recommended_action: 'Compléter les coûts pour calcul fiable',
    confidence_score: 0.9,
    margin_reliable: false,
    source_records: entityId ? [{ type: module, id: entityId }] : [],
  };
}

/** Rentabilité — ne jamais afficher une marge non fiable ; signaler les données manquantes. */
export function evaluateProfitabilityRules(data = {}) {
  const findings = [];
  arr(data.animaux).forEach((a) => {
    const missing = [];
    if (!n(a.cout_achat ?? a.purchase_cost)) missing.push('coût achat');
    if (!n(a.cout_alimentation ?? a.feed_cost)) missing.push('alimentation');
    if (!n(a.cout_sante ?? a.health_cost)) missing.push('santé');
    if (missing.length >= 2) findings.push(marginFinding(`profit-animal-${a.id}`, 'elevage', `Marge animal non fiable : ${a.name || a.nom || a.id}`, missing, a.id));
  });
  arr(data.avicole || data.lots).forEach((lot) => {
    const missing = [];
    if (!n(lot.cout_poussins ?? lot.chick_cost)) missing.push('poussins');
    if (!n(lot.cout_aliment ?? lot.feed_cost)) missing.push('alimentation');
    if (!n(lot.cout_vaccins ?? lot.vaccine_cost)) missing.push('vaccins');
    if (missing.length >= 2) findings.push(marginFinding(`profit-lot-${lot.id}`, 'elevage', `Marge lot non fiable : ${lot.name || lot.id}`, missing, lot.id));
  });
  arr(data.production_oeufs_logs || data.productionLogs).slice(0, 30).forEach((log) => {
    const eggs = n(log.oeufs_produits ?? log.eggs_count);
    if (eggs > 0 && !log.cout_unitaire && !log.feed_cost_allocated) {
      findings.push(marginFinding(`profit-egg-${log.id}`, 'elevage', `Marge œufs non calculable : relevé ${log.id || log.date}`, ['alimentation', 'pertes'], log.id));
    }
  });
  return findings;
}
