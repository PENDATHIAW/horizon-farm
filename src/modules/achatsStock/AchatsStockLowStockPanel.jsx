import { PackageCheck, Plus } from 'lucide-react';
import { openStockPurchaseForm } from '../../utils/achatsStockFormBridge.js';
import { fmtNumber } from '../../utils/format.js';
import { AchatsStockSection } from './achatsStockUi.jsx';

const n = (v = 0) => Number(v || 0);
const qty = (r = {}) => n(r.quantite ?? r.quantity ?? r.stock);
const threshold = (r = {}) => n(r.seuil ?? r.threshold ?? r.stock_min ?? r.minimum_stock);
const label = (r = {}) => r.produit || r.name || r.nom || r.libelle || r.title || 'Produit';

export default function AchatsStockLowStockPanel({ items = [], compact = false, setTab }) {
  if (!items.length) return null;

  const today = new Date().toISOString().slice(0, 10);

  return (
    <AchatsStockSection
      title={compact ? 'Produits sous seuil' : 'Réapprovisionnement prioritaire'}
      subtitle={compact ? 'Alertes actives - détail complet sur cet onglet.' : 'Produits à commander ou réapprovisionner en priorité.'}
    >
      <div className="divide-y divide-line/60">
        {items.map((row) => {
          const q = qty(row);
          const th = threshold(row);
          const critical = q <= 0;
          return (
            <div key={row.id || label(row)} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-earth">{label(row)}</p>
                <p className="text-xs text-slate">
                  {fmtNumber(q)} u. · seuil {fmtNumber(th)}
                  {critical ? ' · rupture' : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => openStockPurchaseForm({
                  setTab,
                  intent_label: 'Réapprovisionner',
                  draft_fields: { date: today, produit: label(row), stock_id: row.id },
                })}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-leaf px-3 py-2 text-xs font-semibold text-earth"
              >
                <Plus size={12} /> Réappro
              </button>
            </div>
          );
        })}
      </div>
      {!compact ? (
        <p className="text-xs text-slate flex items-center gap-1">
          <PackageCheck size={13} /> Les distributions aliment vers l&apos;élevage se gèrent depuis Élevage → Alimentation.
        </p>
      ) : null}
    </AchatsStockSection>
  );
}
