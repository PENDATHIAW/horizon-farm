import { fmtCurrency, fmtNumber, fmtPercent } from './format.js';

/** Une seule vérité financière Élevage — moteur unifiedCostService (aligné Finance). */
export const PRODUCTION_FINANCE_SOURCE = 'Coût unifié ERP (alimentation + santé + achat) — même moteur que Finance & Rentabilité.';

export const MARGIN_GROSS_DEFINITION_SHORT = 'Revenus − coût de production unifié ERP';
export const MARGIN_GROSS_DEFINITION = `Marge brute technique = ${MARGIN_GROSS_DEFINITION_SHORT}`;

export const PRODUCTION_FINANCE_LABELS = {
  costTotal: 'Coût de production unifié',
  revenue: 'Revenu enregistré (fiche)',
  marginGross: 'Marge brute technique',
  marginNote: 'CA fiche − coût unifié (pas de double comptage trésorerie)',
  icPerKg: 'Indice de consommation (€/kg)',
  icPerEgg: 'Coût unitaire œuf (€)',
  icPerAnimal: 'Coût unitaire animal (€)',
  partial: 'Données partielles — compléter alimentation / santé / vente',
};

export const ELEVAGE_FINANCE_LABELS = PRODUCTION_FINANCE_LABELS;

export function formatUnifiedCost(value) {
  return value > 0 ? fmtCurrency(value) : '—';
}

export function formatTechnicalMargin({ margin, reliable, missing = [] } = {}) {
  if (margin == null && !reliable) {
    return missing.length ? `${PRODUCTION_FINANCE_LABELS.partial} (${missing.join(', ')})` : '—';
  }
  if (margin == null) return '—';
  const tone = margin > 0 ? 'good' : margin < 0 ? 'bad' : 'warn';
  return { value: fmtCurrency(margin), tone, label: PRODUCTION_FINANCE_LABELS.marginGross };
}

export function buildFinancialSnapshot(kpi = {}, kind = 'lot') {
  const cost = kpi.totalCost ?? kpi.costPerKg ?? kpi.costPerAnimal ?? kpi.costPerEgg;
  return {
    costLabel: PRODUCTION_FINANCE_LABELS.costTotal,
    costValue: kpi.unifiedTotal != null ? formatUnifiedCost(kpi.unifiedTotal) : '—',
    margin: formatTechnicalMargin({ margin: kpi.margin, reliable: kpi.reliable, missing: kpi.missing }),
    icLabel: kind === 'pondeuse' ? PRODUCTION_FINANCE_LABELS.icPerEgg : kind === 'animal' ? PRODUCTION_FINANCE_LABELS.icPerAnimal : PRODUCTION_FINANCE_LABELS.icPerKg,
    icValue: kind === 'pondeuse'
      ? (kpi.costPerEgg > 0 ? fmtCurrency(kpi.costPerEgg) : '—')
      : kind === 'animal'
        ? (kpi.costPerKg > 0 ? fmtCurrency(kpi.costPerKg) : '—')
        : (kpi.costPerKg > 0 ? fmtCurrency(kpi.costPerKg) : '—'),
    source: PRODUCTION_FINANCE_SOURCE,
  };
}
