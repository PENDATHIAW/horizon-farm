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
    <section className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-black text-sky-950">Contexte Élevage → Stock</p>
          {contextMessage ? <p className="mt-1 leading-relaxed">{contextMessage}</p> : null}
          {matched.length ? (
            <p className="mt-2 text-xs text-sky-800">
              {matched.length} ligne(s) correspondante(s) · quantité totale {fmtNumber(matched.reduce((s, r) => s + Number(r.quantite ?? r.quantity ?? 0), 0))}
            </p>
          ) : (
            <p className="mt-2 text-xs text-amber-800 font-bold">
              Aucune ligne stock ne correspond encore à ce filtre — vérifiez les articles œufs/tablettes ou créez-les manuellement si besoin.
            </p>
          )}
        </div>
        {onClear ? (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1 rounded-lg border border-sky-300 bg-white px-2 py-1 text-xs font-black text-sky-900"
          >
            <X size={14} />
            Effacer le filtre
          </button>
        ) : null}
      </div>
    </section>
  );
}
