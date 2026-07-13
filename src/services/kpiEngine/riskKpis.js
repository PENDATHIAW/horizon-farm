import { evaluateRiskRules } from '../erpRules/riskRules.js';

export function computeRiskKpis(data = {}) {
  const risks = evaluateRiskRules(data);
  const critical = risks.filter((risk) => risk.level === 'critique' || risk.level === 'eleve').length;
  return { risks, total: risks.length, critical, maxScore: risks[0]?.score || 0 };
}
