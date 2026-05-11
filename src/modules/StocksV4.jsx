import { useCallback } from 'react';
import { toNumber } from '../utils/format';
import { makeId } from '../utils/ids';
import StocksV3 from './StocksV3.jsx';
import StockEvolution from './StockEvolution.jsx';
import StockFeedingCostPlanner from './StockFeedingCostPlanner.jsx';

const unitPrice = (row = {}) => toNumber(row.prixUnit ?? row.prixunit ?? row.prix_unitaire ?? row.unit_price ?? row.prix_achat);
const today = () => new Date().toISOString().slice(0, 10);

export default function StocksV4(props) {
  const updateWithLossFinance = useCallback(async (id, patch = {}) => {
    await props.onUpdate?.(id, patch);
    if (patch.last_movement_type !== 'perte') return;
    const row = (props.rows || []).find((item) => String(item.id) === String(id));
    const qty = toNumber(patch.last_movement_qty);
    const amount = qty * unitPrice(row);
    if (!row || qty <= 0 || amount <= 0) return;
    const alreadyLinked = patch.last_loss_finance_id || patch.loss_finance_recorded;
    if (alreadyLinked) return;
    await props.onCreateFinanceTransaction?.({
      id: makeId('TRX'),
      type: 'sortie',
      libelle: `Perte stock ${row.produit || row.name || row.id}`,
      montant: amount,
      date: today(),
      categorie: 'Perte stock',
      module_lie: 'stock',
      related_id: id,
      source_module: 'stock',
      source_record_id: id,
      statut: 'paye',
      notes: `${qty} ${row.unite || ''} perdu(s)`,
    });
    await props.onRefreshFinances?.();
  }, [props]);

  return (
    <div className="space-y-6">
      <StocksV3 {...props} onUpdate={updateWithLossFinance} />
      <StockFeedingCostPlanner
        rows={props.rows || []}
        animaux={props.animaux || []}
        lots={props.lots || []}
      />
      <StockEvolution
        rows={props.rows || []}
        alimentationLogs={props.alimentationLogs || []}
        onNavigate={props.onNavigate}
      />
    </div>
  );
}
