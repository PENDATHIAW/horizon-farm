import { Tag } from 'lucide-react';
import { fmtCurrency } from '../utils/format';
import { PROPOSED_PRICE_MARGIN_LABEL, SALE_PRICE_HELP_ANIMAL, SALE_PRICE_HELP_AVICOLE } from '../utils/salePricePresentation.js';

/**
 * Bandeau prix de vente proposé - visible sur toutes les fiches (pas seulement l’onglet Finances).
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
      className={`rounded-2xl border ${hasPrice ? 'border-positive bg-positive-bg' : 'border-vigilance bg-vigilance-bg'} p-4`}
      aria-label="Prix de vente proposé"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-normal font-semibold text-positive flex items-center gap-2">
            <Tag size={14} />
            Prix de vente proposé
          </p>
          <p className="mt-1 text-2xl font-semibold text-earth">
            {hasPrice ? fmtCurrency(recommended) : 'À calculer'}
          </p>
          {isLot && hasPrice && unitPrice > 0 ? (
            <p className="text-sm text-slate">
              {fmtCurrency(unitPrice)} / sujet · effectif pris en compte par le moteur
            </p>
          ) : null}
          {!isLot && salePricing.configuredPricePerKg > 0 ? (
            <p className="text-sm text-slate">
              Base Annexe : {fmtCurrency(salePricing.configuredPricePerKg)} / kg
              {salePricing.speciesKey ? ` (${salePricing.speciesKey})` : ''}
            </p>
          ) : null}
          {basis ? (
            <p className="text-xs text-slate mt-1">Calcul : {basis}</p>
          ) : null}
        </div>
        {!compact ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm min-w-[200px]">
            <div className="rounded-xl bg-white/80 border border-positive px-3 py-2">
              <p className="text-meta uppercase text-slate">Plancher</p>
              <p className="font-semibold text-earth">{minimum > 0 ? fmtCurrency(minimum) : '-'}</p>
            </div>
            <div className="rounded-xl bg-white/80 border border-positive px-3 py-2">
              <p className="text-meta uppercase text-slate">Coût unifié</p>
              <p className="font-semibold text-earth">{fmtCurrency(salePricing.totalCost || 0)}</p>
            </div>
            <div className="rounded-xl bg-white/80 border border-positive px-3 py-2">
              <p className="text-meta uppercase text-slate">{PROPOSED_PRICE_MARGIN_LABEL}</p>
              <p className={`font-semibold ${Number(marginValue) < 0 ? 'text-urgent' : 'text-positive'}`}>
                {hasPrice && marginValue != null ? fmtCurrency(marginValue) : '-'}
              </p>
              {hasPrice ? (
                <p className="text-meta text-slate mt-1">{marginLabel}</p>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
      {ficheDivergeNote ? (
        <p className="mt-3 text-sm text-horizon-dark rounded-xl border border-vigilance bg-vigilance-bg px-3 py-2">
          {ficheDivergeNote}
        </p>
      ) : null}
      {salePricing.alerts?.length ? (
        <p className="mt-3 text-sm text-horizon-dark rounded-xl border border-vigilance bg-vigilance-bg px-3 py-2">
          {salePricing.alerts.join(' ')}
        </p>
      ) : null}
      {!hasPrice ? (
        <p className="mt-2 text-xs text-horizon-dark">
          Complétez poids, achat/alimentation ou les prix/kg dans l’onglet Annexe. Détail dans Finances.
        </p>
      ) : null}
      {!compact ? (
        <p className="mt-2 text-meta text-slate leading-snug">{helpText}</p>
      ) : null}
      {onOpenFinances ? (
        <button
          type="button"
          onClick={onOpenFinances}
          className="mt-3 text-xs font-semibold text-positive underline underline-offset-2"
        >
          Voir le détail coûts & marge
        </button>
      ) : null}
    </section>
  );
}
