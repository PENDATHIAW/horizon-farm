import { AlertTriangle, ArrowDownUp, CheckCircle2, PackagePlus, Receipt, Truck } from 'lucide-react';
import toast from 'react-hot-toast';
import { fmtCurrency, fmtNumber, toNumber } from '../utils/format';
import { makeId } from '../utils/ids';
import { calculateStockMetrics } from '../utils/businessCalculations';

function today() { return new Date().toISOString().slice(0, 10); }
function unitPrice(row = {}) { return toNumber(row.prixUnit ?? row.prixunit ?? row.prix_unitaire); }

async function stockMove({ row, type, qty, props }) {
  const current = toNumber(row.quantite);
  const nextQty = type === 'entrée' ? current + qty : type === 'sortie' || type === 'perte' ? Math.max(0, current - qty) : qty;
  await props.onUpdate?.(row.id, {
    quantite: nextQty,
    last_movement_type: type,
    last_movement_qty: qty,
    last_movement_at: new Date().toISOString(),
    source_module: 'stock',
    source_record_id: row.id,
  });
  await props.onCreateBusinessEvent?.({
    id: makeId('EVT'),
    event_type: type === 'perte' ? 'perte_stock' : 'mouvement_stock',
    module_source: 'stock',
    entity_type: 'stock',
    entity_id: row.id,
    title: `Mouvement stock: ${type}`,
    description: `${row.produit || row.id}: ${current} -> ${nextQty} ${row.unite || ''}`,
    severity: type === 'perte' ? 'warning' : 'info',
    event_date: today(),
  });
  toast.success(`Stock mis à jour: ${type}`);
}

async function receiveCritical(row, props) {
  const metrics = calculateStockMetrics(row);
  const qty = Math.max(1, Math.round(metrics.suggestedOrderQty || toNumber(row.seuil) || 1));
  const amount = qty * unitPrice(row);
  await stockMove({ row, type: 'entrée', qty, props });
  if (amount > 0) {
    await props.onCreateFinanceTransaction?.({
      id: makeId('TRX'),
      type: 'sortie',
      libelle: `Approvisionnement ${row.produit || row.id}`,
      montant: amount,
      date: today(),
      categorie: 'Stocks',
      module_lie: 'stock',
      related_id: row.id,
      fournisseur_id: row.fournisseur_id || '',
      statut: 'paye',
      source_module: 'stock',
      source_record_id: row.id,
    });
    await props.onRefreshFinances?.();
  }
  toast.success('Approvisionnement reçu et relié aux finances');
}

export default function StockFlowPanel(props) {
  const rows = Array.isArray(props.rows) ? props.rows : [];
  const critiques = rows.filter((row) => calculateStockMetrics(row).critical).slice(0, 6);
  const totalValue = rows.reduce((sum, row) => sum + calculateStockMetrics(row).value, 0);
  const lastMoves = rows.filter((row) => row.last_movement_type).slice(0, 5);

  return (
    <div className="rounded-2xl border border-[#d6c3a0] bg-white p-5 space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#8a7456]">Flux stock connecté</p>
          <h3 className="font-black text-[#2f2415]">Mouvements & approvisionnement</h3>
          <p className="text-sm text-[#8a7456] mt-1">Entrée, sortie, perte et réception fournisseur sans remplacer l’inventaire existant.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-xl bg-[#fffdf8] border border-[#eadcc2] px-3 py-2"><b>{fmtCurrency(totalValue)}</b><br /><span className="text-[#8a7456]">valeur stock</span></div>
          <div className="rounded-xl bg-[#fffdf8] border border-[#eadcc2] px-3 py-2"><b>{critiques.length}</b><br /><span className="text-[#8a7456]">à commander</span></div>
        </div>
      </div>

      {critiques.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
          {critiques.map((row) => {
            const metrics = calculateStockMetrics(row);
            const qty = Math.max(1, Math.round(metrics.suggestedOrderQty || toNumber(row.seuil) || 1));
            return (
              <div key={row.id} className="rounded-xl border border-red-200 bg-red-50/50 p-3">
                <p className="font-black text-[#2f2415]"><AlertTriangle size={14} className="inline text-red-500" /> {row.produit}</p>
                <p className="text-xs text-[#8a7456] mt-1">Stock {fmtNumber(row.quantite)} / seuil {fmtNumber(row.seuil)} {row.unite || ''}</p>
                <button type="button" className="mt-3 text-sm font-bold text-emerald-700" onClick={() => receiveCritical(row, props)}><Truck size={14} className="inline" /> Réceptionner {fmtNumber(qty)} {row.unite || ''}</button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3 text-sm text-[#8a7456]"><CheckCircle2 size={14} className="inline" /> Aucun stock critique détecté.</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {rows.slice(0, 3).map((row) => (
          <div key={row.id} className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3">
            <p className="font-bold text-[#2f2415]"><ArrowDownUp size={14} className="inline" /> {row.produit}</p>
            <p className="text-xs text-[#8a7456] mt-1">Quantité actuelle: {fmtNumber(row.quantite)} {row.unite || ''}</p>
            <div className="flex flex-wrap gap-2 mt-3 text-xs font-bold">
              <button type="button" className="text-emerald-700" onClick={() => stockMove({ row, type: 'entrée', qty: 1, props })}><PackagePlus size={12} className="inline" /> +1</button>
              <button type="button" className="text-amber-700" onClick={() => stockMove({ row, type: 'sortie', qty: 1, props })}><Receipt size={12} className="inline" /> sortie</button>
              <button type="button" className="text-red-600" onClick={() => stockMove({ row, type: 'perte', qty: 1, props })}><AlertTriangle size={12} className="inline" /> perte</button>
            </div>
          </div>
        ))}
      </div>

      {lastMoves.length ? <p className="text-xs text-[#8a7456]">Derniers mouvements visibles dans les fiches stock via last_movement_type / last_movement_qty.</p> : null}
    </div>
  );
}
