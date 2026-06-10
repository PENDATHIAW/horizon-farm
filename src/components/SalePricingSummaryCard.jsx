import { Tag } from 'lucide-react';
import { fmtCurrency } from '../utils/format';
import { PROPOSED_PRICE_MARGIN_LABEL, SALE_PRICE_HELP_ANIMAL, SALE_PRICE_HELP_AVICOLE } from '../utils/salePricePresentation.js';

/**
 * Bandeau prix de vente proposé — visible sur toutes les fiches (pas seulement l’onglet Finances).
 * Marge affichée = prix proposé − coût unifié (alignée liste Animaux / Avicole).
 */
export default function SalePricingSummaryCard({
  variant = 'animal',
  salePricing,
  onOpenFinances,
  compact = false,
  pricingBasis = '',
  marginOnProposed = undefined,
  marginSource = '',
  ficheDivergeNote = '',
}) {
  if (!salePricing) return null;

  const isLot = variant === 'avicole_lot';
  const recommended = isLot ? salePricing.recommendedTotalPrice : salePricing.recommendedPrice;
  const unitPrice = isLot ? salePricing.recommendedUnitPrice : null;
  const minimum = isLot ? salePricing.minimumUnitPrice : salePricing.minimumPrice;
  const hasPrice = Number(recommended) > 0;
  const basis = pricingBasis || salePricing.pricingBasis || '';
  const marginValue = marginOnProposed !== undefined ? marginOnProposed : salePricing.margin;
  const marginLabel = marginSource || 'prix proposé − coût unifié';
  const helpText = isLot ? SALE_PRICE_HELP_AVICOLE : SALE_PRICE_HELP_ANIMAL;

  return (
    <section
      className={`rounded-2xl border ${hasPrice ? 'border-emerald-300 bg-emerald-50' : 'border-amber-300 bg-amber-50'} p-4`}
      aria-label="Prix de vente proposé"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest font-black text-emerald-900 flex items-center gap-2">
            <Tag size={14} />
            Prix de vente proposé
          </p>
          <p className="mt-1 text-2xl font-black text-[#2f2415]">
            {hasPrice ? fmtCurrency(recommended) : 'À calculer'}
          </p>
          {isLot && hasPrice && unitPrice > 0 ? (
            <p className="text-sm text-[#7d6a4a]">
              {fmtCurrency(unitPrice)} / sujet · effectif pris en compte par le moteur
            </p>
          ) : null}
          {!isLot && salePricing.configuredPricePerKg > 0 ? (
            <p className="text-sm text-[#7d6a4a]">
              Base Annexe : {fmtCurrency(salePricing.configuredPricePerKg)} / kg
              {salePricing.speciesKey ? ` (${salePricing.speciesKey})` : ''}
            </p>
          ) : null}
          {basis ? (
            <p className="text-xs text-[#7d6a4a] mt-1">Calcul : {basis}</p>
          ) : null}
        </div>
        {!compact ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm min-w-[200px]">
            <div className="rounded-xl bg-white/80 border border-emerald-200/60 px-3 py-2">
              <p className="text-[10px] uppercase text-[#8a7456]">Plancher</p>
              <p className="font-black text-[#2f2415]">{minimum > 0 ? fmtCurrency(minimum) : '—'}</p>
            </div>
            <div className="rounded-xl bg-white/80 border border-emerald-200/60 px-3 py-2">
              <p className="text-[10px] uppercase text-[#8a7456]">Coût unifié</p>
              <p className="font-black text-[#2f2415]">{fmtCurrency(salePricing.totalCost || 0)}</p>
            </div>
            <div className="rounded-xl bg-white/80 border border-emerald-200/60 px-3 py-2">
              <p className="text-[10px] uppercase text-[#8a7456]">{PROPOSED_PRICE_MARGIN_LABEL}</p>
              <p className={`font-black ${Number(marginValue) < 0 ? 'text-red-600' : 'text-emerald-800'}`}>
                {hasPrice && marginValue != null ? fmtCurrency(marginValue) : '—'}
              </p>
              {hasPrice ? (
                <p className="text-[10px] text-[#8a7456] mt-0.5">{marginLabel}</p>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
      {ficheDivergeNote ? (
        <p className="mt-3 text-sm text-amber-900 rounded-xl border border-amber-200 bg-amber-100/80 px-3 py-2">
          {ficheDivergeNote}
        </p>
      ) : null}
      {salePricing.alerts?.length ? (
        <p className="mt-3 text-sm text-amber-900 rounded-xl border border-amber-200 bg-amber-100/80 px-3 py-2">
          {salePricing.alerts.join(' ')}
        </p>
      ) : null}
      {!hasPrice ? (
        <p className="mt-2 text-xs text-amber-900">
          Complétez poids, achat/alimentation ou les prix/kg dans l’onglet Annexe. Détail dans Finances.
        </p>
      ) : null}
      {!compact ? (
        <p className="mt-2 text-[11px] text-[#7d6a4a] leading-snug">{helpText}</p>
      ) : null}
      {onOpenFinances ? (
        <button
          type="button"
          onClick={onOpenFinances}
          className="mt-3 text-xs font-bold text-emerald-800 underline underline-offset-2"
        >
          Voir le détail coûts & marge
        </button>
      ) : null}
    </section>
  );
}
