import { toNumber } from '../utils/format';

export const LOSS_TYPES = [
  { key: 'mortalite', label: 'Mortalité', modules: ['animaux', 'avicole'], affectsQuantity: true, financialAuto: false, description: 'Sujet mort ou perte biologique.' },
  { key: 'vol', label: 'Vol', modules: ['animaux', 'avicole', 'cultures', 'stock'], affectsQuantity: true, financialAuto: false, description: 'Quantité volée ou disparue.' },
  { key: 'peremption', label: 'Péremption', modules: ['stock', 'avicole', 'cultures'], affectsQuantity: true, financialAuto: false, description: 'Produit périmé, viande, œufs, intrants ou récolte impropre.' },
  { key: 'casse', label: 'Casse / œufs cassés', modules: ['avicole', 'stock'], affectsQuantity: true, financialAuto: false, description: 'Casse pendant manipulation, tri ou transport.' },
  { key: 'avarie', label: 'Avarie / détérioration', modules: ['stock', 'cultures', 'avicole'], affectsQuantity: true, financialAuto: false, description: 'Produit détérioré, humide, contaminé ou inutilisable.' },
  { key: 'predation', label: 'Prédation', modules: ['avicole', 'animaux', 'cultures'], affectsQuantity: true, financialAuto: false, description: 'Perte due aux prédateurs ou nuisibles.' },
  { key: 'maladie_perte', label: 'Perte liée maladie', modules: ['animaux', 'avicole', 'cultures'], affectsQuantity: true, financialAuto: false, description: 'Perte de sujet ou de production liée à un problème sanitaire.' },
  { key: 'climat', label: 'Perte climatique', modules: ['cultures', 'stock'], affectsQuantity: true, financialAuto: false, description: 'Sécheresse, excès d’eau, chaleur, humidité ou intempérie.' },
  { key: 'recolte_perdue', label: 'Récolte perdue', modules: ['cultures'], affectsQuantity: true, financialAuto: false, description: 'Récolte non récupérable, invendue ou impropre.' },
  { key: 'tri_rebut', label: 'Rebut / tri qualité', modules: ['cultures', 'avicole', 'stock'], affectsQuantity: true, financialAuto: false, description: 'Quantité écartée après tri qualité.' },
  { key: 'erreur_saisie', label: 'Correction / erreur de saisie', modules: ['animaux', 'avicole', 'cultures', 'stock'], affectsQuantity: true, financialAuto: false, description: 'Ajustement de stock ou d’effectif sans impact financier.' },
  { key: 'autre', label: 'Autre perte', modules: ['animaux', 'avicole', 'cultures', 'stock'], affectsQuantity: true, financialAuto: false, description: 'Autre sortie sans revenu à documenter.' },
];

export const LOSS_TYPE_BY_KEY = Object.fromEntries(LOSS_TYPES.map((type) => [type.key, type]));

const arr = (value) => Array.isArray(value) ? value : [];
const lower = (value) => String(value || '').toLowerCase();
const qtyOf = (row = {}) => toNumber(row.quantity ?? row.quantite ?? row.qty ?? row.nombre ?? row.effectif ?? row.delta ?? row.delta_effectif);

export function lossTypesForModule(moduleKey) {
  return LOSS_TYPES.filter((type) => type.modules.includes(moduleKey));
}

export function isLossEvent(row = {}) {
  const text = lower(`${row.event_type || ''} ${row.type || ''} ${row.title || ''} ${row.description || ''} ${row.reason || ''} ${row.loss_type || ''}`);
  return /perte|loss|mort|mortal|vol|p[eé]rim|casse|avarie|predat|maladie|climat|rebut|tri|d[eé]t[eé]rior/.test(text);
}

