const arr = (v) => (Array.isArray(v) ? v : []);
const low = (v) => String(v || '').toLowerCase();
const isOpen = (r = {}) => !['termine', 'terminé', 'done', 'closed', 'resolu', 'résolu', 'traitee'].includes(low(r.status || r.statut));

export function evaluateTaskAlertRules(taches = [], alertes = []) {
  const findings = [];
  arr(taches).filter((t) => t.priority === 'critique' || t.status === 'retard').forEach((t) => {
    findings.push({
      id: `task-critical-${t.id}`,
      module: 'activite_suivi',
      severity: 'haute',
      title: `Tâche critique : ${t.title || t.id}`,
      recommended_action: 'Traiter ou réassigner',
      confidence_score: 0.87,
      source_records: [{ type: 'task', id: t.id }],
    });
  });
  arr(alertes).filter((a) => isOpen(a) && a.status === 'nouvelle').forEach((a) => {
    findings.push({
      id: `alert-open-${a.id}`,
      module: 'activite_suivi',
      severity: low(a.severity).includes('critique') ? 'critique' : 'moyenne',
      title: a.title || 'Alerte non traitée',
      recommended_action: a.action_recommandee || 'Créer tâche ou résoudre',
      confidence_score: 0.86,
      source_records: [{ type: 'alert', id: a.id }],
    });
  });
  return findings;
}
