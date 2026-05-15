const clean = (value) => String(value || '').trim().toLowerCase();

export function detectOfflineConflictRisk(item = {}) {
  const moduleKey = clean(item.module || item.moduleKey || item.module_lie);
  const action = clean(item.action || item.type || item.operation);
  const label = clean(item.label || item.recordId || item.id);
  if (moduleKey.includes('stock') && (action.includes('sortie') || label.includes('sortie') || label.includes('aliment'))) return { level: 'haute', reason: 'Vérifier le stock disponible avant replay.' };
  if ((moduleKey.includes('ventes') || moduleKey.includes('payments')) && (label.includes('paiement') || action.includes('payment') || action.includes('update'))) return { level: 'haute', reason: 'Vérifier que la commande n’est pas déjà soldée.' };
  if (moduleKey.includes('animaux') && (action.includes('update') || action.includes('modification'))) return { level: 'moyenne', reason: 'Vérifier que l’animal n’a pas déjà été vendu, réformé ou perdu.' };
  if (moduleKey.includes('avicole') && (label.includes('vendu') || action.includes('update'))) return { level: 'moyenne', reason: 'Vérifier l’effectif actif avant replay.' };
  if (moduleKey.includes('alertes') || moduleKey.includes('taches')) return { level: 'faible', reason: 'Risque faible : vérifier doublon tâche/alerte.' };
  return { level: 'faible', reason: 'Risque faible détecté.' };
}

export function enrichOfflineQueue(items = []) {
  return (Array.isArray(items) ? items : []).map((item) => ({ ...item, conflictRisk: detectOfflineConflictRisk(item) }));
}
