import { useState } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { fmtNumber } from '../../utils/format.js';
import {
  TRANSFER_STATUS,
  commitFarmTransfer,
  prepareFarmTransfer,
  validateFarmTransfer,
} from '../../utils/farmTransferWorkflow.js';
import { AchatsStockSection } from './achatsStockUi.jsx';

export default function AchatsStockTransferPanel({
  stocks = [],
  accessibleFarms = [],
  farmScope = {},
  onUpdateStock,
  onCreateStockMovement,
  onCreateBusinessEvent,
  onRefreshStockMovements,
  existingMovements = [],
}) {
  const [sourceFarmId, setSourceFarmId] = useState(farmScope?.farmId || accessibleFarms[0]?.id || '');
  const [destFarmId, setDestFarmId] = useState('');
  const [stockId, setStockId] = useState('');
  const [qty, setQty] = useState('');
  const [motif, setMotif] = useState('');
  const [pending, setPending] = useState(null);
  const [busy, setBusy] = useState(false);

  const scopedStocks = stocks.filter((row) => !sourceFarmId || String(row.farm_id || '') === String(sourceFarmId));
  const selectedStock = scopedStocks.find((row) => String(row.id) === String(stockId));

  const requestTransfer = () => {
    const preview = prepareFarmTransfer({
      sourceFarmId,
      destFarmId,
      stock: selectedStock,
      qty: Number(qty),
      motif,
    });
    if (!preview.ok) {
      toast.error(preview.error);
      return;
    }
    setPending(preview);
    toast.success('Demande de transfert préparée');
  };

  const executeTransfer = async () => {
    if (!pending?.transfer) return;
    setBusy(true);
    try {
      const result = await commitFarmTransfer({
        transfer: { ...pending.transfer, status: TRANSFER_STATUS.ACCEPTED },
        stock: selectedStock,
        handlers: {
          onUpdateStock,
          onCreateStockMovement,
          onCreateBusinessEvent,
          onRefreshStockMovements,
        },
        existingMovements,
      });
      if (!result.ok) throw new Error(result.error);
      toast.success('Transfert effectué');
      setPending(null);
      setQty('');
      setMotif('');
    } catch (e) {
      toast.error(e.message || 'Erreur transfert');
    } finally {
      setBusy(false);
    }
  };

  if (!accessibleFarms.length && farmScope?.mode !== 'all') return null;

  return (
    <AchatsStockSection
      title="Transfert inter-fermes"
      subtitle="Demande simple : sortie ferme source, entrée ferme destination. Pas de facturation interne."
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="text-xs font-black text-[#8a7456]">Ferme source</span>
          <select value={sourceFarmId} onChange={(e) => setSourceFarmId(e.target.value)} className="mt-1 w-full rounded-xl border border-[#eadcc2] px-3 py-2 text-sm">
            <option value="">—</option>
            {accessibleFarms.map((farm) => (
              <option key={farm.id} value={farm.id}>{farm.name || farm.id}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="text-xs font-black text-[#8a7456]">Ferme destination</span>
          <select value={destFarmId} onChange={(e) => setDestFarmId(e.target.value)} className="mt-1 w-full rounded-xl border border-[#eadcc2] px-3 py-2 text-sm">
            <option value="">—</option>
            {accessibleFarms.filter((farm) => String(farm.id) !== String(sourceFarmId)).map((farm) => (
              <option key={farm.id} value={farm.id}>{farm.name || farm.id}</option>
            ))}
          </select>
        </label>
        <label className="text-sm sm:col-span-2">
          <span className="text-xs font-black text-[#8a7456]">Article</span>
          <select value={stockId} onChange={(e) => setStockId(e.target.value)} className="mt-1 w-full rounded-xl border border-[#eadcc2] px-3 py-2 text-sm">
            <option value="">—</option>
            {scopedStocks.map((row) => (
              <option key={row.id} value={row.id}>
                {row.produit || row.name || row.id} · {fmtNumber(row.quantite ?? row.quantity)} {row.unite || ''}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="text-xs font-black text-[#8a7456]">Quantité</span>
          <input type="number" min="0" value={qty} onChange={(e) => setQty(e.target.value)} className="mt-1 w-full rounded-xl border border-[#eadcc2] px-3 py-2 text-sm" />
        </label>
        <label className="text-sm">
          <span className="text-xs font-black text-[#8a7456]">Motif</span>
          <input value={motif} onChange={(e) => setMotif(e.target.value)} className="mt-1 w-full rounded-xl border border-[#eadcc2] px-3 py-2 text-sm" placeholder="Transfert interne" />
        </label>
      </div>

      {selectedStock && validateFarmTransfer({ sourceFarmId, destFarmId, stock: selectedStock, qty: Number(qty) }) ? (
        <p className="text-xs text-amber-700">{validateFarmTransfer({ sourceFarmId, destFarmId, stock: selectedStock, qty: Number(qty) })}</p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={requestTransfer} className="inline-flex items-center gap-1 rounded-xl bg-[#2f2415] px-4 py-2 text-xs font-black text-white">
          <ArrowLeftRight size={14} /> Demander transfert
        </button>
        {pending ? (
          <button type="button" disabled={busy} onClick={executeTransfer} className="rounded-xl bg-[#22c55e] px-4 py-2 text-xs font-black text-[#052e16] disabled:opacity-50">
            {busy ? '…' : 'Accepter & effectuer'}
          </button>
        ) : null}
      </div>

      {pending?.transfer ? (
        <p className="text-xs text-[#8a7456]">
          Demande {pending.transfer.id} · {pending.transfer.quantity} {pending.transfer.unit} · statut {pending.transfer.status}
        </p>
      ) : null}
    </AchatsStockSection>
  );
}
