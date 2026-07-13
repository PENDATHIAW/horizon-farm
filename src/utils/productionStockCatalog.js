import { toNumber } from './format';
import { EGG_STOCK_CATEGORY, EGG_STOCK_PRODUCT } from '../services/livestockStockBridge';

const arr = (value) => (Array.isArray(value) ? value : []);
const lower = (value) => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const MEAT_AVICOLE_CATS = new Set(['produit_fini_viande_avicole', 'produit_fini_viande_frais']);
const MEAT_ANIMAL_CATS = new Set([
  'produit_fini_viande_bovine_boeuf',
  'produit_fini_viande_bovine_vache',
  'produit_fini_viande_bovine_veau',
  'produit_fini_viande_ovine',
  'produit_fini_viande_ovine_agneau',
  'produit_fini_viande_caprine',
  'produit_fini_viande_animale',
]);
const HARVEST_CATS = new Set(['recolte', 'recolte_vegetale', 'produits_recoltes', 'produit_recolte']);

function qty(row = {}) {
  return toNumber(row.quantite ?? row.quantity ?? row.stock);
}

function isEggStock(row = {}) {
  const cat = lower(row.categorie || row.category);
  const name = lower(`${row.produit || ''} ${row.nom || ''}`);
  return cat === EGG_STOCK_CATEGORY || name.includes('oeuf') || name.includes('œuf') || name.includes('tablette');
}

function isMeatAvicole(row = {}) {
  const cat = lower(row.categorie || row.category);
  return MEAT_AVICOLE_CATS.has(cat) || (lower(row.activite_liee) === 'avicole' && cat.includes('viande'));
}

function isMeatAnimal(row = {}) {
  const cat = lower(row.categorie || row.category);
  return MEAT_ANIMAL_CATS.has(cat) || (lower(row.activite_liee) === 'animaux' && cat.includes('viande'));
}

function isHarvestStock(row = {}) {
  const cat = lower(row.categorie || row.category);
  return HARVEST_CATS.has(cat) || lower(row.activite_liee) === 'cultures' || cat.includes('recolte');
}

export function classifyStockRow(row = {}) {
  if (isEggStock(row)) return 'oeufs';
  if (isMeatAvicole(row)) return 'viande_avicole';
  if (isMeatAnimal(row)) return 'viande_animale';
  if (isHarvestStock(row)) return 'recolte';
  if (/aliment|feed|provende|son|mais|foin|fourrage/.test(lower(`${row.produit || ''} ${row.categorie || ''}`))) return 'aliment';
  return 'autre';
}

export function summarizeProductionStock(rows = []) {
  const summary = {
    oeufs: { lines: 0, qty: 0, unite: 'œuf' },
    viande_avicole: { lines: 0, qty: 0, unite: 'kg' },
    viande_animale: { lines: 0, qty: 0, unite: 'kg' },
    recolte: { lines: 0, qty: 0, unite: 'kg' },
    aliment: { lines: 0, qty: 0, unite: 'kg' },
  };
  arr(rows).forEach((row) => {
    const kind = classifyStockRow(row);
    if (!summary[kind]) return;
    summary[kind].lines += 1;
    summary[kind].qty += qty(row);
    if (row.unite) summary[kind].unite = row.unite;
  });
  return summary;
}

const lotText = (lot = {}) => lower(`${lot.type || ''} ${lot.name || ''} ${lot.type_lot || ''}`);
const isPondeuse = (lot = {}) => {
  const t = lotText(lot);
  return t.includes('pondeuse') || t.includes('ponte') || t.includes('oeuf');
};
const isChair = (lot = {}) => {
  const t = lotText(lot);
  return t.includes('chair') || t.includes('broiler');
};
const activeCount = (lot = {}) => toNumber(lot.current_count ?? lot.effectif_actuel ?? lot.initial_count);
const isClosedAnimal = (row = {}) => ['vendu', 'mort', 'abattu', 'perdu', 'cloture', 'sorti'].some((w) => lower(row.status || row.statut).includes(w));

