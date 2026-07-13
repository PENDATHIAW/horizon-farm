/**
 * ASSISTANT_INTENT_MATRIX - 3 familles d'intentions métier.
 * DÉCLARER · DEMANDER · DÉCIDER
 */

export const INTENT_FAMILIES = Object.freeze({
  DECLARER: 'DECLARER',
  DEMANDER: 'DEMANDER',
  DECIDER: 'DECIDER',
});

const DECLARER_PATTERNS = [
  { intent: 'sale_record', patterns: [/vendu/, /vente de/, /vendre/, /enregistre.*vente/], label: 'Vente' },
  { intent: 'culture_harvest', patterns: [/recolte/, /récolté/, /récolte/], label: 'Récolte' },
  { intent: 'finance_entry', patterns: [/paye/, /payé/, /depense/, /dépense/, /encaissement/, /recette/], label: 'Paiement / dépense' },
  { intent: 'health_action', patterns: [/vaccin/, /soin/, /deparas/, /déparas/, /traite/, /traité/], label: 'Santé' },
  { intent: 'purchase_stock', patterns: [/achete/, /acheté/, /achat de/, /reception/, /réception/], label: 'Achat / réception stock' },
  { intent: 'mortality_event', patterns: [/mortalite/, /mortalité/, /morts/], label: 'Mortalité' },
  { intent: 'egg_production', patterns: [/ramasse/, /ramassé/, /ponte/, /oeufs/, /œufs/, /tablettes/], label: 'Production œufs' },
  { intent: 'culture_expense', patterns: [/intrant/, /engrais/, /semence/], label: 'Intrant culture' },
  { intent: 'delivery', patterns: [/livre/, /livré/, /livraison/], label: 'Livraison' },
  { intent: 'transformation', patterns: [/transform/, /abattage/], label: 'Transformation' },
  { intent: 'task_creation', patterns: [/tache/, /tâche/, /rappelle moi/], label: 'Tâche' },
  { intent: 'equipment_action', patterns: [/equipement/, /équipement/, /maintenance/, /panne/], label: 'Équipement' },
];

const DEMANDER_PATTERNS = [
  { intent: 'treasury', patterns: [/tresorerie/, /trésorerie/, /cash/, /liquidite/], label: 'Trésorerie', route: 'finance_pilotage' },
  { intent: 'receivables', patterns: [/creance/, /créance/, /encaisser/, /impaye/, /impayé/], label: 'Créances', route: 'finance_pilotage' },
  { intent: 'payables', patterns: [/dette/, /dettes/, /fournisseur.*payer/], label: 'Dettes', route: 'finance_pilotage' },
  { intent: 'top_client', patterns: [/meilleur client/, /top client/], label: 'Meilleur client', route: 'commercial' },
  { intent: 'top_product', patterns: [/meilleur produit/, /top produit/, /vend.*mieux/], label: 'Meilleur produit', route: 'commercial' },
  { intent: 'stock_status', patterns: [/stock/, /rupture/, /seuil/], label: 'État du stock', route: 'achats_stock' },
  { intent: 'margin', patterns: [/marge/, /rentabilite/, /rentabilité/], label: 'Marge', route: 'finance_pilotage' },
  { intent: 'commercial_summary', patterns: [/ca commercial/, /panier moyen/, /resume commercial/], label: 'Situation commerciale', route: 'commercial' },
];

const DECIDER_PATTERNS = [
  { intent: 'today_actions', patterns: [/aujourd.*hui/, /que faire/, /priorite/, /priorité/], label: 'Priorités du jour' },
  { intent: 'sell_today', patterns: [/que vendre/, /vendre aujourd/], label: 'Que vendre' },
  { intent: 'follow_up', patterns: [/qui relancer/, /relancer.*client/], label: 'Qui relancer' },
  { intent: 'month_goal', patterns: [/objectif.*mois/, /ou en suis/], label: 'Objectif mois' },
  { intent: 'annual_goal', patterns: [/objectif.*annuel/, /objectif de l/], label: 'Objectif année' },
  { intent: 'investor_overview', patterns: [/etat.*exploitation/, /performance/, /investisseur/, /dossier invest/], label: 'Vue investisseur' },
  { intent: 'monthly_risks', patterns: [/risque.*mois/, /principal risque/], label: 'Risques du mois' },
];

const norm = (value = '') => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

function matchFamily(text, entries) {
  const q = norm(text);
  for (const entry of entries) {
    if (entry.patterns.some((p) => (typeof p === 'string' ? q.includes(norm(p)) : p.test(q)))) {
      return entry;
    }
  }
  return null;
}

/**
 * Classifie une phrase utilisateur dans une des 3 familles.
 * @returns {{ family: string, intent: string, label: string, route?: string } | null}
 */
export function classifyAssistantIntent(text = '') {
  const declarer = matchFamily(text, DECLARER_PATTERNS);
  if (declarer) return { family: INTENT_FAMILIES.DECLARER, ...declarer };

  const demander = matchFamily(text, DEMANDER_PATTERNS);
  if (demander) return { family: INTENT_FAMILIES.DEMANDER, ...demander };

  const decider = matchFamily(text, DECIDER_PATTERNS);
  if (decider) return { family: INTENT_FAMILIES.DECIDER, ...decider };

  return null;
}

/** Matrice exportée pour documentation et tests. */
export const ASSISTANT_INTENT_MATRIX = Object.freeze({
  [INTENT_FAMILIES.DECLARER]: DECLARER_PATTERNS,
  [INTENT_FAMILIES.DEMANDER]: DEMANDER_PATTERNS,
  [INTENT_FAMILIES.DECIDER]: DECIDER_PATTERNS,
});

export default ASSISTANT_INTENT_MATRIX;
