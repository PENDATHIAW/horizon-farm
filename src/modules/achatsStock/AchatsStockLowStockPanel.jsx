import { PackageCheck, Plus } from 'lucide-react';
import { emitHorizonForm } from '../../services/formModalManager.js';
import { fmtNumber } from '../../utils/format.js';
import { AchatsStockSection } from './achatsStockUi.jsx';

const n = (v = 0) => Number(v || 0);
const qty = (r = {}) => n(r.quantite ?? r.quantity ?? r.stock);
const threshold = (r = {}) => n(r.seuil ?? r.threshold ?? r.stock_min ?? r.minimum_stock);
const label = (r = {}) => r.produit || r.name || r.nom || r.libelle || r.title || 'Produit';

export default function AchatsStockLowStockPanel({ items = [], compact = false }) {
  if (!items.length) return null;

  const today = new Date().toISOString().slice(0, 10);

  return (
    <AchatsStockSection
      title={compact ? 'Produits sous seuil' : 'Réapprovisionnement prioritaire'}
      subtitle={compact ? 'Alertes actives — détail complet sur cet onglet.' : 'Produits à commander ou réapprovisionner en priorité.'}
    >
      <div className="divide-y divide-[#eadcc2]/60">
        {items.map((row) => {
          const q = qty(row);
          const th = threshold(row);
          const critical = q <= 0;
          return (
            <div key={row.id || label(row)} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-black text-[#2f2415]">{label(row)}</p>
                <p className="text-xs text-[#8a7456]">
                  {fmtNumber(q)} u. · seuil {fmtNumber(th)}
                  {critical ? ' · rupture' : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => emitHorizonForm('stock', 'stock_purchase', 'Réapprovisionner', { date: today, produit: label(row), stock_id: row.id })}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-[#22c55e] px-3 py-1.5 text-xs font-black text-[#052e16]"
              >
                <Plus size={12} /> Réappro
              </button>
            </div>
          );
        })}
      </div>
      {!compact ? (
        <p className="text-xs text-[#8a7456] flex items-center gap-1">
          <PackageCheck size={13} /> Les distributions aliment vers l&apos;élevage se gèrent depuis Élevage → Alimentation.
        </p>
      ) : null}
    </AchatsStockSection>
  );
}