export function buildProductionCoherenceAlerts({ stocks = [], lots = [], animaux = [], cultures = [] }) {
  const alerts = [];
  const summary = summarizeProductionStock(stocks);
  const hasEggLine = summary.oeufs.lines > 0;
  const hasMeatAvicole = summary.viande_avicole.lines > 0;
  const hasMeatAnimal = summary.viande_animale.lines > 0;
  const hasHarvest = summary.recolte.lines > 0;

  arr(lots).filter(isPondeuse).filter((lot) => activeCount(lot) > 0).forEach((lot) => {
    if (!hasEggLine) {
      alerts.push({
        id: `prod-egg-missing-${lot.id}`,
        severity: 'orange',
        title: `Ponte sans ligne stock œufs · ${lot.name || lot.id}`,
        detail: 'Les ramassages doivent alimenter « Tablettes d’œufs vendables » dans le stock.',
        module: 'elevage',
        tab: 'Production',
      });
    }
  });

  arr(lots).filter(isChair).filter((lot) => activeCount(lot) > 0).forEach((lot) => {
    const ready = lower(lot.status || lot.statut).includes('pret') || lower(lot.phase || '').includes('finition');
    if (ready && !hasMeatAvicole) {
      alerts.push({
        id: `prod-chair-meat-${lot.id}`,
        severity: 'orange',
        title: `Lot chair sans stock viande · ${lot.name || lot.id}`,
        detail: 'Abattage / transformation doit créer une ligne viande avicole en stock.',
        module: 'elevage',
        tab: 'Transformation',
      });
    }
  });

  arr(animaux).filter((a) => !isClosedAnimal(a)).forEach((animal) => {
    if (lower(animal.status || animal.statut) === 'abattu' && !hasMeatAnimal) {
      alerts.push({
        id: `prod-animal-meat-${animal.id}`,
        severity: 'red',
        title: `Animal abattu sans stock viande · ${animal.name || animal.id}`,
        detail: 'Enregistrer l’abattage avec destination stock dans Élevage › Transformation.',
        module: 'elevage',
        tab: 'Transformation',
      });
    }
  });

  arr(cultures).filter((c) => toNumber(c.quantite_recoltee ?? c.production_reelle) > 0).forEach((culture) => {
    const linked = arr(stocks).some((s) => String(s.source_record_id || s.culture_id) === String(culture.id));
    if (!linked && !hasHarvest) {
      alerts.push({
        id: `prod-culture-harvest-${culture.id}`,
        severity: 'orange',
        title: `Récolte sans stock · ${culture.nom || culture.culture || culture.id}`,
        detail: 'La récolte doit créer une ligne stock récolte (Cultures ou pont récolte → stock).',
        module: 'cultures',
        tab: 'Récolte',
      });
    } else if (!linked) {
      alerts.push({
        id: `prod-culture-stock-gap-${culture.id}`,
        severity: 'orange',
        title: `Récolte non rapprochée du stock · ${culture.nom || culture.id}`,
        detail: 'Quantité récoltée enregistrée mais aucune ligne stock liée à cette culture.',
        module: 'achats_stock',
        tab: 'Stock',
      });
    }
  });

  if (!hasEggLine && !hasMeatAvicole && !hasMeatAnimal && !hasHarvest) {
    alerts.push({
      id: 'prod-no-finished-lines',
      severity: 'orange',
      title: 'Aucun produit fini issu production en stock',
      detail: 'Attendu : œufs, viande (chair/animaux) ou récoltes - après saisie métier dans Élevage / Cultures.',
      module: 'achats_stock',
      tab: 'Stock',
    });
  }

  return alerts;
}

export const PRODUCTION_STOCK_EXPECTATIONS = {
  oeufs: { label: 'Œufs / tablettes', product: EGG_STOCK_PRODUCT, category: EGG_STOCK_CATEGORY, source: 'Élevage › Production (pondeuses)' },
  viande_avicole: { label: 'Viande avicole (chair)', category: 'produit_fini_viande_avicole', source: 'Élevage › Transformation (abattage lot)' },
  viande_animale: { label: 'Viande animale', category: 'produit_fini_viande_frais', source: 'Élevage › Transformation (abattage animal)' },
  recolte: { label: 'Récoltes', category: 'recolte_vegetale', source: 'Cultures › Récolte vers stock' },
};
