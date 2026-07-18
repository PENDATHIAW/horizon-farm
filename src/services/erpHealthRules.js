import { computeErpAuditFindings } from './erpRules/index.js';

/**
 * Règles de santé ERP (fichier de couche architecture, requis par la CI
 * erp-audit). Les anciens compteurs de navigation (computeNavAlertCounts /
 * navAlertFlags) ont été retirés : le flux d'alertes unifié
 * (src/utils/unifiedAlerts.js) est désormais la source unique des pastilles.
 */

const low = (v) => String(v || '').toLowerCase();

const isOpen = (r = {}) => !['termine', 'terminé', 'done', 'closed', 'clos', 'resolu', 'résolu', 'traitee', 'traitée'].includes(low(r.status || r.statut || r.state));

/** Score santé global ERP 0-100. */
export function computeGlobalHealthScore(data = {}) {
  const findings = computeErpAuditFindings(data);
  const critical = findings.filter((f) => f.severity === 'critique' || f.severity === 'haute').length;
  const total = Math.max(findings.length, 1);
  return Math.max(0, Math.round(100 - (critical / total) * 100));
}

export { computeErpAuditFindings, isOpen };
