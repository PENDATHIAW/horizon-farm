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
    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-3">
      <div>
        <p className="text-xs uppercase tracking-widest text-[#9a6b12] font-black">Produits issus de la production</p>
        <h3 className="text-lg font-black text-[#2f2415] mt-1">Ce qui doit apparaître en stock</h3>
        <p className="text-sm text-[#8a7456] mt-1">
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
              className={`rounded-2xl border p-4 ${empty ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}
            >
              <p className="flex items-center gap-2 font-black text-[#2f2415]">
                <Icon size={18} aria-hidden="true" />
                {item.label}
              </p>
              <p className="mt-1 text-xs text-[#8a7456]">{item.source}</p>
              <p className="mt-2 text-sm">
                {empty ? (
                  <span className="text-amber-800 font-bold">Aucune ligne stock</span>
                ) : (
                  <span className="text-emerald-800 font-bold">
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
          className="rounded-xl border border-[#eadcc2] px-3 py-2 font-bold text-[#2f2415]"
        >
          Élevage
        </button>
        <button
          type="button"
          onClick={() => onNavigate?.('cultures')}
          className="rounded-xl border border-[#eadcc2] px-3 py-2 font-bold text-[#2f2415]"
        >
          Cultures
        </button>
      </div>
    </section>
  );
}
