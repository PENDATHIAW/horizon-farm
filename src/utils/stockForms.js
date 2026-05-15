export const arr = (value) => Array.isArray(value) ? value : [];

export function alimentationFields({ stocks = [], animaux = [], lots = [], isFood = () => false } = {}) {
  const foodStocks = arr(stocks).filter(isFood);
  const activeAnimals = arr(animaux).filter((a) => a?.id && !['vendu', 'mort', 'vole', 'volé', 'reforme', 'réforme'].includes(String(a.status || a.statut || '').toLowerCase()));
  const activeLots = arr(lots).filter((l) => l?.id && !['vendu', 'termine', 'terminé', 'perdu', 'archive', 'archivé'].includes(String(l.status || l.statut || '').toLowerCase()));
  return [
    { key: 'section_source', label: 'Source alimentation', type: 'section', description: 'Choisis un stock existant quand l’aliment est disponible. Sinon utilise la saisie manuelle.' },
    { key: 'id', label: 'ID', type: 'text', required: true },
    { key: 'date', label: 'Date', type: 'date' },
    { key: 'stock_id', label: 'Stock aliment utilisé', type: 'select', options: [{ value: '__manual__', label: 'Saisie manuelle / aliment non stocké' }, ...foodStocks.map((s) => ({ value: s.id, label: `${s.produit} · ${s.quantite} ${s.unite || ''} disponible(s)` }))] },
    { key: 'categorie', label: 'Catégorie animale', type: 'select', options: [
      { value: 'bovin', label: 'Bovins' },
      { value: 'ovin', label: 'Ovins' },
      { value: 'caprin', label: 'Caprins' },
      { value: 'pondeuse', label: 'Pondeuses' },
      { value: 'chair', label: 'Poulets de chair' },
      { value: 'autre', label: 'Autre' },
    ] },
    { key: 'type_cible', label: 'Type cible', type: 'select', clearOnChange: ['cible_id'], options: [
      { value: 'categorie_animale', label: 'Catégorie animale' },
      { value: 'animal', label: `Animal précis (${activeAnimals.length})` },
      { value: 'lot_avicole', label: `Lot avicole (${activeLots.length})` },
    ] },
    { key: 'cible_id', label: 'Animal lié', type: 'select', showWhen: (form) => form.type_cible === 'animal', options: activeAnimals.map((a) => ({ value: a.id, label: `${a.name || a.nom || a.tag || a.id} · ${a.id}` })), emptyLabel: 'Aucun animal disponible' },
    { key: 'cible_id', label: 'Lot avicole lié', type: 'select', showWhen: (form) => form.type_cible === 'lot_avicole', options: activeLots.map((l) => ({ value: l.id, label: `${l.name || l.nom || l.id} · ${l.id}` })), emptyLabel: 'Aucun lot avicole disponible' },
    { key: 'quantite', label: 'Quantité utilisée', type: 'number', required: true },
    { key: 'unite', label: 'Unité', type: 'select', options: ['kg', 'sac', 'litre', 'unité'] },
    { key: 'montant_total', label: 'Montant total', type: 'number' },
    { key: 'duree_jours', label: 'Durée couverte (jours)', type: 'number' },
    { key: 'fournisseur_id', label: 'Fournisseur', type: 'text' },
    { key: 'notes', label: 'Notes', type: 'text', fullWidth: true },
  ];
}

export function normalizeAlimentationPayload(payload = {}) {
  return {
    ...payload,
    stock_id: payload.stock_id === '__manual__' ? '' : payload.stock_id,
    source_mode: payload.stock_id === '__manual__' || !payload.stock_id ? 'manuel' : 'stock',
    cible_id: payload.type_cible === 'categorie_animale' ? '' : payload.cible_id,
  };
}
