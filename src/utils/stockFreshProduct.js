import { toNumber } from './format';

const arr = (value) => (Array.isArray(value) ? value : []);
const clean = (value = '') => String(value || '').trim();
const lower = (value = '') => clean(value).toLowerCase();

export const FRESH_STOCK_CATEGORIES = new Set([
  'produit_fini_oeufs',
  'produit_fini_viande_frais',
  'produit_fini_viande_surgelé',
  'produit_fini_viande_surgele',
  'produit_fini_viande_avicole',
  'produit_fini_viande_bovine_boeuf',
  'produit_fini_viande_bovine_vache',
  'produit_fini_viande_bovine_veau',
  'produit_fini_viande_ovine',
  'produit_fini_viande_ovine_agneau',
  'produit_fini_viande_caprine',
  'produit_fini_viande_animale',
  'produit_fini_laitier',
  'recolte',
  'recolte_vegetale',
  'produit_fini',
  'produits_recoltes',
]);

export const STOCK_CATEGORY_OPTIONS = [
  { value: 'aliment_betail', label: 'Aliment bétail' },
  { value: 'aliment_avicole', label: 'Aliment avicole' },
  { value: 'semences', label: 'Semences' },
  { value: 'engrais', label: 'Engrais / fertilisants' },
  { value: 'phytosanitaire', label: 'Produits phytosanitaires' },
  { value: 'vaccin', label: 'Vaccins' },
  { value: 'medicament', label: 'Médicaments / soins' },
  { value: 'materiel', label: 'Matériel / consommables' },
  { value: 'emballage', label: 'Emballages' },
  { value: 'carburant', label: 'Carburant / énergie' },
  { value: 'produit_fini_oeufs', label: 'Produits finis — œufs' },
  { value: 'produit_fini_viande_frais', label: 'Produits finis — viande fraîche' },
  { value: 'produit_fini_viande_surgelé', label: 'Produits finis — viande surgelée' },
  { value: 'produit_fini_laitier', label: 'Produits finis — laitier' },
  { value: 'recolte_vegetale', label: 'Produits finis — récolte végétale' },
  { value: 'recolte', label: 'Produits récoltés (générique)' },
  { value: 'autre', label: 'Autre' },
];

export function isFreshStockCategory(categorie = '') {
  const cat = lower(categorie);
  if (FRESH_STOCK_CATEGORIES.has(cat)) return true;
  return cat.includes('produit_fini') || cat.includes('viande') || cat.includes('oeuf') || cat.includes('œuf') || cat.includes('recolte') || cat.includes('récolte');
}

export function requiresDlc(row = {}) {
  return isFreshStockCategory(row.categorie || row.category);
}

export function parseStockDate(value = '') {
  const raw = clean(value).slice(0, 10);
  if (!raw) return null;
  const date = new Date(`${raw}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function daysUntilDlc(row = {}, referenceDate = new Date()) {
  const dlc = parseStockDate(row.date_peremption || row.dlc || row.date_limite_consommation);
  if (!dlc) return null;
  const ref = new Date(referenceDate);
  ref.setHours(12, 0, 0, 0);
  return Math.ceil((dlc.getTime() - ref.getTime()) / 86400000);
}

/** orange: J-3..1, red: <24h (0 days), black: expired, green: ok */
export function dlcAlertLevel(row = {}, referenceDate = new Date()) {
  if (!requiresDlc(row)) return 'none';
  const days = daysUntilDlc(row, referenceDate);
  if (days === null) return 'missing';
  if (days < 0) return 'black';
  if (days === 0) return 'red';
  if (days <= 3) return 'orange';
  return 'ok';
}

export function isCommerciallyBlocked(row = {}) {
  const status = lower(row.statut || row.stock_status || row.status);
  if (['perime', 'périmé', 'bloque', 'bloqué', 'non_conforme', 'epuise', 'épuisé'].includes(status)) return true;
  return dlcAlertLevel(row) === 'black';
}

export function defaultDlcForCategory(categorie = '', fromDate = new Date()) {
  const cat = lower(categorie);
  const date = new Date(fromDate);
  if (cat.includes('surgel')) {
    date.setMonth(date.getMonth() + 6);
    return date.toISOString().slice(0, 10);
  }
  if (isFreshStockCategory(cat)) {
    date.setDate(date.getDate() + 7);
    return date.toISOString().slice(0, 10);
  }
  return '';
}

export function stockKgAvailable(row = {}) {
  const qty = toNumber(row.quantite ?? row.quantity);
  const unit = lower(row.unite || row.unit);
  if (unit.includes('sac')) return qty * toNumber(row.poids_sac_kg || row.sac_kg || 50);
  return qty;
}

export function estimateFeedCoverageDays({ stockRow, subjects = 0, dailyKgPerSubject = 0 }) {
  const subjectsN = Math.max(0, toNumber(subjects));
  const daily = Math.max(0, toNumber(dailyKgPerSubject));
  if (!subjectsN || !daily) return null;
  const needPerDay = subjectsN * daily;
  if (needPerDay <= 0) return null;
  return stockKgAvailable(stockRow) / needPerDay;
}

export function buildFeedCoherenceAlerts({ stocks = [], lots = [], dailyKgByLot = 0.135 }) {
  const alerts = [];
  const feedStocks = arr(stocks).filter((row) => /aliment|feed|provende|son|mais|maïs|foin|fourrage/.test(lower(`${row.produit} ${row.categorie}`)));
  const totalFeedKg = feedStocks.reduce((sum, row) => sum + stockKgAvailable(row), 0);
  arr(lots).forEach((lot) => {
    const text = lower(`${lot.type} ${lot.name} ${lot.activity_type}`);
    const isLayer = text.includes('pondeuse') || text.includes('ponte') || text.includes('oeuf');
    const isBroiler = text.includes('chair') || text.includes('broiler');
    if (!isLayer && !isBroiler) return;
    const count = toNumber(lot.current_count ?? lot.effectif_actuel ?? lot.initial_count);
    if (count <= 0) return;
    const dailyKg = isLayer ? dailyKgByLot : 0.1;
    const needPerDay = count * dailyKg;
    if (needPerDay <= 0) return;
    const coverage = totalFeedKg / needPerDay;
    if (coverage < 3) {
      alerts.push({
        id: `coh-feed-${lot.id}`,
        severity: coverage < 1 ? 'red' : 'orange',
        title: `Aliment insuffisant pour ${lot.name || lot.id}`,
        detail: `${count} sujet(s) · ~${coverage.toFixed(1)} jour(s) de stock aliment (besoin ~${needPerDay.toFixed(0)} kg/j)`,
        lotId: lot.id,
      });
    }
  });
  return alerts;
}
