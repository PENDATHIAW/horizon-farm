import { X } from 'lucide-react';
import { fmtNumber } from '../../utils/format';
import { filterStocksByContext } from '../../utils/productionNavigation.js';

export default function StockNavigationContextBanner({
  stockContext,
  searchContext,
  contextMessage,
  stocks = [],
  onClear,
}) {
  if (!stockContext && !contextMessage) return null;

  const matched = filterStocksByContext(stocks, stockContext, searchContext);

  return (
    <section className="rounded-2xl border border-line bg-neutral-bg p-4 text-sm text-neutral">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-semibold text-neutral">Contexte Élevage → Stock</p>
          {contextMessage ? <p className="mt-1 leading-relaxed">{contextMessage}</p> : null}
          {matched.length ? (
            <p className="mt-2 text-xs text-neutral">
              {matched.length} ligne(s) correspondante(s) · quantité totale {fmtNumber(matched.reduce((s, r) => s + Number(r.quantite ?? r.quantity ?? 0), 0))}
            </p>
          ) : (
            <p className="mt-2 text-xs text-horizon-dark font-semibold">
              Aucune ligne stock ne correspond encore à ce filtre - vérifiez les articles œufs/tablettes ou créez-les manuellement si besoin.
            </p>
          )}
        </div>
        {onClear ? (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2 py-1 text-xs font-semibold text-neutral"
          >
            <X size={14} />
            Effacer le filtre
          </button>
        ) : null}
      </div>
    </section>
  );
}
