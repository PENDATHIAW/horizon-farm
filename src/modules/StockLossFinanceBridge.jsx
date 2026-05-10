import { AlertTriangle, Receipt } from 'lucide-react';
import toast from 'react-hot-toast';
import { fmtCurrency, fmtNumber, toNumber } from '../utils/format';
import { buildStockLossBusinessEvent, buildStockLossFinanceTransaction, calculateStockLossImpact } from '../utils/stockLossImpact';

function askLossQty(row) {
  const raw = window.prompt(`Déclarer une perte stock\nProduit: ${row.produit || row.nom || row.id}\nDisponible: ${fmtNumber(row.quantite)} ${row.unite || ''}\nQuantité perdue:`, '1');
  if (raw === null) return null;
  const qty = toNumber(raw);
  if (qty <= 0) {
    toast.error('Quantité invalide');
    return null;
  }
  if (qty > toNumber(row.quantite)) {
    toast.error(`Stock insuffisant : ${fmtNumber(row.quantite)} ${row.unite || ''} disponible(s)`);
    return null;
  }
  return qty;
}

export default function StockLossFinanceBridge({ rows = [], onUpdate, onCreateFinanceTransaction, onRefreshFinances, onCreateBusinessEvent, onRefreshBusinessEvents, onRefresh }) {
  const candidates = rows.filter((row) => toNumber(row.quantite) > 0).slice(0, 6);
  const totalExposure = candidates.reduce((sum, row) => sum + calculateStockLossImpact(row, Math.min(1, toNumber(row.quantite))).amount, 0);

  const declareLoss = async (row) => {
    const qty = askLossQty(row);
    if (!qty) return;
    try {
      const nextQty = Math.max(0, toNumber(row.quantite) - qty);
      const finance = buildStockLossFinanceTransaction(row, qty);
      await onUpdate?.(row.id, {
        quantite: nextQty,
        statut: nextQty <= 0 ? 'epuise' : (row.statut || row.stock_status || 'ok'),
        stock_status: nextQty <= 0 ? 'epuise' : (row.stock_status || row.statut || 'ok'),
        last_movement_type: 'perte',
        last_movement_qty: qty,
        last_movement_at: new Date().toISOString(),
      });
      if (finance) await onCreateFinanceTransaction?.(finance);
      await onCreateBusinessEvent?.(buildStockLossBusinessEvent(row, qty));
      await Promise.allSettled([onRefresh?.(), onRefreshFinances?.(), onRefreshBusinessEvents?.()]);
      toast.success('Perte enregistrée, charge Finance créée');
    } catch (error) {
      toast.error(error.message || 'Perte stock impossible');
    }
  };

  return <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 space-y-4">
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
      <div>
        <p className="text-xs uppercase tracking-widest text-amber-700">Pertes stock → Finance</p>
        <h3 className="font-black text-[#2f2415]">Déclarer une perte avec impact financier</h3>
        <p className="mt-1 text-sm text-amber-800">Chaque perte baisse le stock, crée une charge Finance et un événement d’impact.</p>
      </div>
      <div className="rounded-xl bg-white border border-amber-200 px-3 py-2 text-sm text-amber-800"><Receipt size={14} className="inline" /> exposition test {fmtCurrency(totalExposure)}</div>
    </div>
    {candidates.length ? <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
      {candidates.map((row) => {
        const impact = calculateStockLossImpact(row, 1);
        return <button key={row.id} type="button" onClick={() => declareLoss(row)} className="rounded-xl border border-amber-200 bg-white p-3 text-left hover:border-amber-400">
          <p className="font-bold text-[#2f2415]"><AlertTriangle size={14} className="inline text-amber-600" /> {row.produit || row.nom || row.id}</p>
          <p className="mt-1 text-xs text-[#8a7456]">Disponible : {fmtNumber(row.quantite)} {row.unite || ''}</p>
          <p className="mt-1 text-xs text-amber-700">Impact 1 unité : {fmtCurrency(impact.amount)}</p>
        </button>;
      })}
    </div> : <div className="rounded-xl border border-amber-200 bg-white p-3 text-sm text-amber-800">Aucun stock disponible pour déclarer une perte.</div>}
  </section>;
}
