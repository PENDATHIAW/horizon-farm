import { toNumber, fmtNumber } from './format';
import { DEFAULT_EGGS_PER_TABLET } from './costEngine';

const lower = (value = '') => String(value || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export function isEggTraySale(row = {}) {
  const text = lower(`${row.product_name || ''} ${row.produit || ''} ${row.sale_kind || ''}`);
  const unit = lower(row.unit || row.unite || '');
  return row.sale_kind === 'oeufs_tablettes' || unit.includes('tablette') || unit.includes('plateau') || text.includes('oeuf') || text.includes('tablette') || text.includes('plateau');
}

export function saleQuantityDetail(row = {}) {
  const qty = Math.max(0, toNumber(row.quantity ?? row.quantite ?? row.qty ?? 0));
  const eggsPerUnit = toNumber(row.eggs_per_unit ?? row.oeufs_par_tablette) || DEFAULT_EGGS_PER_TABLET;
  const explicitEggs = toNumber(row.eggs_quantity ?? row.oeufs_quantity ?? row.oeufs_vendus ?? row.eggs_sold);
  const unit = String(row.unit || row.unite || '').trim();

  if (isEggTraySale(row)) {
    const plateaux = qty || Math.floor(explicitEggs / eggsPerUnit);
    const oeufs = explicitEggs || plateaux * eggsPerUnit;
    return {
      plateaux,
      oeufs,
      eggsPerUnit,
      isEggSale: true,
      shortLabel: plateaux > 0 ? `${fmtNumber(plateaux)} pl. (${fmtNumber(oeufs)} œufs)` : `${fmtNumber(oeufs)} œufs`,
      label: plateaux > 0 ? `${fmtNumber(plateaux)} plateaux (${fmtNumber(oeufs)} œufs)` : `${fmtNumber(oeufs)} œufs`,
    };
  }

  return {
    plateaux: null,
    oeufs: null,
    eggsPerUnit: null,
    isEggSale: false,
    shortLabel: qty > 0 ? `${fmtNumber(qty)} ${unit || 'unité'}` : '—',
    label: qty > 0 ? `${fmtNumber(qty)} ${unit || 'unité'}` : '—',
  };
}

export const EGG_MARGIN_FORMULA = 'Marge plateaux = CA vente − [(coût œuf × nb œufs) + (coût emballage × nb plateaux) + transport livraison]. Le coût œuf = (amortissement cheptel pondeuses + alimentation + santé + charges directes) ÷ œufs vendables produits sur la période.';
