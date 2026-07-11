import { toNumber } from './format';

export const arr = (value) => (Array.isArray(value) ? value : []);

const stockUnitPrice = (stock = {}) => toNumber(stock.prixUnit ?? stock.prix_unitaire ?? stock.unit_price ?? stock.price);
const lower = (value) => String(value || '').toLowerCase();
const activeAnimalStatuses = new Set(['vendu', 'mort', 'vole', 'volé', 'reforme', 'réforme']);
const activeLotStatuses = new Set(['vendu', 'termine', 'terminé', 'perdu', 'archive', 'archivé']);
const stockLabel = (stock = {}) => lower(`${stock.produit || ''} ${stock.name || ''} ${stock.nom || ''} ${stock.categorie || ''} ${stock.category || ''}`);
const lotLabel = (lot = {}) => lower(`${lot.type || ''} ${lot.type_lot || ''} ${lot.name || ''} ${lot.nom || ''}`);
const animalLabel = (animal = {}) => lower(`${animal.type || ''} ${animal.espece || ''} ${animal.species || ''} ${animal.name || ''} ${animal.nom || ''}`);
const isActiveAnimal = (animal = {}) => animal?.id && !activeAnimalStatuses.has(lower(animal.status || animal.statut));
const isActiveLot = (lot = {}) => lot?.id && !activeLotStatuses.has(lower(lot.status || lot.statut));
const categoryFromText = (text) => {
  const value = lower(text);
  if (/pondeuse|layer|oeuf|œuf/.test(value)) return 'pondeuse';
  if (/chair|broiler|poulet/.test(value)) return 'chair';
  if (/caprin|chevre|chèvre/.test(value)) return 'caprin';
  if (/ovin|mouton|brebis/.test(value)) return 'ovin';
  if (/bovin|boeuf|bœuf|vache|taureau/.test(value)) return 'bovin';
  return '';
};
const lotCategory = (lot = {}) => categoryFromText(lotLabel(lot));
const animalCategory = (animal = {}) => categoryFromText(animalLabel(animal));
const one = (rows = []) => (rows.length === 1 ? rows[0] : null);

export function alimentationFields({ stocks = [], animaux = [], lots = [], fournisseurs = [], isFood = () => false } = {}) {
  const foodStocks = arr(stocks).filter(isFood);
  const activeAnimals = arr(animaux).filter(isActiveAnimal);
  const activeLots = arr(lots).filter(isActiveLot);
  const supplierOptions = arr(fournisseurs).map((f) => ({ value: f.id, label: f.nom || f.name || f.id }));

  return [
    { key: 'section_source', label: 'Source alimentation', type: 'section', description: 'Choisis un stock existant quand l’aliment est disponible. Sinon utilise la saisie manuelle.' },
    { key: 'id', label: 'ID', type: 'text', required: true },
    { key: 'date', label: 'Date', type: 'date', required: true },
    { key: 'stock_id', label: 'Stock aliment utilisé', type: 'select', options: [{ value: '__manual__', label: 'Saisie manuelle / aliment non stocké' }, ...foodStocks.map((s) => ({ value: s.id, label: `${s.produit} · ${s.quantite} ${s.unite || ''} disponible(s)` }))] },
    { key: 'produit', label: 'Produit / type aliment', type: 'text', required: true, description: 'Ex. aliment pondeuse, provende bovins, maïs…' },
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
    { key: 'prix_unitaire', label: 'Prix unitaire', type: 'number', description: 'Calculé automatiquement si le montant total est renseigné.' },
    { key: 'montant_total', label: 'Montant total', type: 'number', description: 'Calculé automatiquement si le prix unitaire est renseigné.' },
    { key: 'duree_jours', label: 'Durée couverte (jours)', type: 'number' },
    { key: 'fournisseur_id', label: 'Fournisseur', type: 'select', required: true, options: supplierOptions, emptyLabel: 'Aucun fournisseur enregistré' },
    { key: 'notes', label: 'Notes', type: 'text', fullWidth: true },
  ];
}

