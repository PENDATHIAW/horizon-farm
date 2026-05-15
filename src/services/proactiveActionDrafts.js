export function buildDraftFromProactiveInsight(insight = {}, dataMap = {}) {
  if (!insight?.module) return null;

  const base = {
    status: 'draft_incomplete',
    source: 'horizon_proactive',
    source_insight: insight,
    confidence: insight.confidence || 78,
    requires_validation: true,
    warnings: insight.reason ? [insight.reason] : [],
    history: [{ role: 'assistant', content: `Proposition proactive: ${insight.title}` }],
  };

  if (insight.module === 'stock') {
    const stocks = Array.isArray(dataMap.stock) ? dataMap.stock : [];
    const critical = stocks.find((row) => Number(row.quantite || 0) <= Number(row.seuil || 0) && Number(row.seuil || 0) > 0) || {};
    const productName = critical.produit || critical.name || 'aliment';

    return {
      ...base,
      intent: 'purchase_stock',
      primary_module: 'stock',
      form_type: 'stock_purchase',
      missing_fields: ['quantity', 'supplier_name', 'payment_status', 'date'],
      draft_fields: {
        product_name: productName,
        quantity: '',
        unit: critical.unite || 'sac',
        supplier_name: '',
        payment_status: 'unknown',
        date: '',
        notes: `Action proposée par Horizon : ${insight.title}`,
      },
      impacted_modules: ['stock', 'finances', 'fournisseurs', 'tracabilite', 'centre_ia'],
      proposed_actions: [
        { module: 'stock', action: 'prepare_restock', label: 'Préparer réapprovisionnement' },
        { module: 'finances', action: 'estimate_cash_impact', label: 'Estimer impact trésorerie' },
      ],
      ui: {
        title: 'Réapprovisionnement proposé',
        subtitle: 'Horizon a détecté un risque de rupture. Complète quantité, fournisseur et paiement avant validation.',
        validation_label: 'Valider l’achat',
        cancel_label: 'Annuler',
        edit_label: 'Modifier',
        missing_label: 'Quantité, fournisseur, paiement et date à confirmer',
      },
    };
  }

  if (insight.module === 'finances') {
    return {
      ...base,
      intent: 'task_creation',
      primary_module: 'taches',
      form_type: 'task_creation',
      status: 'awaiting_validation',
      missing_fields: [],
      draft_fields: {
        title: insight.title || 'Action finance à traiter',
        description: insight.action || insight.message || '',
        priority: insight.severity === 'critique' ? 'critique' : 'haute',
        due_date: new Date().toISOString().slice(0, 10),
      },
      impacted_modules: ['taches', 'finances', 'tracabilite', 'centre_ia'],
      proposed_actions: [{ module: 'taches', action: 'create_task', label: 'Créer une tâche finance' }],
      ui: {
        title: 'Action finance proposée',
        subtitle: 'Horizon propose une tâche de suivi financier.',
        validation_label: 'Créer la tâche',
        cancel_label: 'Annuler',
        edit_label: 'Modifier',
      },
    };
  }

  if (['avicole', 'animaux', 'sante', 'cultures', 'smartfarm', 'fournisseurs'].includes(insight.module)) {
    return {
      ...base,
      intent: 'task_creation',
      primary_module: 'taches',
      form_type: 'task_creation',
      status: 'awaiting_validation',
      missing_fields: [],
      draft_fields: {
        title: insight.title || 'Action terrain à traiter',
        description: `${insight.message || ''}\nAction recommandée : ${insight.action || ''}`.trim(),
        priority: insight.severity === 'critique' ? 'critique' : insight.severity === 'haute' ? 'haute' : 'normale',
        due_date: new Date().toISOString().slice(0, 10),
      },
      impacted_modules: ['taches', insight.module, 'tracabilite', 'centre_ia'],
      proposed_actions: [{ module: 'taches', action: 'create_task', label: 'Créer une tâche terrain' }],
      ui: {
        title: 'Action terrain proposée',
        subtitle: 'Horizon propose une tâche pour traiter ce risque.',
        validation_label: 'Créer la tâche',
        cancel_label: 'Annuler',
        edit_label: 'Modifier',
      },
    };
  }

  return {
    ...base,
    intent: 'task_creation',
    primary_module: 'taches',
    form_type: 'task_creation',
    status: 'awaiting_validation',
    missing_fields: [],
    draft_fields: {
      title: insight.title || 'Action proactive Horizon',
      description: insight.action || insight.message || '',
      priority: 'normale',
      due_date: new Date().toISOString().slice(0, 10),
    },
    impacted_modules: ['taches', 'tracabilite', 'centre_ia'],
  };
}

export default buildDraftFromProactiveInsight;
