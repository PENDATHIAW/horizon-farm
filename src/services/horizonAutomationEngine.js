import { buildDraftFromProactiveInsight } from './proactiveActionDrafts';
import { buildHorizonProactiveInsights } from './horizonProactiveService';

const DEFAULT_RULES = [
  {
    id: 'stock-critical-prepare-purchase',
    name: 'Stock critique → préparer achat',
    enabled: true,
    severity: ['critique', 'haute'],
    modules: ['stock'],
    action: 'prepare_draft',
  },
  {
    id: 'finance-pressure-create-task',
    name: 'Tension finance → tâche de suivi',
    enabled: true,
    severity: ['critique', 'haute'],
    modules: ['finances'],
    action: 'prepare_draft',
  },
  {
    id: 'avicole-risk-create-task',
    name: 'Risque avicole → tâche terrain',
    enabled: true,
    severity: ['critique', 'haute'],
    modules: ['avicole'],
    action: 'prepare_draft',
  },
  {
    id: 'animal-health-create-task',
    name: 'Animal à surveiller → tâche santé',
    enabled: true,
    severity: ['critique', 'haute'],
    modules: ['animaux', 'sante'],
    action: 'prepare_draft',
  },
  {
    id: 'smartfarm-device-create-task',
    name: 'Smart Farm indisponible → tâche contrôle',
    enabled: true,
    severity: ['critique', 'haute', 'moyenne'],
    modules: ['smartfarm'],
    action: 'prepare_draft',
  },
];

const keyOf = (automation) => `${automation.rule_id}:${automation.insight_id}`;

export function buildHorizonAutomations(dataMap = {}, options = {}) {
  const rules = options.rules || DEFAULT_RULES;
  const maxDrafts = options.maxDrafts || 5;
  const proactive = buildHorizonProactiveInsights(dataMap);
  const automations = [];

  for (const insight of proactive.insights || []) {
    const rule = rules.find((item) => (
      item.enabled !== false
      && item.modules.includes(insight.module)
      && item.severity.includes(insight.severity)
    ));

    if (!rule) continue;

    const draft = buildDraftFromProactiveInsight(insight, dataMap);
    if (!draft) continue;

    automations.push({
      id: `${rule.id}:${insight.id}`,
      rule_id: rule.id,
      rule_name: rule.name,
      insight_id: insight.id,
      severity: insight.severity,
      module: insight.module,
      status: 'pending_validation',
      mode: 'semi_autonomous',
      title: insight.title,
      message: insight.message,
      recommendation: insight.action,
      draft,
      created_at: new Date().toISOString(),
    });
  }

  const unique = [];
  const seen = new Set();
  for (const automation of automations) {
    const key = keyOf(automation);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(automation);
  }

  return {
    generated_at: new Date().toISOString(),
    mode: 'semi_autonomous',
    total: unique.length,
    automations: unique.slice(0, maxDrafts),
    rules: rules.map(({ id, name, enabled, modules, severity }) => ({ id, name, enabled, modules, severity })),
  };
}

export default buildHorizonAutomations;
