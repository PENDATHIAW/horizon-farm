const arr = (v) => (Array.isArray(v) ? v : []);
const n = (v = 0) => Number(v || 0);

export function evaluateLivestockRules(animaux = [], lots = [], sante = []) {
  const findings = [];
  arr(animaux).filter((a) => a.health_status === 'malade').forEach((a) => {
    findings.push({
      id: `animal-sick-${a.id}`,
      module: 'elevage',
      severity: 'haute',
      title: `Animal malade : ${a.nom || a.name || a.id}`,
      recommended_action: 'Ouvrir fiche santé et planifier soin',
      confidence_score: 0.88,
      source_records: [{ type: 'animal', id: a.id }],
    });
  });
  arr(lots).forEach((lot) => {
    const mortality = n(lot.mortality);
    const initial = n(lot.initial_count);
    if (initial > 0 && mortality / initial > 0.04) {
      findings.push({
        id: `lot-mortality-${lot.id}`,
        module: 'elevage',
        severity: 'critique',
        title: `Mortalité élevée lot : ${lot.nom || lot.name || lot.id}`,
        description: `${mortality}/${initial} mortalités`,
        recommended_action: 'Contrôler santé et alimentation du lot',
        confidence_score: 0.93,
        source_records: [{ type: 'lot', id: lot.id }],
      });
    }
  });
  arr(sante).filter((v) => v.statut === 'retard').forEach((v) => {
    findings.push({
      id: `health-late-${v.id}`,
      module: 'elevage',
      severity: 'haute',
      title: `Soin en retard : ${v.nom || v.type || v.id}`,
      recommended_action: 'Planifier intervention vétérinaire',
      confidence_score: 0.9,
      source_records: [{ type: 'sante', id: v.id }],
    });
  });
  return findings;
}
