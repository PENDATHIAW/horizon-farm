export const ERP_INTERCONNECTION_MATRIX = [
  {
    id: 'sales_finance',
    label: 'Ventes ↔ Finance',
    source: 'ventes',
    targets: ['sales_orders', 'payments', 'invoices', 'finances', 'clients', 'documents', 'business_events', 'alertes_center'],
    checks: [
      'Chaque paiement doit être lié à une commande existante.',
      'Chaque paiement encaissé doit avoir une transaction Finance correspondante.',
      'Une commande payée ne doit pas garder de reste à payer.',
      'Une commande facturée doit avoir une facture liée.',
      'Une créance doit créer une alerte ou rester visible côté client.',
    ],
  },
  {
    id: 'sales_stock_sources',
    label: 'Ventes ↔ Stock / Animaux / Avicole / Cultures',
    source: 'ventes',
    targets: ['stock', 'animaux', 'avicole', 'cultures', 'sales_opportunities', 'business_events'],
    checks: [
      'Une opportunité convertie ne doit pas rester ouverte.',
      'Une commande liée à une source doit pointer vers une source active.',
      'Une source déjà vendue ne doit pas être proposée une deuxième fois.',
    ],
  },
  {
    id: 'health_stock_finance',
    label: 'Santé ↔ Stock ↔ Finance',
    source: 'sante',
    targets: ['animaux', 'avicole', 'stock', 'finances', 'documents', 'taches', 'alertes_center'],
    checks: [
      'Un soin sur stock interne doit avoir un stock_id.',
      'La quantité utilisée ne doit pas dépasser le stock disponible.',
      'Un soin payé ou facturé doit avoir une transaction Finance.',
      'Une cible santé doit pointer vers un animal ou un lot actif.',
    ],
  },
  {
    id: 'stock_supply_finance',
    label: 'Stock ↔ Fournisseurs ↔ Finance',
    source: 'stock',
    targets: ['fournisseurs', 'finances', 'documents', 'taches', 'alertes_center', 'business_events'],
    checks: [
      'Un stock critique doit pouvoir générer une tâche ou une alerte.',
      'Un achat stock doit pouvoir être relié à un fournisseur et à une dépense.',
      'Un fournisseur à dette doit être visible dans les alertes ou les finances.',
    ],
  },
  {
    id: 'alerts_tasks_actions',
    label: 'Alertes ↔ Tâches ↔ Actions',
    source: 'alertes_center',
    targets: ['taches', 'animaux', 'avicole', 'stock', 'cultures', 'finances', 'smartfarm'],
    checks: [
      'Une alerte critique doit pointer vers une cible active ou une action claire.',
      'Une alerte traitée ne doit pas revenir automatiquement.',
      'Une tâche liée à une alerte doit suivre le statut de résolution.',
    ],
  },
  {
    id: 'documents_traceability',
    label: 'Documents ↔ Traçabilité ↔ Modules',
    source: 'documents',
    targets: ['animaux', 'avicole', 'cultures', 'clients', 'fournisseurs', 'finances', 'sales_orders', 'business_events'],
    checks: [
      'Un document lié doit pointer vers une cible existante.',
      'Une facture ou justificatif doit être relié à la vente, finance ou fournisseur concerné.',
      'Un événement métier important doit pouvoir être retracé.',
    ],
  },
  {
    id: 'investment_profitability',
    label: 'Investissements ↔ Rentabilité',
    source: 'investissements',
    targets: ['finances', 'business_plans', 'bp_investment_lines', 'bp_revenue_projections', 'financements'],
    checks: [
      'Un investissement doit remonter dans la rentabilité globale.',
      'Les coûts récurrents doivent être visibles dans Finance & Investisseurs.',
      'Les projections doivent être séparées du réalisé.',
    ],
  },
  {
    id: 'smartfarm_alerts_tasks',
    label: 'Smart Farm ↔ Alertes ↔ Maintenance',
    source: 'smartfarm',
    targets: ['sensor_devices', 'camera_devices', 'alertes_center', 'taches', 'equipements'],
    checks: [
      'Un capteur hors ligne doit déclencher une alerte ou une tâche.',
      'Une tâche maintenance doit pointer vers un équipement ou un device.',
      'Une alerte Smart Farm traitée ne doit pas être renotifiée.',
    ],
  },
];

export function getInterconnectionFlow(issue = {}) {
  const module = String(issue.module || '').toLowerCase();
  const message = String(issue.message || '').toLowerCase();
  if (['payments', 'invoices', 'sales_orders'].includes(module) || message.includes('commande') || message.includes('paiement') || message.includes('facture')) return 'sales_finance';
  if (module.includes('opportunit') || message.includes('opportunité') || message.includes('opportunite')) return 'sales_stock_sources';
  if (module.includes('sante') || message.includes('soin') || message.includes('santé')) return 'health_stock_finance';
  if (module.includes('stock') || message.includes('stock')) return 'stock_supply_finance';
  if (module.includes('alerte') || module.includes('tache') || message.includes('alerte') || message.includes('tâche')) return 'alerts_tasks_actions';
  if (module.includes('document') || message.includes('document')) return 'documents_traceability';
  if (module.includes('investissement') || message.includes('rentabilité')) return 'investment_profitability';
  if (module.includes('sensor') || module.includes('camera') || message.includes('capteur')) return 'smartfarm_alerts_tasks';
  return 'documents_traceability';
}

export function summarizeMatrixCoverage(dataMap = {}, issues = []) {
  return ERP_INTERCONNECTION_MATRIX.map((flow) => {
    const availableTargets = flow.targets.filter((key) => Array.isArray(dataMap[key]) && dataMap[key].length > 0);
    const flowIssues = issues.filter((issue) => getInterconnectionFlow(issue) === flow.id);
    const criticalCount = flowIssues.filter((issue) => issue.severity === 'critical').length;
    return {
      ...flow,
      activeTargets: availableTargets.length,
      totalTargets: flow.targets.length,
      coverage: flow.targets.length ? Math.round((availableTargets.length / flow.targets.length) * 100) : 0,
      issueCount: flowIssues.length,
      criticalCount,
      status: criticalCount > 0 ? 'critique' : flowIssues.length > 0 ? 'a_verifier' : 'ok',
    };
  });
}
