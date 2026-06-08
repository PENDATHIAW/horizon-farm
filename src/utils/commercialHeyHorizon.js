/**
 * Commercial V3 — questions Hey Horizon commerciales.
 */

export const COMMERCIAL_HEY_HORIZON_QUESTIONS = [
  { id: 'relance_today', label: 'Clients à relancer', query: 'Quels clients dois-je relancer aujourd\'hui ?', moduleId: 'commercial', tab: 'Relances' },
  { id: 'quotes_pending', label: 'Devis en attente', query: 'Quels devis sont en attente ?', moduleId: 'commercial', tab: 'Ventes' },
  { id: 'deliveries_today', label: 'Livraisons du jour', query: 'Quelles commandes doivent être livrées ?', moduleId: 'commercial', tab: 'Livraisons' },
  { id: 'top_clients', label: 'Top clients', query: 'Quels clients achètent le plus ?', moduleId: 'commercial', tab: 'Clients' },
  { id: 'top_products', label: 'Top produits', query: 'Quels produits se vendent le mieux ?', moduleId: 'commercial', tab: 'Graphiques' },
  { id: 'farm_sales', label: 'Ventes par ferme', query: 'Quelle ferme vend le plus ?', moduleId: 'commercial', tab: 'Graphiques' },
  { id: 'segment_ca', label: 'Segment le plus rentable', query: 'Quel segment client rapporte le plus ?', moduleId: 'commercial', tab: 'Clients' },
  { id: 'subscriptions_prep', label: 'Abonnements à préparer', query: 'Quels abonnements sont à préparer ?', moduleId: 'commercial', tab: 'Abonnements' },
  { id: 'low_margin', label: 'Marges faibles', query: 'Quelles ventes ont une marge faible ?', moduleId: 'commercial', tab: 'Ventes' },
  { id: 'receivables', label: 'Créances', query: 'Quelles créances sont ouvertes ?', moduleId: 'commercial', tab: 'Clients' },
];

export function launchCommercialHeyHorizonQuestion({ questionId = '', onNavigate, onOpenAssistant } = {}) {
  const item = COMMERCIAL_HEY_HORIZON_QUESTIONS.find((q) => q.id === questionId)
    || COMMERCIAL_HEY_HORIZON_QUESTIONS[0];
  if (onOpenAssistant) {
    onOpenAssistant(item.query);
    return;
  }
  onNavigate?.(item.moduleId, { tab: item.tab, heyHorizonQuery: item.query });
}

export function commercialHeyHorizonPresets() {
  return COMMERCIAL_HEY_HORIZON_QUESTIONS.slice(0, 6);
}
