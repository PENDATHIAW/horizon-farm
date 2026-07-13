import { Package } from 'lucide-react';
import { useMemo } from 'react';
import { fmtNumber } from '../utils/format';
import { listStockMovements, summarizeMovements } from '../services/stockMovementsService';

const labelOf = (row = {}) => row.stock_id || row.id || 'Mouvement';
const typeLabel = (type = '') => (type === 'entree' ? 'Entrée' : type === 'perte' ? 'Perte' : 'Sortie');

export default function StockMovementsPanel({ movements = [], stockId = '' }) {
  const summary = useMemo(() => summarizeMovements(movements), [movements]);
  const rows = useMemo(() => listStockMovements(movements, stockId), [movements, stockId]);

  return (
    <section className="rounded-3xl border border-line bg-white p-6 shadow-card space-y-4">
      <div>
        <p className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-3 py-1 text-xs font-semibold text-slate">
          <Package size={14} /> Historique mouvements
        </p>
        <h3 className="mt-3 text-xl font-semibold text-earth">Traçabilité stock</h3>
        <p className="mt-1 text-sm text-slate">{summary.total} mouvement(s) · {summary.entrees} entrée(s) · {summary.sorties} sortie(s) · {summary.pertes} perte(s)</p>
      </div>
      {rows.length ? (
        <div className="space-y-2">
          {rows.slice(0, 10).map((row) => (
            <div key={row.id} className="flex items-center justify-between rounded-xl border border-line bg-card px-3 py-2 text-sm">
              <div>
                <b className="text-earth">{typeLabel(row.movement_type)} · {labelOf(row)}</b>
                <p className="text-xs text-slate">{String(row.movement_date || row.created_at || '—').slice(0, 10)} · {row.stock_before} → {row.stock_after} {row.unit || ''}</p>
              </div>
              <span className="font-semibold text-earth">{fmtNumber(row.quantity)}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-line bg-card p-4 text-sm text-slate">Aucun mouvement enregistré pour l&apos;instant.</div>
      )}
    </section>
  );
}
