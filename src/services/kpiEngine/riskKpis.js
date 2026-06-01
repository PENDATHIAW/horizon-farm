import { evaluateRiskRules } from '../erpRules/riskRules.js';

export function computeRiskKpis(data = {}) {
  const risks = evaluateRiskRules(data);
  const critical = risks.filter((r) => r.level === 'critique' || r.level === 'eleve').length;
  return {
    risks,
    total: risks.length,
    critical,
    maxScore: risks[0]?.score || 0,
  };
}