export function normalizeLossEvent(row = {}) {
  const text = lower(`${row.loss_type || ''} ${row.event_type || ''} ${row.title || ''} ${row.description || ''}`);
  const found = LOSS_TYPES.find((type) => text.includes(type.key) || lower(type.label).split(' ')[0] && text.includes(lower(type.label).split(' ')[0]));
  return {
    id: row.id,
    date: row.event_date || row.date || row.created_at || row.updated_at || '',
    module: row.module_source || row.module || row.source_module || 'stock',
    entityType: row.entity_type || row.target_type || '',
    entityId: row.entity_id || row.target_id || row.related_id || row.source_record_id || '',
    type: found?.key || row.loss_type || 'autre',
    label: found?.label || row.title || 'Perte',
    quantity: qtyOf(row),
    unit: row.unit || row.unite || '',
    reason: row.reason || row.description || row.notes || row.title || '',
    financialAuto: false,
    raw: row,
  };
}

export function buildLossSummary({ businessEvents = [], stocks = [], animaux = [], lots = [], cultures = [] } = {}) {
  const eventLosses = arr(businessEvents).filter(isLossEvent).map(normalizeLossEvent);
  const stockMovements = arr(stocks)
    .filter((row) => lower(row.last_movement_type).includes('perte') || lower(row.last_movement_label).includes('perte'))
    .map((row) => normalizeLossEvent({
      id: `${row.id}-last-loss`,
      event_date: row.last_movement_at,
      module_source: 'stock',
      entity_type: 'stock',
      entity_id: row.id,
      loss_type: 'autre',
      title: row.last_movement_label || `Perte stock ${row.produit || row.name || row.id}`,
      quantity: row.last_movement_qty,
      unite: row.unite,
      description: 'Dernier mouvement de perte stock.',
    }));
  const animalLosses = arr(animaux)
    .filter((row) => /mort|vole|volé|perdu/.test(lower(`${row.status || ''} ${row.statut || ''}`)))
    .map((row) => normalizeLossEvent({ id: `${row.id}-status-loss`, event_date: row.updated_at || row.date_sortie, module_source: 'animaux', entity_type: 'animal', entity_id: row.id, loss_type: lower(row.status || row.statut).includes('mort') ? 'mortalite' : lower(row.status || row.statut).includes('vol') ? 'vol' : 'autre', title: row.name || row.tag || row.id, quantity: 1, unite: 'sujet', description: `Statut ${row.status || row.statut}` }));
  const lotLosses = arr(lots)
    .filter((row) => toNumber(row.mortality ?? row.morts) > 0)
    .map((row) => normalizeLossEvent({ id: `${row.id}-mortality`, event_date: row.updated_at || row.date_entree, module_source: 'avicole', entity_type: 'lot_avicole', entity_id: row.id, loss_type: 'mortalite', title: row.name || row.nom || row.id, quantity: toNumber(row.mortality ?? row.morts), unite: 'sujets', description: 'Mortalité enregistrée sur le lot.' }));
  const cultureLosses = arr(cultures)
    .filter((row) => /perdu|perte/.test(lower(`${row.status || ''} ${row.statut || ''}`)) || toNumber(row.quantite_perdue) > 0)
    .map((row) => normalizeLossEvent({ id: `${row.id}-culture-loss`, event_date: row.updated_at || row.date_recolte, module_source: 'cultures', entity_type: 'culture', entity_id: row.id, loss_type: 'recolte_perdue', title: row.nom || row.name || row.id, quantity: toNumber(row.quantite_perdue), unite: row.unite_recolte || 'kg', description: `Culture ${row.statut || row.status || 'perte'}` }));
  const losses = [...eventLosses, ...stockMovements, ...animalLosses, ...lotLosses, ...cultureLosses];
  const byType = losses.reduce((acc, loss) => {
    const key = loss.type || 'autre';
    acc[key] ||= { type: key, label: LOSS_TYPE_BY_KEY[key]?.label || key, quantity: 0, count: 0, losses: [] };
    acc[key].quantity += toNumber(loss.quantity);
    acc[key].count += 1;
    acc[key].losses.push(loss);
    return acc;
  }, {});
  const byModule = losses.reduce((acc, loss) => {
    const key = loss.module || 'autre';
    acc[key] ||= { module: key, quantity: 0, count: 0, losses: [] };
    acc[key].quantity += toNumber(loss.quantity);
    acc[key].count += 1;
    acc[key].losses.push(loss);
    return acc;
  }, {});
  return { losses, byType, byModule, totalCount: losses.length };
}
