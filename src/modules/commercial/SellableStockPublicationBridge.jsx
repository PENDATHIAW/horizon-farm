import { Megaphone, Package } from 'lucide-react';
import { useMemo, useState } from 'react';
import { fmtCurrency, fmtNumber } from '../../utils/format';
import { daysUntilDlc } from '../../utils/stockFreshProduct';
import {
  dlcOf,
  listSellableStocks,
  productNameOf,
  quantityOf,
  unitOf,
  unitPriceOf,
} from '../../utils/sellableStock';
import SalesPublicationModal from './SalesPublicationModal.jsx';

export default function SellableStockPublicationBridge({
  rows = [],
  title = 'Publier le stock',
  subtitle = 'Transformez un produit disponible ou proche DLC en message de vente.',
  limit = 8,
  contactPhone = '',
  onWhatsAppLog,
}) {
  const [activeRow, setActiveRow] = useState(null);
  const candidates = useMemo(() => listSellableStocks(rows, limit), [rows, limit]);

  return (
    <>
      <div className="rounded-2xl border border-line bg-white p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-normal text-slate">Suggestions commerciales</p>
            <h3 className="font-semibold text-earth">{title}</h3>
            <p className="text-sm text-slate mt-1">{subtitle}</p>
          </div>
          <div className="rounded-xl border border-line bg-card px-3 py-2 text-sm text-slate">
            <Megaphone size={14} className="inline" />
            {' '}
            {candidates.length} produit(s)
          </div>
        </div>

        {candidates.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
            {candidates.map((row) => {
              const qty = quantityOf(row);
              const price = unitPriceOf(row);
              const dlc = dlcOf(row);
              const days = daysUntilDlc(row);
              const urgent = days != null && days <= 3;
              return (
                <div key={row.id} className={`rounded-xl border p-3 ${urgent ? 'border-vigilance bg-vigilance-bg' : 'border-line bg-card'}`}>
                  <p className="font-semibold text-earth">
                    <Package size={14} className="inline" />
                    {' '}
                    {productNameOf(row)}
                  </p>
                  <p className="text-xs text-slate mt-1">
                    {fmtNumber(qty)} {unitOf(row)} · {fmtCurrency(price)}
                  </p>
                  {dlc ? (
                    <p className="text-xs font-semibold text-horizon-dark mt-1">DLC {dlc}</p>
                  ) : null}
                  <button
                    type="button"
                    className="mt-3 text-sm font-semibold text-horizon-dark hover:text-earth"
                    onClick={() => setActiveRow(row)}
                  >
                    <Megaphone size={14} className="inline" />
                    {' '}
                    Générer publication
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-line bg-card p-3 text-sm text-slate">
            Aucun produit vendable disponible pour publication.
          </div>
        )}
      </div>

      <SalesPublicationModal
        open={Boolean(activeRow)}
        onClose={() => setActiveRow(null)}
        stockRow={activeRow}
        contactPhone={contactPhone}
        onWhatsAppLog={onWhatsAppLog}
      />
    </>
  );
}
