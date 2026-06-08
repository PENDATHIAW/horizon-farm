/**
 * Métriques ferme légères — partagées Dashboard et consolidation multi-fermes.
 */

import { avicoleActiveCount, avicoleHasActiveBirds } from './avicoleMetrics.js';
import { resolveAvicoleLotKind } from './avicoleActivity.js';
import { toNumber } from './format.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const lower = (value) => String(value || '').trim().toLowerCase();

const CLOSED_ANIMAL_WORDS = ['vendu', 'mort', 'vole', 'volé', 'perdu', 'abattu', 'cloture', 'clôture', 'sorti'];
const isClosedAnimal = (row = {}) => CLOSED_ANIMAL_WORDS.some((word) => lower(row.status || row.statut).includes(word));

const cultureRecordType = (row = {}) => lower(row.record_type || row.type_fiche || 'culture');
const parcelLabel = (row = {}) => String(row.parcelle_code || row.parcelle_nom || row.parcelle || row.nom || '').trim();
const CLOSED_PARCEL_WORDS = ['archive', 'archivé', 'supprime', 'supprimé', 'ferme', 'fermé', 'inactive', 'inactif'];

function isActiveParcelRecord(row = {}) {
  const status = lower(row.statut || row.status || 'actif');
  return !CLOSED_PARCEL_WORDS.some((word) => status.includes(word));
}

function surfaceToM2(row = {}) {
  const surface = toNumber(row.surface_exploitable ?? row.surface);
  if (surface <= 0) return 0;
  const unit = lower(String(row.unite_surface || row.unite || 'm²').replace(/\s/g, ''));
  if (unit === 'ha' || unit === 'hectare' || unit === 'hectares') return surface * 10000;
  return surface;
}

export function computeFarmParcelSurfaceM2(cultures = []) {
  const rows = arr(cultures);
  const parcelRecords = rows.filter((row) => cultureRecordType(row) === 'parcelle' && isActiveParcelRecord(row));
  if (parcelRecords.length) {
    return parcelRecords.reduce((sum, row) => sum + surfaceToM2(row), 0);
  }
  const byParcel = new Map();
  rows
    .filter((row) => cultureRecordType(row) === 'culture' && !['termine', 'perdu', 'archive', 'archivé'].includes(lower(row.statut || row.status)))
    .forEach((row) => {
      const key = lower(parcelLabel(row));
      if (!key || key.includes('non renseign')) return;
      const area = surfaceToM2(row);
      if (area <= 0) return;
      byParcel.set(key, Math.max(byParcel.get(key) || 0, area));
    });
  return [...byParcel.values()].reduce((sum, value) => sum + value, 0);
}

export function computeFarmHeadcount({ animaux = [], lots = [], cultures = [] } = {}) {
  const activeAnimalRows = arr(animaux).filter((row) => !isClosedAnimal(row));
  const activeLotRows = arr(lots).filter(avicoleHasActiveBirds);

  let effectifChair = 0;
  let effectifPondeuses = 0;
  let effectifAvicoleOther = 0;
  let activeLotsChair = 0;
  let activeLotsPondeuses = 0;

  activeLotRows.forEach((lot) => {
    const count = avicoleActiveCount(lot);
    const kind = resolveAvicoleLotKind(lot);
    if (kind === 'pondeuse') {
      effectifPondeuses += count;
      activeLotsPondeuses += 1;
    } else if (kind === 'chair') {
      effectifChair += count;
      activeLotsChair += 1;
    } else {
      effectifAvicoleOther += count;
    }
  });

  const activeAvicole = effectifChair + effectifPondeuses + effectifAvicoleOther;

  return {
    total: activeAnimalRows.length + activeAvicole,
    activeAnimals: activeAnimalRows.length,
    activeAvicole,
    effectifChair,
    effectifPondeuses,
    effectifAvicoleOther,
    activeLots: activeLotRows.length,
    activeLotsChair,
    activeLotsPondeuses,
    parcelSurfaceM2: computeFarmParcelSurfaceM2(cultures),
  };
}

const stockQty = (row = {}) => toNumber(row.quantite ?? row.quantity ?? row.stock);
const stockThreshold = (row = {}) => toNumber(row.seuil ?? row.threshold ?? row.stock_min ?? row.minimum_stock);
const stockUnitPrice = (row = {}) => toNumber(row.prixUnit ?? row.prixunit ?? row.prix_unitaire ?? row.unit_price);

export function computeStockSummary(stocks = []) {
  const rows = arr(stocks);
  const lowStock = rows.filter((row) => {
    const threshold = stockThreshold(row);
    return threshold > 0 && stockQty(row) <= threshold;
  });
  const available = rows.filter((row) => stockQty(row) > 0);
  const stockValue = rows.reduce((sum, row) => sum + stockQty(row) * stockUnitPrice(row), 0);
  return {
    totalProducts: rows.length,
    availableProducts: available.length,
    lowStockCount: lowStock.length,
    stockValue,
  };
}

export function computeCultureSummary(cultures = []) {
  const rows = arr(cultures);
  const parcelRecords = rows.filter((row) => cultureRecordType(row) === 'parcelle' && isActiveParcelRecord(row));
  const activeCultureRows = rows.filter(
    (row) => cultureRecordType(row) === 'culture'
      && !['termine', 'terminé', 'perdu', 'archive', 'archivé'].includes(lower(row.statut || row.status)),
  );

  let parcelCount = parcelRecords.length;
  if (!parcelCount) {
    const parcelKeys = new Set();
    activeCultureRows.forEach((row) => {
      const label = parcelLabel(row);
      if (label && !label.toLowerCase().includes('non renseign')) parcelKeys.add(lower(label));
    });
    parcelCount = parcelKeys.size;
  }

  const surfaceM2 = Math.round(computeFarmParcelSurfaceM2(rows));
  const activeCultures = activeCultureRows.length;

  return {
    parcelCount,
    surfaceM2,
    activeCultures,
    hasData: parcelCount > 0 || activeCultures > 0 || surfaceM2 > 0,
  };
}
