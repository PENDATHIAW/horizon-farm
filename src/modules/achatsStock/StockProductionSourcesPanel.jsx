import { Beef, Bird, Egg, Sprout } from 'lucide-react';
import { fmtNumber } from '../../utils/format';
import { PRODUCTION_STOCK_EXPECTATIONS, summarizeProductionStock } from '../../utils/productionStockCatalog';

const ICONS = { oeufs: Egg, viande_avicole: Bird, viande_animale: Beef, recolte: Sprout };

export default function StockProductionSourcesPanel({ rows = [], onNavigate }) {
  const summary = summarizeProductionStock(rows);
  const items = ['oeufs', 'viande_avicole', 'viande_animale', 'recolte'].map((key) => ({
    key,
    ...PRODUCTION_STOCK_EXPECTATIONS[key],
    ...summary[key],
  }));

  return (
    <section className="rounded-3xl border border-line bg-white p-6 shadow-card space-y-3">
      <div>
        <p className="text-xs uppercase tracking-normal text-horizon-dark font-semibold">Produits issus de la production</p>
        <h3 className="text-lg font-semibold text-earth mt-1">Ce qui doit apparaître en stock</h3>
        <p className="text-sm text-slate mt-1">
          Les têtes vivantes restent dans Élevage (lots / animaux). Seuls les <b>produits finis</b> sont inventoriés ici.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {items.map((item) => {
          const Icon = ICONS[item.key] || Sprout;
          const empty = item.lines <= 0;
          return (
            <div
              key={item.key}
              className={`rounded-2xl border p-4 ${empty ? 'border-vigilance bg-vigilance-bg' : 'border-positive bg-positive-bg'}`}
            >
              <p className="flex items-center gap-2 font-semibold text-earth">
                <Icon size={18} aria-hidden="true" />
                {item.label}
              </p>
              <p className="mt-1 text-xs text-slate">{item.source}</p>
              <p className="mt-2 text-sm">
                {empty ? (
                  <span className="text-horizon-dark font-semibold">Aucune ligne stock</span>
                ) : (
                  <span className="text-positive font-semibold">
                    {item.lines} ligne(s) · {fmtNumber(item.qty)} {item.unite}
                  </span>
                )}
              </p>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-2 justify-end text-xs">
        <button
          type="button"
          onClick={() => onNavigate?.('elevage')}
          className="rounded-xl border border-line px-3 py-2 font-semibold text-earth"
        >
          Élevage
        </button>
        <button
          type="button"
          onClick={() => onNavigate?.('cultures')}
          className="rounded-xl border border-line px-3 py-2 font-semibold text-earth"
        >
          Cultures
        </button>
      </div>
    </section>
  );
}