export function deriveAlimentationValues({ stocks = [], fournisseurs = [], animaux = [], lots = [], isFood = () => false } = {}) {
  return (next, changedKey) => {
    const out = { ...next };
    const foodStocks = arr(stocks).filter(isFood);
    const activeAnimals = arr(animaux).filter(isActiveAnimal);
    const activeLots = arr(lots).filter(isActiveLot);
    let autoSelectedStock = false;

    if (changedKey === null && (!out.stock_id || out.stock_id === '__manual__')) {
      const onlyStock = one(foodStocks);
      if (onlyStock) {
        out.stock_id = onlyStock.id;
        autoSelectedStock = true;
      }
    }

    const stock = out.stock_id && out.stock_id !== '__manual__'
      ? arr(stocks).find((s) => String(s.id) === String(out.stock_id))
      : null;

    if (stock && (changedKey === null || changedKey === 'stock_id')) {
      if (!out.produit) out.produit = stock.produit || stock.name || stock.nom || '';
      if (!out.fournisseur_id && stock.fournisseur_id) out.fournisseur_id = stock.fournisseur_id;
      if (!out.unite && stock.unite) out.unite = stock.unite;
      const inferredCategory = categoryFromText(stockLabel(stock));
      if (inferredCategory && (!out.categorie || changedKey === 'stock_id' || autoSelectedStock)) out.categorie = inferredCategory;
      const unitPrice = stockUnitPrice(stock);
      const qty = toNumber(out.quantite);
      if (unitPrice > 0 && qty > 0 && (!out.montant_total || changedKey === 'stock_id')) {
        out.montant_total = String(Math.round(unitPrice * qty));
      }
      if (unitPrice > 0 && !out.prix_unitaire) out.prix_unitaire = String(Number(unitPrice.toFixed(2)));
    }

    if (!out.fournisseur_id && changedKey === null) {
      const onlySupplier = one(arr(fournisseurs).filter((f) => f?.id));
      if (onlySupplier) out.fournisseur_id = onlySupplier.id;
    }

    const targetCategory = out.categorie || categoryFromText(out.produit);
    if ((changedKey === null || changedKey === 'stock_id' || changedKey === 'categorie' || changedKey === 'type_cible') && !out.cible_id) {
      if (out.type_cible === 'animal') {
        const onlyAnimal = one(targetCategory ? activeAnimals.filter((item) => animalCategory(item) === targetCategory) : activeAnimals);
        if (onlyAnimal) out.cible_id = onlyAnimal.id;
      } else if (out.type_cible === 'lot_avicole') {
        const onlyLot = one(targetCategory ? activeLots.filter((item) => lotCategory(item) === targetCategory) : activeLots);
        if (onlyLot) out.cible_id = onlyLot.id;
      } else if (['pondeuse', 'chair'].includes(targetCategory)) {
        const onlyLot = one(activeLots.filter((item) => lotCategory(item) === targetCategory));
        if (onlyLot) {
          out.type_cible = 'lot_avicole';
          out.cible_id = onlyLot.id;
        }
      } else if (['bovin', 'ovin', 'caprin'].includes(targetCategory)) {
        const onlyAnimal = one(activeAnimals.filter((item) => animalCategory(item) === targetCategory));
        if (onlyAnimal) {
          out.type_cible = 'animal';
          out.cible_id = onlyAnimal.id;
        }
      }
    }

    const qty = toNumber(out.quantite);
    const total = toNumber(out.montant_total);
    const unit = toNumber(out.prix_unitaire);

    if (changedKey === 'montant_total' && qty > 0 && total > 0) {
      out.prix_unitaire = String(Number((total / qty).toFixed(2)));
    } else if (changedKey === 'prix_unitaire' && qty > 0 && unit > 0) {
      out.montant_total = String(Math.round(unit * qty));
    } else if ((changedKey === 'quantite' || changedKey === 'stock_id') && qty > 0) {
      if (total > 0) out.prix_unitaire = String(Number((total / qty).toFixed(2)));
      else if (unit > 0) out.montant_total = String(Math.round(unit * qty));
    }

    if (out.fournisseur_id && (changedKey === null || changedKey === 'fournisseur_id' || changedKey === 'stock_id')) {
      const supplier = arr(fournisseurs).find((f) => String(f.id) === String(out.fournisseur_id));
      if (supplier) out.fournisseur_nom = supplier.nom || supplier.name || '';
    }

    return out;
  };
}

export function normalizeAlimentationPayload(payload = {}, { stocks = [], fournisseurs = [] } = {}) {
  const stock = payload.stock_id && payload.stock_id !== '__manual__'
    ? arr(stocks).find((s) => String(s.id) === String(payload.stock_id))
    : null;
  const qty = toNumber(payload.quantite);
  let unit = toNumber(payload.prix_unitaire ?? payload.unit_price ?? payload.price);
  let total = toNumber(payload.montant_total ?? payload.cout_total ?? payload.montant);
  if (!unit && qty > 0 && total > 0) unit = total / qty;
  if (!total && unit > 0 && qty > 0) total = unit * qty;
  if (!unit && stock) unit = stockUnitPrice(stock);
  if (!total && unit > 0 && qty > 0) total = unit * qty;

  const supplier = arr(fournisseurs).find((f) => String(f.id) === String(payload.fournisseur_id));

  return {
    ...payload,
    stock_id: payload.stock_id === '__manual__' ? '' : payload.stock_id,
    source_mode: payload.stock_id === '__manual__' || !payload.stock_id ? 'manuel' : 'stock',
    cible_id: payload.type_cible === 'categorie_animale' ? '' : payload.cible_id,
    produit: payload.produit || stock?.produit || stock?.name || '',
    quantite: qty,
    prix_unitaire: unit > 0 ? Number(unit.toFixed(2)) : 0,
    montant_total: total > 0 ? Number(total.toFixed(0)) : 0,
    fournisseur_nom: supplier?.nom || supplier?.name || payload.fournisseur_nom || payload.fournisseur || '',
  };
}
